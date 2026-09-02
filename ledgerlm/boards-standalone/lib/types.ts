/** Shown as a label on the template card: "standard" = bundled, "custom" = built to order. */
export type TemplateTier = "standard" | "custom";

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  /** Label shown on the template card; templates without one show no label. */
  tier?: TemplateTier;
  /** Editable "Analysis Context / System Prompt" shown in the create-board modal. */
  systemPrompt: string;
  /** Instructions given to the model describing the pre-defined analysis. */
  analysisPrompt: string;
}

export interface DataSource {
  id: string;
  name: string;
  kind: "sample" | "upload";
  description: string;
  /** Tabular records, e.g. monthly P&L lines or balance sheet snapshots. */
  records: Record<string, string | number>[];
  /** When the dataset was uploaded (uploads only; used for newest-first ordering). */
  uploadedAt?: string;
}

export interface DataCube {
  id: string;
  name: string;
  description: string;
  /** Version labels selectable as "Rolling Forecasts to Expose". */
  versions: string[];
  records: Record<string, string | number>[];
}

/**
 * How much of the cube an analysis may read.
 * - "all": every column in the sheet (the default when nothing is chosen)
 * - "selected": only the mapped key data columns and their dimensions
 * - "exclude": everything except the named columns
 */
export type ScopeMode = "all" | "selected" | "exclude";

/** A cube column selected for analysis, with a user-given display name. */
export interface KeyColumn {
  column: string;
  label: string;
  /** Optional dimension column to break this measure down by (entity, month, type…). */
  dimension?: string | null;
  /**
   * Selected sub-dimensions — unique values of `dimension` to restrict the
   * analysis to. Empty/absent = all values.
   */
  dimensionValues?: string[];
}

/** Corporate theme extracted from an uploaded .pptx template. All colors are 6-digit hex without #. */
export interface PptTheme {
  sourceFile: string;
  colors: {
    /** Primary text color (dk1) and secondary text color (dk2). */
    dk1: string;
    dk2: string;
    /** Primary and secondary background colors (lt1, lt2). */
    lt1: string;
    lt2: string;
    /** accent1–accent6, in order. */
    accents: string[];
  };
  fonts: { major: string; minor: string };
  /** Resolved slide background color. */
  background: string;
}

export interface BoardDataSources {
  enterpriseData: boolean;
  vaultDocuments: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export type RunTrigger = "scheduled" | "adhoc";

export interface AnalysisThread {
  id: string;
  name: string;
  createdAt: string;
  /** How this thread came to exist: a scheduled run or an ad-hoc run/chat. */
  trigger: RunTrigger;
  /** Report this thread discusses, when it was created by an analysis run. */
  reportId: string | null;
  messages: ChatMessage[];
}

export type TimeGranularity = "auto" | "monthly" | "quarterly" | "yearly";

/**
 * Which period the closing position is measured against.
 * - "previous": the period immediately before the latest one
 * - "opening": the earliest period in the data
 * - "year-ago": the same period one year earlier, when the data spans it
 * - "specific": the period named in `period`
 */
export type ComparisonMode = "previous" | "opening" | "year-ago" | "specific";

export interface ComparisonBasis {
  mode: ComparisonMode;
  /**
   * Period labels, used only when mode is "specific". More than one may be
   * chosen — the closing position is then reported against each of them.
   */
  periods: string[];
}

export type ScheduleFrequency = "15min" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

/** Units for a "custom" frequency. Months are approximated as 30 days. */
export type CustomIntervalUnit = "minutes" | "hours" | "days" | "weeks" | "months";

export interface BoardSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  /** How many `customUnit`s between runs when frequency is "custom". */
  customEvery?: number;
  customUnit?: CustomIntervalUnit;
  /**
   * When the first run should happen (ISO). Null means "one interval from
   * now" — the behaviour before a start time could be chosen.
   */
  startAt?: string | null;
  /** ISO timestamp of the next due run; null when disabled. */
  nextRunAt: string | null;
}

export interface Kpi {
  label: string;
  value: string;
  change?: string;
  direction?: "up" | "down" | "flat";
}

export interface ChartSeries {
  name: string;
  points: { x: string; y: number }[];
}

export interface ChartSpec {
  title: string;
  /**
   * "waterfall" is a variance bridge: the first and last points are the opening
   * and closing totals, and the points between them are signed contributions
   * that carry one to the other.
   */
  type: "line" | "bar" | "area" | "pie" | "waterfall";
  series: ChartSeries[];
}

export interface TableSpec {
  title: string;
  columns: string[];
  rows: string[][];
}

/**
 * A recommended next step. Owner and dueDate are deliberately left for the
 * board owner to fill in — they cannot be derived from the data, and guessing
 * them would put invented names and dates into a finance report.
 */
export interface ActionItem {
  action: string;
  expectedImpact: string;
  owner?: string;
  dueDate?: string;
}

