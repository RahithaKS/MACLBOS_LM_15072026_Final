import { NextResponse } from "next/server";
import { z } from "zod";
import { getTemplate } from "@/lib/templates";
import {
  computeMetricsBlock,
  computeVarianceBlock,
  computeTrendBlock,
  computeDimensionBlock,
  computeCharts,
  computeBalanceSheetBlock,
  computeBalanceSheetCharts,
  computeBalanceSheetReport,
  addCompositePeriod,
  applyTimeGranularity,
  applyPointInTimeGranularity,
} from "@/lib/metrics";
import type { ComparisonBasis, ScopeMode, TimeGranularity } from "@/lib/types";
import { parseUsdInrRate } from "@/lib/balanceSheetRollup";
import { compactSourceForPrompt } from "@/lib/promptData";
import { generate, ConfigError, ModelTimeoutError } from "@/lib/llm";
import type { AnalysisResult, DataSource } from "@/lib/types";

export const maxDuration = 300;

// The model sometimes strays from the enums ("stable", "increasing", "column",
// "doughnut"). Coerce near-misses deterministically instead of failing the run.
const directionSchema = z.preprocess((v) => {
  const s = String(v ?? "").toLowerCase();
  if (/^(up|inc|ris|grow|pos|improv|high|favou?rable|expand)/.test(s)) return "up";
  if (/^(down|dec|fall|drop|neg|low|adverse|wors|contract|shrink)/.test(s)) return "down";
  return "flat";
}, z.enum(["up", "down", "flat"]));

const chartTypeSchema = z.preprocess((v) => {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("bar") || s.includes("col")) return "bar";
  if (s.includes("pie") || s.includes("dou") || s.includes("don")) return "pie";
  if (s.includes("area") || s.includes("stack")) return "area";
  return "line";
}, z.enum(["line", "bar", "area", "pie"]));

// The report is generated in two passes. Asking for every section in one reply
// pushes generation past the model gateway's ~120s ceiling on real datasets
// (524), so the dashboard half and the narrative half are requested separately.
const OverviewSchema = z.object({
  summary: z.string(),
  kpis: z.array(
    z.object({
      label: z.string(),
      value: z.coerce.string(),
      change: z.coerce.string().optional().default(""),
      direction: directionSchema.optional().default("flat"),
    }),
  ),
});

// Only used when a board has no key data columns selected, so charts cannot be
// derived deterministically and the model has to supply them.
const ModelChartsSchema = z.object({
  charts: z.array(
    z.object({
      title: z.string(),
      type: chartTypeSchema,
      series: z.array(
        z.object({
          name: z.string(),
          points: z.array(z.object({ x: z.coerce.string(), y: z.coerce.number() })),
        }),
      ),
    }),
  ),
});

