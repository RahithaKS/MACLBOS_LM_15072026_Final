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
): Promise<void> {
  const chartSnapshots: PdfChartSnapshot[] =
    kind === "pdf" ? await capturePdfCharts(chartsRoot) : [];
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

  const output = await response.blob();
  downloadExportFile(
    output,
    reportFileName(board, report, kind === "ppt" ? "pptx" : "pdf"),
  );
}