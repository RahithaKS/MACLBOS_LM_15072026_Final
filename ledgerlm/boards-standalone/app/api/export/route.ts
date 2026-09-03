import { getExportJob, startExportJob, type ExportJobKind } from "@/lib/exportJobs";
import type { ExportDateLabels, PdfChartSnapshot } from "@/lib/exportReport";
import type { Board, Report } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type ExportRequest = {
  kind: ExportJobKind;
  board: Board;
  report: Report;
  chartSnapshots?: PdfChartSnapshot[];
  dateLabels?: ExportDateLabels;
};

function jobResponse(job: ReturnType<typeof getExportJob>) {
  if (!job) return Response.json({ error: "Export job not found or expired." }, { status: 404 });
  return Response.json({
    jobId: job.id,
    state: job.state,
    percent: job.percent,
    stage: job.stage,
    error: job.error,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ExportRequest>;
    if (
      (body.kind !== "ppt" && body.kind !== "pdf") ||
      !body.board ||
      !body.report
    ) {
      return Response.json({ error: "Invalid export request." }, { status: 400 });
    }

    const job = startExportJob({
      kind: body.kind,
      board: body.board,
      report: body.report,
      chartSnapshots: body.chartSnapshots ?? [],
      dateLabels: body.dateLabels,
    });
    return jobResponse(job);
  } catch (error) {
    console.error("Could not start report export", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Export could not be started." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("jobId");
  const job = id ? getExportJob(id) : null;
  if (!job) return jobResponse(job);

  if (url.searchParams.get("download") !== "1" || job.state !== "completed" || !job.output) {
    return jobResponse(job);
  }

  const contentType =
    job.kind === "ppt"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf";
  return new Response(job.output, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(job.output.size),
      "Cache-Control": "private, no-store",
    },
  });
}