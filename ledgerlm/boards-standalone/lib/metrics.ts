import type {
  BalanceSheetReport,
  ChartSpec,
  ComparisonBasis,
  DataSource,
  TimeGranularity,
} from "./types";
import { rollUpBalanceSheet, resolveUnits } from "./balanceSheetRollup";

// Deterministic metric precomputation. The analysis model is good at
// interpretation but unreliable at arithmetic, so every derived figure
// (aggregates, margins, growth rates, ratios) is computed here and handed to
// the prompt as authoritative numbers.

type Row = Record<string, string | number>;
type Source = Pick<DataSource, "name" | "description" | "records">;

/** Column names treated as time periods (finest-granularity-first preference). */
export const PERIOD_KEYS = ["period", "date", "month", "quarter", "year"];

function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function pct(part: number, whole: number): number | null {
  return whole === 0 ? null : round((part / whole) * 100);
}

function growthPct(later: number, earlier: number): number | null {
  return earlier === 0 ? null : round(((later - earlier) / Math.abs(earlier)) * 100);
}

function fmt(n: number | null): string {
  return n === null ? "n/a" : `${n}`;
}

export function findPeriodKey(records: Row[]): string | null {
  const keys = Object.keys(records[0] ?? {});
  // Prefer the finest time granularity when several period columns exist
  // (e.g. separate Year and Month columns → Month-level beats Year-level).
  for (const pref of PERIOD_KEYS) {
    const hit = keys.find((k) => k.toLowerCase() === pref);
    if (hit) return hit;
  }
  // Fall back to the first column whose values are non-numeric strings.
  return keys.find((k) => records.every((r) => typeof r[k] === "string")) ?? null;
}

/**
 * Re-key the period column to the requested granularity. Coarser levels
 * (quarterly/yearly) work by rewriting period values (e.g. "2026-03" →
 * "2026-Q1"); downstream aggregation then groups rows automatically. Values
 * that cannot be mapped (e.g. yearly data asked for monthly) keep their
 * original period.
 */
export function applyTimeGranularity(
  records: Row[],
  granularity?: TimeGranularity | null,
): Row[] {
  if (!granularity || granularity === "auto" || !records.length) return records;
  const periodKey = findPeriodKey(records);
  if (!periodKey) return records;
  const transform = (value: string | number): string | null => {
    const s = String(value).trim();
    const md = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/); // YYYY-MM[-DD]
    const qd = s.match(/^(\d{4})[-\s]?Q([1-4])$/i);
    const yd = s.match(/^\d{4}$/);
    if (granularity === "yearly") {
      if (md) return md[1];
      if (qd) return qd[1];
      if (yd) return s;
    } else if (granularity === "quarterly") {
      if (md) return `${md[1]}-Q${Math.ceil(parseInt(md[2], 10) / 3)}`;
      if (qd) return `${qd[1]}-Q${qd[2]}`;
    } else if (granularity === "monthly") {
      if (md) return `${md[1]}-${md[2].padStart(2, "0")}`;
    }
    return null;
  };
  return records.map((r) => {
    const t = transform(r[periodKey]);
    return t === null ? r : { ...r, [periodKey]: t };
  });
}

/**
 * When a dataset has separate Year and Month columns, synthesize a combined
 * "Period" column (e.g. "2026-03") so period grouping is monthly AND does not
 * merge the same month across different years.
 */
export function addCompositePeriod(records: Row[]): Row[] {
  if (!records.length) return records;
  const keys = Object.keys(records[0]);
  if (keys.some((k) => k.toLowerCase() === "period")) return records;
  const yearKey = keys.find((k) => k.toLowerCase() === "year");
  const monthKey = keys.find((k) => k.toLowerCase() === "month");
  if (!yearKey || !monthKey) return records;
  return records.map((r) => ({
    Period: `${r[yearKey]}-${String(r[monthKey]).padStart(2, "0")}`,
    ...r,
  }));
}

function numericKeys(records: Row[], periodKey: string | null): string[] {
  const keys = Object.keys(records[0] ?? {});
  return keys.filter(
    (k) => k !== periodKey && records.every((r) => typeof r[k] === "number"),
  );
}

/** Sum a numeric column across rows. */
function sum(rows: Row[], key: string): number {
  return rows.reduce((acc, r) => acc + (r[key] as number), 0);
}

/** Group monthly rows ("YYYY-MM") into quarters ("YYYY-Qn") summing numeric columns. */
function quarterlyRollup(records: Row[], periodKey: string, numCols: string[]): Row[] | null {
  if (!records.every((r) => /^\d{4}-\d{2}$/.test(String(r[periodKey])))) return null;
  const groups = new Map<string, Row[]>();
  for (const r of records) {
    const [y, m] = String(r[periodKey]).split("-").map(Number);
    const q = `${y}-Q${Math.ceil(m / 3)}`;
    if (!groups.has(q)) groups.set(q, []);
    groups.get(q)!.push(r);
  }
  return [...groups.entries()].map(([q, rows]) => {
    const out: Row = { [periodKey]: q, months_in_period: rows.length };
    for (const c of numCols) out[c] = round(sum(rows, c), 2);
    return out;
  });
}

function col(records: Row[], key: string): number[] {
  return records.map((r) => r[key] as number);
}

function has(records: Row[], ...keys: string[]): boolean {
  return keys.every((k) => typeof records[0]?.[k] === "number");
}

/** True when every row has a distinct period value (one row per period). */
function periodsAreUnique(records: Row[], periodKey: string | null): boolean {
  if (!periodKey) return true;
  const seen = new Set<string>();
  for (const r of records) {
    const p = String(r[periodKey]);
    if (seen.has(p)) return false;
    seen.add(p);
  }
  return true;
}

/**
 * Per-column trend stats over the whole series. `yoyLag` = periods per year.
 * Change columns compare adjacent rows, so they are only emitted when rows are
 * one-per-period (`withChanges`) — otherwise they'd compare unrelated rows
 * (e.g. two entities within the same month).
 */
function columnStats(
  records: Row[],
  periodKey: string | null,
  numCols: string[],
  yoyLag = 12,
  withChanges = true,
): string {
  const changeHead = withChanges ? ` last vs prior | last vs ${yoyLag} periods ago |` : "";
  const lines: string[] = [
    `| column | first | last | min | max | total |${changeHead}`,
    `|---|---|---|---|---|---|${withChanges ? "---|---|" : ""}`,
  ];
  for (const c of numCols) {
    const v = col(records, c);
    const n = v.length;
    let changeCells = "";
    if (withChanges) {
      const yoy = n >= yoyLag + 1 ? growthPct(v[n - 1], v[n - 1 - yoyLag]) : null;
      const pop = n >= 2 ? growthPct(v[n - 1], v[n - 2]) : null;
      changeCells = ` ${pop === null ? "n/a" : pop + "%"} | ${yoy === null ? "n/a" : yoy + "%"} |`;
    }
    // Loop-based min/max — Math.min(...v) overflows the call stack on
    // datasets beyond ~65k rows.
    let min = Infinity;
    let max = -Infinity;
    for (const x of v) {
      if (x < min) min = x;
      if (x > max) max = x;
    }
    lines.push(
      `| ${c} | ${round(v[0], 2)} | ${round(v[n - 1], 2)} | ${round(min, 2)} | ${round(max, 2)} | ${round(sum(records, c), 2)} |${changeCells}`,
    );
  }
  return lines.join("\n");
}

/** P&L-specific derived metrics per period row. */
function pnlMetrics(rows: Row[], periodKey: string, label: string): string | null {
  if (!has(rows, "revenue")) return null;
  const expenseCols = ["cogs", "salaries", "marketing", "rent_admin", "other_opex"].filter((c) =>
    has(rows, c),
  );
  const lines: string[] = [];
  const header = ["period", "revenue"];
  if (has(rows, "gross_profit")) header.push("gross margin %");
  if (has(rows, "ebitda")) header.push("EBITDA margin %");
  if (has(rows, "net_profit")) header.push("net margin %");
  for (const c of expenseCols) header.push(`${c} % of rev`);
  header.push("revenue growth % vs prior");
  lines.push(`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`);

  rows.forEach((r, i) => {
    const rev = r.revenue as number;
    const cells: string[] = [String(r[periodKey]), `${round(rev, 2)}`];
    if (has(rows, "gross_profit")) cells.push(fmt(pct(r.gross_profit as number, rev)));
    if (has(rows, "ebitda")) cells.push(fmt(pct(r.ebitda as number, rev)));
    if (has(rows, "net_profit")) cells.push(fmt(pct(r.net_profit as number, rev)));
    for (const c of expenseCols) cells.push(fmt(pct(r[c] as number, rev)));
    cells.push(i === 0 ? "n/a" : fmt(growthPct(rev, rows[i - 1].revenue as number)));
    lines.push(`| ${cells.join(" | ")} |`);
  });
  return `**${label} P&L metrics (computed):**\n${lines.join("\n")}`;
}

/** Balance-sheet ratios per snapshot. */
function balanceSheetMetrics(rows: Row[], periodKey: string): string | null {
  if (!has(rows, "total_assets", "total_liabilities", "equity")) return null;
  const lines = [
    "| period | debt-to-equity | working capital | current ratio | equity growth % vs prior |",
    "|---|---|---|---|---|",
  ];
  rows.forEach((r, i) => {
    const debt =
      (has(rows, "short_term_debt") ? (r.short_term_debt as number) : 0) +
      (has(rows, "long_term_debt") ? (r.long_term_debt as number) : 0);
    const dToE = r.equity === 0 ? null : round(debt / (r.equity as number), 2);
    let wc: number | null = null;
    let cr: number | null = null;
    if (has(rows, "cash", "receivables", "inventory", "payables", "short_term_debt")) {
      const ca = (r.cash as number) + (r.receivables as number) + (r.inventory as number);
      const cl = (r.payables as number) + (r.short_term_debt as number);
      wc = round(ca - cl, 2);
      cr = cl === 0 ? null : round(ca / cl, 2);
    }
    const eqG = i === 0 ? null : growthPct(r.equity as number, rows[i - 1].equity as number);
    lines.push(
      `| ${r[periodKey]} | ${fmt(dToE)} | ${fmt(wc)} | ${fmt(cr)} | ${eqG === null ? "n/a" : eqG + "%"} |`,
    );
  });
  return `**Balance sheet ratios (computed):**\n${lines.join("\n")}`;
}

/** Cashflow burn / runway metrics. */
function cashflowMetrics(rows: Row[]): string | null {
  if (!has(rows, "net_cash_movement", "closing_cash")) return null;
  const n = rows.length;
  const last3 = rows.slice(-3);
  const avg3 = round(sum(last3, "net_cash_movement") / last3.length, 2);
  const closing = rows[n - 1].closing_cash as number;
  const runway =
    avg3 < 0 ? `${round(closing / Math.abs(avg3), 1)} periods at trailing-3-period burn` : "n/a (cash positive on trailing 3 periods)";
  return [
    "**Cashflow metrics (computed):**",
    `- Closing cash, latest period: ${round(closing, 2)}`,
    `- Net cash movement, trailing 3-period average: ${avg3}`,
    `- Implied runway: ${runway}`,
    `- Periods with negative net cash movement: ${rows.filter((r) => (r.net_cash_movement as number) < 0).length} of ${n}`,
  ].join("\n");
}

/**
 * Deterministic variance analysis over the user-selected key columns.
 * Convention: the first key column is the primary measure (e.g. Actuals);
 * every other key column is a comparison basis (Budget, Forecast, …).
 */