const NarrativeSchema = z.object({
  insights: z.array(z.string()),
  risks: z.array(z.string()).optional().default([]),
  tables: z
    .array(
      z.object({
        title: z.string(),
        columns: z.array(z.string()),
        rows: z.array(z.array(z.coerce.string())),
      }),
    )
    .optional()
    .default([]),
  commentary: z
    .array(
      z.object({
        area: z.string(),
        explanation: z.coerce.string().optional().default(""),
        recurrence: z.coerce.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
  actions: z
    .array(
      z.object({
        action: z.string(),
        expectedImpact: z.coerce.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
});

interface AnalyzeRequest {
  templateId: string;
  boardName: string;
  /** Board-level "Analysis Context / System Prompt" set in the create-board modal. */
  systemPrompt?: string;
  /** Labelled cube columns the analysis should prioritise (from board settings). */
  keyColumns?: {
    column: string;
    label: string;
    dimension?: string | null;
    dimensionValues?: string[];
  }[];
  /** User-provided structure the generated analysis should follow. */
  reportTemplate?: string;
  /** Period level to aggregate to ("auto" = finest available). */
  timeGranularity?: TimeGranularity;
  /** Which period movements are measured against. */
  comparisonBasis?: ComparisonBasis;
  /** How much of the cube the analysis may read. */
  scopeMode?: ScopeMode;
  excludedColumns?: string[];
  sources: Pick<DataSource, "name" | "description" | "records">[];
}

const OVERVIEW_FORMAT = `{
  "summary": "one short paragraph, plain language, leading with the overall verdict",
  "kpis": [{ "label": "KPI name", "value": "compact value e.g. ₹748L or 42.3%", "change": "vs prior comparable period", "direction": "up" | "down" | "flat" }]
}`;

const CHARTS_FORMAT = `{
  "charts": [{
    "title": "chart title",
    "type": "line" | "bar" | "area" | "pie",
    "series": [{ "name": "short series name", "points": [{ "x": "label", "y": 123.4 }] }]
  }]
}`;

const NARRATIVE_FORMAT = `{
  "insights": ["specific, quantified finding a CFO would act on"],
  "risks": ["red flag or watch item; [] if none"],
  "commentary": [{ "area": "the measure, period or segment that moved", "explanation": "what the figures attribute it to, without inventing a cause", "recurrence": "one-time" | "ongoing" | "" }],
  "tables": [{ "title": "table title", "columns": ["Col"], "rows": [["cell as string"]] }],
  "actions": [{ "action": "recommended next step", "expectedImpact": "the figure it would move, quantified" }]
}`;

/**
 * Read the variance breach threshold from the board's editable system prompt
 * (e.g. "±5%", "threshold of 8%") so the deterministic tables follow prompt
 * edits, not just the narrative. Defaults to 5.
 */
function parseVarianceThreshold(systemPrompt?: string): number {
  const text = systemPrompt ?? "";
  const m =
    text.match(/(?:±|\+\/-|\+-)\s*(\d+(?:\.\d+)?)\s*%/) ??
    text.match(/threshold\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*%/i) ??
    text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:variance\s*)?threshold/i);
  const parsed = m ? parseFloat(m[1]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 5;
}

function buildContext(body: AnalyzeRequest, analysisPrompt: string, templateName: string) {
  const dataBlock = body.sources
    .map((s) => {
      // Bounded raw sample — full-data figures come from the metrics blocks.
      const { records, note } = compactSourceForPrompt(s, {
        mode: body.scopeMode,
        keyColumns: body.keyColumns,
        excludedColumns: body.excludedColumns,
      });
      return `### ${s.name}\n${s.description}${note ? `\n${note}` : ""}\n\`\`\`json\n${JSON.stringify(records)}\n\`\`\``;
    })
    .join("\n\n");

  const metricsBlock = [
    ...body.sources.map((s) => computeMetricsBlock(s, body.keyColumns)),
    // Breakdowns for key columns that were paired with a dimension.
    ...(body.keyColumns?.some((k) => k.dimension)
      ? body.sources.map((s) => computeDimensionBlock(s, body.keyColumns!))
      : []),
    // Variance tables when the board runs the variance template with a primary
    // measure plus at least one comparison basis selected. The breach
    // threshold follows the board's editable system prompt.
    ...(body.templateId === "variance-analysis" && (body.keyColumns?.length ?? 0) >= 2
      ? body.sources.map((s) =>
          computeVarianceBlock(s, body.keyColumns!, parseVarianceThreshold(body.systemPrompt)),
        )
      : []),
    // Trend tables: direction, slope, volatility and per-area growth over time.
    ...(body.templateId === "trend-analysis" && body.keyColumns?.length
      ? body.sources.map((s) => computeTrendBlock(s, body.keyColumns!))
      : []),
    // Balance sheet tables: the balance check, ratios, composition and movement.
    // Needs no key columns — the line items are read from the sheet itself.
    ...(body.templateId === "balance-sheet-tracker"
      ? body.sources.map((s) =>
          computeBalanceSheetBlock(s, body.keyColumns ?? [], {
            // The board's prompt says what unit the sheet is in and, if a second
            // currency is wanted, at what rate. Neither is guessed.
            usdInrRate: parseUsdInrRate(body.systemPrompt),
            unitHint: body.systemPrompt,
            comparison: body.comparisonBasis,
          }),
        )
      : []),
  ]
    .filter(Boolean)
    .join("\n\n");

  return `You are the analysis engine behind LedgerLM, an AI-first financial intelligence platform
for CFOs. You run pre-defined board analyses over financial data and return structured JSON that
renders as a dashboard.

Board: "${body.boardName}"
Analysis to perform: ${templateName}

${body.systemPrompt ? `Board configuration (from the board owner):\n${body.systemPrompt}\n\nWhere the board configuration conflicts with the template instructions below (thresholds, tone, focus areas), the board configuration wins.\n\n` : ""}${analysisPrompt}${
    body.templateId === "variance-analysis"
      ? `\n\nVariance breach threshold in force: ±${parseVarianceThreshold(body.systemPrompt)}% (taken from the board configuration; the pre-computed breach flags already use it).`
      : ""
  }${
    body.timeGranularity && body.timeGranularity !== "auto"
      ? `\n\nTime granularity: the board owner selected ${body.timeGranularity} periods — the data's period column has been aggregated accordingly; report all periods at that level.`
      : ""
  }${
    body.keyColumns?.length
      ? `\n\nKey data columns (selected and named by the board owner):
${body.keyColumns
  .map(
    (k) =>
      `- "${k.label}" = data column \`${k.column}\`${
        k.dimension
          ? `, broken down by dimension \`${k.dimension}\`${
              k.dimensionValues?.length
                ? ` — RESTRICTED to sub-dimensions: ${k.dimensionValues.join(", ")}`
                : ""
            }`
          : ""
      }`,
  )
  .join("\n")}

Prioritise these data points — the KPIs, charts, and insights should be built primarily from them,
and refer to each one by its given name (e.g. "${body.keyColumns[0].label}"), not the raw column
name. For every key data column with a dimension, use the pre-computed dimension breakdown: include
at least one chart or table split by that dimension and call out the largest contributors. Where a
key data column is RESTRICTED to specific sub-dimensions, every figure for it must cover only those
sub-dimension values — ignore rows with other values, and state the restriction in the summary.
Other columns may be used only as supporting context.`
      : ""
  }${
    // Say plainly how much of the sheet is in play, so "no selection" is read
    // as "analyse everything" rather than "analyse nothing in particular".
    body.scopeMode === "exclude" && body.excludedColumns?.length
      ? `\n\nColumn scope: EVERY column in the data is in scope EXCEPT these, which the board owner excluded and which have already been stripped from the data above: ${body.excludedColumns.join(", ")}. Do not speculate about the excluded columns.`
      : body.scopeMode === "selected" && body.keyColumns?.length
        ? `\n\nColumn scope: ONLY the key data columns listed above are in scope. Every other column has been withheld — do not refer to columns that are not in the data.`
        : `\n\nColumn scope: EVERY column present in the data below is in scope. No columns were withheld, so analyse the dataset as a whole${body.keyColumns?.length ? ", treating the key data columns above as the ones to lead with rather than the only ones you may use" : ""}.`
  }${
    body.reportTemplate?.trim()
      ? `\n\nReport template (how the board owner wants the analysis captured):
"""
${body.reportTemplate.trim()}
"""
Follow this structure as closely as the output format allows, in the given order:
- Narrative sections (executive summary, commentary) map to "summary" and "insights".
- Tabular sections map to "tables" — mirror the requested table titles and columns exactly.
- Requested rankings, driver lists, or recommended actions become numbered "insights" entries
  (prefix each with the template section name, e.g. "Recommended actions: …").
- Only include charts that fit the template's intent.`
      : ""
  }

Data sources:

${dataBlock}

${metricsBlock}

Rules:
- The "Pre-computed metrics" sections above were calculated deterministically in code from the raw
  data. They are authoritative. Whenever a KPI, chart point, insight, or table cell involves a
  derived figure (total, aggregate, margin, ratio, growth rate, runway), COPY the pre-computed
  value verbatim — never do your own arithmetic. Raw per-period values may be copied directly from
  the data sources.
- If a figure you want is in neither the raw data nor the pre-computed metrics, leave it out
  rather than estimating it.
- Currency figures are in the units stated in the data source description.`;
}

/** Pass 1: the verdict and the KPI tiles. */
function buildOverviewPrompt(context: string, chartsAreProvided: boolean) {
  return `${context}
- 4 to 6 KPIs.

This is pass 1 of 2: produce ONLY the summary and the KPI tiles. ${
    chartsAreProvided
      ? "The charts for this report have already been generated from the pre-computed figures — do not produce chart data."
      : "Do not produce chart data here."
  } Written commentary comes later — do not include insights, risks or tables.

Respond with ONLY a valid JSON object matching exactly this shape — no markdown fences, no
commentary before or after:

${OVERVIEW_FORMAT}`;
}

/** Fallback pass: charts, only when no key columns exist to derive them from. */
function buildChartsPrompt(context: string) {
  return `${context}
- 2 to 3 charts; at most 12 points per chart series (use the most recent periods if there are
  more). Use "pie" only for composition breakdowns (single series, one point per slice).
- Keep series names and chart titles short.

Produce ONLY the charts for this report. Every data point must be copied from the pre-computed
figures or the raw data — never estimated.

Respond with ONLY a valid JSON object matching exactly this shape — no markdown fences, no
commentary before or after:

${CHARTS_FORMAT}`;
}

/** Pass 2: the written half — insights, risks, supporting tables. */
function buildNarrativePrompt(context: string, summary: string) {
  return `${context}
- 3 to 6 insights; up to 4 risks; at most 2 tables of at most 12 rows each.
- 2 to 4 root-cause commentary entries. These are SEPARATE from insights: an
  insight ranks what happened, whereas commentary attributes it — which
  dimension value, period or measure the movement traces back to, using the
  pre-computed breakdowns. Do not simply restate the insights.
  CRITICAL: the data shows WHAT moved, not WHY. Never invent a business cause
  (a price change, a one-off charge, a headcount decision, market conditions) —
  those appear nowhere in the data. Attribute the movement to what the figures
  actually show, and where the underlying driver is not visible, say so
  explicitly, e.g. "concentrated in <dimension value>, which accounts for X of
  the Y variance; the underlying driver is not identifiable from this dataset".
  Set "recurrence" to "ongoing" only when the movement appears across multiple
  periods in the data and "one-time" only when it appears in a single period;
  otherwise leave it empty.
- 2 to 4 recommended actions. Each must name a concrete next step and the
  quantified figure it would move, taken from the pre-computed metrics. Do NOT
  invent owners or due dates — those are filled in by the board owner.
- All table cell values must be strings.

This is pass 2 of 2. The dashboard half of this report has already been generated, and its verdict
was:
"""
${summary}
"""
Write the commentary that accompanies it: quantified insights, risk flags, and supporting tables.
Stay consistent with that verdict and reuse the same figures. Do not restate the summary itself.

Respond with ONLY a valid JSON object matching exactly this shape — no markdown fences, no
commentary before or after:

${NARRATIVE_FORMAT}`;
}

/** Pull the first top-level JSON object out of a model reply. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

class InvalidReplyError extends Error {}

/**
 * Generate one pass and validate it, with a single repair round-trip in which
 * the model sees its own output plus the validation errors.
 */
async function generateSection<T>(
  prompt: string,
  schema: z.ZodType<T>,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  let reply = await generate(prompt, { json: true, signal });

  for (let attempt = 0; ; attempt++) {
    let problems: string[];
    try {
      const parsed = schema.safeParse(extractJson(reply));
      if (parsed.success) return parsed.data;
      problems = parsed.error.issues
        .slice(0, 10)
        .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`);
    } catch (e) {
      problems = [`- (root): ${(e as Error).message}`];
    }

    console.warn(
      `[analyze] ${label} failed validation (attempt ${attempt + 1}):`,
      problems.slice(0, 5).join(" "),
      `reply head: ${reply.slice(0, 300)}`,
    );
    if (attempt >= 1) {
      throw new InvalidReplyError(
        `The model returned an invalid ${label} twice. Please retry the analysis.`,
      );
    }
    reply = await generate(
      `${prompt}\n\nYour previous reply was:\n${reply.slice(0, 8000)}\n\nIt failed validation:\n${problems.join(
        "\n",
      )}\n\nReturn ONLY the corrected JSON object.`,
      { json: true, signal },
    );
  }
}


