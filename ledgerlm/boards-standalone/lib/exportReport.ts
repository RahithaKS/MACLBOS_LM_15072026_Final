"use client";

import { tidyProse } from "@/lib/prose";
import type {
  BalanceSheetLine,
  Board,
  ChartSpec,
  PptTemplateAnatomy,
  PptTheme,
  Report,
  TemplateRegion,
  TemplateRegionRole,
  TemplateSlideAnatomy,
} from "./types";

// Client-side report exports. PPT uses native (editable) PowerPoint charts;
// PDF embeds PNG snapshots of the charts rendered on the page.

const SERIES_COLORS = ["439798", "bc4096", "8fc3c4", "da95c2"];
const DEEP = "1c3230";
const MUTED = "5f7472";

function fileStamp(board: Board, report: Report) {
  return `${board.name.replace(/[^\w\- ]+/g, "")} — ${new Date(report.createdAt)
    .toLocaleString([], { dateStyle: "short", timeStyle: "short" })
    .replace(/[/:]/g, "-")}`;
}

/** Align a ChartSpec's series onto a shared x-label axis. */
function alignSeries(spec: ChartSpec): { labels: string[]; series: { name: string; values: (number | null)[] }[] } {
  const labels: string[] = [];
  for (const s of spec.series) {
    for (const p of s.points) if (!labels.includes(p.x)) labels.push(p.x);
  }
  return {
    labels,
    series: spec.series.map((s) => ({
      name: s.name,
      values: labels.map((x) => s.points.find((p) => p.x === x)?.y ?? null),
    })),
  };
}

/**
 * Lay a waterfall out as stacked series: a hidden riser lifts each bar to where
 * it starts, and each bar type gets its own series so it can be coloured
 * independently. Exactly one of totals/up/down is non-zero per category.
 */
function waterfallSeries(spec: ChartSpec) {
  const points = spec.series[0]?.points ?? [];
  const labels: string[] = [];
  const risers: number[] = [];
  const totals: number[] = [];
  const up: number[] = [];
  const down: number[] = [];
  let running = 0;
  points.forEach((p, i) => {
    const isTotal = i === 0 || i === points.length - 1;
    labels.push(p.x);
    if (isTotal) {
      running = p.y;
      risers.push(0);
      totals.push(p.y);
      up.push(0);
      down.push(0);
      return;
    }
    risers.push(p.y >= 0 ? running : running + p.y);
    totals.push(0);
    up.push(p.y >= 0 ? p.y : 0);
    down.push(p.y < 0 ? -p.y : 0);
    running += p.y;
  });
  return { labels, risers, totals, up, down };
}

/** Read one scheme color from theme XML: srgbClr value or sysClr fallback. */
function schemeColor(themeXml: string, key: string): string | null {
  const m = themeXml.match(
    new RegExp(`<a:${key}>[\\s\\S]*?(?:srgbClr val="([0-9A-Fa-f]{6})"|sysClr[^>]*lastClr="([0-9A-Fa-f]{6})")`),
  );
  return m ? (m[1] ?? m[2]).toUpperCase() : null;
}

/** Parse the deck's color scheme, font pair, and background from theme/master XML. */
function parseTheme(fileName: string, themeXml: string, masterXml: string | null): PptTheme | null {
  const dk1 = schemeColor(themeXml, "dk1");
  const lt1 = schemeColor(themeXml, "lt1");
  if (!dk1 || !lt1) return null;
  const dk2 = schemeColor(themeXml, "dk2") ?? dk1;
  const lt2 = schemeColor(themeXml, "lt2") ?? lt1;
  const accents = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"]
    .map((k) => schemeColor(themeXml, k))
    .filter((c): c is string => Boolean(c));

  const font = (kind: "major" | "minor") =>
    themeXml.match(new RegExp(`<a:${kind}Font>[\\s\\S]*?<a:latin typeface="([^"]+)"`))?.[1] ?? "";

  // Master background: explicit srgbClr, or a scheme reference (bg1/bg2/...).
  let background = lt1;
  if (masterXml) {
    const bg = masterXml.match(/<p:bg>[\s\S]*?(?:srgbClr val="([0-9A-Fa-f]{6})"|schemeClr val="(\w+)")/);
    if (bg?.[1]) background = bg[1].toUpperCase();
    else if (bg?.[2]) {
      const map: Record<string, string> = { bg1: lt1, bg2: lt2, lt1, lt2, tx1: dk1, tx2: dk2, dk1, dk2 };
      background = map[bg[2]] ?? lt1;
    }
  }

  return {
    sourceFile: fileName,
    colors: { dk1, dk2, lt1, lt2, accents },
    fonts: { major: font("major") || "Calibri Light", minor: font("minor") || "Calibri" },
    background,
  };
}

/**
 * Extract the slide-text outline and the corporate theme (colors, fonts,
 * background) from a .pptx file.
 */
export async function extractPptxTemplate(
  file: File,
): Promise<{ outline: string; theme: PptTheme | null }> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (!slideNames.length) throw new Error("No slides found in that PowerPoint file.");
  const lines: string[] = [];
  for (const [i, name] of slideNames.entries()) {
    const xml = await zip.file(name)!.async("string");
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => decodeXmlEntities(m[1]).trim())
      .filter(Boolean);
    if (texts.length) lines.push(`Slide ${i + 1}: ${texts.join(" | ")}`);
  }
  if (!lines.length) throw new Error("That PowerPoint file contains no readable text.");

  let theme: PptTheme | null = null;
  const themeName = Object.keys(zip.files).find((n) => /^ppt\/theme\/theme1\.xml$/.test(n));
  if (themeName) {
    const themeXml = await zip.file(themeName)!.async("string");
    const masterName = Object.keys(zip.files).find((n) =>
      /^ppt\/slideMasters\/slideMaster1\.xml$/.test(n),
    );
    const masterXml = masterName ? await zip.file(masterName)!.async("string") : null;
    theme = parseTheme(file.name, themeXml, masterXml);
  }

  return {
    outline: `Report template imported from PowerPoint (${file.name}). One section per slide, in order:\n${lines.join("\n")}`,
    theme,
  };
}

type SectionKind = "summary" | "kpis" | "charts" | "insights" | "commentary" | "risks" | "tables" | "actions";

// ---------------------------------------------------------------------------
// Template anatomy
//
// An uploaded template is captured slide by slide: every region's position, how
// it is styled, what it is for, and which analysis fields will be written into
// it. Storing the layout means populating a deck later is a mapping exercise
// against known regions rather than a re-parse of the file, and the mapping is
// visible to the board owner before a single report is generated.
// ---------------------------------------------------------------------------

const EMU_PER_INCH = 914400;

/** Which analysis fields fill each kind of region. */
const ROLE_VARIABLES: Record<TemplateRegionRole, string[]> = {
  title: ["board.name", "report.periodLabel"],
  subtitle: ["report.periodLabel", "report.createdAt", "report.trigger"],
  units: ["report.units", "report.fxRate"],
  footnote: ["report.units", "balanceSheet.unmapped"],
  summary: ["result.summary"],
  kpis: ["result.kpis[].label", "result.kpis[].value", "result.kpis[].change"],
  charts: ["result.charts[].title", "result.charts[].series"],
  tables: [
    "balanceSheet.lines[].label",
    "balanceSheet.lines[].values[period]",
    "balanceSheet.totals",
    "result.tables[]",
  ],
  insights: ["result.insights[]"],
  commentary: ["result.commentary[].area", "result.commentary[].explanation"],
  risks: ["result.risks[]"],
  actions: ["result.actions[].action", "result.actions[].expectedImpact"],
  picture: [],
  unknown: [],
};

/**
 * What a region is for. Its own wording is the strongest signal, so that is
 * tried first; geometry only decides the cases text cannot — the banner across
 * the top is a title, tiny type at the foot is a footnote.
 */
function regionRole(
  text: string,
  kind: TemplateRegion["kind"],
  geom: { y: number; w: number; h: number; slideH: number; fontSize: number | null },
): TemplateRegionRole {
  if (kind === "picture") return "picture";
  if (kind === "chart") return "charts";
  // An embedded object in a finance deck is the position table, linked out to
  // the workbook it was built from.
  if (kind === "table" || kind === "object") return "tables";

  // A units caption is short. Without the size guard any narrative block that
  // happens to quote a figure in mINR gets mistaken for the units label.
  // Tiny type at the foot of a slide is a footnote whatever it mentions —
  // "Notes: <if there is any note from the bar graph>" is not a chart.
  if (geom.fontSize !== null && geom.fontSize <= 7 && geom.h <= 0.5) return "footnote";

  const isCaption = geom.h <= 0.45 && text.length <= 60;
  if (
    isCaption &&
    /values?\s+in\b|\bin\s+m?(?:INR|USD)\b|\bm(?:INR|USD)\b|₹|in\s+(?:millions?|thousands?)/i.test(text)
  ) {
    return "units";
  }

  // A long narrative block is classified on its HEADING, not its body: one
  // sentence mentioning an "exposure" or a "trend" halfway down should not
  // retitle the whole region.
  const isBlock = geom.h >= 1.2;
  const byText = sectionKind(isBlock ? text.slice(0, 80) : text);
  if (byText) return byText;

  if (geom.fontSize !== null && geom.fontSize <= 7) return "footnote";
  if (geom.y < 0.9 && geom.w > geom.slideH * 0.8) return "title";
  if (geom.y < 1.5 && isCaption) return "subtitle";
  if (geom.y > geom.slideH - 1 && geom.h < 0.5) return "footnote";
  // A tall block of text is narrative, whatever it happens to mention.
  if (geom.h >= 1.2) return "commentary";
  return "unknown";
}