export function computeVarianceBlock(
  source: Source,
  keyColumns: { column: string; label: string }[],
  thresholdPct = 5,
): string {
  const records = source.records;
  if (!records.length || keyColumns.length < 2) return "";
  const periodKey = findPeriodKey(records);
  const numCols = numericKeys(records, periodKey);

  const valid = keyColumns.filter((k) => numCols.includes(k.column));
  if (valid.length < 2) return "";
  const [primary, ...comparisons] = valid;

  const parts: string[] = [
    `## Pre-computed variance analysis — ${source.name}`,
    `Primary measure: **${primary.label}** (\`${primary.column}\`). All variances are computed as primary minus comparison; % variance is relative to the comparison value. Whether a variance is favourable depends on the measure type (revenue-like: positive = favourable; cost-like: positive = adverse).`,
  ];

  // Row-level data (multiple rows per period, e.g. one per employee/project)
  // must be aggregated to period totals first — otherwise "per-period"
  // variance rows would actually be per-record rows.
  let varRecords = records;
  if (periodKey && !periodsAreUnique(records, periodKey)) {
    const byPeriod = new Map<string, Row[]>();
    for (const r of records) {
      const p = String(r[periodKey]);
      if (!byPeriod.has(p)) byPeriod.set(p, []);
      byPeriod.get(p)!.push(r);
    }
    varRecords = [...byPeriod.entries()].map(([p, rs]) => {
      const row: Row = { [periodKey]: p };
      for (const kc of valid) row[kc.column] = round(sum(rs, kc.column), 2);
      return row;
    });
    parts.push(
      `Note: the dataset has multiple rows per ${periodKey} (${records.length} rows across ${varRecords.length} periods). Each period row below is the SUM across all rows in that period.`,
    );
  }

  const MAX_VARIANCE_ROWS = 48;
  for (const comp of comparisons) {
    const rowLines: string[] = [];
    let totalP = 0;
    let totalC = 0;
    let breaches = 0;
    let largest: { period: string; variance: number } | null = null;
    varRecords.forEach((r, i) => {
      const p = r[primary.column] as number;
      const c = r[comp.column] as number;
      const v = round(p - c, 2);
      const vPct = pct(p - c, Math.abs(c));
      totalP += p;
      totalC += c;
      if (vPct !== null && Math.abs(vPct) > thresholdPct) breaches++;
      if (!largest || Math.abs(v) > Math.abs(largest.variance)) {
        largest = { period: String(periodKey ? r[periodKey] : i + 1), variance: v };
      }
      rowLines.push(
        `| ${periodKey ? r[periodKey] : i + 1} | ${round(p, 2)} | ${round(c, 2)} | ${v} | ${fmt(vPct)}% | ${
          vPct !== null && Math.abs(vPct) > thresholdPct ? "YES" : "no"
        } |`,
      );
    });
    // Bound the table for large datasets — totals always cover every row.
    let bodyLines = rowLines;
    if (rowLines.length > MAX_VARIANCE_ROWS) {
      const half = MAX_VARIANCE_ROWS / 2;
      bodyLines = [
        ...rowLines.slice(0, half),
        `| … | … | … | … | … | (${rowLines.length - MAX_VARIANCE_ROWS} rows omitted — totals below cover ALL rows) |`,
        ...rowLines.slice(-half),
      ];
    }
    const totalV = round(totalP - totalC, 2);
    const lines = [
      `| period | ${primary.label} | ${comp.label} | variance | variance % | breach ±${thresholdPct}% |`,
      "|---|---|---|---|---|---|",
      ...bodyLines,
      `| **TOTAL** | ${round(totalP, 2)} | ${round(totalC, 2)} | ${totalV} | ${fmt(pct(totalP - totalC, Math.abs(totalC)))}% | ${breaches} rows breach |`,
    ];
    parts.push(
      `**${primary.label} vs ${comp.label}:**\n${lines.join("\n")}\nLargest single-period variance: ${largest!.variance} in ${largest!.period}.`,
    );
  }

  // Period-over-period movement of the primary measure over (aggregated)
  // period totals.
  const v = col(varRecords, primary.column);
  if (v.length >= 2 && v.length <= 60 && periodKey) {
    const popLines = [
      `| period | ${primary.label} | change vs prior | change % |`,
      "|---|---|---|---|",
    ];
    varRecords.forEach((r, i) => {
      const change = i === 0 ? null : round(v[i] - v[i - 1], 2);
      popLines.push(
        `| ${r[periodKey]} | ${round(v[i], 2)} | ${change === null ? "n/a" : change} | ${
          i === 0 ? "n/a" : fmt(growthPct(v[i], v[i - 1]))
        }% |`,
      );
    });
    parts.push(`**${primary.label} period-over-period movement:**\n${popLines.join("\n")}`);
  }

  return parts.join("\n\n");
}

/** Sum a measure per period, in the order periods first appear. */
function totalsByPeriod(
  records: Row[],
  periodKey: string,
  column: string,
): { x: string; y: number }[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const p = String(r[periodKey]);
    const v = Number(r[column]);
    if (!Number.isFinite(v)) continue;
    totals.set(p, (totals.get(p) ?? 0) + v);
  }
  return [...totals.entries()].map(([x, y]) => ({ x, y: round(y, 2) }));
}

/** Chronological where the period labels sort naturally ("2026-03", "2026-Q1"). */
function sortedByPeriodLabel(points: { x: string; y: number }[]): { x: string; y: number }[] {
  return [...points].sort((a, b) => a.x.localeCompare(b.x, undefined, { numeric: true }));
}

const MAX_CHART_POINTS = 24;

const MAX_BRIDGE_STEPS = 8;

/**
 * Variance bridge: opening total → signed contribution per dimension value →
 * closing total. The steps sum exactly to the gap, so the bridge always
 * balances. Business drivers like price or volume are not derivable from the
 * data, so the bridge decomposes by the dimension the board actually selected.
 */
function computeWaterfallBridge(
  records: Row[],
  primary: { column: string; label: string; dimension?: string | null; dimensionValues?: string[] },
  comparison: { column: string; label: string },
): ChartSpec | null {
  const dim = primary.dimension;
  if (!dim) return null;
  const allowed = primary.dimensionValues?.length
    ? new Set(primary.dimensionValues.map(String))
    : null;

  const byValue = new Map<string, { p: number; c: number }>();
  let openTotal = 0;
  let closeTotal = 0;
  for (const r of records) {
    const key = String(r[dim] ?? "");
    if (allowed && !allowed.has(key)) continue;
    const p = Number(r[primary.column]);
    const c = Number(r[comparison.column]);
    if (!Number.isFinite(p) || !Number.isFinite(c)) continue;
    const cur = byValue.get(key) ?? { p: 0, c: 0 };
    cur.p += p;
    cur.c += c;
    byValue.set(key, cur);
    openTotal += c;
    closeTotal += p;
  }
  if (byValue.size < 2) return null;

  const steps = [...byValue.entries()]
    .map(([x, v]) => ({ x, y: round(v.p - v.c, 2) }))
    .sort((a, b) => Math.abs(b.y) - Math.abs(a.y));

  // Keep the biggest movers; roll the rest into one balancing step.
  let kept = steps;
  if (steps.length > MAX_BRIDGE_STEPS) {
    kept = steps.slice(0, MAX_BRIDGE_STEPS);
    const rest = round(
      steps.slice(MAX_BRIDGE_STEPS).reduce((a, s) => a + s.y, 0),
      2,
    );
    if (rest !== 0) kept = [...kept, { x: "Other", y: rest }];
  }

  return {
    title: `${comparison.label} to ${primary.label} bridge by ${dim}`,
    type: "waterfall",
    series: [
      {
        name: "Variance",
        points: [
          { x: comparison.label, y: round(openTotal, 2) },
          ...kept,
          { x: primary.label, y: round(closeTotal, 2) },
        ],
      },
    ],
  };
}

/**
 * Build the report's charts in code rather than asking the model to transcribe
 * hundreds of data points. Two reasons: transcription is the single most
 * expensive part of the reply (it pushed generation past the model gateway's
 * ~120s limit on real datasets), and copied figures are exactly where the model
 * makes arithmetic slips. Same authoritative aggregation as the metrics tables.
 */
export function computeCharts(
  source: Source,
  keyColumns: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[],
  opts: { variance?: boolean; trend?: boolean } = {},
): ChartSpec[] {
  const records = source.records as Row[];
  if (!records.length || !keyColumns?.length) return [];
  const periodKey = findPeriodKey(records);
  const numCols = numericKeys(records, periodKey);
  const measures = keyColumns.filter((k) => numCols.includes(k.column));
  if (!measures.length) return [];

  const charts: ChartSpec[] = [];

  // 0. Variance bridge first — templates lead with it, and chart sections are
  //    filled in order.
  if (opts.variance && measures.length >= 2) {
    const bridge = computeWaterfallBridge(records, measures[0], measures[1]);
    if (bridge) charts.push(bridge);
  }

  // 1. Key measures over time — the trend chart.
  if (periodKey) {
    const series = measures.slice(0, 3).map((m) => {
      const points = sortedByPeriodLabel(totalsByPeriod(records, periodKey, m.column));
      return { name: m.label, points: points.slice(-MAX_CHART_POINTS) };
    });
    const periodCount = series[0]?.points.length ?? 0;
    if (periodCount >= 2) {
      charts.push({
        title: `${measures
          .slice(0, 3)
          .map((m) => m.label)
          .join(" vs ")} by period`,
        type: periodCount <= 12 ? "bar" : "line",
        series,
      });
    }
  }

  // 2. Variance % per period, when a comparison basis was selected.
  if (opts.variance && periodKey && measures.length >= 2) {
    const [primary, comp] = measures;
    const p = new Map(
      totalsByPeriod(records, periodKey, primary.column).map((d) => [d.x, d.y]),
    );
    const c = totalsByPeriod(records, periodKey, comp.column);
    const points = sortedByPeriodLabel(
      c
        .filter((d) => d.y !== 0 && p.has(d.x))
        .map((d) => ({ x: d.x, y: round(((p.get(d.x)! - d.y) / Math.abs(d.y)) * 100, 2) })),
    ).slice(-MAX_CHART_POINTS);
    if (points.length >= 2) {
      charts.push({
        title: `${primary.label} vs ${comp.label} — variance % by period`,
        type: "bar",
        series: [{ name: "Variance %", points }],
      });
    }
  }

  // 2b. Trend boards compare areas over time: one line per dimension value.
  if (opts.trend && periodKey) {
    const dimensioned = measures.find((m) => m.dimension);
    if (dimensioned?.dimension) {
      const dim = dimensioned.dimension;
      const allowed = dimensioned.dimensionValues?.length
        ? new Set(dimensioned.dimensionValues.map(String))
        : null;
      const byValue = new Map<string, Map<string, number>>();
      const rank = new Map<string, number>();
      for (const r of records) {
        const key = String(r[dim] ?? "");
        if (allowed && !allowed.has(key)) continue;
        const v = Number(r[dimensioned.column]);
        if (!Number.isFinite(v)) continue;
        if (!byValue.has(key)) byValue.set(key, new Map());
        const series = byValue.get(key)!;
        const p = String(r[periodKey]);
        series.set(p, (series.get(p) ?? 0) + v);
        rank.set(key, (rank.get(key) ?? 0) + v);
      }
      // Too many lines is unreadable — keep the biggest areas by total.
      const top = [...rank.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k]) => k);
      const series = top.map((value) => ({
        name: value,
        points: sortedByPeriodLabel(
          [...byValue.get(value)!.entries()].map(([x, y]) => ({ x, y: round(y, 2) })),
        ).slice(-MAX_CHART_POINTS),
      }));
      if (series.length >= 2 && (series[0]?.points.length ?? 0) >= 2) {
        charts.push({
          title: `${dimensioned.label} trend by ${dim}`,
          type: "line",
          series,
        });
      }
    }
  }

  // 3. Composition of the primary measure across its selected dimension.
  const dimensioned = measures.find((m) => m.dimension);
  if (dimensioned?.dimension) {
    const dim = dimensioned.dimension;
    const allowed = dimensioned.dimensionValues?.length
      ? new Set(dimensioned.dimensionValues.map(String))
      : null;
    const totals = new Map<string, number>();
    for (const r of records) {
      const key = String(r[dim] ?? "");
      if (allowed && !allowed.has(key)) continue;
      const v = Number(r[dimensioned.column]);
      if (!Number.isFinite(v)) continue;
      totals.set(key, (totals.get(key) ?? 0) + v);
    }
    const ranked = [...totals.entries()]
      .map(([x, y]) => ({ x, y: round(y, 2) }))
      .sort((a, b) => b.y - a.y);
    // Negative slices make a pie meaningless — fall back to a bar chart.
    const allPositive = ranked.every((d) => d.y >= 0);
    const points = ranked.slice(0, 8);
    if (ranked.length > 8 && allPositive) {
      points.push({
        x: "Other",
        y: round(
          ranked.slice(8).reduce((a, d) => a + d.y, 0),
          2,
        ),
      });
    }
    if (points.length >= 2) {
      charts.push({
        title: `${dimensioned.label} by ${dim}`,
        type: allPositive ? "pie" : "bar",
        series: [{ name: dimensioned.label, points }],
      });
    }
  }

  return charts;
}

