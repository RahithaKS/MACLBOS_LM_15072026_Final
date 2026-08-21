import { sql } from "drizzle-orm";
import { db } from "../db";

export const KPI_METRICS = [
  { id: "revenue", label: "Budget / Revenue", unit: "mUSD" },
  { id: "internal_utilization", label: "Internal Utilization", unit: "percent" },
  { id: "external_utilization", label: "External Utilization", unit: "percent" },
  { id: "capacity", label: "Capacity", unit: "capacity" },
] as const;

export type KpiMetricId = (typeof KPI_METRICS)[number]["id"];

export interface KpiReportRequest {
  cubeId: string;
  year: number;
  month: number;
  entity?: string;
  forecastScenario: string;
}

type AggregateRow = {
  revenue_value: string | number | null;
  revenue_rows: string | number | null;
  internal_value: string | number | null;
  internal_rows: string | number | null;
  external_value: string | number | null;
  external_rows: string | number | null;
  capacity_value: string | number | null;
  capacity_rows: string | number | null;
};

const ALL_ENTITIES_LABEL = "All entities";
const ACTUAL_VERSION_PREDICATE = sql`(version IS NULL OR trim(version) = '')`;
const ENTITY_PAGE_PREDICATE = sql`
  upper(regexp_replace(trim(coalesce(page, '')), '\\s+', ' ', 'g'))
    IN ('ENTITY', 'ENTITY VIEW')
`;
const UTILIZATION_PAGE_PREDICATE = sql`
  upper(regexp_replace(trim(coalesce(page, '')), '\\s+', ' ', 'g'))
    IN ('MS VIEW')
`;
const numericText = (column: "cost_value" | "value_percent") => sql.raw(
  `CASE WHEN replace(trim(coalesce(${column}, '')), ',', '') ~ '^-?(?:\\d+\\.?\\d*|\\.\\d+)$'
    THEN replace(trim(${column}), ',', '')::numeric END`,
);

function rowsOf(result: unknown): any[] {
  return (result as { rows?: any[] }).rows ?? [];
}

function numeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueOrNull(value: number | null, rowCount: number | null): number | null {
  return rowCount && rowCount > 0 ? value : null;
}

function normalizedEntity(entity?: string): string | null {
  const value = entity?.trim();
  return value ? value.toUpperCase() : null;
}

function actualEntityPredicate(entity?: string) {
  const selected = normalizedEntity(entity);
  if (selected) {
    if (selected === "WORLD WIDE" || selected === "WORLWIDE") {
      return sql`upper(trim(coalesce(region_entity, ''))) IN ('WORLD WIDE', 'WORLWIDE')`;
    }
    return sql`upper(trim(coalesce(region_entity, ''))) = ${selected}`;
  }
  // "All entities" intentionally includes unassigned source rows but excludes
  // the dedicated World Wide aggregate so it is not double-counted.
  return sql`upper(trim(coalesce(region_entity, ''))) NOT IN ('WORLD WIDE', 'WORLWIDE')`;
}

function forecastEntityPredicate(entity?: string) {
  const selected = normalizedEntity(entity);
  if (selected) {
    if (selected === "WORLD WIDE" || selected === "WORLWIDE") {
      return sql`upper(trim(coalesce(entity, ''))) IN ('WORLD WIDE', 'WORLWIDE')`;
    }
    return sql`upper(trim(coalesce(entity, ''))) = ${selected}`;
  }
  return sql`upper(trim(coalesce(entity, ''))) NOT IN ('WORLD WIDE', 'WORLWIDE')`;
}

function forecastScenarioPredicate(scenario: string) {
  if (scenario === "YTD Forecast") {
    return sql`lower(trim(plan_type)) = 'ytd forecast'`;
  }
  return sql`upper(trim(plan_type)) LIKE ${`${scenario.toUpperCase()} %`}`;
}

