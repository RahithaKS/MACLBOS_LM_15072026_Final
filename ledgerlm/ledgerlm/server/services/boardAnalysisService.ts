/**
 * Smart Analysis Board — core analysis engine.
 *
 * Flow:
 *   1. Fetch actuals + budget from cube_fact_data (filtered by version / plan-type)
 *   2. Compute variance (actual − budget) per dimension
 *   3. Resolve {{placeholder}} tokens in the user prompt template with real data tables
 *   4. Call the LLM and collect the full streamed response
 *   5. Persist the report to cube_board_reports and return it
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { cubeBoardReports, type CubeBoardReport } from '@shared/schema';
import { streamFinancialAnalysis, type DomainAiConfig } from '../openai';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColumnMapping {
  actuals: string;            // version value for actuals e.g. 'CF02 2026'
  budget: string;             // version value for budget  e.g. 'TBP 2026'
  forecast?: string;          // optional forecast version
  rollingForecasts?: string[];
}

export interface AnalysisRequest {
  boardId: string;
  cubeId: string;
  columnMapping: ColumnMapping;
  year: number;
  months: number[];           // [2] = Feb, [1,2,3] = Q1
  dimensions: string[];       // user-friendly names: ['Entity', 'Sector', ...]
  systemPromptTemplate: string;
  userPromptTemplate: string;
  extraContext?: string;
  domainAiConfig?: DomainAiConfig;
}

interface AggRow {
  dimension_key: string;
  total_amount_usd: string | number;
  total_capacity: string | number;
  total_headcount: string | number;
  total_billed_capacity: string | number;
}

interface Metrics {
  amountUsd: number;
  capacity: number;
  headcount: number;
  billedCapacity: number;
}

interface VarianceRow {
  dimensionKey: string;
  actual: number;
  budget: number;
  variance: number;
  variancePct: number | null;
  favorable: boolean;
}

// ── Dimension name → DB column name ──────────────────────────────────────────
// Column names come from this hardcoded map — never from user input — so
// using them in sql.raw() is safe.

const DIMENSION_TO_COLUMN: Record<string, string> = {
  Entity:            'region_entity',
  Sector:            'sector',
  'Cost Category':   'cost_category',
  'Resource Type':   'resource_type',
  Location:          'onsite_offshore',
  'Project GB':      'project_gb',
  'Planning GB':     'planning_gb',
  'Salary Level':    'salary_level',
  'Cost Center':     'cost_center',
  'Service Area':    'service_area',
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchFactData(
  cubeId: string,
  version: string,
  year: number,
  months: number[],
  dimensions: string[],
): Promise<Record<string, Metrics>> {
  const dbCols = dimensions.map((d) => DIMENSION_TO_COLUMN[d]).filter(Boolean);
  const groupCols = dbCols.length > 0 ? dbCols : ['region_entity', 'cost_category'];

  // Safe: column names come from hardcoded map above
  const selectExpr = groupCols
    .map((c) => `COALESCE(${c}::text, 'Unknown')`)
    .join(` || ' | ' || `);
  const groupByExpr = groupCols.join(', ');

  const monthsSql = sql.join(months.map((m) => sql`${m}`), sql`, `);

  const result = await db.execute(
    sql`
      SELECT
        ${sql.raw(selectExpr)} AS dimension_key,
        COALESCE(SUM(amount_usd::float),       0) AS total_amount_usd,
        COALESCE(SUM(capacity::float),         0) AS total_capacity,
        COALESCE(SUM(headcount::float),        0) AS total_headcount,
        COALESCE(SUM(billed_capacity::float),  0) AS total_billed_capacity
      FROM cube_fact_data
      WHERE cube_id = ${cubeId}
        AND version  = ${version}
        AND year     = ${year}
        AND month IN (${monthsSql})
      GROUP BY ${sql.raw(groupByExpr)}
      ORDER BY total_amount_usd DESC
      LIMIT 60
    `
  );

  const map: Record<string, Metrics> = {};
  for (const row of (result.rows ?? result) as unknown as AggRow[]) {
    map[row.dimension_key] = {
      amountUsd:      Number(row.total_amount_usd)      || 0,
      capacity:       Number(row.total_capacity)        || 0,
      headcount:      Number(row.total_headcount)       || 0,
      billedCapacity: Number(row.total_billed_capacity) || 0,
    };
  }
  return map;
}

// ── Variance computation ──────────────────────────────────────────────────────

function computeVariance(
  actuals: Record<string, Metrics>,
  budget: Record<string, Metrics>,
): VarianceRow[] {
  const allKeys = Array.from(new Set([...Object.keys(actuals), ...Object.keys(budget)]));
  const rows: VarianceRow[] = [];

  for (const key of allKeys) {
    const actual    = actuals[key]?.amountUsd ?? 0;
    const budgetVal = budget[key]?.amountUsd  ?? 0;
    const variance  = actual - budgetVal;
    const variancePct = budgetVal !== 0 ? (variance / Math.abs(budgetVal)) * 100 : null;
    // For cost-centre data: spending below budget is favorable
    const favorable = variance <= 0;

    rows.push({ dimensionKey: key, actual, budget: budgetVal, variance, variancePct, favorable });
  }

  return rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

// ── Markdown table builder ────────────────────────────────────────────────────

function buildMarkdownTable(rows: VarianceRow[]): string {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtPct = (n: number | null) =>
    n !== null ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` : 'N/A';

  const header = '| Dimension | Actual (USD) | Budget (USD) | Variance | Var% | Status |';
  const sep    = '|---|---|---|---|---|---|';
  const dataRows = rows.slice(0, 30).map((r) => {
    const sign   = r.variance >= 0 ? '+' : '';
    const status = r.variance === 0 ? '➖ Neutral' : r.favorable ? '✅ Fav' : '⚠️ Unfav';
    return `| ${r.dimensionKey} | ${fmt(r.actual)} | ${fmt(r.budget)} | ${sign}${fmt(r.variance)} | ${fmtPct(r.variancePct)} | ${status} |`;
  });

  return [header, sep, ...dataRows].join('\n');
}

// ── Template resolution ───────────────────────────────────────────────────────

function resolveTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

function formatPeriod(year: number, months: number[]): string {
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (months.length === 1) return `${names[months[0] - 1]} ${year}`;
  if (months.length === 3 && months[0] % 3 === 1)
    return `Q${Math.ceil(months[0] / 3)} ${year}`;
  return `${names[months[0] - 1]}–${names[months[months.length - 1] - 1]} ${year}`;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runBoardAnalysis(
  request: AnalysisRequest,
): Promise<CubeBoardReport> {
  const periodLabel = formatPeriod(request.year, request.months);

  // 1. Fetch actuals + budget in parallel
  const [actualsData, budgetData] = await Promise.all([
    fetchFactData(request.cubeId, request.columnMapping.actuals, request.year, request.months, request.dimensions),
    fetchFactData(request.cubeId, request.columnMapping.budget,  request.year, request.months, request.dimensions),
  ]);

  // 2. Compute variance
  const varianceRows   = computeVariance(actualsData, budgetData);
  const topUnfavorable = varianceRows.filter((r) => r.variance > 0).slice(0, 5);
  const topFavorable   = varianceRows.filter((r) => r.variance < 0).slice(0, 5);

  const totalActual   = Object.values(actualsData).reduce((s, r) => s + r.amountUsd, 0);
  const totalBudget   = Object.values(budgetData).reduce((s, r) => s + r.amountUsd, 0);
  const totalVariance = totalActual - totalBudget;
  const totalVarPct   = totalBudget !== 0
    ? ((totalVariance / Math.abs(totalBudget)) * 100).toFixed(1)
    : 'N/A';

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // 3. Resolve prompt placeholders
  const varianceTable = buildMarkdownTable(varianceRows);

  const templateVars: Record<string, string> = {
    period:              periodLabel,
    actuals_column:      request.columnMapping.actuals,
    budget_column:       request.columnMapping.budget,
    forecast_column:     request.columnMapping.forecast ?? 'N/A',
    variance_table:      varianceTable,
    actuals_table:       varianceTable,   // convenience alias
    budget_table:        varianceTable,   // convenience alias
    total_actual:        fmt(totalActual),
    total_budget:        fmt(totalBudget),
    total_variance:      `${totalVariance >= 0 ? '+' : ''}${fmt(totalVariance)}`,
    total_variance_pct:  `${totalVariance >= 0 ? '+' : ''}${totalVarPct}%`,
    top_unfavorable:     topUnfavorable.map((r, i) =>
      `${i + 1}. ${r.dimensionKey}: +${fmt(r.variance)} USD`).join('\n') || 'None',
    top_favorable:       topFavorable.map((r, i) =>
      `${i + 1}. ${r.dimensionKey}: ${fmt(r.variance)} USD`).join('\n') || 'None',
    dimensions:          request.dimensions.join(', '),
    data_rows_count:     String(varianceRows.length),
  };

  const resolvedUserPrompt = resolveTemplate(request.userPromptTemplate, templateVars)
    + (request.extraContext?.trim()
        ? `\n\n**Additional context from analyst:**\n${request.extraContext}`
        : '');

  // 4. Call LLM and collect full streamed response
  let rawAnalysis = '';
  try {
    for await (const chunk of streamFinancialAnalysis({
      query: resolvedUserPrompt,
      domainAiConfig: request.domainAiConfig,
    })) {
      rawAnalysis += chunk;
    }
  } catch (err) {
    rawAnalysis = `⚠️ Analysis generation failed: ${err instanceof Error ? err.message : String(err)}\n\nResolved prompt:\n${resolvedUserPrompt}`;
  }

  // 5. Persist report
  const result = await db
    .insert(cubeBoardReports)
    .values({
      boardId:          request.boardId,
      title:            `${periodLabel} — Variance Analysis`,
      periodLabel,
      year:             request.year,
      months:           request.months,
      columnMapping:    request.columnMapping,
      dimensions:       request.dimensions,
      userPromptFinal:  resolvedUserPrompt,
      rawAnalysis,
      status:           'complete',
    })
    .returning();

  return result[0];
}

// ── Helper: list available plan_type / version values for a cube ──────────────

export async function getCubeVersions(cubeId: string): Promise<string[]> {
  const result = await db.execute(
    sql`SELECT DISTINCT version FROM cube_fact_data WHERE cube_id = ${cubeId} AND version IS NOT NULL ORDER BY version`
  );
  return ((result.rows ?? result) as { version: string }[]).map((r) => r.version);
}