/**
 * A progress tick. `pct` is where the run is now; `until` is where this phase
 * ends, so the client can advance smoothly while a model call is in flight
 * instead of sitting on one number for half a minute.
 */
type ProgressTick = { pct: number; until: number; stage: string };

type AnalysisFailure = { error: string; status: number };

function failureOf(error: unknown): AnalysisFailure {
  if (error instanceof ConfigError) return { error: error.message, status: 401 };
  if (error instanceof InvalidReplyError) return { error: error.message, status: 502 };
  if (error instanceof ModelTimeoutError) return { error: error.message, status: 504 };
  if (error instanceof Error && error.name === "TimeoutError") {
    return { error: "The model took too long to respond. Try fewer data sources or retry.", status: 504 };
  }
  return { error: error instanceof Error ? error.message : "Analysis failed unexpectedly.", status: 502 };
}

/** Thrown when the client stopped the run; nothing is returned or stored. */
class AnalysisAborted extends Error {}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new AnalysisAborted("Analysis stopped.");
}

/**
 * The analysis itself, independent of how the response is delivered. Reports
 * progress as it goes and stops at the next checkpoint once the caller aborts.
 */
async function runAnalysis(
  body: AnalyzeRequest,
  template: NonNullable<ReturnType<typeof getTemplate>>,
  signal: AbortSignal | undefined,
  progress: (tick: ProgressTick) => void,
): Promise<AnalysisResult> {
  const isBalanceSheet = body.templateId === "balance-sheet-tracker";
  progress({ pct: 4, until: 12, stage: "Reading the data cube" });

  // Separate Year + Month columns → synthesize a monthly "Period" column so
  // all period grouping is month-level and never merges months across years.
  // Then re-key periods to the board's chosen granularity. A balance sheet is a
  // point-in-time position, so coarsening it keeps each bucket's CLOSING period
  // instead of summing the months into it.
  const coarsen = isBalanceSheet ? applyPointInTimeGranularity : applyTimeGranularity;
  body.sources = body.sources.map((s) => ({
    ...s,
    records: coarsen(addCompositePeriod(s.records), body.timeGranularity),
  }));
  throwIfAborted(signal);

  progress({
    pct: 12,
    until: 18,
    stage: isBalanceSheet ? "Reading the balance sheet and checking it ties" : "Computing metrics",
  });
  const context = buildContext(body, template.analysisPrompt, template.name);
  console.log(
    `[analyze] board="${body.boardName}" rows=${body.sources.reduce((a, s) => a + s.records.length, 0)} cols=${Object.keys(body.sources[0]?.records[0] ?? {}).length} context=${Math.round(context.length / 1024)}KB`,
  );
  throwIfAborted(signal);

  // Charts come from the same authoritative aggregation as the metrics tables
  // whenever key data columns are selected — no model transcription involved.
  progress({ pct: 18, until: 22, stage: "Deriving charts from the data" });
  const isVariance = body.templateId === "variance-analysis";
  const isTrend = body.templateId === "trend-analysis";
  const derivedCharts = isBalanceSheet
    ? // Balance sheet charts come from the classified line items, so they work
      // whether or not the board owner mapped any key columns.
      body.sources.flatMap((s) =>
        computeBalanceSheetCharts(s, body.keyColumns ?? [], { unitHint: body.systemPrompt }),
      )
    : body.keyColumns?.length
      ? body.sources.flatMap((s) =>
          computeCharts(s, body.keyColumns!, { variance: isVariance, trend: isTrend }),
        )
      : [];
  console.log(`[analyze] ${derivedCharts.length} chart(s) derived deterministically`);
  throwIfAborted(signal);

  const startedAt = Date.now();
  progress({ pct: 22, until: 55, stage: "Drafting the summary and headline KPIs" });
  const overview = await generateSection(
    buildOverviewPrompt(context, derivedCharts.length > 0),
    OverviewSchema,
    "dashboard section",
    signal,
  );
  console.log(`[analyze] pass 1 (summary + KPIs) done in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  throwIfAborted(signal);

  // Only ask the model for charts when there was nothing to derive them from.
  let charts = derivedCharts;
  if (!charts.length) {
    progress({ pct: 55, until: 62, stage: "Building charts" });
    charts = (
      await generateSection(buildChartsPrompt(context), ModelChartsSchema, "charts section", signal)
    ).charts;
    throwIfAborted(signal);
  }

  // Pass 2 is additive: if the gateway times out on it, the dashboard half is
  // still a usable report, so return it rather than discarding the work — and
  // say plainly that the commentary is missing.
  progress({ pct: 62, until: 92, stage: "Writing insights, commentary, risks and actions" });
  let narrative: z.infer<typeof NarrativeSchema>;
  try {
    narrative = await generateSection(
      buildNarrativePrompt(context, overview.summary),
      NarrativeSchema,
      "commentary section",
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw new AnalysisAborted("Analysis stopped.");
    if (!(error instanceof ModelTimeoutError || error instanceof InvalidReplyError)) throw error;
    console.warn(`[analyze] pass 2 (commentary) failed: ${error.message}`);
    narrative = {
      insights: [
        "Written commentary could not be generated for this run — the model server ran out of time on the second pass. The figures above are complete; re-run the analysis to get the insights.",
      ],
      commentary: [],
      risks: [],
      tables: [],
      actions: [],
    };
  }
  throwIfAborted(signal);
  console.log(`[analyze] complete in ${Math.round((Date.now() - startedAt) / 1000)}s`);

  // The exported deck renders these figures directly, so they are computed
  // rather than read back out of the model's prose.
  progress({ pct: 92, until: 99, stage: isBalanceSheet ? "Building the balance sheet position" : "Assembling the report" });
  const balanceSheet = isBalanceSheet
    ? (body.sources
        .map((s) =>
          computeBalanceSheetReport(s, body.keyColumns ?? [], {
            usdInrRate: parseUsdInrRate(body.systemPrompt),
            unitHint: body.systemPrompt,
            comparison: body.comparisonBasis,
          }),
        )
        .find(Boolean) ?? null)
    : null;
  if (isBalanceSheet) {
    console.log(
      `[analyze] balance sheet report: ${balanceSheet ? `${balanceSheet.lines.length} report lines, ${balanceSheet.periods.length} periods` : "not derivable from this cube"}`,
    );
  }
  throwIfAborted(signal);
  progress({ pct: 100, until: 100, stage: "Done" });

  return { ...overview, charts, ...narrative, balanceSheet } as AnalysisResult;
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json(
      {
        error:
          "The dataset payload could not be processed — it is likely too large. Select key data columns on the board so only the relevant columns are submitted, then retry.",
      },
      { status: 413 },
    );
  }
  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }
  if (!body.sources?.length) {
    return NextResponse.json({ error: "Select at least one data source" }, { status: 400 });
  }

  const wantsStream = /application\/x-ndjson/.test(request.headers.get("accept") ?? "");
  const signal = request.signal;

  // Plain JSON for callers that did not ask for progress (scripts, curl).
  if (!wantsStream) {
    try {
      const result = await runAnalysis(body, template, signal, () => {});
      return NextResponse.json({ result });
    } catch (error) {
      if (error instanceof AnalysisAborted) return new Response(null, { status: 499 });
      const f = failureOf(error);
      return NextResponse.json({ error: f.error }, { status: f.status });
    }
  }

  // Newline-delimited JSON: progress ticks as the run advances, then either the
  // result or an error as the final line. Progress is real — each tick marks a
  // stage the server actually reached — not a timer dressed up as one.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          // The client went away; the abort signal ends the work.
        }
      };
      try {
        const result = await runAnalysis(body, template, signal, (tick) =>
          send({ type: "progress", ...tick }),
        );
        send({ type: "result", result });
      } catch (error) {
        if (error instanceof AnalysisAborted || signal.aborted) {
          console.log(`[analyze] board="${body.boardName}" stopped by the user — nothing returned`);
        } else {
          const f = failureOf(error);
          send({ type: "error", error: f.error, status: f.status });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