/** Read every shape on a slide, in document order. */
function parseSlideRegions(xml: string, slideIndex: number, slideH: number): TemplateRegion[] {
  const regions: TemplateRegion[] = [];
  const shapes = [...xml.matchAll(/<p:(sp|graphicFrame|pic)>([\s\S]*?)<\/p:\1>/g)];

  shapes.forEach(([, tag, body], i) => {
    const off = body.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
    const ext = body.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    const inches = (v: string) => Math.round((Number(v) / EMU_PER_INCH) * 100) / 100;

    let kind: TemplateRegion["kind"] = "text";
    if (tag === "pic") kind = "picture";
    else if (tag === "graphicFrame") {
      kind = /<a:tbl>/.test(body)
        ? "table"
        : /chart/i.test(body)
          ? "chart"
          : "object";
    }

    const texts = [...body.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => decodeXmlEntities(m[1]))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const sizes = [...body.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
    const fontSize = sizes.length ? Math.max(...sizes) : null;
    const color = (body.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"\/>/) ?? [])[1] ?? null;

    const geom = {
      x: off ? inches(off[1]) : 0,
      y: off ? inches(off[2]) : 0,
      w: ext ? inches(ext[1]) : 0,
      h: ext ? inches(ext[2]) : 0,
    };
    const role = regionRole(texts, kind, { ...geom, slideH, fontSize });

    regions.push({
      id: `s${slideIndex}.r${i + 1}`,
      name: (body.match(/name="([^"]*)"/) ?? [])[1] ?? `${tag} ${i + 1}`,
      kind,
      ...geom,
      fontSize,
      bold: /b="1"/.test(body),
      color: color ? color.toUpperCase() : null,
      bullets: /<a:buChar|<a:buAutoNum/.test(body),
      role,
      sample: texts.slice(0, 120),
      text: texts.slice(0, 2000),
      variables: ROLE_VARIABLES[role],
    });
  });

  return regions;
}

/**
 * Capture an uploaded template's slide-by-slide anatomy: where each region sits
 * and what will be written into it.
 */
export async function extractPptxAnatomy(file: File): Promise<PptTemplateAnatomy> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  const presentation = await zip.file("ppt/presentation.xml")?.async("string");
  const size = presentation?.match(/sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  const slideWidthIn = size ? Number(size[1]) / EMU_PER_INCH : 13.333;
  const slideHeightIn = size ? Number(size[2]) / EMU_PER_INCH : 7.5;

  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  const slides: TemplateSlideAnatomy[] = [];
  for (const [i, name] of slideNames.entries()) {
    const xml = await zip.file(name)!.async("string");
    const regions = parseSlideRegions(xml, i + 1, slideHeightIn);
    // The slide's own title, else its first line of text.
    const titleRegion =
      regions.find((r) => r.role === "title") ?? regions.find((r) => r.sample.length > 0);
    slides.push({
      index: i + 1,
      title: titleRegion?.sample.slice(0, 60) || `Slide ${i + 1}`,
      regions,
    });
  }

  return {
    sourceFile: file.name,
    slideWidthIn: Math.round(slideWidthIn * 100) / 100,
    slideHeightIn: Math.round(slideHeightIn * 100) / 100,
    slides,
  };
}


interface PlannedSection {
  /** Heading to print — the template's own wording when it supplied one. */
  title: string;
  kind: SectionKind;
  /**
   * Which items this section carries, as indices into the matching result
   * array. Templates often have several chart or table sections (a bridge, a
   * segment view, a trend), so the generated items are spread across them
   * rather than all landing in the first one.
   */
  items?: number[];
  /** True when the heading is the template's wording rather than a default. */
  fromTemplate?: boolean;
}

/** A heading pulled from the template, plus the text used to classify it. */
interface TemplateSection {
  title: string;
  /** The author's own label for the section ("03 · DETAIL"), when present. */
  marker?: string;
  matchText: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#3[49];|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Cover / divider slides carry no report content. */
function isCoverSlide(texts: string[]): boolean {
  const joined = texts.join(" ").toLowerCase();
  return /prepared by|period covered|reporting period|agenda|confidential|table of contents/.test(
    joined,
  );
}

/** "01 · OVERVIEW", "1. Overview", "SECTION 2 —" … a label, not a title. */
function isSectionMarker(text: string): boolean {
  return /^\d+\s*[·•.):\-–—]/.test(text.trim()) || /^section\s+\d+/i.test(text.trim());
}

const DEFAULT_TITLES: Record<SectionKind, string> = {
  summary: "Summary",
  kpis: "Key metrics",
  charts: "Charts",
  insights: "Key insights",
  commentary: "Root cause commentary",
  risks: "Red flags & watch items",
  tables: "Supporting tables",
  actions: "Recommended actions",
};

const DEFAULT_ORDER: SectionKind[] = [
  "summary",
  "kpis",
  "charts",
  "insights",
  "commentary",
  "risks",
  "tables",
  "actions",
];

/**
 * Section headings in template order. Handles both typed templates (markdown
 * headings, numbered or bulleted lists) and the outline extracted from an
 * uploaded .pptx ("Slide 2: Executive Summary | FY26").
 */
function templateSectionTitles(template: string): TemplateSection[] {
  const sections: TemplateSection[] = [];
  for (const raw of template.split("\n")) {
    const line = decodeXmlEntities(raw.trim());
    if (!line) continue;
    if (/^Report template imported from PowerPoint/i.test(line)) continue;

    const slide = line.match(/^Slide\s+\d+\s*:\s*(.+)$/i);
    if (slide) {
      const texts = slide[1].split("|").map((t) => t.trim()).filter(Boolean);
      if (!texts.length || isCoverSlide(texts)) continue;
      // Decks label slides "01 · OVERVIEW" and put the real heading next.
      const marked = isSectionMarker(texts[0]);
      const title = (marked ? texts[1] : texts[0]) ?? texts[0];
      sections.push({
        title,
        marker: marked ? texts[0] : undefined,
        matchText: texts.slice(0, 2).join(" "),
      });
      continue;
    }

    const marked = line.match(/^(?:#{1,6}\s+|\d+[.)]\s+|[-*•]\s+)(.+)$/);
    const candidate = (marked ? marked[1] : line).replace(/[:–—-]\s*$/, "").trim();
    if (!candidate) continue;
    // An unmarked line only counts as a heading if it reads like one.
    if (!marked && (candidate.length > 60 || /[.!?]$/.test(candidate))) continue;
    sections.push({ title: candidate, matchText: candidate });
  }
  return sections;
}

/** The items a planned section carries — all of them when it has no share. */
function pick<T>(all: T[], items: number[] | undefined): T[] {
  return items === undefined ? all : items.map((i) => all[i]).filter(Boolean);
}

/** Spread n items over k buckets in order, leaving trailing buckets empty. */
function distribute(n: number, k: number): number[][] {
  const buckets: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) buckets[Math.floor((i * k) / n)].push(i);
  return buckets;
}

// Checked in order — narrower categories first, since "Variance summary table"
// should be a table and "Executive summary" a summary.
const KIND_PATTERNS: [RegExp, SectionKind][] = [
  [/\b(risk|red flag|watch item|key pointers?|issue|concern|exposure|mitigat)/i, "risks"],
  [/\b(kpi|scorecard|metric|highlight|at a glance|key figure|dashboard)/i, "kpis"],
  // Balance sheet vocabulary. Ratio-style headings are scorecard sections, so
  // they are matched before "…analysis" would route them to insights.
  [/\b(liquidity|solvency|gearing|leverage|working capital|ratio analysis|key ratios?|financial ratios?|capital structure)/i, "kpis"],
  [/\b(chart|graph|trend|visual|plot|bridge|waterfall|segment|mix|split|composition|by (?:entity|region|category|segment|business unit))/i, "charts"],
  // "\bposition\b" deliberately does not fire inside "composition" (charts).
  [/\b(table|appendix|breakdown|schedule|detail|line item|by category|movement|\bposition\b|statement of financial position)/i, "tables"],
  [/\b(summary|executive|overview|introduction|verdict|headline|synopsis)/i, "summary"],
  [/\b(next step|recommended action|recommendation|action plan|way forward|to-?do)/i, "actions"],
  [/\b(commentary|root cause|rationale|explanation|why|narrative)/i, "commentary"],
  [/\b(insight|driver|finding|analysis|recommend|action|conclusion|takeaway)/i, "insights"],
];

function sectionKind(text: string): SectionKind | null {
  for (const [pattern, kind] of KIND_PATTERNS) {
    if (pattern.test(text)) return kind;
  }
  return null;
}

/** Kinds that hold a list of items, so a template may have several of them. */
const MULTI_ITEM_KINDS = new Set<SectionKind>(["charts", "tables"]);

/**
 * Decide what the exported document contains and in what order. A board's
 * report template drives both the order and the section wording; anything the
 * template does not mention is appended so no generated content is dropped.
 */
function planReportSections(board: Board, result: Report["result"]): PlannedSection[] {
  const has: Record<SectionKind, boolean> = {
    summary: Boolean(result.summary?.trim()),
    kpis: result.kpis.length > 0,
    charts: result.charts.length > 0,
    insights: result.insights.length > 0,
    commentary: (result.commentary?.length ?? 0) > 0,
    risks: result.risks.length > 0,
    tables: result.tables.length > 0,
    actions: (result.actions?.length ?? 0) > 0,
  };

  const counts: Record<SectionKind, number> = {
    summary: 1,
    kpis: 1,
    charts: result.charts.length,
    insights: 1,
    commentary: 1,
    risks: 1,
    tables: result.tables.length,
    actions: 1,
  };

  const plan: PlannedSection[] = [];
  const used = new Set<SectionKind>();

  for (const section of templateSectionTitles(board.reportTemplate ?? "")) {
    // The author's own label wins: a deck that calls a slide "03 · DETAIL"
    // means a detail table, even when its heading reads "Variance by Category".
    const kind = section.marker
      ? (sectionKind(section.marker) ?? sectionKind(section.title))
      : sectionKind(section.matchText);
    if (!kind || !has[kind]) continue;
    // Single-item kinds appear once; charts and tables may repeat, and the
    // generated items get spread across those sections below.
    if (used.has(kind) && !MULTI_ITEM_KINDS.has(kind)) continue;
    used.add(kind);
    plan.push({ title: section.title, kind, fromTemplate: true });
  }

  // Content the template never mentioned still has to appear. Slot it into its
  // natural place — KPIs belong with the summary, not orphaned at the very end.
  for (const kind of DEFAULT_ORDER) {
    if (used.has(kind) || !has[kind]) continue;
    used.add(kind);
    const rank = DEFAULT_ORDER.indexOf(kind);
    let at = 0;
    plan.forEach((s, i) => {
      if (DEFAULT_ORDER.indexOf(s.kind) < rank) at = i + 1;
    });
    plan.splice(at, 0, { title: DEFAULT_TITLES[kind], kind });
  }

  // Hand each chart/table section its share of the items, then drop any
  // section that ended up with nothing to show.
  for (const kind of MULTI_ITEM_KINDS) {
    const sections = plan.filter((s) => s.kind === kind);
    if (sections.length <= 1) continue;
    const buckets = distribute(counts[kind], sections.length);
    sections.forEach((s, i) => {
      s.items = buckets[i];
    });
  }

  return plan.filter((s) => s.items === undefined || s.items.length > 0);
}

/** Export styling resolved from the board's corporate theme, or LedgerLM defaults. */
function exportStyle(board: Board) {
  const t = board.templateTheme;
  const accents = t && t.colors.accents.length >= 2 ? t.colors.accents : SERIES_COLORS;
  return {
    accents,
    heading: t?.colors.dk2 ?? DEEP,
    body: t?.colors.dk1 ?? DEEP,
    muted: t ? t.colors.dk2 : MUTED,
    background: t?.background ?? "EEF2F1",
    tableHead: t?.colors.accents[0] ?? "4E7F80",
    fontHead: t?.fonts.major,
    fontBody: t?.fonts.minor,
  };
}

// ---------------------------------------------------------------------------
// Balance sheet deck
//
// A balance sheet review is presented in a fixed house format, not as a generic
// dashboard: one slide per side of the sheet, the position table down the left
// with the commentary beside it. Geometry below is taken from the supplied
// format deck (13.33 x 7.5in), not invented.
// ---------------------------------------------------------------------------

// An executive reads left to right, top to bottom: the verdict first, then the
// numbers that support it, then the detail. So the slide is a headline strip of
// KPIs across the top, the position chart beneath it, and the narrative down
// the right — nothing below the fold, nothing needing a second pass.
const BS_LAYOUT = {
  title: { x: 0.45, y: 0.28, w: 8.2, h: 0.4 },
  asOf: { x: 0.45, y: 0.66, w: 8.2, h: 0.24 },
  units: { x: 8.9, y: 0.3, w: 4.0, h: 0.24 },
  status: { x: 8.9, y: 0.58, w: 4.0, h: 0.26 },
  rule: { x: 0.45, y: 0.98, w: 12.45, h: 0.028 },
  kpis: { x: 0.45, y: 1.12, w: 7.35, h: 0.86, gap: 0.14 },
  chart: { x: 0.3, y: 2.15, w: 7.65, h: 3.55 },
  totals: { x: 0.45, y: 5.78, w: 7.35, h: 0.5 },
  commentary: { x: 8.25, y: 1.12, w: 4.65, h: 5.2 },
  footnote: { x: 0.45, y: 6.42, w: 12.45, h: 0.22 },
} as const;

/**
 * Two brand primaries carry the data; everything else is neutral so the bars
 * stay the only saturated thing on the slide. Comparative periods step back to
 * greys rather than introducing a third and fourth hue.
 */
const BS_COLORS = {
  teal: "439798",
  magenta: "BC4096",
  ink: "1D2A2B",
  body: "3C4A4B",
  muted: "7A8A8B",
  hairline: "D8E0E0",
  panel: "F4F7F7",
  good: "2E7D5B",
  bad: "B3261E",
} as const;

/** Latest period in teal, then magenta, then neutrals for older comparatives. */
/**
 * Chart series colours: the two brand colours, then lighter tints of the same
 * two for a third and fourth series. Applies to every generated chart — deck,
 * PDF and template — regardless of any theme an uploaded deck carries.
 */
const SERIES_PALETTE = [BS_COLORS.teal, BS_COLORS.magenta, "8FC3C4", "DA95C2"];


// ---------------------------------------------------------------------------
// Fitting text to its box
//
// PowerPoint does not clip a text box: whatever does not fit spills over the
// shape below it, and on a dense slide that reads as one block of text printed
// on top of another. So every block is measured against its box before it is
// placed — the size steps down to a floor first, and if it still will not fit
// the trailing paragraphs are dropped with a note saying so, which is honest
// and legible where an overflow is neither.
// ---------------------------------------------------------------------------

type TextRun = { text: string; options?: Record<string, unknown> };


/** Approximate rendered height in inches of runs laid out at `size` pt. */
function estimateRunsHeight(runs: TextRun[], boxW: number, size: number): number {
  const charW = (size * 0.5) / 72; // Helvetica-ish average glyph width
  const lineH = (size * 1.22) / 72;
  const usableW = Math.max(boxW - 0.2, 0.4); // default insets
  let lines = 0;
  let pending = 0;
  let pendingIndent = 0;
  const flush = () => {
    const cap = Math.max(1, Math.floor((usableW - pendingIndent) / charW));
    lines += Math.max(1, Math.ceil(pending / cap));
    pending = 0;
    pendingIndent = 0;
  };
  for (const r of runs) {
    const o = r.options ?? {};
    if (o.bullet) pendingIndent = 0.28;
    pending += (r.text ?? "").length;
    // A bullet is its own paragraph; otherwise a run continues the line until
    // one is marked breakLine.
    if (o.breakLine === true || o.bullet) flush();
  }
  if (pending > 0) flush();
  return lines * lineH + 0.08;
}

/**
 * Fit runs into a box: returns the runs to place and the size to place them at.
 * Whole paragraphs are dropped from the end, never split, so nothing ends mid-
 * sentence; the note says how many were left out.
 */
function fitRuns(
  runs: TextRun[],
  box: { w: number; h: number },
  baseSize: number,
  minSize = 7,
): { runs: TextRun[]; fontSize: number; truncated: number } {
  if (!runs.length) return { runs, fontSize: baseSize, truncated: 0 };
  runs = runs.map((r) => ({ ...r, text: tidyProse(r.text) }));
  for (let size = baseSize; size >= minSize; size -= 0.5) {
    if (estimateRunsHeight(runs, box.w, size) <= box.h) return { runs, fontSize: size, truncated: 0 };
  }
  // Still too tall at the floor: drop trailing paragraphs until it fits, leaving
  // room for a one-line note.
  const paragraphs: TextRun[][] = [];
  let cur: TextRun[] = [];
  for (const r of runs) {
    cur.push(r);
    const o = r.options ?? {};
    if (o.breakLine === true || o.bullet) {
      paragraphs.push(cur);
      cur = [];
    }
  }
  if (cur.length) paragraphs.push(cur);
  const noteH = (minSize * 1.22) / 72 + 0.05;
  let keep = paragraphs.length;
  while (keep > 1) {
    const kept = paragraphs.slice(0, keep).flat();
    if (estimateRunsHeight(kept, box.w, minSize) + noteH <= box.h) break;
    keep--;
  }
  const dropped = paragraphs.length - keep;
  const kept = paragraphs.slice(0, keep).flat();
  kept.push({
    text: `… ${dropped} more paragraph${dropped === 1 ? "" : "s"} — see the PDF summary.`,
    options: { italic: true, color: BS_COLORS.muted, breakLine: true },
  });
  return { runs: kept, fontSize: minSize, truncated: dropped };
}

/**
 * Compact form of a report line for a chart axis. Full names stay in tables
 * and text; on an axis with seven angled labels in five inches, the short form
 * is what keeps neighbours apart.
 */
function axisLabel(label: string): string {
  const aliases: [RegExp, string][] = [
    [/^cash & cash equivalents$/i, "Cash & equivalents"],
    [/^trade receivables & unbilled$/i, "Trade receivables"],
    [/^other current assets$/i, "Other current"],
    [/^other non-current assets$/i, "Other non-current"],
    [/^right-of-use assets$/i, "Right-of-use assets"],
    [/^non-current liabilities & provisions$/i, "Non-current liab. & prov."],
    [/^unallocated difference \((\w+)\)$/i, "Unallocated"],
  ];
  let text = label;
  for (const [re, to] of aliases) {
    if (re.test(label)) {
      text = to;
      break;
    }
  }
  return wrapAxisLabel(text);
}

/**
 * Break a category label into at most two lines at the word gap nearest its
 * middle, so it reads horizontally under its column instead of being angled.
 * PowerPoint honours the line feed in a category name.
 */
function wrapAxisLabel(text: string, maxLine = 12): string {
  if (text.length <= maxLine || !text.includes(" ")) return text;
  const words = text.split(" ");
  let best = -1;
  let bestGap = Infinity;
  let pos = 0;
  for (let i = 0; i < words.length - 1; i++) {
    pos += words[i].length + 1;
    const gap = Math.abs(pos - text.length / 2);
    if (gap < bestGap) {
      bestGap = gap;
      best = pos;
    }
  }
  if (best < 0) return text;
  return `${text.slice(0, best - 1)}\n${text.slice(best)}`;
}

/** Which slide a commentary item belongs on, by the report lines it names. */
function commentarySide(
  text: string,
  assetLabels: string[],
  fundingLabels: string[],
): "Assets" | "Funding" | null {
  const hay = text.toLowerCase();
  const hits = (labels: string[]) =>
    labels.filter((l) => hay.includes(l.toLowerCase())).length;
  const a = hits(assetLabels) + (/\bassets?\b/.test(hay) ? 1 : 0);
  const f =
    hits(fundingLabels) +
    (/\b(liabilit|equity|payable|provision|borrowing|gearing|leverage)/.test(hay) ? 1 : 0);
  if (a === 0 && f === 0) return null;
  return a >= f ? "Assets" : "Funding";
}

/**
 * Split a paragraph into presentable points. Sentences are the natural unit,
 * but figures carry decimals and abbreviations ("mINR.", "1,240.5"), so a naive
 * split on "." shatters them — only break on sentence ends followed by a space
 * and a capital.
 */
function splitPoints(text: string): string[] {
  const points = String(text ?? "")
    .split(/(?<=[.;])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return points.length ? points : [String(text ?? "").trim()].filter(Boolean);
}

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Render the balance sheet deck. Returns false when the report carries no
 * computed balance sheet, so the caller falls back to the generic deck rather
 * than emitting empty slides.
 */
function addBalanceSheetSlides(
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  board: Board,
  report: Report,
): boolean {
  const bs = report.result.balanceSheet;
  if (!bs || !bs.lines.length || !bs.periods.length) return false;

  const asOf = bs.periods[bs.periods.length - 1];
  // Latest first, then the baselines the board chose — newest comparative
  // first, as the format deck reads. Falls back to the most recent periods for
  // reports generated before the setting existed.
  const chosen = (bs.comparisonPeriods ?? []).filter((p) => p !== asOf);
  const columns = chosen.length
    ? [asOf, ...[...chosen].reverse()]
    : [...bs.periods].reverse().slice(0, 3);
  const assetLines = bs.lines.filter((l) => l.section === "Assets");
  const fundingLines = bs.lines.filter((l) => l.section !== "Assets");
  const assetLabels = assetLines.map((l) => l.label);
  const fundingLabels = fundingLines.map((l) => l.label);

  const commentary = report.result.commentary ?? [];
  const sideOf = (c: { area: string; explanation: string }) =>
    commentarySide(`${c.area} ${c.explanation}`, assetLabels, fundingLabels);

  const fmtUnit = (n: number) => `${formatAmount(n)} ${bs.units}`;

  const buildSlide = (
    side: "Assets" | "Funding",
    heading: string,
    lines: typeof bs.lines,
    subtotals: { label: string; values: Record<string, number> }[],
    kpis: { label: string; value: string; sub: string }[],
    footnote: string,
  ) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    slide.addText(heading, {
      ...BS_LAYOUT.title,
      fontSize: 22,
      bold: true,
      color: BS_COLORS.ink,
      valign: "middle",
    });
    slide.addText(`Position as at ${asOf}`, {
      ...BS_LAYOUT.asOf,
      fontSize: 11,
      color: BS_COLORS.muted,
    });

    slide.addText(
      bs.fxRate ? `${bs.units}  ·  mUSD at ${bs.fxRate}` : bs.units,
      { ...BS_LAYOUT.units, fontSize: 10, color: BS_COLORS.muted, align: "right" },
    );

    // Whether the sheet balances is the first thing a CFO checks, so it is
    // stated on the slide rather than buried in the commentary.
    const ties = Object.values(bs.balances).every(Boolean);
    slide.addText(ties ? "Balance check: ties in all periods" : "Balance check: DOES NOT TIE", {
      ...BS_LAYOUT.status,
      fontSize: 10,
      bold: true,
      color: ties ? BS_COLORS.good : BS_COLORS.bad,
      align: "right",
    });

    slide.addShape(pptx.ShapeType.rect, {
      ...BS_LAYOUT.rule,
      fill: { color: BS_COLORS.teal },
      line: { color: BS_COLORS.teal, width: 0 },
    });

    // Headline figures, evenly spread across the content column.
    const n = Math.max(kpis.length, 1);
    const tileW = (BS_LAYOUT.kpis.w - BS_LAYOUT.kpis.gap * (n - 1)) / n;
    kpis.forEach((k, i) => {
      const x = BS_LAYOUT.kpis.x + i * (tileW + BS_LAYOUT.kpis.gap);
      slide.addShape(pptx.ShapeType.rect, {
        x, y: BS_LAYOUT.kpis.y, w: tileW, h: BS_LAYOUT.kpis.h,
        fill: { color: BS_COLORS.panel },
        line: { color: BS_COLORS.hairline, width: 0.75 },
      });
      slide.addText(k.label.toUpperCase(), {
        x: x + 0.12, y: BS_LAYOUT.kpis.y + 0.07, w: tileW - 0.24, h: 0.18,
        fontSize: 8, bold: true, color: BS_COLORS.muted, charSpacing: 0.6,
      });
      slide.addText(k.value, {
        x: x + 0.12, y: BS_LAYOUT.kpis.y + 0.25, w: tileW - 0.24, h: 0.34,
        fontSize: 17, bold: true, color: BS_COLORS.ink,
      });
      slide.addText(k.sub, {
        x: x + 0.12, y: BS_LAYOUT.kpis.y + 0.6, w: tileW - 0.24, h: 0.2,
        fontSize: 8, color: BS_COLORS.muted,
      });
    });

    // Position by report line. Horizontal bars because the line names are long
    // and would otherwise be rotated or truncated.
    slide.addChart(
      pptx.ChartType.bar,
      columns.map((p) => ({
        name: p,
        labels: lines.map((l) => axisLabel(l.label)),
        values: lines.map((l) => l.values[p] ?? 0),
      })),
      {
        ...BS_LAYOUT.chart,
        barDir: "col",
        barGrouping: "clustered",
        barGapWidthPct: 30,
        barOverlapPct: -30,
        catAxisLabelRotate: 0,
        chartColors: SERIES_PALETTE.slice(0, columns.length),
        catAxisLabelFontSize: 9,
        catAxisLabelColor: BS_COLORS.body,
        catAxisLineShow: false,
        valAxisHidden: true,
        valGridLine: { style: "none" },
        showValue: true,
        dataLabelFontSize: 6.5,
        dataLabelColor: BS_COLORS.body,
        dataLabelPosition: "outEnd",
        dataLabelFormatCode: "#,##0",
        showLegend: columns.length > 1,
        legendPos: "t",
        legendFontSize: 9,
        legendColor: BS_COLORS.body,
        plotArea: { fill: { color: "FFFFFF" } },
      },
    );

    // The totals the chart leaves out, so a total bar can't dwarf its own lines.
    slide.addText(
      subtotals.flatMap((t, i) => [
        ...(i ? [{ text: "     ", options: { color: BS_COLORS.hairline } }] : []),
        { text: `${t.label}  `, options: { color: BS_COLORS.muted, fontSize: 10 } },
        {
          text: fmtUnit(t.values[asOf] ?? 0),
          options: { color: BS_COLORS.ink, fontSize: 12, bold: true },
        },
      ]),
      { ...BS_LAYOUT.totals, valign: "middle" },
    );

    // Narrative column.
    const mine = commentary.filter((c) => (sideOf(c) ?? "Assets") === side);
    const risks = report.result.risks ?? [];
    const pointers = risks.filter(
      (r) => (commentarySide(r, assetLabels, fundingLabels) ?? "Assets") === side,
    );

    slide.addText("WHAT MOVED", {
      x: BS_LAYOUT.commentary.x, y: BS_LAYOUT.commentary.y, w: BS_LAYOUT.commentary.w, h: 0.2,
      fontSize: 8, bold: true, color: BS_COLORS.teal, charSpacing: 0.6,
    });
    {
      const movedBox = {
        x: BS_LAYOUT.commentary.x,
        y: BS_LAYOUT.commentary.y + 0.24,
        w: BS_LAYOUT.commentary.w,
        h: BS_LAYOUT.commentary.h - (pointers.length ? 1.9 : 0.24),
      };
      const movedRuns: TextRun[] = mine.length
        ? mine.flatMap((c) => [
            {
              text: c.area,
              options: { bold: true, color: BS_COLORS.ink, breakLine: true },
            },
            ...splitPoints(c.explanation).map((point) => ({
              text: point,
              options: { color: BS_COLORS.body, bullet: { indent: 14 }, breakLine: true },
            })),
          ])
        : [
            {
              text: "No commentary was derivable for this side from the balance sheet alone.",
              options: { italic: true, color: BS_COLORS.muted, breakLine: true },
            },
          ];
      // Fitted so the column can never run down into WATCH ITEMS below it.
      const fitted = fitRuns(movedRuns, movedBox, 9.5);
      slide.addText(fitted.runs as never, {
        ...movedBox,
        fontSize: fitted.fontSize,
        valign: "top",
        lineSpacingMultiple: 1.05,
        fit: "shrink",
      });
    }

    if (pointers.length) {
      const y = BS_LAYOUT.commentary.y + BS_LAYOUT.commentary.h - 1.6;
      slide.addText("WATCH ITEMS", {
        x: BS_LAYOUT.commentary.x, y, w: BS_LAYOUT.commentary.w, h: 0.2,
        fontSize: 8, bold: true, color: BS_COLORS.magenta, charSpacing: 0.6,
      });
      const watchBox = { x: BS_LAYOUT.commentary.x, y: y + 0.22, w: BS_LAYOUT.commentary.w, h: 1.35 };
      const watchRuns: TextRun[] = pointers.flatMap((r) =>
        splitPoints(r).map((point) => ({
          text: point,
          options: { color: BS_COLORS.body, bullet: { indent: 14 }, breakLine: true },
        })),
      );
      const fittedWatch = fitRuns(watchRuns, watchBox, 9);
      slide.addText(fittedWatch.runs as never, {
        ...watchBox,
        fontSize: fittedWatch.fontSize,
        valign: "top",
        lineSpacingMultiple: 1.05,
        fit: "shrink",
      });
    }

    if (footnote) {
      slide.addText(footnote, {
        ...BS_LAYOUT.footnote,
        fontSize: 7,
        italic: true,
        color: BS_COLORS.muted,
      });
    }
  };

  const perPeriod = (pick: (p: string) => number): Record<string, number> =>
    Object.fromEntries(bs.periods.map((p) => [p, pick(p)]));

  // The board's chosen baseline, so headline movements and the tables agree.
  const prior =
    bs.comparisonPeriod ?? (bs.periods.length > 1 ? bs.periods[bs.periods.length - 2] : null);
  /** Movement against the prior period, phrased for a headline tile. */
  const delta = (values: Record<string, number>) => {
    if (!prior) return `at ${asOf}`;
    const now = values[asOf] ?? 0;
    const was = values[prior] ?? 0;
    const diff = now - was;
    const pct = was === 0 ? null : (diff / Math.abs(was)) * 100;
    const sign = diff >= 0 ? "+" : "−";
    return `${sign}${formatAmount(Math.abs(diff))} vs ${prior}${
      pct === null ? "" : ` (${sign}${Math.abs(pct).toFixed(1)}%)`
    }`;
  };
  const lineValues = (label: string) =>
    bs.lines.find((l) => l.label === label)?.values ?? {};
  const sumWhere = (pred: (l: BalanceSheetLine) => boolean) =>
    perPeriod((p) => bs.lines.filter(pred).reduce((a, l) => a + (l.values[p] ?? 0), 0));

  const currentAssets = sumWhere((l) => l.section === "Assets" && l.term === "current");
  const currentLiabs = sumWhere((l) => l.section === "Liabilities" && l.term === "current");
  const workingCapital = perPeriod((p) => currentAssets[p] - currentLiabs[p]);
  const cash = lineValues("Cash & cash equivalents");

  const ratio = (a: number, b: number) => (b === 0 ? "n/a" : (a / b).toFixed(2));

  buildSlide(
    "Assets",
    "Balance Sheet — Assets",
    assetLines,
    [{ label: "Total assets", values: bs.totals.assets }],
    [
      {
        label: "Total assets",
        value: formatAmount(bs.totals.assets[asOf] ?? 0),
        sub: delta(bs.totals.assets),
      },
      {
        label: "Cash & equivalents",
        value: formatAmount(cash[asOf] ?? 0),
        sub: Object.keys(cash).length ? delta(cash) : "not separately identified",
      },
      {
        label: "Working capital",
        value: formatAmount(workingCapital[asOf] ?? 0),
        sub: delta(workingCapital),
      },
      {
        label: "Current ratio",
        value: ratio(currentAssets[asOf] ?? 0, currentLiabs[asOf] ?? 0),
        sub: "current assets ÷ current liabilities",
      },
    ],
    `All figures in ${bs.units}${bs.fxRate ? `; mUSD converted at ${bs.fxRate}` : ""}.`,
  );

  const totalFunding = perPeriod((p) => bs.totals.liabilities[p] + bs.totals.equity[p]);
  buildSlide(
    "Funding",
    "Balance Sheet — Liabilities & Equity",
    fundingLines,
    [
      { label: "Total liabilities", values: bs.totals.liabilities },
      { label: "Total equity", values: bs.totals.equity },
      { label: "Liabilities & equity", values: totalFunding },
    ],
    [
      {
        label: "Total equity",
        value: formatAmount(bs.totals.equity[asOf] ?? 0),
        sub: delta(bs.totals.equity),
      },
      {
        label: "Total liabilities",
        value: formatAmount(bs.totals.liabilities[asOf] ?? 0),
        sub: delta(bs.totals.liabilities),
      },
      {
        label: "Debt to equity",
        value: ratio(bs.totals.liabilities[asOf] ?? 0, bs.totals.equity[asOf] ?? 0),
        sub: "total liabilities ÷ total equity",
      },
      {
        label: "Equity ratio",
        value:
          (bs.totals.assets[asOf] ?? 0) === 0
            ? "n/a"
            : `${(((bs.totals.equity[asOf] ?? 0) / (bs.totals.assets[asOf] ?? 1)) * 100).toFixed(1)}%`,
        sub: "equity ÷ total assets",
      },
    ],
    bs.unmapped.length
      ? `${bs.unmapped.length} line item(s) matched no report line and are excluded from the roll-up: ${bs.unmapped.slice(0, 6).join(", ")}.`
      : `All figures in ${bs.units}${bs.fxRate ? `; mUSD converted at ${bs.fxRate}` : ""}.`,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Template-driven deck
//
// When a board has an uploaded report format, the deck is that format: same
// slide size, one slide per template slide, and every region filled at its own
// position and size with the analysis field its role maps to. The stored
// anatomy is the contract — what the owner saw at setup is what gets built.
// ---------------------------------------------------------------------------

/** Period-like tokens in the template's own captions get the report's period. */
function retargetPeriod(text: string, asOf: string | null): string {
  if (!asOf) return text;
  return text
    // Explicit placeholders: "as of XX", "<period>", "{period}", "[period]".
    .replace(/\bXX+\b/g, asOf)
    .replace(/[<{[]\s*(?:period|date|month|quarter|as[- ]?of)\s*[>}\]]/gi, asOf)
    .replace(/\b(?:as (?:of|at)\s+)([A-Za-z]{3,9}['’]?\s?\d{2,4}|\d{4}-\d{2}|Q[1-4]['’]?\d{2,4})/gi, (_m, p1) =>
      _m.replace(p1, asOf),
    )
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*['’]\s?\d{2}\b/gi, asOf);
}

/**
 * Headings a placeholder region lays out — "Cash & cash equivalents: (Pointers
 * on …)", "Trade Payables:", "Other Liabilities: …". Any short caption ending
 * in a colon counts; a bracketed hint after it is common but not required.
 */
function placeholderHeadings(text: string): string[] {
  const out: string[] = [];
  // The separator is a lookbehind so one heading's colon can introduce the next.
  const re = /(?<=^|[.:)\]>]\s{0,3}|\s{2,}|\n)([A-Z][A-Za-z&/’'\-\s]{2,50}?):(?!\d)/g;
  // A line name has no verbs; a sentence fragment that happens to end in a
  // colon ("Cash increased due to collections:") does.
  const prose = /\b(is|are|was|were|due|has|have|had|increased|decreased|rose|fell|because|which|that|this|from|into)\b/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const h = m[1].trim();
    // The region's own title, and anything that reads as a sentence, are not lines.
    if (/^key pointers|^notes?$|^note$/i.test(h) || h.split(/\s+/).length > 6 || prose.test(h) || out.includes(h)) continue;
    out.push(h);
  }
  // Fallback: the stricter "Heading: (" form, in case the loose pass found nothing.
  if (!out.length) {
    const strict = /([A-Z][A-Za-z&/’'\-\s]{2,60}?):\s*[(<[]/g;
    while ((m = strict.exec(text))) {
      const h = m[1].trim();
      if (!/^key pointers/i.test(h) && !out.includes(h)) out.push(h);
    }
  }
  return out;
}

/** How strongly a commentary item concerns a template heading, by shared words. */
function headingMatch(heading: string, text: string): number {
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/^(other|total|current|assets?|liabilit\w*)$/.test(w));
  const hw = new Set(words(heading));
  if (!hw.size) return 0;
  const tw = new Set(words(text));
  let hits = 0;
  for (const w of hw) if (tw.has(w)) hits++;
  return hits / hw.size;
}

/** Which side of the balance sheet a template slide is about, from its title. */
function slideSide(title: string): "Assets" | "Funding" | null {
  if (/liabilit|equity|funding/i.test(title)) return "Funding";
  if (/asset/i.test(title)) return "Assets";
  return null;
}

/**
 * Bosch-style Entity P&L report. The P&L output uses a governed, fixed
 * financial-statement canvas instead of the generic report-table renderer:
 * the reference format has a seven-column comparison table and a commentary
 * column, neither of which can be represented accurately by a generic table.
 */
function addEntityPnlSlide(
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  _board: Board,
  report: Report,
): boolean {
  const pnl = report.result.entityPnl;
  if (!pnl?.lines.length || !pnl.columns.length) return false;
  const slide = pptx.addSlide();
  const format = (value: number | null | undefined, percentage = false) => {
    if (value === null || value === undefined) return "—";
    return percentage
      ? `${Number(value).toFixed(1)}%`
      : formatAmount(Number(value));
  };
  const current = pnl.columns[0] ?? "";
  const comparison = pnl.columns[1] ?? "";
  const cf = pnl.columns.find((column) => /^CF\d+|^TBP/i.test(column)) ?? null;
  const yearEnd = pnl.columns.find((column) => /\bYE$/i.test(column)) ?? null;
  const [year, month] = pnl.asOf.split("-").map(Number);
  const date = new Date(year, Math.max(0, month - 1), 1);
  const monthLabel = date.toLocaleString("en-US", { month: "long" });
  const titlePeriod = pnl.comparison === "yoy" ? `H1'${String(year).slice(-2)}` : `Q${Math.ceil(month / 3)}'${String(year).slice(-2)}`;
  const comparisonCaption = pnl.comparison === "yoy" ? "YoY" : "QoQ";
  const reportTitle = `P&L ${titlePeriod} – ${comparisonCaption} : ${monthLabel}'${String(year).slice(-2)} v ${comparison.replace(/ .*/, "")}'${comparison.match(/\d{4}/)?.[0]?.slice(-2) ?? ""}`;
  const significantRows = new Set(["Revenue", "Total Expenses", "EBIT", "EBIT%", "End Capacity", "Average Capacity"]);
  const tableRows = [
    [
      { text: pnl.entity, options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "left" as const } },
      { text: yearEnd ?? `YE ${year - 1}`, options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "right" as const } },
      { text: cf ?? "CF", options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "right" as const } },
      { text: current, options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "right" as const } },
      { text: comparison, options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "right" as const } },
      { text: "Variance", options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "right" as const } },
      { text: "%", options: { bold: true, color: "FFFFFF", fill: { color: "007D88" }, align: "right" as const } },
    ],
    ...pnl.lines.map((item) => {
      const isPercent = item.label === "EBIT%";
      const currentValue = item.values[current] ?? null;
      const comparisonValue = item.values[comparison] ?? null;
      const variance =
        currentValue === null || comparisonValue === null ? null : Number(currentValue) - Number(comparisonValue);
      const variancePercent =
        variance === null || !comparisonValue ? null : (variance / Math.abs(Number(comparisonValue))) * 100;
      const base = { color: "263238", fill: { color: significantRows.has(item.label) ? "EEF5F5" : "FFFFFF" }, align: "right" as const };
      return [
        { text: item.label, options: { ...base, align: "left" as const, bold: significantRows.has(item.label) } },
        { text: format(yearEnd ? item.values[yearEnd] : null, isPercent), options: base },
        { text: format(cf ? item.values[cf] : null, isPercent), options: base },
        { text: format(currentValue, isPercent), options: { ...base, bold: significantRows.has(item.label) } },
        { text: format(comparisonValue, isPercent), options: base },
        { text: format(variance, isPercent), options: { ...base, color: variance !== null && variance < 0 ? "B42318" : "1E6B4E" } },
        { text: format(variancePercent, true), options: { ...base, color: variancePercent !== null && variancePercent < 0 ? "B42318" : "1E6B4E" } },
      ];
    }),
  ];
  const commentary = [
    ...report.result.commentary.map((item) => ({
      heading: item.area,
      text: item.explanation,
    })),
    ...["Outsourcing Cost", "Consultancy Charges", "CI Charges & Other Revenue", "Facilities Cost", "Other Expenses"]
      .filter((label) => pnl.lines.some((line) => line.label === label))
      .map((heading) => ({
        heading,
        text: "Owner commentary is required to attribute this movement. This report shows only the governed cube figures.",
      })),
  ].slice(0, 6);

  slide.background = { color: "FFFFFF" };
  slide.addText(reportTitle, {
    x: 0.48, y: 0.28, w: 9.5, h: 0.36, fontSize: 21, bold: true, color: "C90073",
  });
  slide.addText(
    `Entity: ${pnl.entity} · ${current}${comparison ? ` vs ${comparison}` : ""} · ${pnl.comparison === "qoq" ? "QoQ MTD" : "YoY YTD"}`,
    { x: 0.5, y: 0.76, w: 8.4, h: 0.2, fontSize: 8.5, bold: true, color: "007D88" },
  );
  slide.addText(`Values in m${pnl.currency}`, {
    x: 5.1, y: 1.06, w: 1.35, h: 0.18, fontSize: 7.5, italic: true, bold: true, color: "263238", align: "right",
  });
  slide.addTable(tableRows, {
    x: 0.48, y: 1.32, w: 6.04, h: 5.23, fontSize: 6.2, margin: 0.035, rowH: 0.255,
    border: { type: "solid", color: "BCC7CA", pt: 0.45 },
    colW: [1.64, 0.68, 0.68, 0.77, 0.77, 0.77, 0.44],
  });
  let commentY = 1.25;
  commentary.forEach((item) => {
    slide.addText(`${item.heading}:`, {
      x: 6.86, y: commentY, w: 1.55, h: 0.18, fontSize: 7.4, bold: true, color: "263238",
    });
    slide.addText(item.text, {
      x: 8.3, y: commentY, w: 4.42, h: 0.46, fontSize: 6.25, color: "263238", fit: "shrink", valign: "top",
    });
    commentY += 0.68;
  });
  slide.addText(
    pnl.evidence?.[0] ?? "Source: authorized Enterprise Data cube read at run time.",
    { x: 0.48, y: 6.67, w: 8.7, h: 0.16, fontSize: 5.7, color: "65747A" },
  );
  slide.addText("BOSCH", {
    x: 11.78, y: 6.66, w: 0.9, h: 0.2, fontSize: 10, bold: true, color: "E20015", align: "center",
  });
  const footerSegments = [
    ["E20015", 3.1], ["743B8E", 1.35], ["006B76", 1.6], ["00A7B5", 2.2], ["37A757", 1.3], ["00A7B5", 3.78],
  ];
  let footerX = 0;
  footerSegments.forEach(([color, width]) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: footerX, y: 7.18, w: Number(width), h: 0.32,
      fill: { color: String(color) }, line: { color: String(color), width: 0 },
    });
    footerX += Number(width);
  });
  return true;
}