const MAX_TREND_PERIODS = 48;
const MAX_TREND_DIMENSION_VALUES = 10;

/** Population standard deviation, used to score how choppy a series is. */
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
}

/** Least-squares slope per period — the trend line's direction and steepness. */
function slopePerPeriod(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, v) => a + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return den === 0 ? null : round(num / den, 2);
}

function trendDirection(first: number, last: number, tolerancePct = 1): string {
  const pct = growthPct(last, first);
  if (pct === null) return "n/a";
  if (Math.abs(pct) < tolerancePct) return "flat";
  return pct > 0 ? "rising" : "falling";
}

/**
 * Deterministic trend analysis: how each selected measure moves over time, and
 * how each value of the selected dimension trends within it. Same contract as
 * the variance block — the model copies these figures, never derives them.
 */
export function computeTrendBlock(
  source: Source,
  keyColumns: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[],
): string {
  const records = source.records;
  if (!records.length || !keyColumns?.length) return "";
  const periodKey = findPeriodKey(records);
  if (!periodKey) return "";
  const numCols = numericKeys(records, periodKey);
  const measures = keyColumns.filter((k) => numCols.includes(k.column));
  if (!measures.length) return "";

  // Aggregate to one row per period so a trend is never read off raw rows.
  const periods: string[] = [];
  const totals = new Map<string, Map<string, number>>();
  for (const r of records) {
    const p = String(r[periodKey]);
    if (!totals.has(p)) {
      totals.set(p, new Map());
      periods.push(p);
    }
    const bucket = totals.get(p)!;
    for (const m of measures) {
      const v = Number(r[m.column]);
      if (Number.isFinite(v)) bucket.set(m.column, (bucket.get(m.column) ?? 0) + v);
    }
  }
  periods.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (periods.length < 2) return "";

  const parts: string[] = [
    `## Pre-computed trend analysis — ${source.name}`,
    `Every figure below is aggregated to one row per ${periodKey} across ${records.length} rows and ${periods.length} periods, then measured first-to-last. "Slope/period" is a least-squares fit; "volatility" is the standard deviation of period-over-period % change.`,
  ];

  // 1. Headline trend per measure.
  const headline = [
    "| measure | first period | last period | first value | last value | change | change % | avg %/period | slope/period | volatility % | direction |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const m of measures) {
    const series = periods.map((p) => round(totals.get(p)!.get(m.column) ?? 0, 2));
    const first = series[0];
    const last = series[series.length - 1];
    const pops: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const g = growthPct(series[i], series[i - 1]);
      if (g !== null) pops.push(g);
    }
    const avgPop = pops.length ? round(pops.reduce((a, v) => a + v, 0) / pops.length, 2) : null;
    headline.push(
      `| ${m.label} | ${periods[0]} | ${periods[periods.length - 1]} | ${first} | ${last} | ${round(last - first, 2)} | ${fmt(growthPct(last, first))}% | ${fmt(avgPop)}% | ${fmt(slopePerPeriod(series))} | ${fmt(round(stdev(pops), 2))}% | ${trendDirection(first, last)} |`,
    );
  }
  parts.push(`**Trend summary by measure:**\n${headline.join("\n")}`);

  // 2. The series itself, so period-level figures can be quoted exactly.
  for (const m of measures) {
    const rows = periods.map((p, i) => {
      const v = round(totals.get(p)!.get(m.column) ?? 0, 2);
      const prev = i === 0 ? null : round(totals.get(periods[i - 1])!.get(m.column) ?? 0, 2);
      return `| ${p} | ${v} | ${prev === null ? "n/a" : round(v - prev, 2)} | ${prev === null ? "n/a" : `${fmt(growthPct(v, prev))}%`} |`;
    });
    const body =
      rows.length > MAX_TREND_PERIODS
        ? [
            ...rows.slice(0, MAX_TREND_PERIODS / 2),
            `| … | … | … | (${rows.length - MAX_TREND_PERIODS} periods omitted) |`,
            ...rows.slice(-MAX_TREND_PERIODS / 2),
          ]
        : rows;
    parts.push(
      `**${m.label} by ${periodKey}:**\n${[
        `| ${periodKey} | ${m.label} | change vs prior | change % |`,
        "|---|---|---|---|",
        ...body,
      ].join("\n")}`,
    );
  }

  // 3. Trend per dimension value — "across multiple areas" over the same span.
  const dimensioned = measures.find((m) => m.dimension);
  if (dimensioned?.dimension) {
    const dim = dimensioned.dimension;
    const allowed = dimensioned.dimensionValues?.length
      ? new Set(dimensioned.dimensionValues.map(String))
      : null;
    const byValue = new Map<string, Map<string, number>>();
    for (const r of records) {
      const key = String(r[dim] ?? "");
      if (allowed && !allowed.has(key)) continue;
      const v = Number(r[dimensioned.column]);
      if (!Number.isFinite(v)) continue;
      if (!byValue.has(key)) byValue.set(key, new Map());
      const series = byValue.get(key)!;
      const p = String(r[periodKey]);
      series.set(p, (series.get(p) ?? 0) + v);
    }

    const firstP = periods[0];
    const lastP = periods[periods.length - 1];
    const firstTotal = [...byValue.values()].reduce((a, s) => a + (s.get(firstP) ?? 0), 0);
    const lastTotal = [...byValue.values()].reduce((a, s) => a + (s.get(lastP) ?? 0), 0);

    const ranked = [...byValue.entries()]
      .map(([value, series]) => {
        const f = round(series.get(firstP) ?? 0, 2);
        const l = round(series.get(lastP) ?? 0, 2);
        const all = periods.map((p) => round(series.get(p) ?? 0, 2));
        return {
          value,
          first: f,
          last: l,
          growth: growthPct(l, f),
          slope: slopePerPeriod(all),
          shareFirst: pct(f, firstTotal),
          shareLast: pct(l, lastTotal),
        };
      })
      .sort((a, b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity));

    const shown = ranked.slice(0, MAX_TREND_DIMENSION_VALUES);
    parts.push(
      `**Trend by ${dim} (${firstP} → ${lastP}${ranked.length > shown.length ? `, top ${shown.length} of ${ranked.length} by growth` : ""}):**\n${[
        `| ${dim} | ${firstP} | ${lastP} | change | change % | slope/period | share at start | share at end | share shift |`,
        "|---|---|---|---|---|---|---|---|---|",
        ...shown.map(
          (d) =>
            `| ${d.value} | ${d.first} | ${d.last} | ${round(d.last - d.first, 2)} | ${fmt(d.growth)}% | ${fmt(d.slope)} | ${fmt(d.shareFirst)}% | ${fmt(d.shareLast)}% | ${d.shareFirst !== null && d.shareLast !== null ? `${round(d.shareLast - d.shareFirst, 1)}pp` : "n/a"} |`,
        ),
        `| **TOTAL** | ${round(firstTotal, 2)} | ${round(lastTotal, 2)} | ${round(lastTotal - firstTotal, 2)} | ${fmt(growthPct(lastTotal, firstTotal))}% | — | 100% | 100% | — |`,
      ].join("\n")}\nFastest growing: ${shown[0]?.value ?? "n/a"}. Fastest declining: ${ranked[ranked.length - 1]?.value ?? "n/a"}.`,
    );
  }

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Balance sheet analysis
//
// A balance sheet is a STOCK, not a flow: each period is a point-in-time
// snapshot. Every other block in this file sums a measure across periods, which
// for a balance sheet is meaningless (March cash + April cash is not a number).
// So this block never aggregates across periods — it only ever sums line items
// *within* one period, and compares periods side by side.
// ---------------------------------------------------------------------------

export type BalanceSheetSection = "Assets" | "Liabilities" | "Equity" | "Unclassified";

const MAX_BS_LINE_ITEMS = 40;

/**
 * Subtotal rows ("Total current assets", "TOTAL EQUITY AND LIABILITIES") are
 * present in almost every exported balance sheet. Summing them alongside their
 * own components double-counts, so they are excluded from every total and kept
 * only as an independent cross-check against what we compute.
 */
export function isBalanceSheetSubtotal(name: string): boolean {
  return /^\s*(total|sub-?total|sum)\b/i.test(name) || /\btotal\s+(assets|liabilities|equity)/i.test(name);
}

/**
 * Current vs non-current, which drives working capital and the current/quick
 * ratios. An explicit caption always wins; failing that the item is classified
 * by its nature, because a real sheet often carries the current/non-current
 * split as a grouping row rather than repeating it in every caption — and
 * "Cash and bank balances" is a current asset whether or not it says so.
 * Anything genuinely ambiguous stays "unknown" and is left out of the ratios
 * rather than guessed into them.
 */
function currentClass(name: string): "current" | "non-current" | "unknown" {
  const s = name.toLowerCase();
  if (/\bnon[-\s]?current\b/.test(s)) return "non-current";
  if (/\bcurrent\b/.test(s)) return "current";
  if (/\b(long[-\s]?term|fixed\s+assets?)\b/.test(s)) return "non-current";
  if (
    /\b(short[-\s]?term|cash|bank|receivables?|debtors?|inventor(?:y|ies)|stock[-\s]?in[-\s]?trade|prepaid|prepayments?|payables?|creditors?|accruals?|accrued|overdrafts?)\b/.test(s)
  ) {
    return "current";
  }
  if (/\b(property|plant|equipment|ppe|goodwill|intangibles?)\b/.test(s)) return "non-current";
  return "unknown";
}

function isInventoryItem(name: string): boolean {
  // Stems are spelled out to their real endings: a trailing \b after a stem
  // like "inventor" would never match "inventories".
  return /\b(inventor(?:y|ies)|stock[-\s]?in[-\s]?trade|stocks?)\b/i.test(name);
}

/**
 * Classify a line item into its balance sheet section.
 *
 * Order matters. The explicit words "asset"/"liability" are tested before the
 * item-level keywords so "Deferred tax asset" lands under Assets rather than
 * being caught by the "deferred"/"tax" liability keywords; equity terms are
 * tested before liability terms so "Share capital" is not caught by "capital
 * work in progress" style patterns.
 */