function safeScenario(scenario: string): string {
  const normalized = scenario.trim().toUpperCase();
  if (normalized === "YTD FORECAST") return "YTD Forecast";
  if (/^CF(02|05|09|11)$/.test(normalized)) return normalized;
  throw new Error("Forecast scenario must be YTD Forecast, CF02, CF05, CF09, or CF11.");
}

export function validateKpiReportRequest(payload: unknown): KpiReportRequest {
  const request = payload as Partial<KpiReportRequest>;
  const year = Number(request.year);
  const month = Number(request.month);
  if (!request.cubeId || typeof request.cubeId !== "string") {
    throw new Error("A KPI cube is required.");
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Select a valid reporting year.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Select a reporting month.");
  }
  return {
    cubeId: request.cubeId,
    year,
    month,
    entity: request.entity?.trim() || undefined,
    forecastScenario: safeScenario(String(request.forecastScenario || "YTD Forecast")),
  };
}

export async function getKpiReportOptions(cubeId: string) {
  const [yearsResult, entityResult, scenarioResult, actualResult] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT year
      FROM cube_plan_data
      WHERE cube_id = ${cubeId} AND year IS NOT NULL
      ORDER BY year DESC
    `),
    db.execute(sql`
      SELECT DISTINCT trim(entity) AS entity
      FROM cube_plan_data
      WHERE cube_id = ${cubeId}
        AND entity IS NOT NULL
        AND trim(entity) <> ''
        AND ${ENTITY_PAGE_PREDICATE}
      ORDER BY entity
    `),
    db.execute(sql`
      SELECT DISTINCT upper(substring(trim(plan_type) FROM '^(CF02|CF05|CF09|CF11)')) AS scenario
      FROM cube_plan_data
      WHERE cube_id = ${cubeId}
        AND upper(trim(plan_type)) ~ '^(CF02|CF05|CF09|CF11)\\s+\\d{4}$'
      ORDER BY scenario
    `),
    db.execute(sql`
      SELECT EXISTS(
        SELECT 1 FROM cube_fact_data
        WHERE cube_id = ${cubeId} AND ${ACTUAL_VERSION_PREDICATE}
      ) AS actual_available
    `),
  ]);

  const forecastScenarios = [
    "YTD Forecast",
    ...rowsOf(scenarioResult).map((row) => String(row.scenario)).filter(Boolean),
  ];
  return {
    years: rowsOf(yearsResult).map((row) => Number(row.year)).filter(Number.isFinite),
    entities: rowsOf(entityResult).map((row) => String(row.entity)).filter(Boolean),
    forecastScenarios: Array.from(new Set(forecastScenarios)),
    defaultForecastScenario: "YTD Forecast",
    actualAvailable: Boolean(rowsOf(actualResult)[0]?.actual_available),
  };
}

async function runKpiMetricSnapshot(request: KpiReportRequest) {
  const actualEntity = actualEntityPredicate(request.entity);
  const forecastEntity = forecastEntityPredicate(request.entity);
  const scenario = forecastScenarioPredicate(request.forecastScenario);

  const [actualResult, forecastResult] = await Promise.all([
    db.execute(sql`
      SELECT
        SUM(CASE WHEN cost_category = 'Revenue' THEN amount_usd END) / 1000000.0 AS revenue_value,
        COUNT(*) FILTER (WHERE cost_category = 'Revenue' AND amount_usd IS NOT NULL) AS revenue_rows,
        SUM(billed_capacity) FILTER (
          WHERE cost_category = 'Billing Utilization'
            AND lower(trim(coalesce(resource_type, ''))) = 'internal'
        ) / NULLIF(SUM(allocated_capacity) FILTER (
          WHERE cost_category = 'Billing Utilization'
            AND lower(trim(coalesce(resource_type, ''))) = 'internal'
        ), 0) AS internal_value,
        COUNT(*) FILTER (
          WHERE cost_category = 'Billing Utilization'
            AND lower(trim(coalesce(resource_type, ''))) = 'internal'
            AND allocated_capacity IS NOT NULL
        ) AS internal_rows,
        SUM(billed_capacity) FILTER (
          WHERE cost_category = 'Billing Utilization'
            AND lower(trim(coalesce(resource_type, ''))) = 'external'
        ) / NULLIF(SUM(allocated_capacity) FILTER (
          WHERE cost_category = 'Billing Utilization'
            AND lower(trim(coalesce(resource_type, ''))) = 'external'
        ), 0) AS external_value,
        COUNT(*) FILTER (
          WHERE cost_category = 'Billing Utilization'
            AND lower(trim(coalesce(resource_type, ''))) = 'external'
            AND allocated_capacity IS NOT NULL
        ) AS external_rows,
        SUM(capacity) FILTER (WHERE cost_category = 'GB Wise END Capacity') AS capacity_value,
        COUNT(*) FILTER (
          WHERE cost_category = 'GB Wise END Capacity' AND capacity IS NOT NULL
        ) AS capacity_rows
      FROM cube_fact_data
      WHERE cube_id = ${request.cubeId}
        AND year = ${request.year}
        AND month = ${request.month}
        AND ${ACTUAL_VERSION_PREDICATE}
        AND ${actualEntity}
    `),
    db.execute(sql`
      SELECT
        SUM(${numericText("cost_value")}) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) = 'budget (musd)'
        ) AS revenue_value,
        COUNT(*) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) = 'budget (musd)'
            AND ${numericText("cost_value")} IS NOT NULL
        ) AS revenue_rows,
        AVG(${numericText("value_percent")}) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) = 'internal utilization (%)'
        ) AS internal_value,
        COUNT(*) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) = 'internal utilization (%)'
            AND ${numericText("value_percent")} IS NOT NULL
        ) AS internal_rows,
        AVG(${numericText("value_percent")}) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) = 'outsourcing utilization (%)'
        ) AS external_value,
        COUNT(*) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) = 'outsourcing utilization (%)'
            AND ${numericText("value_percent")} IS NOT NULL
        ) AS external_rows,
        SUM(${numericText("cost_value")}) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) IN (
            'offshore capacity', 'outsourcing capacity', 'onsite capacity'
          )
          AND lower(trim(coalesce(sub_category, ''))) = 'end'
        ) AS capacity_value,
        COUNT(*) FILTER (
          WHERE lower(trim(coalesce(particulars, ''))) IN (
            'offshore capacity', 'outsourcing capacity', 'onsite capacity'
          )
          AND lower(trim(coalesce(sub_category, ''))) = 'end'
          AND ${numericText("cost_value")} IS NOT NULL
        ) AS capacity_rows
      FROM cube_plan_data
      WHERE cube_id = ${request.cubeId}
        AND year = ${request.year}
        AND month = ${request.month}
        AND ${scenario}
        AND ${forecastEntity}
        AND (
          (
            ${ENTITY_PAGE_PREDICATE}
            AND lower(trim(coalesce(particulars, ''))) IN (
              'budget (musd)', 'offshore capacity', 'outsourcing capacity', 'onsite capacity'
            )
          )
          OR (
            ${UTILIZATION_PAGE_PREDICATE}
            AND lower(trim(coalesce(particulars, ''))) IN (
              'internal utilization (%)', 'outsourcing utilization (%)'
            )
          )
        )
    `),
  ]);

  const actual = (rowsOf(actualResult)[0] ?? {}) as AggregateRow;
  const forecast = (rowsOf(forecastResult)[0] ?? {}) as AggregateRow;
  const warnings: string[] = [];
  const metricValue = (row: AggregateRow, field: keyof AggregateRow) => numeric(row[field]);
  const metricRows = (row: AggregateRow, field: keyof AggregateRow) => numeric(row[field]) ?? 0;
  const actualLabel = "Anaplan actuals · unversioned actual export rows";
  const forecastLabel = `MBR workbook · ${request.forecastScenario}`;

  const metrics = KPI_METRICS.map((definition) => {
    const field = definition.id === "revenue"
      ? "revenue"
      : definition.id === "internal_utilization"
        ? "internal"
        : definition.id === "external_utilization"
          ? "external"
          : "capacity";
    const actualRows = metricRows(actual, `${field}_rows` as keyof AggregateRow);
    const forecastRows = metricRows(forecast, `${field}_rows` as keyof AggregateRow);
    const actualValue = valueOrNull(
      metricValue(actual, `${field}_value` as keyof AggregateRow),
      actualRows,
    );
    const forecastValue = valueOrNull(
      metricValue(forecast, `${field}_value` as keyof AggregateRow),
      forecastRows,
    );
    if (actualValue === null) warnings.push(`${definition.label}: no mapped Anaplan actual rows for this period and entity scope.`);
    if (forecastValue === null) warnings.push(`${definition.label}: no MBR forecast rows for this period, scenario, and entity scope.`);
    const variance = actualValue !== null && forecastValue !== null ? actualValue - forecastValue : null;
    return {
      ...definition,
      actual: actualValue,
      forecast: forecastValue,
      variance,
      variancePercent: variance !== null && forecastValue !== null && forecastValue !== 0
        ? variance / forecastValue
        : null,
      actualSourceRows: actualRows,
      forecastSourceRows: forecastRows,
      remarks: definition.id === "capacity"
        ? ["Forecast capacity is the End-of-month sum of Offshore, Outsourcing, and Onsite Capacity."]
        : definition.id.includes("utilization")
          ? ["Actual utilization is billed capacity ÷ allocated capacity; forecast values are source-provided percentages."]
          : ["Actual revenue uses Anaplan Revenue rows; forecast uses MBR Budget (mUSD) source values."],
    };
  });

  return {
    metrics,
    warnings: Array.from(new Set(warnings)),
  };
}

const BUSINESS_METRICS_SCOPES = [
  { id: "global", label: "World Wide (Global)", code: "WW", entity: "World Wide" },
  { id: "india", label: "India (BGSW)", code: "IN", entity: "BGSW" },
  { id: "vietnam", label: "Vietnam (BGSV)", code: "VN", entity: "BGSV" },
  { id: "mexico", label: "Mexico (NE-MX)", code: "MX", entity: "NE-MX" },
] as const;

type BusinessMetricsScope = (typeof BUSINESS_METRICS_SCOPES)[number];
type KpiSnapshot = Awaited<ReturnType<typeof runKpiMetricSnapshot>>;

function displayKpiValue(value: number, unit: (typeof KPI_METRICS)[number]["unit"]): string {
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (unit === "capacity") return `${Math.round(value).toLocaleString()} HC`;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mUSD`;
}