/**
 * Root-cause commentary: what moved, why, and whether it repeats. Distinct
 * from `insights` — insights rank what happened, commentary explains it.
 */
export interface CommentaryItem {
  area: string;
  explanation: string;
  /** "one-time" or "ongoing" when the analysis can tell them apart. */
  recurrence?: string;
}

/** What a region of an uploaded template slide is there to carry. */
export type TemplateRegionRole =
  | "title"
  | "subtitle"
  | "units"
  | "footnote"
  | "summary"
  | "kpis"
  | "charts"
  | "tables"
  | "insights"
  | "commentary"
  | "risks"
  | "actions"
  | "picture"
  | "unknown";

/** One shape on a template slide, and what will be written into it. */
export interface TemplateRegion {
  /** Stable id within the template, e.g. "s2.r4". */
  id: string;
  /** The shape's own name in the deck ("TextBox 6"). */
  name: string;
  kind: "text" | "table" | "chart" | "picture" | "object";
  /** Position and size in inches, as laid out in the source deck. */
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number | null;
  bold: boolean;
  color: string | null;
  bullets: boolean;
  role: TemplateRegionRole;
  /** A short excerpt of the region's own text, so it is recognisable. */
  sample: string;
  /**
   * The region's full text. Placeholder decks carry their structure here —
   * "Cash & cash equivalents: (Pointers on …)" — and the export fills those
   * headings rather than inventing its own.
   */
  text?: string;
  /** Which analysis fields populate this region. */
  variables: string[];
}

export interface TemplateSlideAnatomy {
  /** 1-based slide number in the source deck. */
  index: number;
  title: string;
  regions: TemplateRegion[];
}

/**
 * The slide-by-slide structure of an uploaded template: where every region sits
 * and which analysis field fills it. Captured at upload so populating a deck is
 * a mapping exercise against a stored layout, not a re-parse of the file.
 */
export interface PptTemplateAnatomy {
  sourceFile: string;
  slideWidthIn: number;
  slideHeightIn: number;
  slides: TemplateSlideAnatomy[];
}

/** One line of the management-report roll-up, with its per-period amounts. */
export interface BalanceSheetLine {
  label: string;
  section: "Assets" | "Liabilities" | "Equity";
  term: "current" | "non-current";
  /** Period label → amount, in the source units. */
  values: Record<string, number>;
}

/**
 * The balance sheet as the report presents it. Computed deterministically and
 * carried on the result so the exported deck renders the real figures rather
 * than re-reading them out of model-written prose.
 */
export interface BalanceSheetReport {
  periods: string[];
  /** The period movement figures are measured against (the first baseline). */
  comparisonPeriod: string | null;
  /** Every baseline the closing position is reported against, oldest first. */
  comparisonPeriods: string[];
  lines: BalanceSheetLine[];
  totals: {
    assets: Record<string, number>;
    liabilities: Record<string, number>;
    equity: Record<string, number>;
  };
  /** Period → whether assets = liabilities + equity within tolerance. */
  balances: Record<string, boolean>;
  /** Units the figures are in, as supplied (e.g. "mINR"). */
  units: string;
  /** USD→INR rate when the board supplied one, else null — never guessed. */
  fxRate: number | null;
  /** Line items no report line claimed; surfaced, never silently dropped. */
  unmapped: string[];
}

export type EntityPnlComparison = "qoq" | "yoy";
export type EntityPnlCurrency = "USD" | "INR";

/**
 * Stored board inputs for the governed Entity P&L. The cube remains in
 * Enterprise Data; this only saves the permitted selection to re-run later.
 */
export interface EntityPnlSettings {
  cubeId: string | null;
  cubeName: string;
  entity: string;
  asOf: string;
  comparison: EntityPnlComparison;
  currency: EntityPnlCurrency;
  /** Optional, independently displayed forecast scenario such as CF05. */
  cfVersion: string | null;
}

/**
 * Stored board inputs for the governed KPI Metrics board. The cube remains in
 * Enterprise Data; this only saves the permitted report selection to re-run.
 */
export interface KpiReportSettings {
  cubeId: string | null;
  cubeName: string;
  year: number;
  month: number;
  entity: string;
  forecastScenario: string;
}

export interface EntityPnlLine {
  label: string;
  values: Record<string, number | null>;
}

/** Deterministic, presentation-ready result returned by the Python adapter. */
export interface EntityPnlReport {
  entity: string;
  asOf: string;
  comparison: EntityPnlComparison;
  currency: EntityPnlCurrency;
  units: string;
  columns: string[];
  lines: EntityPnlLine[];
  evidence: string[];
}

/** One governed KPI value pair retained with a board report for presentation. */
export interface GovernedKpiMetric {
  id: string;
  label: string;
  unit: "mUSD" | "percent" | "capacity";
  actual: number | null;
  forecast: number | null;
  variance: number | null;
  variancePercent: number | null;
  actualSourceRows: number;
  forecastSourceRows: number;
  remarks: string[];
}