export function classifyBalanceSheetSection(name: string): BalanceSheetSection {
  const s = name.toLowerCase().trim();
  if (!s) return "Unclassified";

  // 1. Explicit section words win outright.
  if (/\bassets?\b/.test(s)) return "Assets";
  if (/\bliabilit(y|ies)\b/.test(s)) return "Liabilities";
  if (/\b(equity|shareholders?['’]?\s*funds?|net\s+worth)\b/.test(s)) return "Equity";

  // 2. Equity-specific instruments.
  if (
    /\b(share\s+capital|paid[-\s]?up\s+capital|share\s+premium|securities\s+premium|retained\s+earnings|reserves?|surplus|treasury\s+(stock|shares)|minority\s+interest|non[-\s]?controlling)\b/.test(s)
  ) {
    return "Equity";
  }

  // 3. Liability-specific instruments.
  if (
    /\b(payables?|creditors?|borrowings?|loans?|debt|debentures?|overdrafts?|provisions?|accruals?|accrued|deferred\s+(?:revenue|income)|lease\s+(?:liabilit(?:y|ies)|obligations?)|due\s+to)\b/.test(s)
  ) {
    return "Liabilities";
  }

  // 4. Asset-specific instruments.
  if (
    /\b(cash|bank|receivables?|debtors?|inventor(?:y|ies)|stock[-\s]?in[-\s]?trade|prepaid|prepayments?|property|plant|equipment|ppe|goodwill|intangibles?|investments?|deposits?|advances?|due\s+from)\b/.test(s)
  ) {
    return "Assets";
  }

  return "Unclassified";
}

type BsShape = {
  /** Period labels in chronological order. */
  periods: string[];
  /** Line item name → per-period amount. */
  items: Map<string, Map<string, number>>;
  /** How the sheet was read, for the prompt's provenance line. */
  layout: "tidy" | "wide";
  lineItemKey: string;
  /** Subtotal rows kept aside for the integrity cross-check. */
  subtotals: Map<string, Map<string, number>>;
  /** Line item → section, taken from a section column when the sheet has one. */
  declaredSections: Map<string, BalanceSheetSection>;
  /** Line item → its category caption, where the sheet carries a category column. */
  itemCategories: Map<string, string>;
  /**
   * Line item → current/non-current, read from the section column's own wording
   * ("Current liabilities ( ≤ 1 year)"). Authoritative where present: a caption
   * like "Provisions for pensions" says nothing about its term, but the section
   * it sits under does.
   */
  declaredTerms: Map<string, "current" | "non-current">;
  /** Identity key → the caption to display for it. */
  itemLabels: Map<string, string>;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Sortable key for a period label, so "Jun-26" orders after "Sep-25" rather
 * than alphabetically. Wide sheets often carry their period columns in
 * presentation order (latest first, comparatives after), which is not
 * chronological — and first-to-last movement depends on getting this right.
 */
function periodSortKey(label: string): string {
  const s = label.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})/); // 2026-06
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{4})[-\s]?q([1-4])$/i); // 2026-Q2
  if (m) return `${m[1]}-Q${m[2]}`;
  m = s.match(/^([a-z]{3})[a-z]*[-\s/]?(\d{2,4})$/i); // Jun-26 / June 2026
  if (m) {
    const mi = MONTHS.indexOf(m[1].toLowerCase());
    if (mi >= 0) {
      const y = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
      return `${y}-${String(mi + 1).padStart(2, "0")}`;
    }
  }
  if (/^\d{4}$/.test(s)) return s;
  return s;
}

/**
 * Which period the closing position is measured against.
 *
 * A balance sheet review is read against a chosen baseline: last quarter for
 * momentum, the same quarter last year for seasonality, the opening position
 * for the year to date. The choice changes every movement figure, so it is a
 * board setting rather than an assumption, and it resolves to a period that
 * actually exists in the data — a basis the data cannot support falls back to
 * the previous period rather than silently comparing against nothing.
 */
export function resolveComparisonPeriods(
  periods: string[],
  basis?: ComparisonBasis | null,
): string[] {
  if (periods.length < 2) return [];
  const last = periods[periods.length - 1];
  const previous = periods[periods.length - 2];
  const mode = basis?.mode ?? "previous";

  if (mode === "opening") return [periods[0]];
  if (mode === "specific") {
    // Only periods the data actually contains, oldest first, never the closing
    // period itself. A baseline the data cannot support would otherwise report
    // a movement the reader cannot trace back to the sheet.
    const chosen = (basis?.periods ?? []).filter((p) => p !== last && periods.includes(p));
    const unique = [...new Set(chosen)].sort(
      (a, b) => periods.indexOf(a) - periods.indexOf(b),
    );
    return unique.length ? unique : [previous];
  }
  if (mode === "year-ago") {
    const key = periodSortKey(last);
    const m = key.match(/^(\d{4})-(Q?\d{1,2})$/);
    if (m) {
      const target = `${Number(m[1]) - 1}-${m[2]}`;
      const hit = periods.find((p) => periodSortKey(p) === target);
      if (hit) return [hit];
    } else if (/^\d{4}$/.test(key)) {
      const hit = periods.find((p) => periodSortKey(p) === String(Number(key) - 1));
      if (hit) return [hit];
    }
    return [previous];
  }
  return [previous];
}

/** The primary baseline — the first of the chosen comparison periods. */
export function resolveComparisonPeriod(
  periods: string[],
  basis?: ComparisonBasis | null,
): string | null {
  return resolveComparisonPeriods(periods, basis)[0] ?? null;
}

function sortPeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) =>
    periodSortKey(a).localeCompare(periodSortKey(b), undefined, { numeric: true }),
  );
}

/**
 * Read a balance sheet in either layout an Excel export actually arrives in:
 *
 *  - "tidy":  Period | Line Item | Amount   (one row per item per period)
 *  - "wide":  Line Item | Mar-24 | Apr-24 | …  (one column per period)
 *
 * Returns null when the records are not shaped like a balance sheet at all, so
 * the caller can fall back to the generic metrics rather than emit nonsense.
 */