/**
 * Direct Business Metrics output for KPI boards. An imported PPTX stores only
 * text-region anatomy, not its decorative panel shapes; rendering this fixed
 * layout prevents the values from collapsing into a thin strip at the top.
 */
function addKpiMetricsSlide(
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  board: Board,
  report: Report,
): boolean {
  if (board.templateId !== "kpi-metrics") return false;
  const snapshot = report.result.kpiReport ?? null;
  const hasReferenceNarrative = Boolean(snapshot?.narrative?.length && snapshot.scopeBadges?.length === 4);
  const sections: Array<{
    title: string;
    status: "in_scope" | "phase_2";
    summary: string;
    lines: string[];
  }> = hasReferenceNarrative ? snapshot!.narrative! : report.result.kpis.map((metric) => ({
    title: metric.label,
    status: "in_scope" as const,
    summary: metric.value,
    lines: [metric.change ?? "No comparison is available."],
  }));

  pptx.defineLayout({ name: "KPI_BUSINESS_METRICS", width: 13.333, height: 9.2 });
  pptx.layout = "KPI_BUSINESS_METRICS";
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  const C = {
    magenta: "A83678", darkMagenta: "8C2465", ink: "303030", muted: "626262",
    border: "777777", panel: "D9D9D9", navy: "006578", red: "D9192B",
    teal: "0097A7", orange: "F08A21", green: "009B76",
  };
  const add = (value: string, options: Record<string, unknown>) =>
    slide.addText(value, {
      fontFace: "Arial", color: C.ink, margin: 0, fit: "shrink", valign: "top", ...options,
    });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 0.09,
    fill: { color: C.magenta }, line: { color: C.magenta, transparency: 100 },
  });
  [[C.magenta, 0, 2.2], [C.orange, 2.2, 2.7], [C.green, 4.9, 3.1], [C.teal, 8, 2.3], [C.red, 10.3, 3.033]]
    .forEach(([fill, x, w]) => slide.addShape(pptx.ShapeType.rect, {
      x: Number(x), y: 0.09, w: Number(w), h: 0.055,
      fill: { color: String(fill) }, line: { color: String(fill), transparency: 100 },
    }));
  [[-1.15, 0.16, 6.9, 2.95], [7.4, 0.20, 6.9, 3.25]].forEach(([x, y, w, h]) =>
    slide.addShape(pptx.ShapeType.arc, {
      x, y, w, h,
      fill: { color: "F6EFF3", transparency: 28 },
      line: { color: "F6EFF3", transparency: 100 },
    }),
  );
  add(`Business Metrics ${snapshot?.periodLabel ?? ""}`, {
    x: 2.15, y: 0.33, w: 7.8, h: 0.45, fontSize: 25, bold: true,
    italic: true, color: C.magenta, align: "center",
  });
  add("Bosch\nGlobal\nSoftware\nTechnologies", {
    x: 11.87, y: 0.30, w: 1.08, h: 0.56, fontSize: 7.5, bold: true,
    color: C.magenta, breakLine: true,
  });
  if (hasReferenceNarrative) {
    [["WW", C.navy], ["IN", "EE9AB8"], ["VN", C.red], ["MX", "59A587"]].forEach(([label, fill], index) => {
      const x = 3.1 + index * 1.14;
      slide.addShape(pptx.ShapeType.rect, {
        x, y: 0.91, w: 0.88, h: 0.48,
        fill: { color: fill }, line: { color: fill, transparency: 100 },
      });
      add(label, { x, y: 1.035, w: 0.88, h: 0.17, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center" });
    });
  } else {
    add("Legacy KPI snapshot", {
      x: 3.0, y: 1.04, w: 3.2, h: 0.18, fontSize: 9, bold: true, color: C.muted, align: "center",
    });
  }

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.36, y: 1.52, w: 12.62, h: 7.03,
    fill: { color: C.panel }, line: { color: C.border, pt: 0.65 },
  });
  add("Decision / info to GLs", {
    x: 0.45, y: 1.60, w: 4.6, h: 0.20, fontSize: 10.5, bold: true, color: C.magenta,
  });
  add(hasReferenceNarrative
    ? "Green: current plan-excel scope  •  Red: Phase 2 / out of scope"
    : "Re-run this board to generate the four-scope Business Metrics decision panel.", {
    x: 7, y: 1.61, w: 5.55, h: 0.17, fontSize: 7.2, bold: true, color: C.muted, align: "right",
  });
  let y = 1.95;
  sections.slice(0, 6).forEach((section) => {
    const inScope = section.status === "in_scope";
    const color = inScope ? C.green : C.red;
    const height = inScope ? 0.87 : 0.54;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45, y: y - 0.025, w: 0.075, h: height - 0.02,
      fill: { color }, line: { color, transparency: 100 },
    });
    add(`${section.title}:`, { x: 0.58, y, w: 3.8, h: 0.16, fontSize: 8.4, bold: true, color });
    add(section.summary, { x: 0.72, y: y + 0.18, w: 11.72, h: 0.16, fontSize: 6.85, bold: true, color });
    if (section.lines.length) {
      add(section.lines.join("\n"), {
        x: 0.72, y: y + 0.37, w: 11.72, h: height - 0.36,
        fontSize: 6.05, color, breakLine: true,
      });
    }
    y += height;
  });
  const governanceY = Math.min(7.06, y + 0.08);
  slide.addShape(pptx.ShapeType.line, { x: 0.48, y: governanceY, w: 12.34, h: 0, line: { color: "AFAFAF", pt: 0.5 } });
  add("Source & governance", {
    x: 0.48, y: governanceY + 0.12, w: 2, h: 0.17, fontSize: 8.4, bold: true, color: C.darkMagenta,
  });
  add(`Actuals: ${snapshot?.actualSourceLabel ?? "governed source"}  •  Forecast: ${snapshot?.forecastSourceLabel ?? "governed source"}`, {
    x: 0.48, y: governanceY + 0.35, w: 12.28, h: 0.18, fontSize: 6.55, color: C.muted,
  });
  add(`Warnings / data-quality notes: ${snapshot?.warnings?.join("  •  ") || "No data-quality warnings returned by the governed KPI service."}`, {
    x: 0.48, y: governanceY + 0.58, w: 12.28, h: 0.28, fontSize: 5.9, italic: true, color: C.muted,
  });
  add(`Report generated ${new Date(report.createdAt).toLocaleString()} · LedgerLM KPI Metrics Board`, {
    x: 0.48, y: 8.43, w: 12.28, h: 0.12, fontSize: 5.6, color: C.muted,
  });
  [[C.navy, 0, 5], [C.red, 5, 2.4], [C.teal, 7.4, 2.6], [C.orange, 10, 3.333]]
    .forEach(([fill, x, w]) => slide.addShape(pptx.ShapeType.rect, {
      x: Number(x), y: 8.75, w: Number(w), h: 0.45,
      fill: { color: String(fill) }, line: { color: String(fill), transparency: 100 },
    }));
  add("Internal | Governed Enterprise Data | KPI Metrics Board", {
    x: 0.44, y: 8.89, w: 5.7, h: 0.12, fontSize: 5.5, bold: true, color: "FFFFFF",
  });
  add("BOSCH", {
    x: 11.74, y: 8.84, w: 1.05, h: 0.20, fontSize: 9.3, bold: true, color: "FFFFFF", align: "center",
  });
  return true;
}

