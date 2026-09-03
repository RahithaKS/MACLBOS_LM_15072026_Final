import {
  generateReportPdf,
  generateReportPpt,
  type ExportDateLabels,
  type ExportProgress,
  type PdfChartSnapshot,
} from "@/lib/exportReport";
import type { Board, Report } from "@/lib/types";

export type ExportJobKind = "ppt" | "pdf";
export type ExportJobState = "queued" | "running" | "completed" | "failed";

export type ExportJob = {
  id: string;
  kind: ExportJobKind;
  state: ExportJobState;
  percent: number;
  stage: string;
  output?: Blob;
  error?: string;
  createdAt: number;
  expiresAt: number;
};

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, ExportJob>();

function cleanupExpiredJobs(now = Date.now()) {
  for (const [id, job] of jobs) {
    if (job.expiresAt <= now) jobs.delete(id);
  }
}

export function getExportJob(id: string): ExportJob | null {
  cleanupExpiredJobs();
  return jobs.get(id) ?? null;
}

export function startExportJob(input: {
  kind: ExportJobKind;
  board: Board;
  report: Report;
  chartSnapshots: PdfChartSnapshot[];
  dateLabels?: ExportDateLabels;
}): ExportJob {
  cleanupExpiredJobs();
  const now = Date.now();
  const job: ExportJob = {
    id: crypto.randomUUID(),
    kind: input.kind,
    state: "queued",
    percent: 0,
    stage: "Queued for export",
    createdAt: now,
    expiresAt: now + JOB_TTL_MS,
  };
  jobs.set(job.id, job);

  void processExportJob(job, input);
  return job;
}

async function processExportJob(
  job: ExportJob,
  input: {
    kind: ExportJobKind;
    board: Board;
    report: Report;
    chartSnapshots: PdfChartSnapshot[];
    dateLabels?: ExportDateLabels;
  },
) {
  const onProgress: ExportProgress = (percent, stage) => {
    job.state = "running";
    job.percent = Math.max(job.percent, Math.min(99, Math.round(percent)));
    job.stage = stage;
  };

  try {
    onProgress(1, "Starting export");
    job.state = "running";
    job.output =
      input.kind === "ppt"
        ? await generateReportPpt(input.board, input.report, input.dateLabels, onProgress)
        : await generateReportPdf(
            input.board,
            input.report,
            input.chartSnapshots,
            input.dateLabels,
            onProgress,
          );
    job.state = "completed";
    job.percent = 100;
    job.stage = "Ready to download";
  } catch (error) {
    job.state = "failed";
    job.error = error instanceof Error ? error.message : "Export failed unexpectedly.";
    job.stage = "Export failed";
  }
}