function readBalanceSheet(
  records: Row[],
  keyColumns: { column: string; label: string; dimension?: string | null; dimensionValues?: string[] }[],
): BsShape | null {
  if (!records.length) return null;
  const keys = Object.keys(records[0]);

  // The line-item column is resolved FIRST, before any period detection: in a
  // wide sheet the captions are the only text column, and letting the generic
  // period-finder claim it would make the sheet unreadable.
  const textKeys = keys.filter((k) =>
    records.some((r) => typeof r[k] === "string" && String(r[k]).trim()),
  );
  if (!textKeys.length) return null;

  const scoreCaptions = (k: string) => {
    const vals = [...new Set(records.map((r) => String(r[k] ?? "")).filter(Boolean))];
    if (!vals.length) return 0;
    const hits = vals.filter(
      (v) => classifyBalanceSheetSection(v) !== "Unclassified" || isBalanceSheetSubtotal(v),
    ).length;
    return hits / vals.length;
  };

  const distinctCount = (k: string) =>
    new Set(records.map((r) => String(r[k] ?? "")).filter(Boolean)).size;

  // Refuse data that is not a balance sheet. Without this, any dataset with a
  // text column yields a block where every line item is "Unclassified" — noise
  // that reads as a failed analysis. An explicitly mapped dimension is trusted.
  const MIN_CAPTION_SHARE = 0.34;

  const mapped = keyColumns.find((k) => k.dimension)?.dimension;
  // Among the columns that read as balance sheet captions, the line-item column
  // is the most GRANULAR one. A real export usually has both a section column
  // ("Current Assets" / "Non-current assets", a handful of values) and a
  // particulars column (hundreds of values); the section column scores just as
  // well on captions, so picking by score alone would collapse the whole sheet
  // into three line items.
  const candidates = textKeys.filter((k) => scoreCaptions(k) >= MIN_CAPTION_SHARE);
  const lineItemKey =
    mapped && keys.includes(mapped)
      ? mapped
      : candidates.sort((a, b) => distinctCount(b) - distinctCount(a))[0];
  if (!lineItemKey) return null;

  /** "2026-01", "Mar-24", "2026", "2026-Q1" — a period label, not a caption. */
  const looksLikePeriod = (v: string) =>
    /^\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?$/.test(v) ||
    /^\d{4}[-\s]?q[1-4]$/i.test(v) ||
    /^\d{4}$/.test(v) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s/]?\d{2,4}$/i.test(v.trim());

  // A period column must not be the caption column. Prefer an explicitly named
  // one, else a text column whose values actually read as period labels.
  const namedPeriod = keys.find(
    (k) => k !== lineItemKey && PERIOD_KEYS.includes(k.toLowerCase()),
  );
  const inferredPeriod = textKeys.find(
    (k) =>
      k !== lineItemKey &&
      records.every((r) => !String(r[k] ?? "").trim() || looksLikePeriod(String(r[k]))),
  );
  const periodKey = namedPeriod ?? inferredPeriod ?? null;
  // A value column is one whose populated cells are numbers. Blanks do NOT
  // disqualify it: a real balance sheet export carries spacer rows and the odd
  // empty cell, and demanding a number in every single row means two blanks in
  // 165 rows silently reduce the sheet to "no value columns" — which reads to
  // the user as the balance sheet analysis simply not running.
  const isValueColumn = (k: string) => {
    let numbers = 0;
    for (const r of records) {
      const v = r[k];
      if (v === null || v === undefined || v === "") continue;
      if (typeof v !== "number") return false;
      numbers++;
    }
    return numbers > 0;
  };
  const allNumeric = keys.filter(
    (k) => k !== lineItemKey && k !== periodKey && isValueColumn(k),
  );
  // In a wide sheet the period columns are the ones whose HEADER is a period.
  // Real exports sit derived columns like "Variance" beside them, and treating
  // one of those as a period would invent a phantom balance sheet date.
  const periodHeaders = allNumeric.filter((k) => looksLikePeriod(k));
  const numCols = periodHeaders.length >= 1 && !periodKey ? periodHeaders : allNumeric;

  // A dedicated section column ("Current Assets" / "Equity" / …) classifies far
  // more reliably than caption keywords, so it wins when the sheet has one: few
  // distinct values, every one of which names a balance sheet section.
  /** Share of a column's distinct values that name a balance sheet section. */
  const sectionShare = (k: string) => {
    const vals = [...new Set(records.map((r) => String(r[k] ?? "")).filter(Boolean))];
    // Headroom matters more than tightness here: overshooting the cap makes the
    // column invisible, and the fallback — reading sections off captions — gets
    // whole blocks wrong rather than merely a few.
    if (!vals.length || vals.length > 14) return 0;
    return vals.filter((v) => classifyBalanceSheetSection(v) !== "Unclassified").length / vals.length;
  };
  // Most, not all: real sheets carry typos ("Liabiities") and stray headings,
  // and demanding a clean sweep would discard an otherwise perfect section
  // column and silently fall back to guessing sections from captions.
  const named = textKeys.find(
    (k) => k !== lineItemKey && k !== periodKey && /^section$/i.test(k) && sectionShare(k) > 0,
  );
  const sectionKey =
    named ?? textKeys.find((k) => k !== lineItemKey && k !== periodKey && sectionShare(k) >= 0.7) ?? null;

  const allowed = keyColumns.find((k) => k.dimension === lineItemKey)?.dimensionValues;
  const allowSet = allowed?.length ? new Set(allowed.map(String)) : null;

  // The category column has to be known before rows are bucketed, because
  // whether a "Total:" row is a duplicate or the only carrier of a balance
  // depends on whether its category has any detail rows.
  const categoryCandidates = textKeys.filter(
    (k) => k !== lineItemKey && k !== periodKey && k !== sectionKey,
  );
  const categoryKey =
    categoryCandidates.find((k) => /categor|group|class/i.test(k)) ??
    categoryCandidates.find((k) => {
      if (sectionShare(k) >= 0.7) return false;
      const n = distinctCount(k);
      return n >= 2 && n < distinctCount(lineItemKey) && n <= 60;
    }) ??
    null;

  /**
   * Which "Total:" rows actually carry a balance nothing else does.
   *
   * Excluding every subtotal is right where detail rows sit beneath it — count
   * both and the line is doubled. But a real chart of accounts also has leaf
   * categories whose ONLY row is their total ("Tangible fixed assets" →
   * "Total: Tangible fixed assets", with no detail beneath). Dropping those
   * loses the balance outright and the sheet can never tie.
   *
   * A category whose own caption is itself a "Total:" ("Total: Current assets")
   * spans other categories, so it stays excluded whatever it contains.
   */
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[.:]+$/, "").trim();
  /** "Total: Trade payables" → "trade payables". */
  const totalledName = (caption: string) =>
    norm(caption.replace(/^\s*(sub-?total|total|sum)\s*[:\-–—]?\s*/i, ""));

  // Grouping labels, finest first, used to bound a block of related rows.
  const groupKeys = [
    ...categoryCandidates.filter((k) => /sub/i.test(k) && /categor|group|class/i.test(k)),
    ...categoryCandidates.filter((k) => !/sub/i.test(k) && /categor|group|class/i.test(k)),
  ];
  const groupsOf = (r: Row): string[] => {
    const all = groupKeys.map((k) => String(r[k] ?? "").trim()).filter(Boolean);
    if (!all.length && categoryKey) {
      const v = String(r[categoryKey] ?? "").trim();
      if (v) all.push(v);
    }
    return all;
  };

  const detailPerGroup = new Map<string, number>();
  for (const r of records) {
    const caption = String(r[lineItemKey] ?? "").trim();
    const group = groupsOf(r)[0] ?? "";
    if (!caption || !group || isBalanceSheetSubtotal(caption)) continue;
    detailPerGroup.set(group, (detailPerGroup.get(group) ?? 0) + 1);
  }

  /**
   * Name-based fallback, used only where the figures cannot decide (a tidy
   * sheet, or a total that is zero in every period).
   */
  const namedDuplicate = (caption: string, groups: string[]) => {
    if (!isBalanceSheetSubtotal(caption)) return false;
    const finest = groups[0] ?? "";
    if (!finest) return true;
    if (groups.some((g) => isBalanceSheetSubtotal(g))) return true;
    const totalled = totalledName(caption);
    const namesItsGroup = groups.some((g) => {
      const group = norm(g);
      return totalled === group || totalled.includes(group) || group.includes(totalled);
    });
    return namesItsGroup && (detailPerGroup.get(finest) ?? 0) > 0;
  };

  /**
   * Decide which "Total:" rows restate rows already counted — arithmetically,
   * by checking whether each one actually equals the rows above it.
   *
   * Naming cannot be trusted for this. A real chart of accounts nests several
   * sub-totals inside one category and abbreviates them inconsistently ("Total:
   * Accrued liab. personnel related" sitting under "Accrued liabilities"), so a
   * caption test either misses the nested total — counting a whole block twice
   * — or over-matches and deletes a leaf whose own detail rows are simply not
   * in the sheet.
   *
   * Walking the rows in order and testing the sums is exact: a total that
   * equals the run of rows above it is a restatement; a total that equals the
   * earlier sub-totals is a total-of-totals; anything else is the only carrier
   * of its balance and has to be counted.
   */
  /**
   * Which "Total:" rows restate rows already counted — decided per period.
   *
   * The decision cannot be made once for the whole sheet. A comparative column
   * is often restated at the total level without its breakdown being
   * refreshed, so the same total legitimately restates its details in one
   * period and is the only carrier of the balance in another. Judging all
   * periods together forces one answer onto both cases and leaves whichever
   * period disagrees short.
   *
   * Returns flags[periodIndex][rowIndex].
   */
  const markDuplicateTotals = (valueCols: string[]): boolean[][] => {
    const captionAt = (i: number) => String(records[i][lineItemKey] ?? "").trim();
    const isTotalRow = (i: number) => isBalanceSheetSubtotal(captionAt(i));

    const labelAt = (i: number, level: "fine" | "main" | "section") => {
      const r = records[i];
      const g = groupsOf(r);
      const section = sectionKey ? String(r[sectionKey] ?? "").trim() : "";
      if (level === "section") return section;
      if (level === "main") return `${section}|${g[g.length - 1] ?? ""}`;
      return `${section}|${g[0] ?? ""}`;
    };

    const resolvePeriod = (col: string): boolean[] => {
      const flags = new Array<boolean>(records.length).fill(false);
      const value = (i: number) => {
        const v = Number(records[i][col]);
        return Number.isFinite(v) ? v : 0;
      };
      /** Currency sums in the billions: compare on a relative tolerance. */
      const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, Math.abs(a) * 1e-6);

      const live: number[] = [];
      records.forEach((r, i) => {
        if (!captionAt(i)) return;
        // A total whose own category caption is a "Total:" spans other
        // categories ("Total: Assets"); never a leaf, never part of a block.
        if (isTotalRow(i) && groupsOf(r).some((g) => isBalanceSheetSubtotal(g))) {
          flags[i] = true;
          return;
        }
        live.push(i);
      });

      const bucket = (level: "fine" | "main" | "section") => {
        const out = new Map<string, number[]>();
        for (const i of live) {
          if (flags[i]) continue;
          const key = labelAt(i, level);
          if (!out.has(key)) out.set(key, []);
          out.get(key)!.push(i);
        }
        return out;
      };

      // Pass 1 — inside one leaf group.
      for (const indices of bucket("fine").values()) {
        const details = indices.filter((i) => !isTotalRow(i));
        const totals = indices.filter(isTotalRow);
        if (!totals.length || !details.length) continue;
        const detailSum = details.reduce((acc, i) => acc + value(i), 0);
        if (totals.some((i) => same(value(i), detailSum))) {
          for (const i of totals) flags[i] = true;
          continue;
        }
        const grand = totals.find((g) => {
          const rest = totals.filter((t) => t !== g).reduce((acc, t) => acc + value(t), 0);
          return same(value(g), detailSum + rest);
        });
        if (grand !== undefined) flags[grand] = true;
      }

      // Passes 2 and 3 — totals spanning the groups below them. A total equal
      // to the run of rows above it restates them; the run then collapses into
      // it so the next total up can match against it in turn.
      const collapseRuns = (indices: number[]) => {
        const stack: number[] = [];
        for (const i of indices) {
          const v = value(i);
          if (!isTotalRow(i)) {
            stack.push(v);
            continue;
          }
          let acc = 0;
          let matchAt = -1;
          for (let k = stack.length - 1; k >= 0; k--) {
            acc += stack[k];
            if (same(v, acc)) {
              matchAt = k;
              break;
            }
          }
          if (matchAt >= 0) {
            flags[i] = true;
            stack.splice(matchAt);
          }
          stack.push(v);
        }
      };
      for (const indices of bucket("main").values()) collapseRuns(indices);
      for (const indices of bucket("section").values()) collapseRuns(indices);

      // Final pass — a category's own total against what is still counted under
      // it. Where they agree the total is redundant and drops out. Where they
      // disagree the breakdown is incomplete for this period, and the sheet's
      // total is the reliable figure: keep it and drop the partial detail, so
      // the category contributes exactly what the source says it does.
      for (const indices of bucket("main").values()) {
        const groupName = norm(labelAt(indices[0], "main").split("|")[1] ?? "");
        if (!groupName) continue;
        const own = indices.find((i) => {
          if (flags[i] || !isTotalRow(i)) return false;
          const totalled = totalledName(captionAt(i));
          return totalled === groupName || totalled.includes(groupName) || groupName.includes(totalled);
        });
        if (own === undefined) continue;
        const others = indices.filter((i) => i !== own && !flags[i]);
        if (!others.length) continue;
        const counted = others.reduce((acc, i) => acc + value(i), 0);
        if (same(value(own), counted)) {
          flags[own] = true;
        } else {
          for (const i of others) flags[i] = true;
        }
      }

      return flags;
    };

    return valueCols.map(resolvePeriod);
  };

  const items = new Map<string, Map<string, number>>();
  const subtotals = new Map<string, Map<string, number>>();
  const itemLabels = new Map<string, string>();
  const declaredSections = new Map<string, BalanceSheetSection>();
  const declaredTerms = new Map<string, "current" | "non-current">();
  const itemCategories = new Map<string, string>();

  /**
   * A line item's identity is its section AND category AND caption — not the
   * caption alone. A real balance sheet repeats wording across the two halves
   * ("Loans ≤ 1 y - K" is a receivable under assets and a payable under
   * liabilities); keyed on caption they collapse into one line and the asset
   * nets against the liability, quietly corrupting both section totals.
   * Genuine sub-accounts, which share section, category and caption, still sum.
   */
  const identity = (r: Row, caption: string) =>
    [
      sectionKey ? String(r[sectionKey] ?? "").trim() : "",
      categoryKey ? String(r[categoryKey] ?? "").trim() : "",
      caption,
    ].join(" ");

  const put = (bucket: Map<string, Map<string, number>>, key: string, period: string, v: number) => {
    if (!bucket.has(key)) bucket.set(key, new Map());
    const series = bucket.get(key)!;
    // Same item repeated within a period (sub-accounts) is summed — that is a
    // within-period sum, which is the one aggregation a balance sheet allows.
    series.set(period, (series.get(period) ?? 0) + v);
  };

  /** Record the caption, section, term and category behind an identity key. */
  const describe = (key: string, r: Row, caption: string) => {
    if (!itemLabels.has(key)) itemLabels.set(key, caption);
    if (categoryKey && !itemCategories.has(key)) {
      const cat = String(r[categoryKey] ?? "").trim();
      if (cat) itemCategories.set(key, cat);
    }
    if (sectionKey && !declaredSections.has(key)) {
      const declared = String(r[sectionKey] ?? "").trim();
      if (!declared) return;
      const section = classifyBalanceSheetSection(declared);
      if (section !== "Unclassified") declaredSections.set(key, section);
      const term = currentClass(declared);
      if (term !== "unknown") declaredTerms.set(key, term);
    }
  };

  let periods: string[];
  let layout: BsShape["layout"];
  // In a wide sheet every period sits on the row, so a total can be checked
  // against the rows above it directly.
  const dupFlags =
    periodKey && numCols.length ? null : markDuplicateTotals(numCols.filter((c) => looksLikePeriod(c)));


  if (periodKey && numCols.length) {
    layout = "tidy";
    // The amount column: the board owner's first numeric key column, else the
    // only numeric column present.
    const measure = keyColumns.find((k) => numCols.includes(k.column))?.column ?? numCols[0];
    const seen: string[] = [];
    for (const r of records) {
      const caption = String(r[lineItemKey] ?? "").trim();
      if (!caption) continue;
      if (allowSet && !allowSet.has(caption)) continue;
      const p = String(r[periodKey]);
      if (!seen.includes(p)) seen.push(p);
      const v = Number(r[measure]);
      if (!Number.isFinite(v)) continue;
      const key = identity(r, caption);
      const duplicate = namedDuplicate(caption, groupsOf(r));
      if (!duplicate) describe(key, r, caption);
      put(duplicate ? subtotals : items, duplicate ? caption : key, p, v);
    }
    periods = seen;
  } else if (numCols.length >= 2 || (numCols.length === 1 && looksLikePeriod(numCols[0]))) {
    // Wide: every numeric column is a period, in sheet order. A lone numeric
    // column counts only when its header reads as a period, so an ordinary
    // "Amount" column is not mistaken for a one-period sheet.
    layout = "wide";
    periods = numCols;
    records.forEach((r, rowIndex) => {
      const caption = String(r[lineItemKey] ?? "").trim();
      if (!caption) return;
      if (allowSet && !allowSet.has(caption)) return;
      const key = identity(r, caption);
      const named = namedDuplicate(caption, groupsOf(r));
      // A row counted in any period needs its caption and section recorded.
      const countedSomewhere = numCols.some((_, pi) =>
        dupFlags ? !dupFlags[pi][rowIndex] : !named,
      );
      if (countedSomewhere) describe(key, r, caption);
      numCols.forEach((p, pi) => {
        const v = Number(r[p]);
        if (!Number.isFinite(v)) return;
        const duplicate = dupFlags ? dupFlags[pi][rowIndex] : named;
        put(duplicate ? subtotals : items, duplicate ? caption : key, p, v);
      });
    });
  } else {
    return null;
  }

  if (!items.size || periods.length === 0) return null;

  /**
   * Reconcile to the sheet's own section totals.
   *
   * Detail rows and the totals above them do not always agree in every column.
   * A comparative period is often restated at the total level without its
   * breakdown being refreshed, so summing the detail understates that period
   * while the sheet itself foots perfectly. The sheet's stated total is the
   * authority; the difference is carried as its own visible line rather than
   * quietly spread across the report lines or silently dropped.
   */
  const sectionGrandTotal = (patterns: RegExp[]): Map<string, number> | null => {
    for (const r of records) {
      const caption = String(r[lineItemKey] ?? "").trim();
      if (!patterns.some((p) => p.test(caption))) continue;
      const values = new Map<string, number>();
      let any = false;
      for (const p of periods) {
        const v = Number(layout === "wide" ? r[p] : r[numCols[0]]);
        if (Number.isFinite(v) && v !== 0) any = true;
        values.set(p, Number.isFinite(v) ? v : 0);
      }
      if (any) return values;
    }
    return null;
  };

  if (layout === "wide") {
    const sectionOf = (key: string) =>
      declaredSections.get(key) ?? classifyBalanceSheetSection(itemLabels.get(key) ?? key);
    const GRANDS: [BalanceSheetSection, RegExp[]][] = [
      ["Assets", [/^total:?\s*assets$/i]],
      ["Liabilities", [/^total:?\s*liabilities$/i]],
      ["Equity", [/^total:?\s*equity$/i]],
    ];
    for (const [section, patterns] of GRANDS) {
      const stated = sectionGrandTotal(patterns);
      if (!stated) continue;
      const counted = new Map<string, number>();
      for (const [key, series] of items) {
        if (sectionOf(key) !== section) continue;
        for (const p of periods) counted.set(p, (counted.get(p) ?? 0) + (series.get(p) ?? 0));
      }
      const delta = new Map<string, number>();
      let material = false;
      let plausible = true;
      for (const p of periods) {
        const statedValue = stated.get(p) ?? 0;
        const d = statedValue - (counted.get(p) ?? 0);
        delta.set(p, d);
        if (Math.abs(d) > Math.max(1, Math.abs(statedValue) * 1e-6)) material = true;
        // A reconciling residual is small. A "total" that differs from the
        // line items by a large fraction is measuring something else — a row
        // labelled "Total: Liabilities" may cover liabilities AND equity — and
        // reconciling to it would import that other meaning as a phantom line.
        if (statedValue !== 0 && Math.abs(d / statedValue) > 0.25) plausible = false;
      }
      if (!material || !plausible) continue;
      const key = `__reconciled__ ${section}`;
      items.set(key, delta);
      itemLabels.set(key, `Unallocated difference (${section.toLowerCase()})`);
      declaredSections.set(key, section);
      itemCategories.set(key, "Unallocated difference");
    }
  }

  // Captions carry the classification for sheets with no section column, so a
  // key with no declared section falls back to reading its own caption.
  for (const [key, caption] of itemLabels) {
    if (!declaredSections.has(key)) {
      const section = classifyBalanceSheetSection(caption);
      if (section !== "Unclassified") declaredSections.set(key, section);
    }
  }

  return {
    periods: sortPeriods(periods),
    items,
    layout,
    lineItemKey,
    subtotals,
    declaredSections,
    itemCategories,
    declaredTerms,
    itemLabels,
  };
}