function addTemplateDrivenSlides(
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  board: Board,
  report: Report,
): boolean {
  const anatomy = board.templateAnatomy;
  if (!anatomy || !anatomy.slides.length) return false;

  const result = report.result;
  const bs = result.balanceSheet ?? null;
  const pnl = result.entityPnl ?? null;
  const asOf = bs?.periods[bs.periods.length - 1] ?? pnl?.asOf ?? null;
  const units = bs?.units ?? pnl?.units ?? "";
  const theme = board.templateTheme;
  // Text is black. The template's regions carry their own colours — its
  // commentary box is the red used for emphasis — and inheriting those paints
  // whole blocks in a colour meant for a phrase.
  const inkColor = "000000";
  const headColor = BS_COLORS.teal;
  // Bars are always the brand pair, never the uploaded deck's theme accents.
  const palette = SERIES_PALETTE;
  const fontHead = theme?.fonts.major;
  const fontBody = theme?.fonts.minor;

  // Match the template's own slide size, so positions carry over 1:1.
  pptx.defineLayout({ name: "TEMPLATE", width: anatomy.slideWidthIn, height: anatomy.slideHeightIn });
  pptx.layout = "TEMPLATE";

  const assetLines = bs?.lines.filter((l) => l.section === "Assets") ?? [];
  const fundingLines = bs?.lines.filter((l) => l.section !== "Assets") ?? [];
  const assetLabels = assetLines.map((l) => l.label);
  const fundingLabels = fundingLines.map((l) => l.label);
  const commentary = result.commentary ?? [];
  const risks = result.risks ?? [];

  const columns = (() => {
    if (pnl) return pnl.columns;
    if (!bs || !asOf) return [] as string[];
    const chosen = (bs.comparisonPeriods ?? []).filter((p) => p !== asOf);
    return chosen.length ? [asOf, ...[...chosen].reverse()] : [...bs.periods].reverse().slice(0, 3);
  })();

  // Some roles hold lists; each slide takes its share so two commentary slides
  // don't both print everything.
  let insightCursor = 0;
  let actionCursor = 0;

  anatomy.slides.forEach((tplSlide) => {
    const slide = pptx.addSlide();
    if (theme?.background) slide.background = { color: theme.background };
    const side = slideSide(tplSlide.title);
    const forSide = <T,>(items: T[], text: (t: T) => string): T[] => {
      if (!side || !bs) return items;
      return items.filter((t) => (commentarySide(text(t), assetLabels, fundingLabels) ?? "Assets") === side);
    };

    for (const stored of tplSlide.regions) {
      // Re-derive the role from the region's own geometry and text with the
      // current rules. Anatomies captured under earlier rules stay on the
      // board, and trusting a stale role puts a chart in a 0.2in footnote box —
      // whose axes and legend then spill over the heading beneath it.
      const role = regionRole(stored.text ?? stored.sample, stored.kind, {
        y: stored.y,
        w: stored.w,
        h: stored.h,
        slideH: anatomy.slideHeightIn,
        fontSize: stored.fontSize,
      });
      const r = { ...stored, role };
      const box = { x: r.x, y: r.y, w: Math.max(r.w, 0.3), h: Math.max(r.h, 0.2) };
      const size = r.fontSize ?? 10;
      const color = inkColor;
      const base = { ...box, fontSize: size, color, ...(fontBody ? { fontFace: fontBody } : {}) };
      /** Place a block of text so it stays inside its own box. */
      const placeFitted = (runs: TextRun[], opts: Record<string, unknown> = {}) => {
        const fitted = fitRuns(runs, box, size);
        slide.addText(fitted.runs as never, {
          ...base,
          ...opts,
          fontSize: fitted.fontSize,
          valign: "top",
          fit: "shrink",
        });
      };

      switch (r.role) {
        case "title":
          slide.addText(
            pnl
              ? `Entity P&L Analysis · ${pnl.entity}`
              : retargetPeriod(r.sample || board.name, asOf) || board.name,
            {
            ...base,
            bold: true,
            fontSize: Math.max(size, 14),
            color: inkColor,
            ...(fontHead ? { fontFace: fontHead } : {}),
            valign: "middle",
            },
          );
          break;

        case "subtitle":
          slide.addText(
            pnl
              ? `${pnl.columns[0] ?? pnl.asOf}${pnl.columns[1] ? ` vs ${pnl.columns[1]}` : ""} · ${pnl.comparison === "qoq" ? "QoQ MTD" : "YoY YTD"}`
              : retargetPeriod(r.sample, asOf) || (asOf ? `as of ${asOf}` : ""),
            { ...base, bold: r.bold },
          );
          break;

        case "units":
          slide.addText(
            units
              ? `Values in ${units}${bs?.fxRate ? ` · mUSD at ${bs.fxRate}` : ""}`
              : r.sample,
            {
            ...base,
            bold: true,
            },
          );
          break;

        case "footnote":
          slide.addText(
            pnl?.evidence?.length
              ? pnl.evidence[0]
              : bs?.unmapped.length
              ? `${bs.unmapped.length} line item(s) matched no report line: ${bs.unmapped.slice(0, 6).join(", ")}`
              : units
                ? `All figures in ${units}.`
                : r.sample,
            { ...base, italic: true, fontSize: Math.min(size, 7) },
          );
          break;

        case "summary":
          placeFitted([{ text: result.summary, options: { breakLine: true } }]);
          break;

        case "kpis": {
          const kpis = result.kpis.slice(0, 6);
          const cols = Math.min(kpis.length, 3);
          const rows = Math.ceil(kpis.length / cols) || 1;
          const gap = 0.1;
          const tw = (box.w - gap * (cols - 1)) / cols;
          const th = (box.h - gap * (rows - 1)) / rows;
          kpis.forEach((k, i) => {
            const cx = box.x + (i % cols) * (tw + gap);
            const cy = box.y + Math.floor(i / cols) * (th + gap);
            slide.addShape(pptx.ShapeType.rect, {
              x: cx, y: cy, w: tw, h: th,
              fill: { color: BS_COLORS.panel },
              line: { color: BS_COLORS.hairline, width: 0.5 },
            });
            // Value type scales with the tile so three lines always fit inside it.
            const valueSize = Math.max(9, Math.min(14, (th * 72) / 3.4));
            slide.addText(
              [
                { text: k.label.toUpperCase(), options: { fontSize: 7, bold: true, color: BS_COLORS.muted, breakLine: true } },
                { text: tidyProse(k.value), options: { fontSize: valueSize, bold: true, color: inkColor, breakLine: true } },
                { text: tidyProse(k.change ?? ""), options: { fontSize: 7, color: BS_COLORS.muted } },
              ],
              { x: cx + 0.08, y: cy + 0.04, w: tw - 0.16, h: th - 0.08, valign: "top", fit: "shrink" },
            );
          });
          break;
        }

        case "tables": {
          // The position table for this slide's side, from the computed sheet.
          if (bs && columns.length) {
            const lines = side === "Funding" ? fundingLines : side === "Assets" ? assetLines : bs.lines;
            const totals: [string, Record<string, number>][] =
              side === "Funding"
                ? [
                    ["Total liabilities", bs.totals.liabilities],
                    ["Total equity", bs.totals.equity],
                  ]
                : side === "Assets"
                  ? [["Total assets", bs.totals.assets]]
                  : [
                      ["Total assets", bs.totals.assets],
                      ["Total liabilities & equity", Object.fromEntries(bs.periods.map((p) => [p, bs.totals.liabilities[p] + bs.totals.equity[p]]))],
                    ];
            const head = [
              { text: side === "Funding" ? "Liabilities & equity" : "Assets", options: { bold: true, color: "FFFFFF", fill: { color: headColor } } },
              ...columns.map((p) => ({ text: p, options: { bold: true, align: "right" as const, color: "FFFFFF", fill: { color: headColor } } })),
            ];
            const body = lines.map((l) => [
              { text: l.label, options: {} },
              ...columns.map((p) => ({ text: formatAmount(l.values[p] ?? 0), options: { align: "right" as const } })),
            ]);
            const foot = totals.map(([label, vals]) => [
              { text: label, options: { bold: true, fill: { color: BS_COLORS.panel } } },
              ...columns.map((p) => ({ text: formatAmount(vals[p] ?? 0), options: { bold: true, align: "right" as const, fill: { color: BS_COLORS.panel } } })),
            ]);
            const rowsCount = 1 + body.length + foot.length;
            const rowH = Math.min(0.28, box.h / rowsCount);
            slide.addTable([head, ...body, ...foot], {
              ...box,
              // Type scales with the row height, so a long table stays inside
              // its box instead of growing past it.
              fontSize: Math.min(size, 9, Math.max(6, (rowH * 72) / 1.9)),
              autoPage: false,
              color: inkColor,
              border: { type: "solid", pt: 0.5, color: BS_COLORS.hairline },
              colW: [box.w * 0.46, ...columns.map(() => (box.w * 0.54) / columns.length)],
              rowH,
              ...(fontBody ? { fontFace: fontBody } : {}),
            });
          } else {
            // No computed sheet: the model's tables, one after another.
            const t = result.tables[0];
            if (t) {
              slide.addTable(
                [t.columns.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: headColor } } })), ...t.rows.map((row) => row.map((c) => ({ text: c, options: {} })))],
                { ...box, fontSize: Math.min(size, 9), color: inkColor, border: { type: "solid", pt: 0.5, color: BS_COLORS.hairline } },
              );
            }
          }
          break;
        }

        case "charts": {
          const spec = result.charts[0];
          // A chart needs room for its axes and legend; a box smaller than this
          // gets no chart at all rather than one whose labels land on the
          // neighbouring text.
          if (box.w < 2 || box.h < 1) break;
          if (bs && columns.length) {
            const lines = side === "Funding" ? fundingLines : side === "Assets" ? assetLines : bs.lines;
            slide.addChart(
              pptx.ChartType.bar,
              columns.map((p) => ({
                name: p,
                labels: lines.map((l) => axisLabel(l.label)),
                values: lines.map((l) => l.values[p] ?? 0),
              })),
              {
                ...box,
                // Vertical columns, report lines along the bottom. Long line
                // names are angled so neighbours never run into each other.
                barDir: "col",
                barGrouping: "clustered",
                // Wider bars with daylight between the bars of a cluster, so a
                // label is never wider than the bar it sits on.
                barGapWidthPct: 30,
                barOverlapPct: -30,
                chartColors: palette.slice(0, columns.length),
                catAxisLabelFontSize: 7.5,
                catAxisLabelRotate: 0,
                valAxisHidden: true,
                valGridLine: { style: "none" },
                // Every value sits above its own bar, small enough that two
                // labels on neighbouring bars stay apart. Inside-the-bar labels
                // were tried and rejected: a short bar clips them.
                showValue: true,
                dataLabelFontSize: 6,
                dataLabelPosition: "outEnd",
                dataLabelFormatCode: "#,##0",
                showLegend: columns.length > 1,
                legendPos: "t",
                legendFontSize: 8,
              },
            );
          } else if (spec) {
            const labels = [...new Set(spec.series.flatMap((s) => s.points.map((p) => p.x)))];
            slide.addChart(
              spec.type === "pie" ? pptx.ChartType.pie : spec.type === "line" ? pptx.ChartType.line : pptx.ChartType.bar,
              spec.series.map((s) => ({ name: s.name, labels, values: labels.map((x) => s.points.find((p) => p.x === x)?.y ?? 0) })),
              { ...box, chartColors: palette, showLegend: true, legendPos: "b", legendFontSize: 8 },
            );
          }
          break;
        }

        case "commentary": {
          const mine = forSide(commentary, (c) => `${c.area} ${c.explanation}`);
          const squashKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
          // Headings: the template's own where it has them, then one per report
          // line on this side that the template did not name — generated, so
          // every line on the balance sheet gets addressed. With no template
          // headings at all, the report lines are the headings.
          const templateHeadings = placeholderHeadings(r.text ?? r.sample);
          const sideLines = bs
            ? side === "Funding"
              ? fundingLines
              : side === "Assets"
                ? assetLines
                : bs.lines
            : [];
          // A report line is covered when a template heading names it — either
          // way round: "Investments in Group Entities" covers the line
          // "Investments" even though only one of its three words matches.
          const covered = (label: string) =>
            templateHeadings.some(
              (h) =>
                squashKey(h) === squashKey(label) ||
                Math.max(headingMatch(h, label), headingMatch(label, h)) >= 0.5,
            );
          const generated = sideLines.map((l) => l.label).filter((label) => !covered(label));
          const headings = [...templateHeadings, ...generated];
          if (headings.length >= 1 && (bs || templateHeadings.length >= 2)) {
            // The template dictates the headings; each is filled with the
            // commentary that concerns it, and anything left over goes last.
            const used = new Set<number>();
            const runs: { text: string; options: Record<string, unknown> }[] = [];
            for (const h of headings) {
              const hits = mine
                .map((c, i) => ({ c, i, score: headingMatch(h, `${c.area} ${c.explanation}`) }))
                .filter((x) => !used.has(x.i) && x.score > 0)
                .sort((a, b) => b.score - a.score);
              runs.push({ text: `${h}:`, options: { bold: true, breakLine: true } });
              if (hits.length) {
                for (const { c, i } of hits.slice(0, 2)) {
                  used.add(i);
                  for (const point of splitPoints(c.explanation)) {
                    runs.push({ text: point, options: { bullet: { indent: 12 }, breakLine: true } });
                  }
                }
              } else {
                // No narrative for this heading — state the figure itself from
                // the computed sheet, which is always true, rather than assert
                // that nothing moved.
                // A heading that IS a report line ("Other current assets") is
                // matched exactly first; word overlap is only the fallback,
                // since it discounts the generic words those labels are made of.
                const squash = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
                const line = bs
                  ? (bs.lines.find((l) => squash(l.label) === squash(h)) ??
                    bs.lines
                      .map((l) => ({ l, score: headingMatch(h, l.label) }))
                      .filter((x) => x.score > 0)
                      .sort((a, b) => b.score - a.score)[0]?.l)
                  : undefined;
                const from = bs?.comparisonPeriod ?? null;
                if (line && asOf && from && from in line.values) {
                  const now = line.values[asOf] ?? 0;
                  const was = line.values[from] ?? 0;
                  const d = now - was;
                  const pct = was === 0 ? "" : ` (${d >= 0 ? "+" : ""}${((d / Math.abs(was)) * 100).toFixed(1)}%)`;
                  runs.push({
                    text: `${formatAmount(now)} ${units} at ${asOf} vs ${formatAmount(was)} ${units} at ${from}: ${d >= 0 ? "+" : ""}${formatAmount(d)} ${units}${pct}. No further commentary generated for this line.`,
                    options: { bullet: { indent: 12 }, breakLine: true },
                  });
                } else {
                  runs.push({
                    text: "No commentary generated for this line.",
                    options: { italic: true, bullet: { indent: 12 }, breakLine: true },
                  });
                }
              }
            }
            const rest = mine.filter((_, i) => !used.has(i));
            if (rest.length) {
              runs.push({ text: "Other movements:", options: { bold: true, breakLine: true } });
              for (const c of rest) {
                runs.push({ text: `${c.area} — ${c.explanation}`, options: { bullet: { indent: 12 }, breakLine: true } });
              }
            }
            placeFitted(runs, { paraSpaceAfter: 2 });
          } else {
            placeFitted(
              mine.length
                ? mine.flatMap((c) => [
                    { text: `${c.area}: `, options: { bold: true, breakLine: false } },
                    { text: c.explanation, options: { breakLine: true } },
                  ])
                : [{ text: "No commentary was derivable for this slide from the data.", options: { italic: true, breakLine: true } }],
              { paraSpaceAfter: 4 },
            );
          }
          break;
        }

        case "insights": {
          const share = Math.max(1, Math.ceil(result.insights.length / anatomy.slides.length));
          const items = result.insights.slice(insightCursor, insightCursor + share);
          insightCursor += share;
          placeFitted(items.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })));
          break;
        }

        case "risks": {
          const mine = forSide(risks, (t) => t);
          const full = r.text ?? r.sample;
          const title = retargetPeriod(full.split(":")[0], asOf) || "Watch items";
          const headings = placeholderHeadings(full);
          const runs: { text: string; options: Record<string, unknown> }[] = [
            { text: `${title}:`, options: { bold: true, breakLine: true } },
          ];
          if (headings.length >= 2) {
            const used = new Set<number>();
            for (const h of headings) {
              const hits = mine
                .map((t, i) => ({ t, i, score: headingMatch(h, t) }))
                .filter((x) => !used.has(x.i) && x.score > 0)
                .sort((a, b) => b.score - a.score);
              runs.push({ text: h, options: { bold: true, breakLine: true } });
              if (hits.length) {
                for (const { t, i } of hits.slice(0, 2)) {
                  used.add(i);
                  runs.push({ text: t, options: { bullet: { indent: 12 }, breakLine: true } });
                }
              } else {
                runs.push({
                  text: "Nothing flagged from the data — add from supporting schedules.",
                  options: { italic: true, bullet: { indent: 12 }, breakLine: true },
                });
              }
            }
            for (const t of mine.filter((_, i) => !used.has(i))) {
              runs.push({ text: t, options: { bullet: true, breakLine: true } });
            }
          } else if (mine.length) {
            for (const t of mine) runs.push({ text: t, options: { bullet: true, breakLine: true } });
          } else {
            runs.push({ text: "None identified from the data — add from supporting schedules.", options: { italic: true } });
          }
          placeFitted(runs);
          break;
        }

        case "actions": {
          const items = (result.actions ?? []).slice(actionCursor, actionCursor + 4);
          actionCursor += items.length;
          if (items.length) {
            slide.addTable(
              [
                ["Action", "Expected impact"].map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: headColor } } })),
                ...items.map((a) => [{ text: a.action, options: {} }, { text: a.expectedImpact, options: {} }]),
              ],
              { ...box, fontSize: Math.min(size, 9), color: inkColor, border: { type: "solid", pt: 0.5, color: BS_COLORS.hairline } },
            );
          }
          break;
        }

        case "picture":
        case "unknown":
        default:
          // Decorative or unmapped: nothing to write here.
          break;
      }
    }
  });

  return true;
}