function comparisonUnit(unit: (typeof KPI_METRICS)[number]["unit"]): string {
  if (unit === "percent") return "percentage points";
  if (unit === "capacity") return "HC";
  return "mUSD";
}

function narrativeLine(
  scope: BusinessMetricsScope,
  metric: KpiSnapshot["metrics"][number] | undefined,
): string {
  if (!metric || metric.actual === null || metric.forecast === null || metric.variance === null) {
    return `${scope.label}: no complete governed Actual-versus-Forecast comparison is available for this period.`;
  }
  if (metric.variance === 0) {
    return `${scope.label}: Actual ${displayKpiValue(metric.actual, metric.unit)} is in line with forecast ${displayKpiValue(metric.forecast, metric.unit)}.`;
  }
  const direction = metric.variance > 0 ? "higher" : "lower";
  return `${scope.label}: Actual ${displayKpiValue(metric.actual, metric.unit)} is ${direction} by ${displayKpiValue(Math.abs(metric.variance), metric.unit === "percent" ? "percent" : metric.unit).replace("%", ` ${comparisonUnit(metric.unit)}`)} compared with forecast ${displayKpiValue(metric.forecast, metric.unit)}.`;
}

function buildBusinessMetricsNarrative(
  scopeSnapshots: { scope: BusinessMetricsScope; snapshot: KpiSnapshot }[],
  phaseTwoPeriod: string,
) {
  const metricSections = KPI_METRICS.map((definition) => {
    const lines = scopeSnapshots.map(({ scope, snapshot }) =>
      narrativeLine(scope, snapshot.metrics.find((metric) => metric.id === definition.id)),
    );
    return {
      id: definition.id,
      title: definition.id === "capacity" ? "Capacity (Internal + External)" : definition.label,
      status: "in_scope" as const,
      summary: lines[0],
      lines: lines.slice(1),
    };
  });

  return [
    ...metricSections,
    {
      id: "ebit",
      title: "EBIT",
      status: "phase_2" as const,
      summary: `Out of scope for ${phaseTwoPeriod} — planned for Phase 2.`,
      lines: ["No EBIT number is displayed until an approved governed source mapping and definition are available."],
    },
    {
      id: "capex",
      title: "Capex",
      status: "phase_2" as const,
      summary: `Out of scope for ${phaseTwoPeriod} — planned for Phase 2.`,
      lines: ["No Capex number is displayed until an approved governed source mapping and definition are available."],
    },
  ];
}