/**
 * Detect the sign convention. Many exports carry liabilities and equity as
 * negatives so the sheet foots to zero; others carry everything positive and
 * rely on A = L + E. Getting this wrong inverts gearing and every ratio, so it
 * is decided from the data and stated in the prompt rather than assumed.
 */
function detectSignConvention(
  sections: Map<string, BalanceSheetSection>,
  items: Map<string, Map<string, number>>,
  period: string,
): "signed" | "absolute" {
  let lePositive = 0;
  let leNegative = 0;
  for (const [item, series] of items) {
    const section = sections.get(item);
    if (section !== "Liabilities" && section !== "Equity") continue;
    const v = series.get(period) ?? 0;
    if (v > 0) lePositive++;
    else if (v < 0) leNegative++;
  }
  return leNegative > lePositive ? "signed" : "absolute";
}

/**
 * Deterministic balance sheet analysis: section totals, the balance check,
 * liquidity and solvency ratios, composition, and line-item movement. Same
 * contract as the variance and trend blocks — the model quotes these figures
 * and never derives its own.
 */
export function computeBalanceSheetBlock(
  source: Source,
  keyColumns: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[] = [],
  opts: {
    usdInrRate?: number | null;
    unitHint?: string | null;
    comparison?: ComparisonBasis | null;
  } = {},
): string {
  const shape = readBalanceSheet(source.records as Row[], keyColumns ?? []);
  if (!shape) return "";
  const { periods, items, layout, lineItemKey, subtotals, declaredSections, itemCategories, declaredTerms, itemLabels } = shape;

  // The sheet's own section column wins where it has one; caption keywords are
  // the fallback for sheets that only carry line item names.
  const label = (key: string) => itemLabels.get(key) ?? key;
  const sections = new Map<string, BalanceSheetSection>();
  for (const item of items.keys()) {
    sections.set(item, declaredSections.get(item) ?? classifyBalanceSheetSection(label(item)));
  }

  const last = periods[periods.length - 1];
  const convention = detectSignConvention(sections, items, last);
  // Scale to the reporting unit once, here, so no downstream figure can be
  // presented in a different unit from the one it was computed in.
  let maxAbs = 0;
  for (const series of items.values()) {
    for (const v of series.values()) maxAbs = Math.max(maxAbs, Math.abs(v));
  }
  const units = resolveUnits(opts.unitHint, maxAbs);
  // Normalise to "everything positive" so ratios read conventionally.
  const amount = (item: string, period: string): number => {
    const raw = (items.get(item)?.get(period) ?? 0) / units.divisor;
    const section = sections.get(item);
    if (convention === "signed" && (section === "Liabilities" || section === "Equity")) return -raw;
    return raw;
  };

  const itemsIn = (section: BalanceSheetSection) =>
    [...items.keys()].filter((i) => sections.get(i) === section);
  const sectionTotal = (section: BalanceSheetSection, period: string) =>
    itemsIn(section).reduce((a, i) => a + amount(i, period), 0);
  /** The sheet's declared term wins; the caption is only the fallback. */
  const termOf = (item: string): "current" | "non-current" | "unknown" =>
    declaredTerms.get(item) ?? currentClass(label(item));
  const isCurrent = (item: string) => termOf(item) === "current";
  const subsetTotal = (section: BalanceSheetSection, period: string, pred: (n: string) => boolean) =>
    itemsIn(section)
      .filter(pred)
      .reduce((a, i) => a + amount(i, period), 0);

  const counts = {
    Assets: itemsIn("Assets").length,
    Liabilities: itemsIn("Liabilities").length,
    Equity: itemsIn("Equity").length,
    Unclassified: itemsIn("Unclassified").length,
  };

  const rate = opts.usdInrRate ?? null;
  const parts: string[] = [
    `## Pre-computed balance sheet analysis — ${source.name}`,
    `Comparison baseline: the closing position is reported against ${
      resolveComparisonPeriods(periods, opts.comparison).join(", ") || "the opening period"
    } (chosen on the board); movement figures use ${
      resolveComparisonPeriod(periods, opts.comparison) ?? "the opening period"
    }. Do not measure movement against any other period.
Units: every figure below is in ${units.label}. ${units.note} ${
      rate
        ? `A USD→INR rate of ${rate} was given, so figures may also be stated in mUSD as (mINR ÷ ${rate}); always label which currency a figure is in.`
        : "No USD→INR conversion rate was given, so report in mINR only — do NOT convert to mUSD or any other currency, and do not estimate a rate."
    }
Read as a ${layout === "wide" ? "wide sheet (one column per period)" : "tidy sheet (one row per line item per period)"} keyed on \`${lineItemKey}\`, covering ${items.size} line items across ${periods.length} period(s): ${periods[0]} → ${last}.
A balance sheet is a point-in-time snapshot, so NOTHING below is summed across periods — every figure is a single period's position, or a comparison between two periods.
Sign convention detected: ${
      convention === "signed"
        ? "liabilities and equity are carried as NEGATIVE in the source; they have been negated so all figures below read as positive magnitudes"
        : "all sections carried as positive magnitudes (A = L + E)"
    }.
Line items classified — Assets ${counts.Assets}, Liabilities ${counts.Liabilities}, Equity ${counts.Equity}, Unclassified ${counts.Unclassified}.${
      counts.Unclassified
        ? ` Unclassified items are EXCLUDED from section totals and ratios; list them in the report and say they need mapping: ${itemsIn("Unclassified").slice(0, 12).map(label).join(", ")}.`
        : ""
    }${
      subtotals.size
        ? `\n${subtotals.size} subtotal row(s) in the sheet were excluded from every total to avoid double-counting, and used only for the integrity cross-check below.`
        : ""
    }`,
  ];

  // 1. Section totals and the balance check, period by period.
  const balanceRows = periods.map((p) => {
    const a = sectionTotal("Assets", p);
    const l = sectionTotal("Liabilities", p);
    const e = sectionTotal("Equity", p);
    const diff = a - (l + e);
    // A sheet ties if the residual is under 0.5% of total assets.
    const ties = a === 0 ? diff === 0 : Math.abs(diff / a) < 0.005;
    return { p, a, l, e, diff, ties };
  });
  parts.push(
    `**Section totals and balance check by period:**\n${[
      "| period | total assets | total liabilities | total equity | liabilities + equity | residual (A − L − E) | ties? |",
      "|---|---|---|---|---|---|---|",
      ...balanceRows.map(
        (r) =>
          `| ${r.p} | ${round(r.a, 2)} | ${round(r.l, 2)} | ${round(r.e, 2)} | ${round(r.l + r.e, 2)} | ${round(r.diff, 2)} | ${r.ties ? "yes" : "**NO**"} |`,
      ),
    ].join("\n")}${
      balanceRows.some((r) => !r.ties)
        ? `\nWARNING: the sheet does not balance in ${balanceRows.filter((r) => !r.ties).length} period(s). Report this prominently as a data-integrity red flag before any interpretation — an unbalanced sheet usually means missing line items, a misclassified caption, or a mixed sign convention.`
        : "\nThe sheet balances in every period."
    }`,
  );

  // 2. Integrity cross-check against the sheet's own subtotal rows.
  if (subtotals.size) {
    const findSub = (re: RegExp) => [...subtotals.keys()].find((k) => re.test(k));
    const checks: string[] = [];
    const pairs: [string, BalanceSheetSection, RegExp][] = [
      ["Total assets", "Assets", /total\s+assets/i],
      ["Total liabilities", "Liabilities", /total\s+liabilit/i],
      ["Total equity", "Equity", /total\s+equity/i],
    ];
    for (const [label, section, re] of pairs) {
      const key = findSub(re);
      if (!key) continue;
      for (const p of periods) {
        const computed = sectionTotal(section, p);
        let stated = subtotals.get(key)!.get(p) ?? 0;
        if (convention === "signed" && section !== "Assets") stated = -stated;
        const delta = round(computed - stated, 2);
        checks.push(
          `| ${p} | ${label} | ${round(computed, 2)} | ${round(stated, 2)} | ${delta} | ${Math.abs(delta) < 0.01 ? "match" : "**MISMATCH**"} |`,
        );
      }
    }
    if (checks.length) {
      parts.push(
        `**Integrity cross-check — computed totals vs the sheet's own subtotal rows:**\n${[
          "| period | subtotal | computed from line items | stated in sheet | difference | verdict |",
          "|---|---|---|---|---|---|",
          ...checks,
        ].join("\n")}\nAny MISMATCH means line items and the sheet's own subtotal disagree — call it out as a data-integrity issue.`,
      );
    }
  }

  // 3. Liquidity and solvency ratios. Current/non-current split relies on the
  //    captions saying so; when they don't, the ratios are reported as n/a
  //    rather than guessed.
  const ratioRows = periods.map((p) => {
    const ca = subsetTotal("Assets", p, isCurrent);
    const cl = subsetTotal("Liabilities", p, isCurrent);
    const inv = subsetTotal("Assets", p, (n) => isCurrent(n) && isInventoryItem(label(n)));
    const a = sectionTotal("Assets", p);
    const l = sectionTotal("Liabilities", p);
    const e = sectionTotal("Equity", p);
    const hasSplit = ca !== 0 || cl !== 0;
    return {
      p,
      ca,
      cl,
      wc: hasSplit ? round(ca - cl, 2) : null,
      current: hasSplit && cl !== 0 ? round(ca / cl, 2) : null,
      quick: hasSplit && cl !== 0 ? round((ca - inv) / cl, 2) : null,
      de: e === 0 ? null : round(l / e, 2),
      equityRatio: pct(e, a),
      hasSplit,
    };
  });
  const anySplit = ratioRows.some((r) => r.hasSplit);
  // Only assets and liabilities carry a current/non-current term — equity has
  // no such split, so it is not "unmapped" for being absent from the ratios.
  const unknownTerm = [...items.keys()].filter((i) => {
    const s = sections.get(i);
    return (s === "Assets" || s === "Liabilities") && termOf(i) === "unknown";
  });
  parts.push(
    `**Liquidity and solvency ratios by period:**\n${[
      "| period | current assets | current liabilities | working capital | current ratio | quick ratio | debt/equity | equity ratio % |",
      "|---|---|---|---|---|---|---|---|",
      ...ratioRows.map(
        (r) =>
          `| ${r.p} | ${r.hasSplit ? round(r.ca, 2) : "n/a"} | ${r.hasSplit ? round(r.cl, 2) : "n/a"} | ${fmt(r.wc)} | ${fmt(r.current)} | ${fmt(r.quick)} | ${fmt(r.de)} | ${fmt(r.equityRatio)}% |`,
      ),
    ].join("\n")}${
      anySplit
        ? `\nCurrent/non-current split used for these ratios (assets and liabilities only): ${
            [...items.keys()].filter(
              (i) =>
                (sections.get(i) === "Assets" || sections.get(i) === "Liabilities") &&
                termOf(i) === "current",
            ).length
          } current, ${
            [...items.keys()].filter(
              (i) =>
                (sections.get(i) === "Assets" || sections.get(i) === "Liabilities") &&
                termOf(i) === "non-current",
            ).length
          } non-current, ${unknownTerm.length} of undetermined term${
            unknownTerm.length
              ? ` (EXCLUDED from working capital and the current/quick ratios — name them in the report as needing mapping: ${unknownTerm.slice(0, 10).map(label).join(", ")})`
              : ""
          }.`
        : "\nNote: nothing in the sheet distinguishes current from non-current, so working capital and the current/quick ratios cannot be computed. Say so plainly instead of estimating them."
    }`,
  );

  // 3b. Presentation roll-up — the handful of lines a management report shows.
  const rollup = rollUpBalanceSheet({
    items,
    sections,
    itemCategories,
    periods,
    amount,
    term: termOf,
    label,
  });
  if (rollup.lines.length) {
    const subtotal = (section: BalanceSheetSection, term: "current" | "non-current", p: string) =>
      rollup.lines
        .filter((l) => l.section === section && l.term === term)
        .reduce((a, l) => a + (l.values.get(p) ?? 0), 0);
    const rows: string[] = [];
    let lastKey = "";
    for (const line of rollup.lines) {
      const key = `${line.section}|${line.term}`;
      if (lastKey && key !== lastKey) {
        const [sec, t] = lastKey.split("|") as [BalanceSheetSection, "current" | "non-current"];
        if (sec !== "Equity") {
          rows.push(
            `| **${t === "current" ? "Current" : "Non-current"} ${sec.toLowerCase()}** | ${periods.map((p) => round(subtotal(sec, t, p), 2)).join(" | ")} |${
              rate ? ` ${round(subtotal(sec, t, last) / rate, 2)} |` : ""
            }`,
          );
        }
      }
      rows.push(
        `| ${line.label} | ${periods.map((p) => round(line.values.get(p) ?? 0, 2)).join(" | ")} |${
          rate ? ` ${round((line.values.get(last) ?? 0) / rate, 2)} |` : ""
        }`,
      );
      lastKey = key;
    }
    parts.push(
      `**Presentation roll-up in mINR${rate ? ` (with ${last} also shown in mUSD at ${rate})` : ""} — detail lines grouped into report lines; subtotal rows in the sheet were NOT used as inputs, so nothing is double counted:**\n${[
        `| report line | ${periods.join(" | ")} |${rate ? ` ${last} (mUSD) |` : ""}`,
        `|---|${periods.map(() => "---").join("|")}|${rate ? "---|" : ""}`,
        ...rows,
        `| **TOTAL ASSETS** | ${periods.map((p) => round(sectionTotal("Assets", p), 2)).join(" | ")} |${
          rate ? ` ${round(sectionTotal("Assets", last) / rate, 2)} |` : ""
        }`,
        `| **TOTAL LIABILITIES + EQUITY** | ${periods.map((p) => round(sectionTotal("Liabilities", p) + sectionTotal("Equity", p), 2)).join(" | ")} |${
          rate ? ` ${round((sectionTotal("Liabilities", last) + sectionTotal("Equity", last)) / rate, 2)} |` : ""
        }`,
      ].join("\n")}\nUse these report lines — not the raw line items — when the output has to match a management reporting format.${
        rollup.unmapped.length
          ? `\nDATA ISSUE — ${rollup.unmapped.length} line item(s) matched no report line and are EXCLUDED from the roll-up (they remain in the section totals, so the roll-up will not foot to them). Name these in the report as needing mapping: ${rollup.unmapped.slice(0, 12).map((u) => u.category ?? u.item).join(", ")}.`
          : ""
      }`,
    );
  }

  // 4. Composition at the latest period.
  const composition = [...items.keys()]
    .filter((i) => sections.get(i) !== "Unclassified")
    .map((i) => ({ item: label(i), section: sections.get(i)!, v: amount(i, last) }))
    .filter((r) => r.v !== 0)
    .sort((a, b) => a.section.localeCompare(b.section) || Math.abs(b.v) - Math.abs(a.v));
  const totalAssetsLast = sectionTotal("Assets", last);
  parts.push(
    `**Composition at ${last} (top ${Math.min(composition.length, MAX_BS_LINE_ITEMS)} of ${composition.length} line items):**\n${[
      "| section | line item | amount | share of section % | share of total assets % |",
      "|---|---|---|---|---|",
      ...composition
        .slice(0, MAX_BS_LINE_ITEMS)
        .map(
          (r) =>
            `| ${r.section} | ${r.item} | ${round(r.v, 2)} | ${fmt(pct(r.v, sectionTotal(r.section, last)))}% | ${fmt(pct(r.v, totalAssetsLast))}% |`,
        ),
    ].join("\n")}`,
  );

  // 5. Movement against the board's chosen comparison period.
  if (periods.length >= 2) {
    const first = resolveComparisonPeriod(periods, opts.comparison) ?? periods[0];
    const movement = [...items.keys()]
      .filter((i) => sections.get(i) !== "Unclassified")
      .map((i) => {
        const f = amount(i, first);
        const l = amount(i, last);
        return { item: label(i), section: sections.get(i)!, f, l, change: l - f, pct: growthPct(l, f) };
      })
      .filter((r) => r.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    if (movement.length) {
      parts.push(
        `**Movement ${first} → ${last} (top ${Math.min(movement.length, MAX_BS_LINE_ITEMS)} of ${movement.length} by absolute change):**\n${[
          `| section | line item | ${first} | ${last} | change | change % |`,
          "|---|---|---|---|---|---|",
          ...movement
            .slice(0, MAX_BS_LINE_ITEMS)
            .map(
              (r) =>
                `| ${r.section} | ${r.item} | ${round(r.f, 2)} | ${round(r.l, 2)} | ${round(r.change, 2)} | ${fmt(r.pct)}% |`,
            ),
        ].join("\n")}\nLargest increase: ${movement.find((m) => m.change > 0)?.item ?? "none"}. Largest decrease: ${movement.find((m) => m.change < 0)?.item ?? "none"}.`,
      );
    }
  }

  return parts.join("\n\n");
}

/**
 * The balance sheet as structured data for the exported deck.
 *
 * Deliberately separate from the prompt block above: the deck must show the
 * computed figures, not figures the model re-typed into prose. Same reader and
 * same roll-up, so the deck and the narrative can never disagree.
 */
export function computeBalanceSheetReport(
  source: Source,
  keyColumns: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[] = [],
  opts: {
    usdInrRate?: number | null;
    unitHint?: string | null;
    comparison?: ComparisonBasis | null;
  } = {},
): BalanceSheetReport | null {
  const shape = readBalanceSheet(source.records as Row[], keyColumns ?? []);
  if (!shape) return null;
  const { periods, items, declaredSections, itemCategories, declaredTerms, itemLabels } = shape;

  const label = (key: string) => itemLabels.get(key) ?? key;
  const sections = new Map<string, BalanceSheetSection>();
  for (const item of items.keys()) {
    sections.set(item, declaredSections.get(item) ?? classifyBalanceSheetSection(label(item)));
  }
  const last = periods[periods.length - 1];
  const convention = detectSignConvention(sections, items, last);
  let maxAbs = 0;
  for (const series of items.values()) {
    for (const v of series.values()) maxAbs = Math.max(maxAbs, Math.abs(v));
  }
  const units = resolveUnits(opts.unitHint, maxAbs);
  const amount = (item: string, period: string): number => {
    const raw = (items.get(item)?.get(period) ?? 0) / units.divisor;
    const s = sections.get(item);
    if (convention === "signed" && (s === "Liabilities" || s === "Equity")) return -raw;
    return raw;
  };
  const termOf = (item: string): "current" | "non-current" | "unknown" =>
    declaredTerms.get(item) ?? currentClass(label(item));
  const sectionTotal = (section: BalanceSheetSection, p: string) =>
    [...items.keys()]
      .filter((i) => sections.get(i) === section)
      .reduce((a, i) => a + amount(i, p), 0);

  const rollup = rollUpBalanceSheet({
    items,
    sections,
    itemCategories,
    periods,
    amount,
    term: termOf,
    label,
  });

  const byPeriod = (fn: (p: string) => number): Record<string, number> =>
    Object.fromEntries(periods.map((p) => [p, round(fn(p), 2)]));

  const assets = byPeriod((p) => sectionTotal("Assets", p));
  const liabilities = byPeriod((p) => sectionTotal("Liabilities", p));
  const equity = byPeriod((p) => sectionTotal("Equity", p));



  return {
    periods,
    comparisonPeriod: resolveComparisonPeriod(periods, opts.comparison),
    comparisonPeriods: resolveComparisonPeriods(periods, opts.comparison),
    lines: rollup.lines
      // "Unclassified" can't reach here — the roll-up rejects it — but the
      // report's own type only admits the three real sections.
      .filter((l) => l.section !== "Unclassified")
      .map((l) => ({
        label: l.label,
        section: l.section as "Assets" | "Liabilities" | "Equity",
        term: l.term,
        values: Object.fromEntries(periods.map((p) => [p, round(l.values.get(p) ?? 0, 2)])),
      })),
    totals: { assets, liabilities, equity },
    balances: Object.fromEntries(
      periods.map((p) => {
        const a = assets[p];
        const diff = a - (liabilities[p] + equity[p]);
        return [p, a === 0 ? diff === 0 : Math.abs(diff / a) < 0.005];
      }),
    ),
    units: units.label,
    fxRate: opts.usdInrRate ?? null,
    unmapped: rollup.unmapped.map((u) => u.category ?? u.item),
  };
}

/**
 * Balance sheet charts, built from the same authoritative classification as the
 * tables above: the A/L/E position per period, working capital, and the asset
 * mix at the latest period.
 */
export function computeBalanceSheetCharts(
  source: Source,
  keyColumns: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[] = [],
  opts: { unitHint?: string | null } = {},
): ChartSpec[] {
  const shape = readBalanceSheet(source.records as Row[], keyColumns ?? []);
  if (!shape) return [];
  const { periods, items, declaredSections, declaredTerms, itemLabels } = shape;

  // The sheet's own section column wins where it has one; caption keywords are
  // the fallback for sheets that only carry line item names.
  const label = (key: string) => itemLabels.get(key) ?? key;
  const sections = new Map<string, BalanceSheetSection>();
  for (const item of items.keys()) {
    sections.set(item, declaredSections.get(item) ?? classifyBalanceSheetSection(label(item)));
  }
  const last = periods[periods.length - 1];
  const convention = detectSignConvention(sections, items, last);
  let maxAbs = 0;
  for (const series of items.values()) {
    for (const v of series.values()) maxAbs = Math.max(maxAbs, Math.abs(v));
  }
  const units = resolveUnits(opts.unitHint, maxAbs);
  const amount = (item: string, period: string): number => {
    const raw = (items.get(item)?.get(period) ?? 0) / units.divisor;
    const s = sections.get(item);
    if (convention === "signed" && (s === "Liabilities" || s === "Equity")) return -raw;
    return raw;
  };
  const itemsIn = (section: BalanceSheetSection) =>
    [...items.keys()].filter((i) => sections.get(i) === section);
  const sectionTotal = (section: BalanceSheetSection, p: string) =>
    itemsIn(section).reduce((a, i) => a + amount(i, p), 0);

  const charts: ChartSpec[] = [];
  const shown = periods.slice(-MAX_CHART_POINTS);

  // 1. Assets / liabilities / equity position over time.
  if (shown.length >= 2) {
    charts.push({
      title: "Assets, liabilities and equity by period",
      type: shown.length <= 12 ? "bar" : "line",
      series: (["Assets", "Liabilities", "Equity"] as const)
        .filter((s) => itemsIn(s).length > 0)
        .map((s) => ({
          name: s,
          points: shown.map((p) => ({ x: p, y: round(sectionTotal(s, p), 2) })),
        })),
    });

    // 2. Working capital. Uses the same declared-term-first rule as the ratio
    //    table, so the chart and the table can never disagree.
    const isCurrent = (item: string) =>
      (declaredTerms.get(item) ?? currentClass(label(item))) === "current";
    const wc = shown.map((p) => {
      const ca = itemsIn("Assets")
        .filter(isCurrent)
        .reduce((a, i) => a + amount(i, p), 0);
      const cl = itemsIn("Liabilities")
        .filter(isCurrent)
        .reduce((a, i) => a + amount(i, p), 0);
      return { x: p, y: round(ca - cl, 2) };
    });
    if (wc.some((d) => d.y !== 0)) {
      charts.push({
        title: "Working capital by period",
        type: "bar",
        series: [{ name: "Working capital", points: wc }],
      });
    }
  }

  // 3. Asset mix at the latest period.
  const mix = itemsIn("Assets")
    .map((i) => ({ x: label(i), y: round(amount(i, last), 2) }))
    .filter((d) => d.y > 0)
    .sort((a, b) => b.y - a.y)
    .slice(0, 8);
  if (mix.length >= 2) {
    charts.push({ title: `Asset composition at ${last}`, type: "pie", series: [{ name: "Assets", points: mix }] });
  }

  return charts;
}

/**
 * Coarsen periods for point-in-time data. Unlike `applyTimeGranularity`, which
 * relabels periods and lets downstream code sum them, this keeps only the
 * CLOSING period of each bucket — summing three months of a balance sheet into
 * a quarter would treble the position.
 */
export function applyPointInTimeGranularity(
  records: Row[],
  granularity?: TimeGranularity | null,
): Row[] {
  if (!granularity || granularity === "auto" || !records.length) return records;
  const periodKey = findPeriodKey(records);
  if (!periodKey) return records;

  const relabelled = applyTimeGranularity(records, granularity);
  // Keep the latest original period inside each coarsened bucket.
  const closing = new Map<string, string>();
  records.forEach((r, i) => {
    const bucket = String(relabelled[i][periodKey]);
    const original = String(r[periodKey]);
    const held = closing.get(bucket);
    if (held === undefined || original.localeCompare(held, undefined, { numeric: true }) > 0) {
      closing.set(bucket, original);
    }
  });
  return records
    .map((r, i) => ({ r, bucket: String(relabelled[i][periodKey]), original: String(r[periodKey]) }))
    .filter((x) => closing.get(x.bucket) === x.original)
    .map((x) => ({ ...x.r, [periodKey]: x.bucket }));
}

/**
 * Deterministic breakdowns of key measures by their selected dimension
 * (entity, month, type, …): totals, share, and a period × dimension pivot
 * when the dimension has few enough values.
 */
export function computeDimensionBlock(
  source: Source,
  keyColumns: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[],
): string {
  const allRecords = source.records;
  if (!allRecords.length) return "";
  const periodKey = findPeriodKey(allRecords);
  const numCols = numericKeys(allRecords, periodKey);
  const parts: string[] = [];

  for (const kc of keyColumns) {
    if (!kc.dimension || !numCols.includes(kc.column)) continue;
    if (!(kc.dimension in (allRecords[0] ?? {}))) continue;

    // Restrict to the selected sub-dimensions (unique dimension values), if any.
    const selected = kc.dimensionValues?.length ? new Set(kc.dimensionValues) : null;
    const records = selected
      ? allRecords.filter((r) => selected.has(String(r[kc.dimension!])))
      : allRecords;
    if (!records.length) continue;

    const groups = new Map<string, Row[]>();
    for (const r of records) {
      const value = String(r[kc.dimension]);
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value)!.push(r);
    }
    const grandTotal = sum(records, kc.column);
    const allRows = [...groups.entries()]
      .map(([value, rs]) => ({ value, total: sum(rs, kc.column), count: rs.length }))
      .sort((a, b) => b.total - a.total);

    // Bound high-cardinality dimensions: top values + one aggregated remainder.
    const MAX_DIMENSION_ROWS = 20;
    let rows = allRows;
    let otherLine = "";
    if (allRows.length > MAX_DIMENSION_ROWS) {
      rows = allRows.slice(0, MAX_DIMENSION_ROWS);
      const rest = allRows.slice(MAX_DIMENSION_ROWS);
      const restTotal = rest.reduce((a, r) => a + r.total, 0);
      const restCount = rest.reduce((a, r) => a + r.count, 0);
      otherLine = `| OTHER (${rest.length} more values) | ${round(restTotal, 2)} | ${fmt(pct(restTotal, grandTotal))}% | ${restCount} | ${round(restTotal / Math.max(1, restCount), 2)} |`;
    }

    const table = [
      `| ${kc.dimension} | total ${kc.label} | share % | rows | avg per row |`,
      "|---|---|---|---|---|",
      ...rows.map(
        (r) =>
          `| ${r.value} | ${round(r.total, 2)} | ${fmt(pct(r.total, grandTotal))}% | ${r.count} | ${round(r.total / r.count, 2)} |`,
      ),
      ...(otherLine ? [otherLine] : []),
      `| **TOTAL** | ${round(grandTotal, 2)} | 100% | ${records.length} | ${round(grandTotal / records.length, 2)} |`,
    ].join("\n");
    const scopeNote = selected
      ? `\nScope: restricted to the sub-dimensions selected by the board owner (${[...selected].join(", ")}). Other ${kc.dimension} values are excluded from every figure above, including the total.`
      : "";
    parts.push(`**${kc.label} by ${kc.dimension} (computed):**\n${table}${scopeNote}`);

    // Period × dimension pivot for trend-by-dimension charts.
    if (periodKey && kc.dimension !== periodKey && rows.length >= 2 && rows.length <= 8) {
      const periods: string[] = [];
      for (const r of records) {
        const p = String(r[periodKey]);
        if (!periods.includes(p)) periods.push(p);
      }
      const values = rows.map((r) => r.value);
      const totalLabel = selected ? "TOTAL (selected)" : "TOTAL";
      const pivot = [
        `| ${periodKey} | ${values.join(" | ")} | ${totalLabel} |`,
        `|${Array(values.length + 2).fill("---").join("|")}|`,
        ...periods.map((p) => {
          const cells = values.map((v) => {
            const rs = (groups.get(v) ?? []).filter((r) => String(r[periodKey]) === p);
            return rs.length ? round(sum(rs, kc.column), 2) : 0;
          });
          const total = round(cells.reduce((a, b) => a + b, 0), 2);
          return `| ${p} | ${cells.join(" | ")} | ${total} |`;
        }),
      ].join("\n");
      parts.push(
        `**${kc.label} per ${periodKey} by ${kc.dimension} (computed):**\n${pivot}\nUse the ${totalLabel} column for period-over-period rates of ${kc.label}.`,
      );
    }
  }

  return parts.length
    ? `## Pre-computed dimension breakdowns — ${source.name}\n\n${parts.join("\n\n")}`
    : "";
}