/**
 * Save a deck, first pinning every chart's category-axis labels horizontal.
 *
 * pptxgenjs writes an empty <a:bodyPr/> for a rotation of 0, which PowerPoint
 * reads as "automatic" — and automatic slants the labels the moment it decides
 * they are too long. An explicit rot="0" is the only thing it honours, so it is
 * written into each chart part before the file is handed over. The labels are
 * already broken into two short lines, so they fit upright.
 */
async function writePptxFile(
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  fileName: string,
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  const zip = await JSZip.loadAsync(blob);
  const charts = Object.keys(zip.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  const download = (file: Blob) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  // Entity P&L slides have no charts. Preserve the document produced by
  // PptxGenJS byte-for-byte rather than unnecessarily repackaging it.
  if (!charts.length) {
    download(blob);
    return;
  }
  for (const name of charts) {
    const xml = await zip.file(name)!.async("string");
    const patched = xml.replace(
      /(<c:catAx>[\s\S]*?<c:txPr>)<a:bodyPr\/>/g,
      '$1<a:bodyPr rot="0" vert="horz"/>',
    );
    if (patched !== xml) zip.file(name, patched);
  }
  const out = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  download(out);
}

export async function exportReportPpt(board: Board, report: Report) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  const W = 13.33;

  // Entity P&L is a governed financial statement with a prescribed Bosch
  // table structure. It must not fall through to the generic template mapper,
  // which collapses its year-end / forecast / variance columns.
  if (addEntityPnlSlide(pptx, board, report)) {
    await writePptxFile(pptx, `${fileStamp(board, report)}.pptx`);
    return;
  }
  // KPI Metrics uses its own governed Business Metrics layout. The imported
  // file is an editable reference template, while this renderer retains the
  // graphic panel and section layout in the downloaded report.
  if (addKpiMetricsSlide(pptx, board, report)) {
    await writePptxFile(pptx, `${fileStamp(board, report)}.pptx`);
    return;
  }
  // A board with an uploaded report format gets exactly that format. Without
  // one, balance sheet boards use the house layout and everything else the
  // generic deck.
  if (addTemplateDrivenSlides(pptx, board, report)) {
    await writePptxFile(pptx, `${fileStamp(board, report)}.pptx`);
    return;
  }
  if (addBalanceSheetSlides(pptx, board, report)) {
    await writePptxFile(pptx, `${fileStamp(board, report)}.pptx`);
    return;
  }
  const result = report.result;
  const style = exportStyle(board);

  const title = (slide: ReturnType<typeof pptx.addSlide>, text: string) =>
    slide.addText(text, {
      x: 0.5, y: 0.35, w: W - 1, h: 0.6,
      fontSize: 24, bold: true, color: style.heading,
      ...(style.fontHead ? { fontFace: style.fontHead } : {}),
    });

  // Title slide
  {
    const slide = pptx.addSlide();
    slide.background = { color: style.background };
    slide.addText(board.name, {
      x: 0.8, y: 2.4, w: W - 1.6, h: 1, fontSize: 40, bold: true, color: style.heading,
      ...(style.fontHead ? { fontFace: style.fontHead } : {}),
    });
    slide.addText(
      `${report.trigger === "scheduled" ? "Scheduled" : "Ad-hoc"} analysis · ${new Date(report.createdAt).toLocaleString()}\nGenerated by LedgerLM${board.templateTheme ? ` · theme: ${board.templateTheme.sourceFile}` : ""}`,
      {
        x: 0.8, y: 3.5, w: W - 1.6, h: 0.9, fontSize: 16, color: style.muted,
        ...(style.fontBody ? { fontFace: style.fontBody } : {}),
      },
    );
  }

  const caption = (slide: ReturnType<typeof pptx.addSlide>, text: string) =>
    slide.addText(text, {
      x: 0.5, y: 0.98, w: W - 1, h: 0.35,
      fontSize: 13, color: style.muted,
      ...(style.fontBody ? { fontFace: style.fontBody } : {}),
    });

  const bulletSlide = (heading: string, items: { text: string; color: string; warn?: boolean }[]) => {
    const slide = pptx.addSlide();
    title(slide, heading);
    const box = { x: 0.5, y: 1.1, w: W - 1, h: 5.8 };
    const runs: TextRun[] = items.map((b) => ({
      text: b.warn ? `⚠ ${b.text}` : b.text,
      options: {
        bullet: b.warn ? false : { code: "2022" },
        color: b.color,
        paraSpaceAfter: 8,
        breakLine: true,
        ...(style.fontBody ? { fontFace: style.fontBody } : {}),
      },
    }));
    // Many insights at 14pt overrun the slide; step the size down before that.
    const fitted = fitRuns(runs, box, 14, 9);
    slide.addText(fitted.runs as never, { ...box, fontSize: fitted.fontSize, valign: "top", fit: "shrink" });
  };

  // Section order and wording follow the board's report template.
  for (const section of planReportSections(board, result)) {
    if (section.kind === "summary") {
      const slide = pptx.addSlide();
      title(slide, section.title);
      {
        const box = { x: 0.5, y: 1.1, w: W - 1, h: 5.8 };
        const fitted = fitRuns([{ text: result.summary, options: { breakLine: true } }], box, 15, 10);
        slide.addText(fitted.runs as never, {
          ...box, fontSize: fitted.fontSize, color: style.body, valign: "top", fit: "shrink",
          ...(style.fontBody ? { fontFace: style.fontBody } : {}),
        });
      }
    }

    if (section.kind === "kpis") {
      const slide = pptx.addSlide();
      title(slide, section.title);
      const rows = [
        ["KPI", "Value", "Change"].map((t) => ({
          text: t,
          options: { bold: true, color: "FFFFFF", fill: { color: style.tableHead } },
        })),
        ...result.kpis.map((k) => [
          { text: k.label, options: {} },
          { text: k.value, options: { bold: true } },
          { text: `${k.direction === "up" ? "▲" : k.direction === "down" ? "▼" : "▶"} ${k.change ?? ""}`, options: {} },
        ]),
      ];
      slide.addTable(rows, {
        x: 0.5, y: 1.2, w: W - 1, fontSize: 13, color: style.body,
        border: { type: "solid", color: "DDE5E3", pt: 1 },
        ...(style.fontBody ? { fontFace: style.fontBody } : {}),
      });
    }

    // One slide per chart (native, editable PowerPoint charts).
    if (section.kind === "charts") {
      for (const spec of pick(result.charts, section.items)) {
        const slide = pptx.addSlide();
        // The template's section name owns the slide; the generated chart's own
        // title becomes a caption so neither is lost.
        title(slide, section.fromTemplate ? section.title : spec.title);
        const captioned = section.fromTemplate && section.title !== spec.title;
        if (captioned) caption(slide, spec.title);
        const area = { x: 0.7, y: captioned ? 1.6 : 1.2, w: W - 1.4, h: captioned ? 5.2 : 5.6 };
        if (spec.type === "pie") {
          const slices = spec.series[0]?.points ?? [];
          slide.addChart(
            pptx.ChartType.doughnut,
            [{ name: spec.series[0]?.name ?? spec.title, labels: slices.map((p) => p.x), values: slices.map((p) => p.y) }],
            { ...area, chartColors: SERIES_PALETTE, showLegend: true, legendPos: "r", holeSize: 55 },
          );
        } else if (spec.type === "waterfall") {
          // PowerPoint has no waterfall primitive, and a stacked bar colours by
          // series rather than by point — so the bridge is built from one
          // hidden riser plus a series per bar type, only one of which is
          // non-zero in any given category.
          const w = waterfallSeries(spec);
          slide.addChart(
            pptx.ChartType.bar,
            [
              { name: "riser", labels: w.labels, values: w.risers },
              { name: "Total", labels: w.labels, values: w.totals },
              { name: "Favourable", labels: w.labels, values: w.up },
              { name: "Adverse", labels: w.labels, values: w.down },
            ],
            {
              ...area,
              barDir: "col",
              barGrouping: "stacked",
              // The riser matches the slide background so it reads as empty.
              chartColors: [style.background, "A9B6B6", BS_COLORS.teal, BS_COLORS.magenta],
              showLegend: false,
              catAxisLabelFontSize: 9,
              valAxisLabelFontSize: 10,
            },
          );
        } else {
          const { labels, series } = alignSeries(spec);
          const type =
            spec.type === "bar" ? pptx.ChartType.bar : spec.type === "area" ? pptx.ChartType.area : pptx.ChartType.line;
          slide.addChart(
            type,
            series.map((s) => ({ name: s.name, labels, values: s.values.map((v) => v ?? 0) })),
            {
              ...area,
              chartColors: SERIES_PALETTE.slice(0, Math.max(1, spec.series.length)),
              showLegend: spec.series.length > 1,
              legendPos: "b",
              barDir: "col",
              lineSize: 2,
              catAxisLabelFontSize: 10,
              valAxisLabelFontSize: 10,
              // Losses read red, matching the on-screen charts.
              ...(spec.series.length === 1 && spec.series[0].points.some((p) => p.y < 0)
                ? { invertedColors: ["B4552F"] }
                : {}),
            },
          );
        }
      }
    }

    if (section.kind === "insights") {
      bulletSlide(
        section.title,
        result.insights.map((t) => ({ text: t, color: style.body })),
      );
    }

    if (section.kind === "commentary") {
      const slide = pptx.addSlide();
      title(slide, section.title);
      const rows = [
        ["Area", "What happened and why", "Recurrence"].map((t) => ({
          text: t,
          options: { bold: true, color: "FFFFFF", fill: { color: style.tableHead } },
        })),
        ...(result.commentary ?? []).map((c) => [
          { text: c.area, options: { bold: true } },
          { text: c.explanation, options: {} },
          { text: c.recurrence ?? "", options: {} },
        ]),
      ];
      slide.addTable(rows, {
        x: 0.5, y: 1.2, w: W - 1, colW: [3.2, 8.1, 1.5], fontSize: 12, color: style.body,
        border: { type: "solid", color: "DDE5E3", pt: 1 },
        ...(style.fontBody ? { fontFace: style.fontBody } : {}),
      });
    }

    if (section.kind === "risks") {
      bulletSlide(
        section.title,
        result.risks.map((t) => ({ text: t, color: "B4552F", warn: true })),
      );
    }

    if (section.kind === "actions") {
      const slide = pptx.addSlide();
      title(slide, section.title);
      const rows = [
        ["Action", "Expected impact", "Owner", "Due date"].map((t) => ({
          text: t,
          options: { bold: true, color: "FFFFFF", fill: { color: style.tableHead } },
        })),
        // Owner and due date are left blank on purpose — they are the board
        // owner's to assign, not the model's to invent.
        ...(result.actions ?? []).map((a) => [
          { text: a.action, options: {} },
          { text: a.expectedImpact, options: {} },
          { text: a.owner ?? "", options: {} },
          { text: a.dueDate ?? "", options: {} },
        ]),
      ];
      slide.addTable(rows, {
        x: 0.5, y: 1.2, w: W - 1, colW: [5.2, 4.1, 1.9, 1.6], fontSize: 12, color: style.body,
        border: { type: "solid", color: "DDE5E3", pt: 1 },
        ...(style.fontBody ? { fontFace: style.fontBody } : {}),
      });
    }

    if (section.kind === "tables") {
      for (const table of pick(result.tables, section.items)) {
        const slide = pptx.addSlide();
        title(slide, section.fromTemplate ? section.title : table.title);
        const captioned = section.fromTemplate && section.title !== table.title;
        if (captioned) caption(slide, table.title);
        const rows = [
          table.columns.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: style.tableHead } } })),
          ...table.rows.map((r) => r.map((cell) => ({ text: cell, options: {} }))),
        ];
        slide.addTable(rows, {
          x: 0.5, y: captioned ? 1.6 : 1.2, w: W - 1, fontSize: 12, color: style.body,
          border: { type: "solid", color: "DDE5E3", pt: 1 },
          ...(style.fontBody ? { fontFace: style.fontBody } : {}),
        });
      }
    }
  }

  await writePptxFile(pptx, `${fileStamp(board, report)}.pptx`);
}

