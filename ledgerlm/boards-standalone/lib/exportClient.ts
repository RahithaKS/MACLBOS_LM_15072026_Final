"use client";

import {
  capturePdfCharts,
  downloadExportFile,
  reportFileName,
  type PdfChartSnapshot,
} from "./exportReport";
import { standaloneApiPath, standaloneRequestHeaders } from "./apiPath";
import type { Board, Report } from "./types";

type ExportKind = "ppt" | "pdf";

export async function exportReportInBackground(
  kind: ExportKind,
  board: Board,
  report: Report,
  chartsRoot: HTMLElement | null,
  onProgress?: (percent: number, stage: string) => void,
): Promise<void> {
  onProgress?.(2, kind === "ppt" ? "Preparing the PowerPoint export" : "Capturing report charts");
  const chartSnapshots: PdfChartSnapshot[] =
    kind === "pdf" ? await capturePdfCharts(chartsRoot) : [];
  if (kind === "pdf") onProgress?.(8, "Starting the PDF export");
  const createdAt = new Date(report.createdAt);
  const dateLabels = {
    full: createdAt.toLocaleString(),
    medium: createdAt.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
  const response = await fetch(standaloneApiPath("/api/export"), {
    method: "POST",
    credentials: "include",
    headers: await standaloneRequestHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      kind,
      // Export renderers use the board's presentation settings, not its report
      // catalogue or chat history. Excluding those keeps the request bounded.
      board: { ...board, reports: [], threads: [] },
      report,
      chartSnapshots,
      dateLabels,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Export failed (${response.status}).`);
  }

  const started = (await response.json()) as {
    jobId: string;
    state: "queued" | "running" | "completed" | "failed";
    percent: number;
    stage: string;
    error?: string;
  };
  if (!started.jobId) throw new Error("Export did not return a job ID.");
  onProgress?.(started.percent, started.stage);

  const deadline = Date.now() + 15 * 60 * 1000;
  let status = started;
  while (status.state !== "completed") {
    if (status.state === "failed") throw new Error(status.error || "Export failed unexpectedly.");
    if (Date.now() >= deadline) throw new Error("Export timed out. Please try again.");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const statusResponse = await fetch(
      `${standaloneApiPath("/api/export")}?jobId=${encodeURIComponent(started.jobId)}`,
      { credentials: "include" },
    );
    if (!statusResponse.ok) {
      // A busy development or preview proxy can briefly time out while a
      // synchronous PDF section is being laid out. The job remains valid, so
      // retry gateway failures until the overall export deadline.
      if ([502, 503, 504].includes(statusResponse.status)) continue;
      throw new Error(`Export status failed (${statusResponse.status}).`);
    }
    status = (await statusResponse.json()) as typeof status;
    onProgress?.(status.percent, status.stage);
  }

  const downloadResponse = await fetch(
    `${standaloneApiPath("/api/export")}?jobId=${encodeURIComponent(started.jobId)}&download=1`,
    { credentials: "include" },
  );
  if (!downloadResponse.ok) throw new Error(`Export download failed (${downloadResponse.status}).`);
  onProgress?.(99, "Downloading the completed file");
  const output = await downloadResponse.blob();
  downloadExportFile(
    output,
    reportFileName(board, report, kind === "ppt" ? "pptx" : "pdf"),
  );
  onProgress?.(100, "Download started");
}