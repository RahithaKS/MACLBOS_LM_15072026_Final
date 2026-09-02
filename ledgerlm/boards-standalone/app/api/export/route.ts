import {
  generateReportPdf,
  generateReportPpt,
  type ExportDateLabels,
  type PdfChartSnapshot,
} from "@/lib/exportReport";
import type { Board, Report } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type ExportRequest = {
  kind: "ppt" | "pdf";
  board: Board;
  report: Report;
  chartSnapshots?: PdfChartSnapshot[];
  dateLabels?: ExportDateLabels;
};

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

    const output =
      body.kind === "ppt"
        ? await generateReportPpt(body.board, body.report, body.dateLabels)
        : await generateReportPdf(
            body.board,
            body.report,
            body.chartSnapshots ?? [],
            body.dateLabels,
          );
    return new Response(output, {
      headers: {
        "Content-Type":
          body.kind === "ppt"
            ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            : "application/pdf",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Report export failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Export failed unexpectedly." },
      { status: 500 },
    );
  }
}