/** Snapshot a rendered SVG chart to a PNG data URL, optionally remapping series colors. */
async function svgToPng(
  svg: SVGSVGElement,
  colorMap?: Map<string, string>,
): Promise<{ dataUrl: string; w: number; h: number }> {
  const rect = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(rect.width));
  clone.setAttribute("height", String(rect.height));
  // A serialised SVG loses the page's CSS, so axis labels fall back to the
  // renderer's default serif. Pin the family the report itself uses.
  clone.setAttribute("style", "font-family: Helvetica, Arial, sans-serif");
  let xml = new XMLSerializer().serializeToString(clone);
  if (colorMap) {
    for (const [from, to] of colorMap) {
      xml = xml.replaceAll(from, to);
    }
  }
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("chart render failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  });
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), w: rect.width, h: rect.height };
}

// ---------------------------------------------------------------------------
// PDF export
//
// Designed as an executive document, not a dump of the on-screen sections: a
// branded cover with the verdict and headline figures, then position, charts,
// narrative and appendix, each laid out on a fixed grid with running footers.
// Everything is drawn with vector primitives and the built-in Helvetica, so
// the file stays small and needs no embedded font.
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

const rgbOf = (hex: string): Rgb => [
  parseInt(hex.slice(0, 2), 16),
  parseInt(hex.slice(2, 4), 16),
  parseInt(hex.slice(4, 6), 16),
];

