"use client";

import { getBoard, saveBoard, ensureDatasetsLoaded } from "./store";
import { getCube } from "./cubes";
import { projectRecordsForScope } from "./promptData";
import { standaloneApiPath } from "./apiPath";
import type {
  AnalysisResult,
  AnalysisThread,
  Board,
  BoardSchedule,
  CustomIntervalUnit,
  Report,
  RunTrigger,
  ScheduleFrequency,
} from "./types";

export const FREQUENCY_MS: Record<Exclude<ScheduleFrequency, "custom">, number> = {
  "15min": 15 * 60_000,
  hourly: 60 * 60_000,
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
  monthly: 30 * 24 * 60 * 60_000,
};

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  "15min": "Every 15 minutes",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom…",
};

export const CUSTOM_UNIT_MS: Record<CustomIntervalUnit, number> = {
  minutes: 60_000,
  hours: 60 * 60_000,
  days: 24 * 60 * 60_000,
  weeks: 7 * 24 * 60 * 60_000,
  months: 30 * 24 * 60 * 60_000,
};

export const CUSTOM_UNITS: CustomIntervalUnit[] = ["minutes", "hours", "days", "weeks", "months"];

/** Smallest custom interval, so a typo can't schedule a run every few seconds. */
export const MIN_CUSTOM_MINUTES = 5;

type ScheduleShape = Pick<BoardSchedule, "frequency" | "customEvery" | "customUnit">;

/** Milliseconds between runs for any schedule, preset or custom. */
export function scheduleIntervalMs(schedule: ScheduleShape): number {
  if (schedule.frequency !== "custom") return FREQUENCY_MS[schedule.frequency];
  const every = Math.max(1, Math.floor(schedule.customEvery ?? 1));
  const unit = schedule.customUnit ?? "days";
  return Math.max(MIN_CUSTOM_MINUTES * 60_000, every * CUSTOM_UNIT_MS[unit]);
}

/** Human-readable frequency, e.g. "Daily" or "Every 3 weeks". */
export function describeFrequency(schedule: ScheduleShape): string {
  if (schedule.frequency !== "custom") return FREQUENCY_LABELS[schedule.frequency];
  const every = Math.max(1, Math.floor(schedule.customEvery ?? 1));
  const unit = schedule.customUnit ?? "days";
  return `Every ${every} ${every === 1 ? unit.replace(/s$/, "") : unit}`;
}

export function nextRunFrom(schedule: ScheduleShape, from = Date.now()): string {
  return new Date(from + scheduleIntervalMs(schedule)).toISOString();
}

/**
 * Largest request body we'll post. The analyze route parses the whole thing
 * into memory, so a few hundred MB takes the server down rather than failing
 * cleanly — which reads to the user as "the app broke when I clicked".
 */
const MAX_PAYLOAD_BYTES = 50_000_000;
const PAYLOAD_SAMPLE_ROWS = 50;

/**
 * Refuse an oversized run with an actionable message instead of crashing the
 * server. Deliberately does NOT truncate rows: every figure in the report is
 * computed from these records, so silently dropping some would produce totals
 * that look authoritative and are wrong.
 */
function assertPayloadIsSendable(records: Record<string, string | number>[], board: Board) {
  if (!records.length) return;
  // Estimate from a sample — stringifying the whole set to measure it would
  // itself allocate the hundreds of MB we're trying to avoid.
  const sample = records.slice(0, PAYLOAD_SAMPLE_ROWS);
  const perRow = JSON.stringify(sample).length / sample.length;
  const estimated = perRow * records.length;
  if (estimated <= MAX_PAYLOAD_BYTES) return;

  const mb = Math.round(estimated / 1_000_000);
  const columns = Object.keys(records[0]).length;
  throw new Error(
    `This run would send about ${mb}MB (${records.length.toLocaleString()} rows × ${columns} columns), which is too large to analyse in one request. ` +
      (board.scopeMode === "all"
        ? "Narrow the column scope on this board — switch to “Selected columns” and map the measures you need, or use “All except…” to drop the columns this analysis does not read."
        : "Reduce the mapped key data columns, or use a coarser time granularity."),
  );
}