/**
 * The four fixed Business Metrics comparison scopes. These are presentation
 * labels only; values continue to be calculated by the governed KPI service.
 */
export interface GovernedKpiScope {
  id: "global" | "india" | "vietnam" | "mexico";
  label: string;
  code: "WW" | "IN" | "VN" | "MX";
  entity: string;
  status: "in_scope";
  metrics: GovernedKpiMetric[];
}

/**
 * A deterministic decision-panel section. Green sections are currently
 * available from approved sources; red sections disclose Phase 2 scope without
 * making up a value.
 */
export interface GovernedKpiNarrativeSection {
  id: "revenue" | "internal_utilization" | "external_utilization" | "capacity" | "ebit" | "capex";
  title: string;
  status: "in_scope" | "phase_2";
  summary: string;
  lines: string[];
}

export interface GovernedKpiValue {
  actual: number | null;
  forecast: number | null;
  variance: number | null;
  variancePercent: number | null;
  actualSourceRows: number;
  forecastSourceRows: number;
}

export interface GovernedKpiGreenSection {
  id: "revenue" | "internal_utilization" | "external_utilization" | "capacity";
  title: string;
  unit: GovernedKpiMetric["unit"];
  total: GovernedKpiValue;
  breakdowns: Array<{
    id: string;
    label: string;
    value: GovernedKpiValue;
    comparisons?: {
      priorYearYtd: GovernedKpiValue;
      previousMonthYtd: GovernedKpiValue;
    };
  }>;
  comparisons?: {
    priorYearYtd: GovernedKpiValue;
    previousMonthYtd: GovernedKpiValue;
  };
}

export interface GovernedKpiGreenEntity {
  id: GovernedKpiScope["id"];
  code: GovernedKpiScope["code"];
  label: string;
  entity: string;
  sections: GovernedKpiGreenSection[];
}

/** Deterministic KPI snapshot used by the KPI Metrics Board and its PPTX export. */
export interface GovernedKpiReport {
  periodLabel: string;
  entityLabel: string;
  forecastScenario: string;
  actualSourceLabel: string;
  forecastSourceLabel: string;
  metrics: GovernedKpiMetric[];
  warnings: string[];
  scopeBadges?: GovernedKpiScope[];
  greenScope?: {
    version: "green-v1";
    period: { year: number; month: number };
    entities: GovernedKpiGreenEntity[];
  };
  narrative?: GovernedKpiNarrativeSection[];
}

export interface AnalysisResult {
  summary: string;
  kpis: Kpi[];
  charts: ChartSpec[];
  insights: string[];
  commentary: CommentaryItem[];
  risks: string[];
  tables: TableSpec[];
  actions: ActionItem[];
  /** Present only for balance sheet boards. */
  balanceSheet?: BalanceSheetReport | null;
  /** Present only for governed Entity P&L boards. */
  entityPnl?: EntityPnlReport | null;
  /** Present only for governed KPI Metrics boards. */
  kpiReport?: GovernedKpiReport | null;
}

export interface Report {
  id: string;
  createdAt: string;
  /** How long the run took, when recorded (added after some reports existed). */
  durationMs?: number;
  trigger: RunTrigger;
  result: AnalysisResult;
}

export interface Board {
  id: string;
  name: string;
  templateId: string;
  createdAt: string;
  description: string;
  systemPrompt: string;
  /** User-provided structure the generated analysis should follow. */
  reportTemplate: string;
  /** Corporate theme from an uploaded .pptx template; exports render with it. */
  templateTheme: PptTheme | null;
  /** Slide-by-slide layout of that template, and what fills each region. */
  templateAnatomy: PptTemplateAnatomy | null;
  /**
   * Original uploaded PowerPoint, retained only so a recognized governed KPI
   * template can be populated without rebuilding or losing decorative shapes.
   * Optional for compatibility with boards saved before exact-template export.
   */
  templatePptx?: {
    fileName: string;
    base64: string;
  } | null;
  cubeId: string | null;
  /** Saved selection for a read-only Enterprise Data Entity P&L run. */
  entityPnl?: EntityPnlSettings | null;
  /** Saved selection for a read-only governed KPI Metrics run. */
  kpiReport?: KpiReportSettings | null;
  /** Time period granularity for the analysis ("auto" = finest available). */
  timeGranularity: TimeGranularity;
  /** Which period the closing position is compared against. */
  comparisonBasis: ComparisonBasis;
  /** How much of the cube the analysis may read. */
  scopeMode: ScopeMode;
  /** Columns held out of scope when scopeMode is "exclude". */
  excludedColumns: string[];
  /** Labelled cube columns the analysis should prioritise. */
  keyColumns: KeyColumn[];
  rollingForecasts: string[];
  dataSources: BoardDataSources;
  schedule: BoardSchedule;
  threads: AnalysisThread[];
  /** Generated reports, newest first. */
  reports: Report[];
}