/**
 * Builds a deterministic report snapshot. The current board selection remains
 * the headline KPI set, while the fixed Business Metrics panel carries the
 * governed World Wide, BGSW, BGSV, and NE-MX comparisons side-by-side.
 */
export async function runKpiReport(request: KpiReportRequest) {
  const selectedSnapshot = await runKpiMetricSnapshot(request);
  const requestedEntity = normalizedEntity(request.entity);
  const scopeSnapshots = await Promise.all(
    BUSINESS_METRICS_SCOPES.map(async (scope) => ({
      scope,
      snapshot: requestedEntity === normalizedEntity(scope.entity)
        ? selectedSnapshot
        : await runKpiMetricSnapshot({ ...request, entity: scope.entity }),
    })),
  );
  const warnings = Array.from(new Set([
    ...selectedSnapshot.warnings,
    ...scopeSnapshots.flatMap(({ snapshot }) => snapshot.warnings),
  ]));
  const periodLabel = new Date(Date.UTC(request.year, request.month - 1, 1)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const phaseTwoPeriod = new Date(Date.UTC(request.year, request.month - 1, 1)).toLocaleDateString("en-US", {
    year: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

  return {
    periodLabel,
    entityLabel: request.entity || ALL_ENTITIES_LABEL,
    forecastScenario: request.forecastScenario,
    actualSourceLabel: "Anaplan actuals · unversioned actual export rows",
    forecastSourceLabel: `MBR workbook · ${request.forecastScenario}`,
    metrics: selectedSnapshot.metrics,
    warnings,
    scopeBadges: scopeSnapshots.map(({ scope, snapshot }) => ({
      ...scope,
      status: "in_scope" as const,
      metrics: snapshot.metrics,
    })),
    narrative: buildBusinessMetricsNarrative(scopeSnapshots, phaseTwoPeriod),
  };
}

export async function saveKpiReport(
  userId: string,
  title: string,
  request: KpiReportRequest,
  report: unknown,
) {
  const result = await db.execute(sql`
    INSERT INTO cube_kpi_reports (cube_id, user_id, title, request, report)
    VALUES (
      ${request.cubeId},
      ${userId},
      ${title},
      ${JSON.stringify(request)}::jsonb,
      ${JSON.stringify(report)}::jsonb
    )
    RETURNING id, cube_id, title, request, report, created_at
  `);
  return rowsOf(result)[0];
}

export async function listSavedKpiReports(userId: string) {
  const result = await db.execute(sql`
    SELECT id, cube_id, title, request, report, created_at
    FROM cube_kpi_reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return rowsOf(result);
}