/**
 * jsPDF's built-in fonts only encode WinAnsi. Anything outside it — arrows,
 * ≤/≥, warning signs, the Unicode minus — is silently mis-encoded and the
 * whole line renders as spaced-out garbage that also overflows the page. Map
 * the characters that finance text actually uses to WinAnsi-safe equivalents,
 * and neutralise anything else rather than let it corrupt the line.
 */
function pdfText(input: string | null | undefined): string {
  let s = tidyProse(String(input ?? ""));
  const map: [RegExp, string][] = [
    [/→|⟶|⇒/g, " to "], // → ⟶ ⇒
    [/←/g, " from "], // ←
    [/≤/g, "<="],
    [/≥/g, ">="],
    [/≠/g, "!="],
    [/−|‐|‑|‒/g, "-"], // minus, hyphens
    [/₹/g, "Rs "], // ₹
    [/▲|▴|↑/g, "(up) "],
    [/▼|▾|↓/g, "(down) "],
    [/►|▶|→/g, ""],
    [/⚠️?|⚠/g, "!"], // ⚠
    [/✓|✔/g, "OK"],
    [/ /g, " "],
    [/​|‌|‍|﻿/g, ""],
    [/′/g, "'"],
    [/″/g, '"'],
    [/⁄/g, "/"],
  ];
  for (const [re, to] of map) s = s.replace(re, to);
  // WinAnsi: Latin-1 plus the 0x80–0x9F specials jsPDF maps (€ … • – — ‘ ’ “ ” ™ etc.).
  const specials = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    out += code <= 0xff || specials.includes(ch) ? ch : "?";
  }
  return out.replace(/\s+/g, " ").trim();
}

/** "94016.19" → "94,016"; "1.76" stays "1.76"; non-numbers pass through. */
function pdfNumber(cell: string): string {
  const raw = String(cell ?? "").trim();
  if (!/^-?[\d,]+(?:\.\d+)?%?$/.test(raw)) return raw;
  const pct = raw.endsWith("%");
  const n = Number(raw.replace(/[,%]/g, ""));
  if (!Number.isFinite(n)) return raw;
  const abs = Math.abs(n);
  const formatted =
    abs >= 1000
      ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return pct ? `${formatted}%` : formatted;
}

/** Sections in the order an executive reads them, unless the board's template dictates otherwise. */
const PDF_ORDER: SectionKind[] = [
  "summary",
  "kpis",
  "insights",
  "tables",
  "charts",
  "commentary",
  "risks",
  "actions",
];

