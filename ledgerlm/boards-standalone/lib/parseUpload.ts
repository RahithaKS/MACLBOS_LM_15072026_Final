"use client";

import Papa from "papaparse";
import { classifyBalanceSheetSection } from "./metrics";
import type { DataSource } from "./types";

// Shared parser for uploaded datasets. Supports CSV (.csv) and Excel
// (.xls/.xlsx — one data source per non-empty sheet).

type Row = Record<string, string | number>;
type RawRow = Record<string, unknown>;

function cleanRows(rows: RawRow[]): Row[] {
  return rows
    .map((r) => {
      const out: Row = {};
      for (const [key, value] of Object.entries(r)) {
        const k = String(key).trim();
        if (!k) continue;
        if (value instanceof Date) {
          // Normalise Excel dates to ISO day strings so they classify as dimensions.
          out[k] = value.toISOString().slice(0, 10);
        } else if (typeof value === "string") {
          out[k] = value.trim();
        } else if (typeof value === "number" || value == null) {
          out[k] = value as number;
        } else {
          out[k] = String(value);
        }
      }
      return out;
    })
    .filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && v !== ""));
}

export type UploadStage = "reading" | "parsing" | "saving" | "done";
export type UploadProgress = (stage: UploadStage, percent: number) => void;

/** Read a file with real progress events. */
function readFile(file: File, as: "text" | "buffer", onProgress?: UploadProgress) {
  return new Promise<string | ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.("reading", Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = () => resolve(reader.result as string | ArrayBuffer);
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
    if (as === "text") reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

async function parseCsv(file: File, onProgress?: UploadProgress): Promise<DataSource[]> {
  const text = (await readFile(file, "text", onProgress)) as string;
  onProgress?.("parsing", 0);
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const records = cleanRows(parsed.data);
        if (!records.length) {
          reject(new Error(`"${file.name}" appears to be empty or not a valid CSV.`));
          return;
        }
        resolve([
          {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.csv$/i, ""),
            kind: "upload",
            description: `Uploaded CSV · columns: ${Object.keys(records[0]).join(", ")}`,
            records,
          },
        ]);
      },
      error: () => reject(new Error(`Could not parse "${file.name}" as CSV.`)),
    });
  });
}

async function parseExcel(file: File, onProgress?: UploadProgress): Promise<DataSource[]> {
  const XLSX = await import("xlsx");
  const buffer = (await readFile(file, "buffer", onProgress)) as ArrayBuffer;
  onProgress?.("parsing", 0);
  const workbook = XLSX.read(buffer, { cellDates: true });
  const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
  const sources: DataSource[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const records = cleanRows(
      XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null }),
    );
    if (!records.length) continue;
    sources.push({
      id: crypto.randomUUID(),
      name: workbook.SheetNames.length > 1 ? `${baseName} — ${sheetName}` : baseName,
      kind: "upload",
      description: `Uploaded Excel · sheet "${sheetName}" · columns: ${Object.keys(records[0]).join(", ")}`,
      records,
    });
  }
  if (!sources.length) {
    throw new Error(`"${file.name}" contains no readable data rows.`);
  }
  // A balance sheet split across sheets is ONE statement, so it is consumed as
  // one source. The halves are replaced, not supplemented: leaving them behind
  // as selectable cubes invites a board to be pointed at half a balance sheet,
  // which can never be checked and never ties.
  const combined = combineBalanceSheetSheets(sources, baseName);
  if (combined) {
    const halfNames = new Set(combined.replaces);
    return [combined.source, ...sources.filter((s) => !halfNames.has(s.name))];
  }
  return sources;
}

/** A sheet needs this many rows before it can be half a balance sheet. */
const MIN_BALANCE_SHEET_ROWS = 10;

/**
 * Column naming the balance sheet section, when a sheet has one.
 *
 * Deliberately strict. A workbook usually carries working notes beside the
 * statement, and those often start with a heading like "Assets" — one distinct
 * value in a handful of rows. Treating such a sheet as half a balance sheet
 * merges scratch rows into the statement and, worse, adds section values that
 * push the real ones past the engine's detection limit.
 */
function findSectionColumn(records: Row[]): string | null {
  if (records.length < MIN_BALANCE_SHEET_ROWS) return null;
  const keys = Object.keys(records[0] ?? {});
  for (const key of keys) {
    const values = [...new Set(records.map((r) => String(r[key] ?? "")).filter(Boolean))];
    // A real side of a balance sheet always has more than one section
    // ("Current assets" and "Non-current assets", or liabilities and equity).
    if (values.length < 2 || values.length > 8) continue;
    const named = values.filter(
      (v) => classifyBalanceSheetSection(v) !== "Unclassified",
    ).length;
    // Most, not all: real sheets carry typos and stray headings.
    if (named / values.length >= 0.7) return key;
  }
  return null;
}

/** The common section column name used once the halves are merged. */
const SECTION_COLUMN = "Section";

/**
 * A balance sheet exported from Excel normally arrives as two sheets — assets
 * on one, liabilities and equity on the other. Neither half can be checked on
 * its own, because assets only equal liabilities plus equity across both. When
 * the sheets look like two halves of one statement, offer a combined source
 * alongside them so a board can analyse the whole balance sheet.
 *
 * The halves name their section column differently ("Assets" on one sheet,
 * "Liabilities" on the other), so both are renamed to a shared column; without
 * that the merged records would carry two half-populated columns and no single
 * usable section.
 */
function combineBalanceSheetSheets(
  sources: DataSource[],
  baseName: string,
): { source: DataSource; replaces: string[] } | null {
  const halves = sources
    .map((source) => ({ source, sectionColumn: findSectionColumn(source.records) }))
    .filter((h): h is { source: DataSource; sectionColumn: string } => Boolean(h.sectionColumn));
  if (halves.length < 2) return null;

  const covered = new Set<string>();
  for (const { source, sectionColumn } of halves) {
    for (const r of source.records) {
      const section = classifyBalanceSheetSection(String(r[sectionColumn] ?? ""));
      if (section !== "Unclassified") covered.add(section);
    }
  }
  // Only worth combining when the halves actually complete each other.
  if (!covered.has("Assets") || !(covered.has("Liabilities") || covered.has("Equity"))) {
    return null;
  }

  const records: Row[] = [];
  for (const { source, sectionColumn } of halves) {
    for (const r of source.records) {
      const out: Row = { [SECTION_COLUMN]: r[sectionColumn] };
      for (const [k, v] of Object.entries(r)) {
        if (k !== sectionColumn) out[k] = v;
      }
      records.push(out);
    }
  }

  const sheetNames = halves.map((h) => h.source.name.split(" — ").pop());
  return {
    replaces: halves.map((h) => h.source.name),
    source: {
      id: crypto.randomUUID(),
      name: baseName,
      kind: "upload",
      description:
        `Balance sheet read as one statement from ${halves.length} sheets (${sheetNames.join(", ")}), ` +
        `${records.length} line items · columns: ${Object.keys(records[0]).join(", ")}`,
      records,
    },
  };
}

/** Accepted extensions for dataset uploads (input `accept` attribute). */
export const UPLOAD_ACCEPT =
  ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Parse an uploaded data file into one or more data sources. */
export async function parseDataFile(
  file: File,
  onProgress?: UploadProgress,
): Promise<DataSource[]> {
  if (/\.(xlsx|xls)$/i.test(file.name)) return parseExcel(file, onProgress);
  if (/\.csv$/i.test(file.name)) return parseCsv(file, onProgress);
  throw new Error(`"${file.name}" is not a supported format — upload .csv, .xls, or .xlsx.`);
}