/**
 * Full precomputed-metrics block for one data source. When key columns are
 * configured on the board, statistics are computed only for those measures —
 * the rest of a wide dataset is out of the analysis scope entirely.
 */
export function computeMetricsBlock(
  source: Source,
  keyColumns?: { column: string }[],
): string {
  const records = source.records;
  if (!records.length) return "";
  const periodKey = findPeriodKey(records);
  let numCols = numericKeys(records, periodKey);
  if (keyColumns?.length) {
    const selected = numCols.filter((c) => keyColumns.some((k) => k.column === c));
    if (selected.length) numCols = selected;
  } else if (numCols.length > 40) {
    // Unscoped wide dataset — bound the stats tables.
    numCols = numCols.slice(0, 40);
  }
  if (!numCols.length) return "";

  const parts: string[] = [`## Pre-computed metrics — ${source.name}`];

  // With multiple rows per period (dimensioned data, e.g. one row per entity
  // per month), adjacent-row change columns would compare unrelated rows.
  const uniquePeriods = periodsAreUnique(records, periodKey);

  parts.push(
    `**Column trend stats (computed):**\n${columnStats(records, periodKey, numCols, 12, uniquePeriods)}${
      uniquePeriods
        ? ""
        : `\nNote: multiple rows share the same ${periodKey} (dimensioned data), so row-to-row change rates are not meaningful — use the quarterly and dimension-breakdown tables for period comparisons.`
    }`,
  );

  if (periodKey) {
    const quarters = quarterlyRollup(records, periodKey, numCols);
    if (quarters) {
      const qCols = [periodKey, ...numCols];
      const table = [
        `| ${qCols.join(" | ")} |`,
        `|${qCols.map(() => "---").join("|")}|`,
        ...quarters.map((q) => `| ${qCols.map((c) => q[c]).join(" | ")} |`),
      ].join("\n");
      parts.push(`**Quarterly totals (computed by summing months):**\n${table}`);
      parts.push(
        `**Quarterly column trend stats (computed; "last vs prior" = QoQ, "last vs 4 periods ago" = YoY):**\n${columnStats(quarters, periodKey, numCols, 4)}`,
      );
      const qPnl = pnlMetrics(quarters, periodKey, "Quarterly");
      if (qPnl) parts.push(qPnl);
    }
    // Per-row P&L metrics only make sense when rows are one-per-period.
    if (uniquePeriods) {
      const pnl = pnlMetrics(records, periodKey, quarters ? "Monthly" : "Per-period");
      if (pnl) parts.push(pnl);
    }
    const bs = balanceSheetMetrics(records, periodKey);
    if (bs) parts.push(bs);
  }
  const cf = cashflowMetrics(records);
  if (cf) parts.push(cf);

  return parts.join("\n\n");
}