export async function exportReportPdf(board: Board, report: Report, chartsRoot: HTMLElement | null) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 46; // page margin
  const FOOT = 40; // reserved for the running footer
  const contentW = pageW - M * 2;
  const result = report.result;
  const bs = result.balanceSheet ?? null;

  const C = {
    teal: rgbOf(BS_COLORS.teal),
    magenta: rgbOf(BS_COLORS.magenta),
    ink: rgbOf(BS_COLORS.ink),
    body: rgbOf(BS_COLORS.body),
    muted: rgbOf(BS_COLORS.muted),
    hair: rgbOf(BS_COLORS.hairline),
    panel: rgbOf(BS_COLORS.panel),
    good: rgbOf(BS_COLORS.good),
    bad: rgbOf(BS_COLORS.bad),
    amber: [184, 120, 20] as Rgb,
    amberSoft: [253, 246, 232] as Rgb,
    tealSoft: [232, 243, 243] as Rgb,
    white: [255, 255, 255] as Rgb,
  };
  const palette = SERIES_PALETTE.map(rgbOf);
  // On-screen chart colours are remapped to the report palette in the snapshot.
  const chartColorMap = new Map(
    SERIES_COLORS.map((c, i) => {
      const [r, g, b] = palette[i % palette.length];
      return [`#${c}`, `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`];
    }),
  );

  const asOf = bs?.periods[bs.periods.length - 1] ?? null;
  const units = bs?.units ?? "";
  const generated = new Date(report.createdAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let y = M;
  const bottom = () => pageH - FOOT - 8;
  const newPage = () => {
    doc.addPage();
    y = M + 10;
  };
  const ensure = (needed: number) => {
    if (y + needed > bottom()) newPage();
  };
  const font = (style: "normal" | "bold" | "italic", size: number, color: Rgb) => {
    doc.setFont("helvetica", style).setFontSize(size).setTextColor(...color);
  };
  /**
   * Wrap text for a given width AT the size it will be drawn. jsPDF measures
   * with the current font, so wrapping before setting the size measures at
   * whatever came last — a 13pt heading — and the first paragraph after every
   * heading comes out a third too narrow.
   */
  const wrap = (text: string, width: number, size = 10, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style).setFontSize(size);
    return doc.splitTextToSize(pdfText(text), width) as string[];
  };

  /** Section title: a teal bar and a bold heading, kept together with what follows. */
  const sectionHeading = (title: string, keepWith = 60) => {
    ensure(28 + keepWith);
    y += 6;
    doc.setFillColor(...C.teal);
    doc.rect(M, y - 11, 3, 14, "F");
    font("bold", 13, C.ink);
    doc.text(pdfText(title), M + 10, y);
    y += 18;
  };
  const paragraph = (text: string, size = 10, color: Rgb = C.body, width = contentW, x = M) => {
    font("normal", size, color);
    const lines = wrap(text, width, size);
    const lh = size * 1.42;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, x, y);
      y += lh;
    }
    y += 4;
  };
  const triangle = (x: number, yy: number, dir: "up" | "down" | "flat", color: Rgb) => {
    doc.setFillColor(...color);
    if (dir === "up") doc.triangle(x, yy + 5, x + 3.2, yy - 0.5, x + 6.4, yy + 5, "F");
    else if (dir === "down") doc.triangle(x, yy - 0.5, x + 3.2, yy + 5, x + 6.4, yy - 0.5, "F");
    else doc.rect(x, yy + 1.4, 6.4, 1.8, "F");
  };
  const numeric = (v: string) => /^-?[\d,]+(?:\.\d+)?%?$/.test(String(v).trim());

  const table = (
    head: string[],
    body: string[][],
    opts: { boldRows?: number[]; bandRows?: number[]; totalRows?: number[]; firstColW?: number } = {},
  ) => {
    // Right-align columns that are numeric all the way down.
    const columnStyles: Record<number, { halign?: "right" | "left"; cellWidth?: number; fontStyle?: "bold" }> = {};
    head.forEach((_, ci) => {
      const allNum = body.length > 0 && body.every((r) => !r[ci] || numeric(r[ci]));
      if (ci > 0 && allNum) columnStyles[ci] = { halign: "right" };
    });
    if (opts.firstColW) columnStyles[0] = { ...(columnStyles[0] ?? {}), cellWidth: opts.firstColW };
    autoTable(doc, {
      head: [head.map(pdfText)],
      body: body.map((r) => r.map((c) => pdfNumber(pdfText(c)))),
      startY: y,
      margin: { left: M, right: M, bottom: FOOT + 8 },
      styles: {
        font: "helvetica",
        fontSize: 8.6,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.body,
        lineColor: C.hair,
        lineWidth: 0.4,
        overflow: "linebreak",
      },
      headStyles: { fillColor: C.teal, textColor: 255, fontStyle: "bold", fontSize: 8.4 },
      alternateRowStyles: { fillColor: [250, 252, 252] },
      columnStyles,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const i = data.row.index;
        if (opts.boldRows?.includes(i)) data.cell.styles.fontStyle = "bold";
        if (opts.bandRows?.includes(i)) {
          data.cell.styles.fillColor = C.panel;
          data.cell.styles.fontStyle = "bold";
        }
        if (opts.totalRows?.includes(i)) {
          data.cell.styles.fillColor = C.tealSoft;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = C.ink;
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  };

  // ---- Cover band ---------------------------------------------------------
  const bandH = 96;
  doc.setFillColor(...C.teal);
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...C.magenta);
  doc.rect(0, bandH, pageW, 3, "F");
  font("bold", 20, C.white);
  const titleLines = wrap(board.name, contentW - 150, 20, "bold");
  doc.text(titleLines.slice(0, 2), M, 40);
  font("normal", 9.5, [225, 240, 240]);
  doc.text(
    pdfText(
      `${report.trigger === "scheduled" ? "Scheduled" : "Ad-hoc"} analysis · ${generated} · Generated by LedgerLM`,
    ),
    M,
    bandH - 22,
  );
  // Right block: as-at period and units.
  if (asOf) {
    font("bold", 11, C.white);
    doc.text(pdfText(`Position as at ${asOf}`), pageW - M, 40, { align: "right" });
  }
  if (units) {
    font("normal", 9.5, [225, 240, 240]);
    doc.text(
      pdfText(bs?.fxRate ? `${units} · mUSD at ${bs.fxRate}` : units),
      pageW - M,
      56,
      { align: "right" },
    );
  }
  y = bandH + 26;

  // Balance-check badge — the first thing a CFO looks for.
  if (bs) {
    const ties = Object.values(bs.balances).every(Boolean);
    const label = ties ? "Balance check: ties in all periods" : "Balance check: does not tie";
    font("bold", 8.5, ties ? C.good : C.bad);
    const w = doc.getTextWidth(label) + 18;
    doc.setFillColor(...(ties ? ([232, 244, 238] as Rgb) : ([251, 234, 232] as Rgb)));
    doc.roundedRect(M, y - 10, w, 16, 3, 3, "F");
    doc.text(label, M + 9, y + 1);
    y += 22;
  }

  // Only the chart surfaces themselves. Recharts also emits a 10x10
  // "recharts-surface" SVG for every legend swatch; picking those up by index
  // put a legend dot in the report, stretched to page width as a solid block.
  const svgs = chartsRoot
    ? [...chartsRoot.querySelectorAll<SVGSVGElement>("svg.recharts-surface")].filter(
        (svg) => !svg.closest(".recharts-legend-wrapper") && svg.getBoundingClientRect().width > 80,
      )
    : [];

  // Section order: the board's template when it has one, else the executive order.
  let sections = planReportSections(board, result);
  if (!sections.some((s) => s.fromTemplate)) {
    sections = [...sections].sort((a, b) => PDF_ORDER.indexOf(a.kind) - PDF_ORDER.indexOf(b.kind));
  }

  for (const section of sections) {
    // ---- Summary: a callout, not a plain paragraph -----------------------
    if (section.kind === "summary" && result.summary) {
      sectionHeading(section.title, 40);
      font("normal", 10.2, C.ink);
      const lines = wrap(result.summary, contentW - 26, 10.2);
      const h = lines.length * 14.4 + 18;
      ensure(h);
      doc.setFillColor(...C.tealSoft);
      doc.roundedRect(M, y - 10, contentW, h, 4, 4, "F");
      doc.setFillColor(...C.teal);
      doc.rect(M, y - 10, 3, h, "F");
      let ly = y + 4;
      for (const line of lines) {
        doc.text(line, M + 14, ly);
        ly += 14.4;
      }
      y += h + 6;
    }

    // ---- KPIs: a tile strip -------------------------------------------
    if (section.kind === "kpis" && result.kpis.length) {
      sectionHeading(section.title, 70);
      const cols = 3;
      const gap = 10;
      const tileW = (contentW - gap * (cols - 1)) / cols;
      const tileH = 62;
      result.kpis.forEach((k, i) => {
        const col = i % cols;
        if (col === 0) {
          ensure(tileH + gap);
        }
        const x = M + col * (tileW + gap);
        doc.setFillColor(...C.panel);
        doc.setDrawColor(...C.hair);
        doc.setLineWidth(0.6);
        doc.roundedRect(x, y - 8, tileW, tileH, 4, 4, "FD");
        font("bold", 7.2, C.muted);
        doc.text(pdfText(k.label).toUpperCase(), x + 10, y + 3, { charSpace: 0.5 });
        font("bold", 16, C.ink);
        // "₹94,161 mINR" says the currency twice; keep the unit, drop the sign.
        const value = /INR/.test(k.value) ? k.value.replace(/^\s*(?:₹|Rs\.?)\s*/, "") : k.value;
        doc.text(pdfText(value), x + 10, y + 24);
        const dir = k.direction ?? "flat";
        const dc = dir === "up" ? C.good : dir === "down" ? C.bad : C.muted;
        triangle(x + 10, y + 36, dir, dc);
        font("normal", 7.6, C.body);
        const change = wrap(k.change ?? "", tileW - 30, 7.6)[0] ?? "";
        doc.text(change, x + 20, y + 41);
        if (col === cols - 1 || i === result.kpis.length - 1) y += tileH + gap;
      });
      y += 4;
    }

    // ---- Insights: numbered, with the number set in teal ----------------
    if (section.kind === "insights" && result.insights.length) {
      sectionHeading(section.title, 40);
      result.insights.forEach((insight, i) => {
        const lines = wrap(insight, contentW - 22, 9.5);
        ensure(lines.length * 13.5 + 6);
        font("bold", 9.5, C.teal);
        doc.text(String(i + 1), M, y);
        font("normal", 9.5, C.body);
        for (const line of lines) {
          doc.text(line, M + 18, y);
          y += 13.5;
        }
        y += 4;
      });
      y += 2;
    }

    // ---- Position: from the computed balance sheet when there is one ------
    if (section.kind === "tables") {
      if (bs && bs.lines.length && asOf) {
        sectionHeading("Balance sheet position", 90);
        const baselines = (bs.comparisonPeriods ?? []).filter((p) => p !== asOf);
        const cols = [...(baselines.length ? baselines : bs.periods.filter((p) => p !== asOf).slice(-2)), asOf];
        const primary = bs.comparisonPeriod && cols.includes(bs.comparisonPeriod) ? bs.comparisonPeriod : cols[0];
        const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
        const delta = (now: number, was: number) => {
          const d = now - was;
          const pct = was === 0 ? "" : ` (${d >= 0 ? "+" : ""}${((d / Math.abs(was)) * 100).toFixed(1)}%)`;
          return `${d >= 0 ? "+" : ""}${fmt(d)}${pct}`;
        };
        const head = ["Report line", ...cols, `Change vs ${primary}`];
        const rows: string[][] = [];
        const bold: number[] = [];
        const band: number[] = [];
        const total: number[] = [];
        const sum = (pred: (l: BalanceSheetLine) => boolean) => (p: string) =>
          bs.lines.filter(pred).reduce((a, l) => a + (l.values[p] ?? 0), 0);
        const pushLine = (label: string, at: (p: string) => number, kind?: "band" | "total") => {
          rows.push([label, ...cols.map((p) => fmt(at(p))), delta(at(asOf), at(primary))]);
          if (kind === "band") band.push(rows.length - 1);
          if (kind === "total") total.push(rows.length - 1);
        };
        const linesOf = (sec: BalanceSheetLine["section"], term?: BalanceSheetLine["term"]) =>
          bs.lines.filter((l) => l.section === sec && (!term || l.term === term));
        for (const l of linesOf("Assets", "current")) pushLine(l.label, (p) => l.values[p] ?? 0);
        pushLine("Current assets", sum((l) => l.section === "Assets" && l.term === "current"), "band");
        for (const l of linesOf("Assets", "non-current")) pushLine(l.label, (p) => l.values[p] ?? 0);
        pushLine("Non-current assets", sum((l) => l.section === "Assets" && l.term === "non-current"), "band");
        pushLine("TOTAL ASSETS", (p) => bs.totals.assets[p] ?? 0, "total");
        for (const l of linesOf("Equity")) pushLine(l.label, (p) => l.values[p] ?? 0);
        pushLine("Total equity", (p) => bs.totals.equity[p] ?? 0, "band");
        for (const l of linesOf("Liabilities", "current")) pushLine(l.label, (p) => l.values[p] ?? 0);
        pushLine("Current liabilities", sum((l) => l.section === "Liabilities" && l.term === "current"), "band");
        for (const l of linesOf("Liabilities", "non-current")) pushLine(l.label, (p) => l.values[p] ?? 0);
        pushLine("Non-current liabilities", sum((l) => l.section === "Liabilities" && l.term === "non-current"), "band");
        pushLine("Total liabilities", (p) => bs.totals.liabilities[p] ?? 0, "band");
        pushLine("TOTAL LIABILITIES & EQUITY", (p) => (bs.totals.liabilities[p] ?? 0) + (bs.totals.equity[p] ?? 0), "total");
        table(head, rows, { boldRows: bold, bandRows: band, totalRows: total, firstColW: 150 });

        // Balance check strip under the table.
        font("normal", 8.4, C.muted);
        const parts = bs.periods.map((p) => `${p}: ${bs.balances[p] ? "ties" : "does not tie"}`);
        paragraph(`Balance check (assets = liabilities + equity) — ${parts.join(" · ")}. All figures in ${units}.`, 8.4, C.muted);
        if (bs.unmapped.length) {
          paragraph(
            `${bs.unmapped.length} line item(s) matched no report line and are excluded from the roll-up: ${bs.unmapped.slice(0, 8).join(", ")}.`,
            8.4,
            C.amber,
          );
        }
      }
      // Model-written supporting tables, in the appendix style.
      const supporting = pick(result.tables, section.items);
      if (supporting.length) {
        sectionHeading(bs ? "Supporting tables" : section.title, 80);
        for (const t of supporting) {
          ensure(60);
          font("bold", 10.5, C.ink);
          doc.text(pdfText(t.title), M, y);
          y += 12;
          table(t.columns, t.rows);
        }
      }
    }

    // ---- Charts: full width, two to a page ---------------------------------
    if (section.kind === "charts") {
      const idxs = section.items ?? result.charts.map((_, n) => n);
      const available = idxs.filter((i) => result.charts[i] && svgs[i]);
      if (available.length) {
        sectionHeading(section.title, 200);
        for (const i of available) {
          const spec = result.charts[i];
          try {
            const png = await svgToPng(svgs[i], chartColorMap);
            const w = contentW;
            const h = Math.min((png.h / png.w) * w, 215);
            ensure(h + 44);
            font("bold", 10.5, C.ink);
            doc.text(pdfText(spec.title), M, y);
            y += 10;
            doc.setDrawColor(...C.hair);
            doc.setLineWidth(0.5);
            doc.roundedRect(M, y - 2, w, h + 4, 4, 4, "S");
            doc.addImage(png.dataUrl, "PNG", M + 2, y, w - 4, h);
            y += h + 12;
            // A pie's legend names its slices, not the single series.
            const legend =
              spec.type === "pie"
                ? (spec.series[0]?.points ?? []).map((pt) => pt.x)
                : spec.series.map((se) => se.name);
            let lx = M;
            font("normal", 8.4, C.muted);
            legend.forEach((name, li) => {
              const label = pdfText(name);
              const wItem = 12 + doc.getTextWidth(label) + 16;
              if (lx + wItem > pageW - M) {
                lx = M;
                y += 13;
              }
              const [r, g, b] = palette[li % palette.length];
              doc.setFillColor(r, g, b);
              doc.roundedRect(lx, y - 6, 8, 8, 1.5, 1.5, "F");
              doc.text(label, lx + 12, y);
              lx += wItem;
            });
            y += 22;
          } catch {
            // Chart snapshot failed — the rest of the report still renders.
          }
        }
      }
    }

    // ---- Commentary: one card per area ------------------------------------
    if (section.kind === "commentary" && (result.commentary ?? []).length) {
      sectionHeading(section.title, 60);
      for (const c of result.commentary ?? []) {
        const bodyLines = wrap(c.explanation, contentW - 28, 9.3);
        const h = 20 + bodyLines.length * 13 + 10;
        ensure(h + 6);
        doc.setDrawColor(...C.hair);
        doc.setLineWidth(0.5);
        doc.roundedRect(M, y - 10, contentW, h, 4, 4, "S");
        doc.setFillColor(...C.teal);
        doc.rect(M, y - 10, 3, h, "F");
        const areaLine = wrap(c.area, contentW - 110, 10, "bold")[0] ?? "";
        font("bold", 10, C.ink);
        doc.text(areaLine, M + 14, y + 3);
        if (c.recurrence) {
          const chip = pdfText(c.recurrence).toUpperCase();
          font("bold", 6.8, C.teal);
          const cw = doc.getTextWidth(chip) + 12;
          doc.setDrawColor(...C.teal);
          doc.roundedRect(M + contentW - cw - 10, y - 5, cw, 12, 6, 6, "S");
          doc.text(chip, M + contentW - cw - 4, y + 3.4, { charSpace: 0.4 });
        }
        font("normal", 9.3, C.body);
        let ly = y + 20;
        for (const line of bodyLines) {
          doc.text(line, M + 14, ly);
          ly += 13;
        }
        y += h + 8;
      }
      y += 2;
    }

    // ---- Risks: amber callouts --------------------------------------------
    if (section.kind === "risks" && result.risks.length) {
      sectionHeading(section.title, 50);
      for (const risk of result.risks) {
        const lines = wrap(risk, contentW - 30, 9.3);
        const h = lines.length * 13 + 12;
        ensure(h + 6);
        doc.setFillColor(...C.amberSoft);
        doc.roundedRect(M, y - 9, contentW, h, 3, 3, "F");
        doc.setFillColor(...C.amber);
        doc.rect(M, y - 9, 3, h, "F");
        font("normal", 9.3, C.body);
        let ly = y + 2;
        for (const line of lines) {
          doc.text(line, M + 14, ly);
          ly += 13;
        }
        y += h + 6;
      }
      y += 2;
    }

    // ---- Actions ----------------------------------------------------------
    if (section.kind === "actions" && (result.actions ?? []).length) {
      sectionHeading(section.title, 70);
      table(
        ["#", "Recommended action", "Expected impact", "Owner", "Due"],
        // Owner and due date stay blank — they cannot be derived from the data.
        (result.actions ?? []).map((a, i) => [String(i + 1), a.action, a.expectedImpact, a.owner ?? "", a.dueDate ?? ""]),
        { firstColW: 18 },
      );
    }
  }

  // ---- Running header and footer on every page --------------------------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) {
      font("bold", 8, C.teal);
      doc.text(pdfText(board.name), M, 26);
      font("normal", 8, C.muted);
      doc.text(pdfText(asOf ? `Position as at ${asOf}${units ? ` · ${units}` : ""}` : generated), pageW - M, 26, {
        align: "right",
      });
      doc.setDrawColor(...C.hair);
      doc.setLineWidth(0.5);
      doc.line(M, 32, pageW - M, 32);
    }
    doc.setDrawColor(...C.hair);
    doc.setLineWidth(0.5);
    doc.line(M, pageH - FOOT + 4, pageW - M, pageH - FOOT + 4);
    font("normal", 7.8, C.muted);
    doc.text("LedgerLM · Confidential", M, pageH - FOOT + 17);
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - FOOT + 17, { align: "right" });
  }

  doc.save(`${fileStamp(board, report)}.pdf`);
}
