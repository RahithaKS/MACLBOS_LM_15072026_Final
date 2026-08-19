import { sql } from "drizzle-orm";
import { db } from "../db";

type CubeSummary = {
  sourceRows: number;
  totalAmount: number;
  totalCapacity: number;
  totalHeadcount: number;
  versions: Array<{ label: string; value: number }>;
  categories: Array<{ label: string; value: number }>;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Produces a reproducible, data-only Board Studio result. It deliberately does
 * not ask a model to calculate amounts: any optional AI interpretation is
 * expected to consume this frozen result after the authoritative aggregation.
 */
export async function buildBoardStudioResult(
  cubeId: string,
  cubeName: string,
  templateName: string,
  isBalanceSheetAnalysis = false,
): Promise<Record<string, unknown>> {
  const overview = isBalanceSheetAnalysis
    ? await db.execute(sql`
      SELECT
        COUNT(*)::int AS source_rows,
        COALESCE(SUM(amount_usd), 0)::numeric AS total_amount,
        0::numeric AS total_capacity,
        0::numeric AS total_headcount
      FROM cube_plan_data
      WHERE cube_id = ${cubeId}
        AND statement_type = 'BS'
    `)
    : await db.execute(sql`
    SELECT
      COUNT(*)::int AS source_rows,
      COALESCE(SUM(amount_usd), 0)::numeric AS total_amount,
      COALESCE(SUM(capacity), 0)::numeric AS total_capacity,
      COALESCE(SUM(headcount), 0)::numeric AS total_headcount
    FROM cube_fact_data
    WHERE cube_id = ${cubeId}
  `);

  const byVersion = isBalanceSheetAnalysis
    ? await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(plan_type), ''), 'Unversioned') AS label,
        COALESCE(SUM(amount_usd), 0)::numeric AS value
      FROM cube_plan_data
      WHERE cube_id = ${cubeId} AND statement_type = 'BS'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8
    `)
    : await db.execute(sql`
    SELECT
      COALESCE(NULLIF(TRIM(version), ''), 'Unversioned') AS label,
      COALESCE(SUM(amount_usd), 0)::numeric AS value
    FROM cube_fact_data
    WHERE cube_id = ${cubeId}
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 8
  `);

  const byCategory = isBalanceSheetAnalysis
    ? await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(bs_category), ''), 'Unclassified') AS label,
        COALESCE(SUM(amount_usd), 0)::numeric AS value
      FROM cube_plan_data
      WHERE cube_id = ${cubeId} AND statement_type = 'BS'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10
    `)
    : await db.execute(sql`
    SELECT
      COALESCE(NULLIF(TRIM(cost_category), ''), 'Unclassified') AS label,
      COALESCE(SUM(amount_usd), 0)::numeric AS value
    FROM cube_fact_data
    WHERE cube_id = ${cubeId}
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  `);

  const headline = (overview.rows?.[0] ?? {}) as Record<string, unknown>;
  const summary: CubeSummary = {
    sourceRows: toNumber(headline.source_rows),
    totalAmount: toNumber(headline.total_amount),
    totalCapacity: toNumber(headline.total_capacity),
    totalHeadcount: toNumber(headline.total_headcount),
    versions: (byVersion.rows ?? []).map((row: any) => ({
      label: String(row.label),
      value: toNumber(row.value),
    })),
    categories: (byCategory.rows ?? []).map((row: any) => ({
      label: String(row.label),
      value: toNumber(row.value),
    })),
  };

  // Existing Enterprise Data Balance Sheet loads are retained in cube_plan_data
  // with statementType = BS. Use them only when the Cube has no generic fact
  // rows, preserving the existing KPI/CAPEX ingestion behavior.
  let sourceTable = isBalanceSheetAnalysis ? "cube_plan_data (Balance Sheet)" : "cube_fact_data";
  if (!isBalanceSheetAnalysis && summary.sourceRows === 0) {
    const planOverview = await db.execute(sql`
      SELECT
        COUNT(*)::int AS source_rows,
        COALESCE(SUM(amount_usd), 0)::numeric AS total_amount
      FROM cube_plan_data
      WHERE cube_id = ${cubeId}
        AND statement_type = 'BS'
    `);
    const planHeadline = (planOverview.rows?.[0] ?? {}) as Record<string, unknown>;
    const planRows = toNumber(planHeadline.source_rows);
    if (planRows > 0) {
      const planTypes = await db.execute(sql`
        SELECT COALESCE(NULLIF(TRIM(plan_type), ''), 'Unversioned') AS label,
               COALESCE(SUM(amount_usd), 0)::numeric AS value
        FROM cube_plan_data
        WHERE cube_id = ${cubeId} AND statement_type = 'BS'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 8
      `);
      const planCategories = await db.execute(sql`
        SELECT COALESCE(NULLIF(TRIM(bs_category), ''), 'Unclassified') AS label,
               COALESCE(SUM(amount_usd), 0)::numeric AS value
        FROM cube_plan_data
        WHERE cube_id = ${cubeId} AND statement_type = 'BS'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `);
      summary.sourceRows = planRows;
      summary.totalAmount = toNumber(planHeadline.total_amount);
      summary.versions = (planTypes.rows ?? []).map((row: any) => ({ label: String(row.label), value: toNumber(row.value) }));
      summary.categories = (planCategories.rows ?? []).map((row: any) => ({ label: String(row.label), value: toNumber(row.value) }));
      sourceTable = "cube_plan_data (Balance Sheet)";
    }
  }

  const hasRows = summary.sourceRows > 0;
  const basis = hasRows
    ? `${summary.sourceRows.toLocaleString()} governed fact rows`
    : "no governed fact rows";

  return {
    generatedBy: "deterministic-cube-aggregation",
    dataBasis: {
      cubeId,
      cubeName,
      templateName,
      sourceTable,
      sourceRows: summary.sourceRows,
      calculatedAt: new Date().toISOString(),
    },
    executiveSummary: hasRows
      ? `${templateName} uses ${basis} from the authorized ${cubeName} Enterprise Cube. All displayed values are deterministic aggregates of the Cube source data.`
      : `${templateName} is connected to ${cubeName}, but the authorized Cube has no fact rows available for analysis yet.`,
    kpis: [
      { label: "Source rows", value: summary.sourceRows.toLocaleString(), format: "number" },
      { label: "Amount (USD)", value: summary.totalAmount, format: "currency" },
      { label: "Capacity", value: summary.totalCapacity, format: "number" },
      { label: "Headcount", value: summary.totalHeadcount, format: "number" },
    ],
    charts: [
      { title: "Amount by version", type: "bar", data: summary.versions },
      { title: "Top cost categories", type: "bar", data: summary.categories },
    ],
    tables: [
      {
        title: "Amount by version",
        columns: ["Version", "Amount (USD)"],
        rows: summary.versions.map((item) => [item.label, item.value]),
      },
      {
        title: "Top cost categories",
        columns: ["Cost category", "Amount (USD)"],
        rows: summary.categories.map((item) => [item.label, item.value]),
      },
    ],
    insights: hasRows
      ? [
          "Figures are calculated directly from the selected Enterprise Cube.",
          "Use Cube governance and access assignments to control the data that can be analyzed.",
        ]
      : [
          "Complete Enterprise Data ingestion for this Cube before running a financial interpretation.",
        ],
    risks: hasRows
      ? []
      : ["No governed Cube facts were available at the time this report was generated."],
  };
}