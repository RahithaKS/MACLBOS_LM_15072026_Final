import { findPeriodKey, PERIOD_KEYS } from "./metrics";
import type { ScopeMode } from "./types";

// Shapes raw dataset records into a bounded sample for the model prompt.
// Real uploads can be tens of MB — sending them verbatim blows the model
// server's request limit (HTTP 413) and its context window. The pre-computed
// metrics are always calculated over the FULL dataset; the prompt only needs
// enough raw rows to convey the data's shape.

type Row = Record<string, string | number>;

export interface Scope {
  mode?: ScopeMode;
  keyColumns?: { column: string; dimension?: string | null }[];
  excludedColumns?: string[];
}

/**
 * Which columns an analysis may read. Returns null when everything is in
 * scope, so callers can skip projecting entirely.
 *
 * Boards saved before scope modes existed carry no `mode`; for them a key
 * column selection still means "only these", which is what it always meant.
 */
export function resolveScopeColumns(allCols: string[], scope: Scope): string[] | null {
  const mode: ScopeMode = scope.mode ?? (scope.keyColumns?.length ? "selected" : "all");

  if (mode === "exclude") {
    const excluded = new Set(scope.excludedColumns ?? []);
    if (!excluded.size) return null;
    // Period columns are what every analysis is keyed on — excluding them would
    // leave nothing to group by, so they always stay.
    const kept = allCols.filter(
      (c) => !excluded.has(c) || PERIOD_KEYS.includes(c.toLowerCase()),
    );
    return kept.length && kept.length < allCols.length ? kept : null;
  }

  if (mode === "selected" && scope.keyColumns?.length) {
    const wanted: string[] = [];
    // Keep every period-like column (Year AND Month, etc.) so the server can
    // synthesize a composite monthly period.
    for (const c of allCols) {
      if (PERIOD_KEYS.includes(c.toLowerCase())) wanted.push(c);
    }
    for (const kc of scope.keyColumns) {
      if (!wanted.includes(kc.column)) wanted.push(kc.column);
      if (kc.dimension && !wanted.includes(kc.dimension)) wanted.push(kc.dimension);
    }
    const scoped = allCols.filter((c) => wanted.includes(c));
    return scoped.length ? scoped : null;
  }

  return null;
}

/**
 * Client-side projection: strip a dataset down to the columns in scope BEFORE
 * posting it to the server. Wide row-level datasets are otherwise hundreds of
 * MB of JSON per request, which can crash the request handler outright.
 */
export function projectRecordsForScope(records: Row[], scope: Scope = {}): Row[] {
  if (!records.length) return records;
  const allCols = Object.keys(records[0]);
  let cols = resolveScopeColumns(allCols, scope);
  // "All columns" on a very wide sheet still needs a ceiling for the request.
  if (!cols && allCols.length > MAX_UNSCOPED_COLS) cols = allCols.slice(0, MAX_UNSCOPED_COLS);
  if (!cols || cols.length === allCols.length) return records;
  const kept = cols;
  return records.map((r) => {
    const out: Row = {};
    for (const c of kept) out[c] = r[c];
    return out;
  });
}

/** Ceiling when nothing is excluded and no key columns are chosen. */
const MAX_UNSCOPED_COLS = 40;

const MAX_COLS = 30;
const HEAD_JSON_BUDGET = 40_000;
const TAIL_JSON_BUDGET = 10_000;

export function compactSourceForPrompt(
  source: { records: Row[] },
  scope: Scope = {},
): { records: Row[]; note: string } {
  const records = source.records;
  if (!records.length) return { records, note: "" };

  // Column selection follows the board's scope: everything, only the mapped key
  // columns (plus their dimensions and the period), or everything bar the
  // excluded ones. A cap applies when the scope is unrestricted.
  const allCols = Object.keys(records[0]);
  const mode: ScopeMode = scope.mode ?? (scope.keyColumns?.length ? "selected" : "all");
  let cols = resolveScopeColumns(allCols, scope) ?? allCols;
  const scopedByKeyColumns = mode === "selected" && cols.length < allCols.length;
  const scopedByExclusion = mode === "exclude" && cols.length < allCols.length;
  if (cols === allCols && allCols.length > MAX_COLS) cols = allCols.slice(0, MAX_COLS);
  // The period column has to survive whatever the scope says.
  const periodKey = findPeriodKey(records);
  if (periodKey && !cols.includes(periodKey)) cols = [periodKey, ...cols];
  const project = (r: Row): Row => {
    const out: Row = {};
    for (const c of cols) out[c] = r[c];
    return out;
  };

  // Row selection by serialized-size budget: a head slice plus a tail slice,
  // so the sample shows both ends of the dataset.
  const head: Row[] = [];
  let headLen = 0;
  let i = 0;
  for (; i < records.length; i++) {
    const row = project(records[i]);
    const len = JSON.stringify(row).length + 1;
    if (headLen + len > HEAD_JSON_BUDGET) break;
    head.push(row);
    headLen += len;
  }
  const tail: Row[] = [];
  if (i < records.length) {
    let tailLen = 0;
    for (let j = records.length - 1; j > i; j--) {
      const row = project(records[j]);
      const len = JSON.stringify(row).length + 1;
      if (tailLen + len > TAIL_JSON_BUDGET) break;
      tail.unshift(row);
      tailLen += len;
    }
  }

  const included = head.length + tail.length;
  const rowsTruncated = included < records.length;
  const colsTruncated = cols.length < allCols.length;
  const omitted = allCols.filter((c) => !cols.includes(c));
  const colNote = !colsTruncated
    ? ""
    : scopedByKeyColumns
      ? `, columns restricted to the board's selected key data columns and dimensions (${cols.join(", ")}; ${omitted.length} other columns omitted)`
      : scopedByExclusion
        ? `, columns are every column EXCEPT the ones the board owner excluded (${omitted.slice(0, 15).join(", ")}${omitted.length > 15 ? ", …" : ""})`
        : `, ${cols.length} of ${allCols.length} columns (omitted: ${omitted
            .slice(0, 15)
            .join(", ")}${omitted.length > 15 ? ", …" : ""})`;
  const note =
    rowsTruncated || colsTruncated
      ? `Raw data below is a SAMPLE ONLY: ${included} of ${records.length} rows${colNote}${
          rowsTruncated && tail.length ? "; the sample covers the start and end of the dataset" : ""
        }. The pre-computed metrics are calculated over the FULL dataset — treat them as the authoritative figures and use this sample only to understand the data's shape.`
      : "";

  return { records: [...head, ...tail], note };
}