/** Notify open pages that board data changed outside their own writes. */
export function announceBoardsUpdated() {
  window.dispatchEvent(new Event("ledgerlm:boards-updated"));
}

/** Where a run is: 0–100, the stage the server is in, and where that stage ends. */
export type AnalysisProgress = { pct: number; until: number; stage: string };

export interface RunAnalysisOptions {
  /** Abort to stop the run. Nothing is stored for a stopped run. */
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
}

/** The user stopped the run before it finished. */
export class AnalysisStoppedError extends Error {
  constructor() {
    super("Analysis stopped — nothing was saved.");
    this.name = "AnalysisStoppedError";
  }
}

/** The embedded app shares LedgerLM's session, including its CSRF protection. */
async function ledgerLmCsrfToken(signal?: AbortSignal): Promise<string> {
  const response = await fetch("/api/auth/csrf-token", {
    credentials: "include",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.csrfToken) {
    throw new Error(payload?.error ?? "Could not establish a secure LedgerLM session. Please sign in again.");
  }
  return payload.csrfToken as string;
}

/**
 * Read the analysis route's newline-delimited stream: progress ticks, then a
 * single result or error line. Resolves with the result; rejects on error or
 * abort.
 */
async function readAnalysisStream(
  res: Response,
  opts: RunAnalysisOptions,
): Promise<AnalysisResult> {
  if (!res.body) throw new Error("The analysis stream was empty.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AnalysisResult | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const msg = JSON.parse(line) as
      | { type: "progress"; pct: number; until: number; stage: string }
      | { type: "result"; result: AnalysisResult }
      | { type: "error"; error: string; status: number };
    if (msg.type === "progress") opts.onProgress?.({ pct: msg.pct, until: msg.until, stage: msg.stage });
    else if (msg.type === "result") result = msg.result;
    else throw new Error(msg.error);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      handle(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  if (buffer.trim()) handle(buffer);
  if (opts.signal?.aborted) throw new AnalysisStoppedError();
  if (!result) throw new Error("The analysis ended without a result. Please retry.");
  return result;
}

/**
 * Run a board's analysis, store the report, and open an analysis thread for it.
 * Returns the updated board. Throws with a user-readable message on failure.
 *
 * A stopped run (opts.signal aborted) throws AnalysisStoppedError and stores
 * nothing — no report, no thread. The board is exactly as it was.
 */
export async function runBoardAnalysis(
  boardId: string,
  trigger: RunTrigger,
  opts: RunAnalysisOptions = {},
): Promise<Board> {
  await ensureDatasetsLoaded();
  const board = getBoard(boardId);
  if (!board) throw new Error("Board not found.");
  const startedAt = Date.now();

  // Entity P&L boards intentionally never copy Enterprise Data into the
  // browser. Each run asks the authenticated LedgerLM proxy to authorize the
  // saved cube selection and invoke the read-only Python calculation service.
  if (board.entityPnl?.cubeId) {
    if (!board.entityPnl.asOf) {
      throw new Error("Choose an as-of month before running the Entity P&L.");
    }
    opts.onProgress?.({ pct: 2, until: 15, stage: "Authorizing the Enterprise cube" });
    let payload: { result?: AnalysisResult; error?: string };
    try {
      const csrfToken = await ledgerLmCsrfToken(opts.signal);
      const res = await fetch("/api/v2/entity-pnl/report-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        signal: opts.signal,
        credentials: "include",
        body: JSON.stringify({
          cube_id: board.entityPnl.cubeId,
          entity: board.entityPnl.entity,
          as_of: board.entityPnl.asOf,
          comparison: board.entityPnl.comparison,
          currency: board.entityPnl.currency,
          cf_version: board.entityPnl.cfVersion,
        }),
      });
      payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.result) {
        throw new Error(payload.error ?? "Could not calculate the Entity P&L from this cube.");
      }
    } catch (error) {
      if (opts.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        throw new AnalysisStoppedError();
      }
      throw error;
    }
    if (opts.signal?.aborted) throw new AnalysisStoppedError();
    opts.onProgress?.({ pct: 88, until: 100, stage: "Saving the governed P&L report" });
    const now = new Date();
    const report: Report = {
      id: crypto.randomUUID(),
      createdAt: now.toISOString(),
      durationMs: Date.now() - startedAt,
      trigger,
      result: payload.result,
    };
    const thread: AnalysisThread = {
      id: crypto.randomUUID(),
      name: `${trigger === "scheduled" ? "Scheduled run" : "Ad-hoc run"} — ${now.toLocaleString([], {
        dateStyle: "short",
        timeStyle: "short",
      })}`,
      createdAt: now.toISOString(),
      trigger,
      reportId: report.id,
      messages: [
        {
          role: "assistant",
          text: `Entity P&L report generated.\n\n${report.result.summary}\n\nAsk me anything about this report or the underlying data.`,
        },
      ],
    };
    const fresh = getBoard(boardId) ?? board;
    const updated: Board = {
      ...fresh,
      reports: [report, ...fresh.reports],
      threads: [thread, ...fresh.threads],
    };
    saveBoard(updated);
    announceBoardsUpdated();
    opts.onProgress?.({ pct: 100, until: 100, stage: "Done" });
    return updated;
  }

  const cube = getCube(board.cubeId);
  if (!cube) throw new Error("No data cube connected to this board.");

  // Only ship the columns in scope — wide datasets are too big otherwise.
  const records = projectRecordsForScope(cube.records, {
    mode: board.scopeMode,
    keyColumns: board.keyColumns,
    excludedColumns: board.excludedColumns,
  });
  assertPayloadIsSendable(records, board);

  opts.onProgress?.({ pct: 1, until: 4, stage: "Sending the data for analysis" });
  let res: Response;
  try {
    res = await fetch(standaloneApiPath("/api/analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      signal: opts.signal,
      body: JSON.stringify({
      templateId: board.templateId,
      boardName: board.name,
      systemPrompt: board.systemPrompt,
      keyColumns: board.keyColumns,
      scopeMode: board.scopeMode,
      excludedColumns: board.excludedColumns,
      reportTemplate: board.reportTemplate,
      timeGranularity: board.timeGranularity,
      comparisonBasis: board.comparisonBasis,
      sources: [{ name: cube.name, description: cube.description, records }],
      }),
    });
  } catch (error) {
    if (opts.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new AnalysisStoppedError();
    }
    throw error;
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ?? `Analysis failed (HTTP ${res.status}).`);
  }

  let result: AnalysisResult;
  try {
    result = await readAnalysisStream(res, opts);
  } catch (error) {
    if (opts.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new AnalysisStoppedError();
    }
    throw error;
  }
  // The last checkpoint before anything is written.
  if (opts.signal?.aborted) throw new AnalysisStoppedError();

  const now = new Date();
  const report: Report = {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    durationMs: Date.now() - startedAt,
    trigger,
    result,
  };
  const thread: AnalysisThread = {
    id: crypto.randomUUID(),
    name: `${trigger === "scheduled" ? "Scheduled run" : "Ad-hoc run"} — ${now.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    })}`,
    createdAt: now.toISOString(),
    trigger,
    reportId: report.id,
    messages: [
      {
        role: "assistant",
        text: `Report generated (${trigger === "scheduled" ? "scheduled" : "ad-hoc"} run).\n\n${result.summary}\n\nAsk me anything about this report or the underlying data.`,
      },
    ],
  };

  // Re-read the board in case another page mutated it while the model ran.
  const fresh = getBoard(boardId) ?? board;
  const updated: Board = {
    ...fresh,
    reports: [report, ...fresh.reports],
    threads: [thread, ...fresh.threads],
  };
  saveBoard(updated);
  announceBoardsUpdated();
  return updated;
}
