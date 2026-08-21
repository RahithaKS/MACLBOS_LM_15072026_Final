"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getBoard, saveBoard, ensureDatasetsLoaded } from "@/lib/store";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { getCube } from "@/lib/cubes";
import {
  runBoardAnalysis,
  describeFrequency,
  AnalysisStoppedError,
  type AnalysisProgress as Progress,
} from "@/lib/runAnalysis";
import AnalysisProgress from "@/components/board/AnalysisProgress";
import { exportReportPpt, exportReportPdf } from "@/lib/exportReport";
import { projectRecordsForScope } from "@/lib/promptData";
import { standaloneApiPath, standaloneRequestHeaders } from "@/lib/apiPath";
import type { AnalysisThread, Board, BoardDataSources, Report, RunTrigger } from "@/lib/types";
import ResultSections from "@/components/board/ResultSections";
import BoardModal, { type BoardModalResult } from "@/components/board/BoardModal";

function TriggerBadge({ trigger }: { trigger: RunTrigger }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        trigger === "scheduled" ? "bg-accent-soft text-accent" : "bg-surface-muted text-muted"
      }`}
    >
      {trigger === "scheduled" ? "Scheduled" : "Ad-hoc"}
    </span>
  );
}

function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function formatRunDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })} at ${d.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

/** Everything a report can be searched by: date, trigger, and its own content. */
function reportSearchText(report: Report): string {
  const r = report.result;
  return [
    formatRunDate(report.createdAt),
    new Date(report.createdAt).toISOString(),
    report.trigger === "scheduled" ? "scheduled" : "ad-hoc adhoc",
    r.summary,
    ...r.kpis.map((k) => `${k.label} ${k.value} ${k.change}`),
    ...r.charts.map((c) => c.title),
    ...r.insights,
    ...r.risks,
    ...r.tables.map((t) => t.title),
  ]
    .join(" ")
    .toLowerCase();
}

const SOURCE_LABELS: { key: keyof BoardDataSources; label: string }[] = [
  { key: "enterpriseData", label: "Enterprise Data" },
  { key: "vaultDocuments", label: "Vault Documents" },
];

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"reports" | "threads">("reports");
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stopping, setStopping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [exporting, setExporting] = useState<{ kind: "ppt" | "pdf"; reportId: string } | null>(null);
  const [reportQuery, setReportQuery] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const reportRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      // Datasets live in IndexedDB; hydrate before resolving the board's cube.
      await ensureDatasetsLoaded();
      const b = getBoard(params.id);
      if (!b) setNotFound(true);
      else setBoard(b);
    }
    load();
    // Reload when the scheduler (or another page) updates boards.
    window.addEventListener("ledgerlm:boards-updated", load);
    return () => window.removeEventListener("ledgerlm:boards-updated", load);
  }, [params.id]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [board?.threads, activeThreadId, chatBusy]);

  const template = board ? (getTemplate(board.templateId) ?? TEMPLATES[0]) : undefined;
  const cube = getCube(board?.cubeId ?? null);
  const isEntityPnl = board?.templateId === "entity-pnl";
  const isKpiReport = board?.templateId === "kpi-metrics";
  const hasEntityPnlSelection = Boolean(board?.entityPnl?.cubeId && board.entityPnl.asOf);
  const hasKpiSelection = Boolean(board?.kpiReport?.cubeId && board.kpiReport.year && board.kpiReport.month);
  const activeThread = board?.threads.find((t) => t.id === activeThreadId) ?? null;
  const latestReport = board?.reports[0] ?? null;
  const activeReport =
    board?.reports.find((r) => r.id === activeReportId) ?? latestReport ?? null;


  const filteredReports = useMemo(() => {
    const reports = board?.reports ?? [];
    const q = reportQuery.trim().toLowerCase();
    if (!q) return reports;
    const terms = q.split(/\s+/);
    return reports.filter((r) => {
      const haystack = reportSearchText(r);
      return terms.every((t) => haystack.includes(t));
    });
  }, [board?.reports, reportQuery]);

  function update(next: Board) {
    saveBoard(next);
    setBoard(next);
  }

  function newThread() {
    if (!board) return;
    const thread: AnalysisThread = {
      id: crypto.randomUUID(),
      name: `${board.name} - Analysis`,
      createdAt: new Date().toISOString(),
      trigger: "adhoc",
      reportId: null,
      messages: [],
    };
    update({ ...board, threads: [thread, ...board.threads] });
    setTab("threads");
    setActiveThreadId(thread.id);
  }

  async function runAnalysis() {
    if (!board || !template || (!cube && !hasEntityPnlSelection && !hasKpiSelection) || running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setStopping(false);
    setError(null);
    setNotice(null);
    setProgress({ pct: 0, until: 4, stage: "Starting" });
    try {
      const updated = await runBoardAnalysis(board.id, "adhoc", {
        signal: controller.signal,
        onProgress: setProgress,
      });
      setProgress({ pct: 100, until: 100, stage: "Done" });
      setBoard(updated);
      setActiveReportId(updated.reports[0]?.id ?? null);
    } catch (e) {
      if (e instanceof AnalysisStoppedError || controller.signal.aborted) {
        // The board is exactly as it was: no report, no thread.
        setNotice("Analysis stopped — nothing was saved.");
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed unexpectedly.");
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      setStopping(false);
      // Leave a completed bar on screen briefly so the finish registers.
      setTimeout(() => setProgress(null), 900);
    }
  }

  function stopAnalysis() {
    if (!abortRef.current) return;
    setStopping(true);
    abortRef.current.abort();
  }

  async function runExport(kind: "ppt" | "pdf", report: Report) {
    if (!board || exporting) return;
    setExporting({ kind, reportId: report.id });
    setError(null);
    try {
      if (kind === "ppt") await exportReportPpt(board, report);
      else await exportReportPdf(board, report, reportRoot.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed unexpectedly.");
    } finally {
      setExporting(null);
    }
  }

  /**
   * Two exports, two purposes. PPT is the deliverable: it follows the board's
   * uploaded report format and builds its charts natively, so any run in the
   * catalogue can be exported directly. PDF is the readable summary of what
   * Board AI generated for the run being viewed; it photographs the charts on
   * screen, which is why it is only offered on the open report.
   */
  function requestExport(kind: "ppt" | "pdf", report: Report) {
    if (exporting) return;
    runExport(kind, report);
  }

  async function sendChat() {
    if (!board || !activeThread || !chatInput.trim() || chatBusy) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatBusy(true);
    setError(null);

    const withUser = {
      ...board,
      threads: board.threads.map((t) =>
        t.id === activeThread.id
          ? { ...t, messages: [...t.messages, { role: "user" as const, text }] }
          : t,
      ),
    };
    update(withUser);

    try {
      const thread = withUser.threads.find((t) => t.id === activeThread.id)!;
      const res = await fetch(standaloneApiPath("/api/chat"), {
        method: "POST",
        headers: await standaloneRequestHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          boardName: board.name,
          systemPrompt: board.systemPrompt,
          cube: cube
            ? {
                name: cube.name,
                description: cube.description,
                records: projectRecordsForScope(cube.records, {
                  mode: board.scopeMode,
                  keyColumns: board.keyColumns,
                  excludedColumns: board.excludedColumns,
                }),
              }
            : null,
          messages: thread.messages,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.reply) {
        setError(payload?.error ?? `Chat failed (HTTP ${res.status}).`);
        return;
      }
      update({
        ...withUser,
        threads: withUser.threads.map((t) =>
          t.id === activeThread.id
            ? { ...t, messages: [...t.messages, { role: "assistant" as const, text: payload.reply }] }
            : t,
        ),
      });
    } catch {
      setError("Could not reach the chat service.");
    } finally {
      setChatBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="grid min-h-[80vh] place-items-center rounded-2xl bg-surface">
        <div className="text-center">
          <p className="text-lg font-medium">Board not found.</p>
          <Link href="/boards" className="mt-3 inline-block text-accent hover:underline">
            ← Back to Boards
          </Link>
        </div>
      </div>
    );
  }

  if (!board || !template) return null;

  return (
    <div className="standalone-page-shell rounded-2xl bg-surface shadow-sm">
      <header className="standalone-page-header flex flex-wrap items-center justify-between gap-3 rounded-t-2xl bg-band px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/boards" aria-label="Back to Boards" className="text-primary-deep/70 hover:text-primary-deep">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
              <path d="M11.5 4 5.5 10l6 6M5.5 10H17" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="font-display text-xl font-semibold">{board.name}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-accent-soft"
          >
            Edit Board
          </button>
          <button
            onClick={newThread}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
              <path d="M17 12.5a1.5 1.5 0 0 1-1.5 1.5H7l-4 3.5V5A1.5 1.5 0 0 1 4.5 3.5h11A1.5 1.5 0 0 1 17 5v7.5Z" strokeLinejoin="round" />
            </svg>
            New Analysis
          </button>
        </div>
      </header>

      <div className="standalone-page-content px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Description</p>
        <p className="mt-1.5 text-[15px]">{board.description || template.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SOURCE_LABELS.filter((s) => board.dataSources[s.key]).map((s) => (
            <span
              key={s.key}
              className="rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-primary-deep"
            >
              {s.label}
            </span>
          ))}
        </div>

        {/* Analysis scope — what this board actually reads. Sits directly under
            the description so it frames everything below it. */}
        {!cube && !isEntityPnl && !isKpiReport ? (
          <div className="mt-5 rounded-xl border border-border px-6 py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-muted" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="12" cy="6" rx="7.5" ry="3" />
                <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
              </svg>
            </span>
            <p className="mt-3 font-display text-base font-semibold">No data cube connected</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              Edit this board and connect a data cube to enable Smart Analysis reports.
            </p>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-accent-soft"
            >
              Connect Cube
            </button>
          </div>
        ) : isEntityPnl ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{board.entityPnl?.cubeName || "Enterprise Data cube"}</p>
              <p className="mt-1 text-xs text-muted">
                {board.entityPnl?.entity || "All entities"} · {board.entityPnl?.asOf || "Select an as-of month"} ·{" "}
                {board.entityPnl?.comparison === "yoy" ? "YoY YTD comparison" : "QoQ MTD comparison"} ·{" "}
                {board.entityPnl?.currency ?? "USD"}
                {board.entityPnl?.cfVersion ? ` · ${board.entityPnl.cfVersion} shown separately` : ""}
              </p>
              <p className="mt-1.5 text-[11px] text-muted">
                Every run reads the authorized cube through the governed, read-only P&amp;L service.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={!hasEntityPnlSelection || running}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {board.reports.length ? "Re-run Analysis" : "Run Analysis"}
            </button>
          </div>
        ) : isKpiReport ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{board.kpiReport?.cubeName || "KPI Enterprise cube"}</p>
              <p className="mt-1 text-xs text-muted">
                {board.kpiReport?.entity || "All entities (excludes World Wide)"} ·{" "}
                {new Date(Date.UTC(board.kpiReport?.year ?? 2025, (board.kpiReport?.month ?? 1) - 1, 1)).toLocaleString(
                  "en-US",
                  { month: "long", year: "numeric" },
                )} · {board.kpiReport?.forecastScenario || "YTD Forecast"}
              </p>
              <p className="mt-1.5 text-[11px] text-muted">
                Every run reads the authorized cube through the governed, read-only KPI service.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={!hasKpiSelection || running}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {board.reports.length ? "Re-run Analysis" : "Run Analysis"}
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-muted">
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-primary-deep" stroke="currentColor" strokeWidth="1.5">
                  <ellipse cx="10" cy="5" rx="6.5" ry="2.5" />
                  <path d="M3.5 5v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V5M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{cube?.name}</p>
                <p className="line-clamp-2 text-xs text-muted" title={cube?.description}>
                  {cube?.description}
                  {board.timeGranularity !== "auto" ? ` · ${board.timeGranularity} granularity` : ""}
                  {board.schedule.enabled && board.schedule.nextRunAt
                    ? ` · ${describeFrequency(board.schedule).toLowerCase()} schedule, next run ${new Date(board.schedule.nextRunAt).toLocaleString()}`
                    : ""}
                </p>
                {(board.keyColumns.length > 0 || board.scopeMode !== "selected") && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-deep">
                      {board.scopeMode === "selected"
                        ? "Analysis scope — only these data points are analysed"
                        : board.scopeMode === "exclude"
                          ? `Analysis scope — all columns except ${countLabel(board.excludedColumns.length, "excluded column")}`
                          : "Analysis scope — all columns in the sheet are analysed"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {board.keyColumns.map((k) => (
                        <span
                          key={k.column}
                          className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-primary-deep"
                          title={
                            k.dimensionValues?.length
                              ? `${k.column} by ${k.dimension}: ${k.dimensionValues.join(", ")}`
                              : k.dimension
                                ? `${k.column} by ${k.dimension}`
                                : k.column
                          }
                        >
                          {k.label}
                          {k.dimension && (
                            <span className="text-accent">
                              by {k.dimension}
                              {k.dimensionValues?.length ? ` (${k.dimensionValues.length})` : ""}
                            </span>
                          )}
                        </span>
                      ))}
                      <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[11px] text-muted">
                        {board.scopeMode === "selected"
                          ? "other columns excluded"
                          : board.scopeMode === "exclude"
                            ? board.excludedColumns.join(", ") || "nothing excluded"
                            : "all other columns also in scope"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!running && (
              <button
                onClick={runAnalysis}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {board.reports.length ? "Re-run Analysis" : "Run Analysis"}
              </button>
            )}
          </div>
        )}

        {/* The run in progress: where it is, and the means to stop it. */}
        {progress && (
          <div className="mt-5">
            <AnalysisProgress progress={progress} onStop={stopAnalysis} stopping={stopping} />
          </div>
        )}
        {notice && !progress && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center gap-6 border-b border-border">
          <button
            onClick={() => setTab("reports")}
            className={`flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              tab === "reports"
                ? "border-primary-deep text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
              <path d="M3.5 16.5v-6M8 16.5V7M12.5 16.5v-9.5M17 16.5V3.5" strokeLinecap="round" />
            </svg>
            Reports
            {board.reports.length > 0 && (
              <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-primary-deep">
                {board.reports.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("threads")}
            className={`flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              tab === "threads"
                ? "border-primary-deep text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
              <path d="M17 12.5a1.5 1.5 0 0 1-1.5 1.5H7l-4 3.5V5A1.5 1.5 0 0 1 4.5 3.5h11A1.5 1.5 0 0 1 17 5v7.5Z" strokeLinejoin="round" />
            </svg>
            Analysis Threads
            {board.threads.length > 0 && (
              <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-primary-deep">
                {board.threads.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {tab === "reports" && (cube || isEntityPnl || isKpiReport) && (
          <div className="mt-5 space-y-5">
            {board.reports.length === 0
              ? !running && (
                  <div className="rounded-xl border border-border px-6 py-12 text-center">
                    <p className="font-display text-lg font-semibold">No reports yet</p>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                      Run Analysis to generate a Smart Analysis report from {isEntityPnl
                        ? board.entityPnl?.cubeName || "the selected Enterprise cube"
                        : isKpiReport
                          ? board.kpiReport?.cubeName || "the selected KPI Enterprise cube"
                          : cube?.name}
                      {board.schedule.enabled ? ", or wait for the next scheduled run" : ""}.
                    </p>
                  </div>
                )
              : (
                <>
                  {/* Last run — the headline the board owner checks first. */}
                  {latestReport && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent-soft/40 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-deep">
                          Last run
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {formatRunDate(latestReport.createdAt)}
                          <TriggerBadge trigger={latestReport.trigger} />
                          <span className="text-xs font-normal text-muted">
                            {countLabel(latestReport.result.kpis.length, "KPI")} ·{" "}
                            {countLabel(latestReport.result.charts.length, "chart")} ·{" "}
                            {countLabel(latestReport.result.insights.length, "insight")}
                            {latestReport.result.risks.length
                              ? ` · ${countLabel(latestReport.result.risks.length, "risk")}`
                              : ""}
                          </span>
                        </p>
                      </div>
                      {activeReport?.id !== latestReport.id && (
                        <button
                          onClick={() => setActiveReportId(latestReport.id)}
                          className="rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-medium hover:bg-accent-soft"
                        >
                          View latest report
                        </button>
                      )}
                    </div>
                  )}

                  {/* Report catalogue — every run, searchable, each downloadable. */}
                  <div className="rounded-xl border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Report catalogue ({board.reports.length})
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          Each run downloads as a presentation in the board&apos;s report format
                          {board.templateAnatomy ? ` (${board.templateAnatomy.sourceFile})` : ""}. Open a
                          run to download the AI summary as PDF.
                        </p>
                      </div>
                      <div className="relative">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          <circle cx="9" cy="9" r="5.5" />
                          <path d="m13.5 13.5 3 3" strokeLinecap="round" />
                        </svg>
                        <input
                          value={reportQuery}
                          onChange={(e) => setReportQuery(e.target.value)}
                          placeholder="Search by date, type, or content…"
                          className="w-64 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {filteredReports.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-muted">
                        No reports match “{reportQuery}”.
                      </p>
                    ) : (
                      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                        {filteredReports.map((report) => {
                          const active = report.id === activeReport?.id;
                          const busyKind =
                            exporting?.reportId === report.id ? exporting.kind : null;
                          return (
                            <li
                              key={report.id}
                              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${
                                active ? "bg-accent-soft/50" : "hover:bg-surface-muted/50"
                              }`}
                            >
                              <button
                                onClick={() => setActiveReportId(report.id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    {formatRunDate(report.createdAt)}
                                  </span>
                                  <TriggerBadge trigger={report.trigger} />
                                  {report.id === latestReport?.id && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-deep">
                                      Latest
                                    </span>
                                  )}
                                  {active && (
                                    <span className="text-[11px] font-medium text-accent">
                                      Viewing
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                                  {report.result.summary}
                                </span>
                              </button>
                              <span className="flex shrink-0 items-center gap-2">
                                <button
                                  onClick={() => requestExport("ppt", report)}
                                  disabled={exporting !== null}
                                  title={
                                    board.templateAnatomy
                                      ? `Presentation in the format of ${board.templateAnatomy.sourceFile}`
                                      : "Presentation in the report format"
                                  }
                                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.6">
                                    <path d="M10 12V3M6.8 9 10 12.2 13.2 9M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  {busyKind === "ppt" ? "Exporting…" : "PPT"}
                                </button>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* The report being viewed. */}
                  {activeReport && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          {activeReport.id === latestReport?.id ? "Last run report" : "Report"} ·{" "}
                          {formatRunDate(activeReport.createdAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => requestExport("pdf", activeReport)}
                            disabled={exporting !== null}
                            title="PDF summary of what Board AI generated for this run"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.6">
                              <path d="M10 12V3M6.8 9 10 12.2 13.2 9M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {exporting?.kind === "pdf" ? "Exporting…" : "Download summary PDF"}
                          </button>
                        </div>
                      </div>
                      <div ref={reportRoot} className="mt-3">
                        <ResultSections result={activeReport.result} />
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>
        )}

        {tab === "threads" && (
          <div className="mt-5">
            {!activeThread ? (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={newThread}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
                      <path d="M17 12.5a1.5 1.5 0 0 1-1.5 1.5H7l-4 3.5V5A1.5 1.5 0 0 1 4.5 3.5h11A1.5 1.5 0 0 1 17 5v7.5Z" strokeLinejoin="round" />
                    </svg>
                    New Chat
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {board.threads.length === 0 && (
                    <p className="rounded-xl border border-border px-6 py-10 text-center text-sm text-muted">
                      No analysis threads yet. Start one with New Chat.
                    </p>
                  )}
                  {board.threads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setActiveThreadId(thread.id)}
                      className="flex w-full max-w-2xl items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-sm hover:border-primary/40"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-muted text-primary-deep">
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
                          <path d="M17 12.5a1.5 1.5 0 0 1-1.5 1.5H7l-4 3.5V5A1.5 1.5 0 0 1 4.5 3.5h11A1.5 1.5 0 0 1 17 5v7.5Z" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {thread.name}
                          <TriggerBadge trigger={thread.trigger} />
                        </span>
                        <span className="block text-xs text-muted">
                          {new Date(thread.createdAt).toLocaleDateString()} at{" "}
                          {new Date(thread.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[60vh] flex-col rounded-xl border border-border">
                <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                  <button
                    onClick={() => setActiveThreadId(null)}
                    aria-label="Back to threads"
                    className="text-muted hover:text-foreground"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12.5 4 6.5 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <p className="text-sm font-semibold">{activeThread.name}</p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {activeThread.messages.length === 0 && (
                    <p className="text-sm text-muted">
                      Ask anything about {cube ? `the ${cube.name} data` : "this board"} — e.g.
                      &quot;What are the top 3 expense drivers this quarter?&quot;
                    </p>
                  )}
                  {activeThread.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-white"
                            : "border border-border bg-background/60"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatBusy && <p className="text-sm text-muted">Analyzing…</p>}
                  <div ref={chatEnd} />
                </div>
                <div className="flex items-center gap-3 border-t border-border px-5 py-3">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChat();
                    }}
                    placeholder="Ask a question about this board's data…"
                    className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatBusy || !chatInput.trim()}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <BoardModal
          mode="edit"
          template={template}
          board={board}
          onClose={() => setEditing(false)}
          onSubmit={(values: BoardModalResult) => {
            update({ ...board, ...values });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
