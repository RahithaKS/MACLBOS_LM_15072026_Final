"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getCubes, classifyColumns } from "@/lib/cubes";
import { PERIOD_KEYS } from "@/lib/metrics";
import { ensureDatasetsLoaded } from "@/lib/store";
import type { DataCube } from "@/lib/types";
import {
  CUSTOM_UNITS,
  FREQUENCY_LABELS,
  MIN_CUSTOM_MINUTES,
  describeFrequency,
  nextRunFrom,
} from "@/lib/runAnalysis";
import type {
  Board,
  BoardDataSources,
  BoardSchedule,
  BoardTemplate,
  CustomIntervalUnit,
  ComparisonBasis,
  ComparisonMode,
  KeyColumn,
  PptTemplateAnatomy,
  PptTheme,
  TemplateRegionRole,
  ScheduleFrequency,
  ScopeMode,
  TimeGranularity,
  EntityPnlSettings,
} from "@/lib/types";

const GRANULARITY_LABELS: Record<TimeGranularity, string> = {
  auto: "Auto (finest available)",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export interface BoardModalResult {
  name: string;
  description: string;
  systemPrompt: string;
  reportTemplate: string;
  templateTheme: PptTheme | null;
  templateAnatomy: PptTemplateAnatomy | null;
  cubeId: string | null;
  entityPnl: EntityPnlSettings | null;
  timeGranularity: TimeGranularity;
  comparisonBasis: ComparisonBasis;
  scopeMode: ScopeMode;
  excludedColumns: string[];
  keyColumns: KeyColumn[];
  rollingForecasts: string[];
  dataSources: BoardDataSources;
  schedule: BoardSchedule;
}

interface Props {
  mode: "create" | "edit";
  template: BoardTemplate;
  /** Existing board when editing. */
  board?: Board;
  onClose: () => void;
  onSubmit: (values: BoardModalResult) => void;
}

const DATA_SOURCE_ROWS: { key: keyof BoardDataSources; label: string; hint: string }[] = [
  { key: "enterpriseData", label: "Enterprise Data", hint: "Access company-wide financial documents" },
  { key: "vaultDocuments", label: "Vault Documents", hint: "Personal uploaded documents" },
];

type ModalSection = "context" | "data" | "schedule";

// One form, shown a step at a time — the whole board still saves in one go.
const SECTIONS: { id: ModalSection; label: string; hint: string }[] = [
  { id: "context", label: "Context", hint: "Name, Description, Prompt" },
  { id: "data", label: "Analysis Scope", hint: "Sources & Cubes" },
  { id: "schedule", label: "Schedule Analysis", hint: "Frequency" },
];

/** Schema preview stays a glance, not a wall of text. */
const MAX_SCHEMA_CHIPS = 12;

const COMPARISON_MODES: { id: ComparisonMode; label: string; hint: string }[] = [
  { id: "previous", label: "Previous period", hint: "the period immediately before the latest" },
  { id: "year-ago", label: "Same period last year", hint: "year-on-year" },
  { id: "opening", label: "Opening position", hint: "the earliest period in the data" },
  { id: "specific", label: "A specific period…", hint: "pick one below" },
];

const SCOPE_MODES: { id: ScopeMode; label: string }[] = [
  { id: "all", label: "All columns" },
  { id: "selected", label: "Selected columns" },
  { id: "exclude", label: "All except…" },
];

/** "2026-06", "Jun-26", "2026-Q2", "2026" — a period label rather than a measure. */
function looksLikePeriodLabel(v: string): boolean {
  return (
    /^\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?$/.test(v) ||
    /^\d{4}[-\s]?q[1-4]$/i.test(v) ||
    /^\d{4}$/.test(v) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s/]?\d{2,4}$/i.test(v.trim())
  );
}

function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** ISO instant → the local "YYYY-MM-DDTHH:mm" a datetime-local input expects. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Step marker: a number, or a tick once the step is behind you. */
function StepMark({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition ${
        done
          ? "bg-primary text-white"
          : active
            ? "border-2 border-primary bg-surface text-primary-deep"
            : "bg-surface-muted text-muted"
      }`}
    >
      {done ? (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.4">
          <path d="m5 10.5 3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  );
}

/**
 * Long prose fields read as documents, so they get a filename strip above the
 * editor rather than sitting as a bare textarea.
 */
function FileCard({ filename, children }: { filename: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border bg-background/50 px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
        <span className="font-mono text-[11px] text-muted">{filename}</span>
      </div>
      {children}
    </div>
  );
}

/** Rendered rows are capped so a dimension with thousands of values stays fast. */
const MAX_VISIBLE_OPTIONS = 60;

/**
 * Type-ahead picker for one value at a time. A native <select> is unusable
 * once a dimension has hundreds of distinct values, so this filters as you
 * type and supports arrow-key navigation.
 */
function TypeaheadPicker({
  options,
  onSelect,
  placeholder,
  disabled,
}: {
  options: string[];
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const visible = matches.slice(0, MAX_VISIBLE_OPTIONS);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(value: string) {
    onSelect(value);
    setQuery("");
    setActive(0);
    // Stay open so several values can be picked in a row.
  }

  return (
    <div ref={boxRef} className="relative w-full shrink-0 sm:w-64">
      <input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && visible[active]) choose(visible[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted/40 disabled:text-muted"
      />
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {visible.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted">No value matches “{query}”.</p>
          ) : (
            <>
              {visible.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`block w-full truncate px-3 py-1.5 text-left text-sm ${
                    i === active ? "bg-accent-soft text-primary-deep" : "hover:bg-surface-muted"
                  }`}
                >
                  {o}
                </button>
              ))}
              {matches.length > visible.length && (
                <p className="px-3 py-1.5 text-[11px] text-muted">
                  +{matches.length - visible.length} more — keep typing to narrow.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}


const ROLE_LABELS: Record<TemplateRegionRole, string> = {
  title: "Title",
  subtitle: "Subtitle",
  units: "Units / currency",
  footnote: "Footnote",
  summary: "Summary",
  kpis: "KPI figures",
  charts: "Chart",
  tables: "Table / position",
  insights: "Insights",
  commentary: "Commentary",
  risks: "Risks & watch items",
  actions: "Recommended actions",
  picture: "Image (kept as-is)",
  unknown: "Not mapped",
};

/**
 * Slide-by-slide readout of an uploaded template: every region, where it sits,
 * and which analysis fields will be written into it. Shown at setup so the
 * mapping can be checked before a report is ever generated — an unmapped region
 * is a question to answer now, not a blank box discovered in the deck later.
 */
function TemplateAnatomyView({ anatomy }: { anatomy: PptTemplateAnatomy }) {
  const [open, setOpen] = useState(false);
  const total = anatomy.slides.reduce((a, s) => a + s.regions.length, 0);
  const unmapped = anatomy.slides.reduce(
    (a, s) => a + s.regions.filter((r) => r.role === "unknown").length,
    0,
  );

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[11px] font-medium">
          Slide anatomy — {anatomy.slides.length} slide{anatomy.slides.length === 1 ? "" : "s"},{" "}
          {total} regions
        </span>
        {unmapped > 0 && (
          <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
            {unmapped} unmapped
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted">
          {anatomy.slideWidthIn}″ × {anatomy.slideHeightIn}″
        </span>
      </button>

      {open && (
        <div className="max-h-72 overflow-y-auto border-t border-border px-3 py-2">
          {anatomy.slides.map((slide) => (
            <div key={slide.index} className="mb-3 last:mb-0">
              <p className="text-[11px] font-semibold">
                Slide {slide.index} · {slide.title}
              </p>
              <table className="mt-1 w-full table-fixed border-collapse text-[10px]">
                <thead>
                  <tr className="text-muted">
                    <th className="w-[22%] py-1 text-left font-medium">Region</th>
                    <th className="w-[20%] py-1 text-left font-medium">Fills with</th>
                    <th className="w-[22%] py-1 text-left font-medium">Position</th>
                    <th className="py-1 text-left font-medium">Variables</th>
                  </tr>
                </thead>
                <tbody>
                  {slide.regions.map((r) => (
                    <tr key={r.id} className="border-t border-border/60 align-top">
                      <td className="py-1 pr-2">
                        <span className="font-mono text-muted">{r.id}</span>{" "}
                        <span title={r.sample}>{r.name}</span>
                      </td>
                      <td
                        className={`py-1 pr-2 ${r.role === "unknown" ? "text-danger" : "text-foreground"}`}
                      >
                        {ROLE_LABELS[r.role]}
                      </td>
                      <td className="py-1 pr-2 font-mono text-muted">
                        {r.x}, {r.y} · {r.w}×{r.h}″
                      </td>
                      <td className="py-1 font-mono text-muted">
                        {r.variables.length ? r.variables.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardModal({ mode, template, board, onClose, onSubmit }: Props) {
  const isEntityPnl = template.id === "entity-pnl";
  const [cubes, setCubes] = useState<DataCube[]>(() => getCubes());
  useEffect(() => {
    ensureDatasetsLoaded().then(() => setCubes(getCubes()));
  }, []);

  const [section, setSection] = useState<ModalSection>("context");
  const [name, setName] = useState(board?.name ?? template.name);
  const [description, setDescription] = useState(board?.description ?? template.description);
  const [systemPrompt, setSystemPrompt] = useState(board?.systemPrompt ?? template.systemPrompt);
  const [reportTemplate, setReportTemplate] = useState(board?.reportTemplate ?? "");
  const [scheduleEnabled, setScheduleEnabled] = useState(board?.schedule.enabled ?? false);
  const [frequency, setFrequency] = useState<ScheduleFrequency>(
    board?.schedule.frequency ?? "daily",
  );
  // <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm", not an ISO
  // instant, so the stored UTC timestamp is converted in and out.
  const [startAt, setStartAt] = useState(toLocalInput(board?.schedule.startAt));
  const [customEvery, setCustomEvery] = useState(String(board?.schedule.customEvery ?? 2));
  const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>(
    board?.schedule.customUnit ?? "days",
  );
  const templateFileInput = useRef<HTMLInputElement>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateTheme, setTemplateTheme] = useState<PptTheme | null>(board?.templateTheme ?? null);
  const [templateAnatomy, setTemplateAnatomy] = useState<PptTemplateAnatomy | null>(
    board?.templateAnatomy ?? null,
  );

  async function handleTemplateFile(file: File) {
    setTemplateError(null);
    if (/\.pptx$/i.test(file.name)) {
      try {
        const { extractPptxTemplate, extractPptxAnatomy } = await import("@/lib/exportReport");
        const { outline, theme } = await extractPptxTemplate(file);
        setReportTemplate(outline);
        setTemplateTheme(theme);
        // Capture the layout as well as the text, so what fills each region is
        // recorded and reviewable rather than re-derived at export time.
        setTemplateAnatomy(await extractPptxAnatomy(file));
        if (!theme) {
          setTemplateError("Slides imported, but no theme found in the file — exports keep LedgerLM styling.");
        }
      } catch (e) {
        setTemplateError(e instanceof Error ? e.message : "Could not read that PowerPoint file.");
      }
      return;
    }
    if (/\.ppt$/i.test(file.name)) {
      setTemplateError(
        "Legacy .ppt files are not supported — save the template as .pptx and upload again.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setReportTemplate(reader.result.trim());
    };
    reader.readAsText(file);
  }
  const [cubeId, setCubeId] = useState<string | null>(board?.cubeId ?? null);
  const [enterpriseCubes, setEnterpriseCubes] = useState<
    { id: string; name: string; description?: string }[]
  >([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [enterpriseError, setEnterpriseError] = useState<string | null>(null);
  const [entityPnl, setEntityPnl] = useState<EntityPnlSettings>(
    board?.entityPnl ?? {
      cubeId: null,
      cubeName: "",
      entity: "",
      asOf: new Date().toISOString().slice(0, 7),
      comparison: "qoq",
      currency: "USD",
      cfVersion: null,
    },
  );
  const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>(
    board?.timeGranularity ?? "auto",
  );
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(
    board?.comparisonBasis?.mode ?? "previous",
  );
  const [comparisonPeriods, setComparisonPeriods] = useState<string[]>(
    board?.comparisonBasis?.periods ?? [],
  );
  const [scopeMode, setScopeMode] = useState<ScopeMode>(board?.scopeMode ?? "all");
  const [excludedColumns, setExcludedColumns] = useState<string[]>(board?.excludedColumns ?? []);
  const [keyColumns, setKeyColumns] = useState<KeyColumn[]>(board?.keyColumns ?? []);
  const [pendingColumn, setPendingColumn] = useState("");
  const [pendingDimension, setPendingDimension] = useState("");
  const [pendingDimensionValues, setPendingDimensionValues] = useState<string[]>([]);
  const [pendingLabel, setPendingLabel] = useState("");
  const [rolling, setRolling] = useState<string[]>(board?.rollingForecasts ?? []);
  const [sources, setSources] = useState<BoardDataSources>(
    board?.dataSources ?? {
      enterpriseData: true,
      vaultDocuments: true,
    },
  );

  useEffect(() => {
    if (!isEntityPnl) return;
    let cancelled = false;
    fetch("/api/user/accessible-cubes", { credentials: "include" })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new Error(payload?.error ?? "Could not load accessible Enterprise Data cubes.");
        if (!cancelled) setEnterpriseCubes(payload?.cubes ?? []);
      })
      .catch((error) => {
        if (!cancelled) setEnterpriseError(error instanceof Error ? error.message : "Could not load Enterprise Data cubes.");
      });
    return () => {
      cancelled = true;
    };
  }, [isEntityPnl]);

  useEffect(() => {
    if (!isEntityPnl || !entityPnl.cubeId) {
      setEntityOptions([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/v2/entity-pnl/cubes/${encodeURIComponent(entityPnl.cubeId)}/entities`, {
      credentials: "include",
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new Error(payload?.error ?? "Could not load entities for this cube.");
        if (!cancelled) setEntityOptions(payload?.entities ?? []);
      })
      .catch((error) => {
        if (!cancelled) setEnterpriseError(error instanceof Error ? error.message : "Could not load entities for this cube.");
      });
    return () => {
      cancelled = true;
    };
  }, [entityPnl.cubeId, isEntityPnl]);

  const cube = cubes.find((c) => c.id === cubeId);
  /** Data columns (measures) vs dimensions of the selected cube. */
  const { measures, dimensions } = cube
    ? classifyColumns(cube.records)
    : { measures: [] as string[], dimensions: [] as string[] };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);


  function toggleVersion(v: string) {
    setRolling((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  /** Data columns not yet added to the key list. */
  const availableColumns = measures.filter((c) => !keyColumns.some((k) => k.column === c));

  /**
   * Every unique value of the pending dimension. A Set keeps this O(rows) —
   * and it must be exhaustive: an earlier version stopped scanning at 30
   * uniques and then hid the picker, so wide dimensions offered no choice at
   * all. Memoised because cubes run to hundreds of thousands of rows.
   */
  const subDimensions = useMemo(() => {
    const selected = cubes.find((c) => c.id === cubeId);
    if (!selected || !pendingDimension) return [] as string[];
    const seen = new Set<string>();
    for (const r of selected.records) {
      const v = String(r[pendingDimension] ?? "").trim();
      if (v) seen.add(v);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [cubes, cubeId, pendingDimension]);

  const unselectedSubDimensions = subDimensions.filter(
    (v) => !pendingDimensionValues.includes(v),
  );

  function removeSubDimension(v: string) {
    setPendingDimensionValues((prev) => prev.filter((x) => x !== v));
  }

  function addKeyColumn() {
    if (!pendingColumn) return;
    const label = pendingLabel.trim() || pendingColumn;
    setKeyColumns((prev) => [
      ...prev,
      {
        column: pendingColumn,
        label,
        dimension: pendingDimension || null,
        dimensionValues: pendingDimension && pendingDimensionValues.length ? pendingDimensionValues : [],
      },
    ]);
    setPendingColumn("");
    setPendingDimension("");
    setPendingDimensionValues([]);
    setPendingLabel("");
  }

  /** Map every remaining data column at once, keeping the raw name as label. */
  function addAllKeyColumns() {
    setKeyColumns((prev) => [
      ...prev,
      ...availableColumns.map((c) => ({
        column: c,
        label: c,
        dimension: pendingDimension || null,
        dimensionValues: pendingDimension && pendingDimensionValues.length ? pendingDimensionValues : [],
      })),
    ]);
    setPendingColumn("");
    setPendingLabel("");
  }

  function removeKeyColumn(column: string) {
    setKeyColumns((prev) => prev.filter((k) => k.column !== column));
  }

  const lastRun = board?.reports[0] ?? null;
  const schemaChips = [...measures, ...dimensions].slice(0, MAX_SCHEMA_CHIPS);
  const hiddenSchemaCount = measures.length + dimensions.length - schemaChips.length;
  /** Bullet lines in the prompt — what the board is actually instructed to do. */
  const directiveCount = systemPrompt
    .split("\n")
    .filter((l) => /^\s*[-–—*•]\s+\S/.test(l)).length;
  /**
   * Period labels present in the selected cube, newest last. Only real periods
   * are offered — a comparison against a period the data does not contain would
   * silently fall back and report a movement the reader cannot trace.
   */
  const cubePeriods = useMemo(() => {
    const records = cubes.find((c) => c.id === cubeId)?.records ?? [];
    if (!records.length) return [] as string[];
    const keys = Object.keys(records[0]);
    const periodKey = keys.find((k) => PERIOD_KEYS.includes(k.toLowerCase()));
    const values = periodKey
      ? [...new Set(records.map((r) => String(r[periodKey] ?? "")).filter(Boolean))]
      : // Wide sheets carry one column per period.
        keys.filter((k) => looksLikePeriodLabel(k));
    return values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [cubes, cubeId]);

  const sectionIndex = SECTIONS.findIndex((s) => s.id === section);
  const isLastSection = sectionIndex === SECTIONS.length - 1;
  /** Before the last section the primary button advances; on it, it commits. */
  const stepping = !isLastSection;

  function goNext() {
    const next = SECTIONS[sectionIndex + 1];
    if (next) setSection(next.id);
  }

  /** The custom interval as stored: a whole number of units, at least 1. */
  const customEveryValue = Math.max(1, Math.floor(Number(customEvery) || 1));
  const cadence = describeFrequency({ frequency, customEvery: customEveryValue, customUnit });
  const belowMinimum =
    customUnit === "minutes" && customEveryValue < MIN_CUSTOM_MINUTES;

  function buildSchedule(): BoardSchedule {
    const custom =
      frequency === "custom" ? { customEvery: customEveryValue, customUnit } : {};
    if (!scheduleEnabled || (!cubeId && !entityPnl.cubeId)) {
      return {
        enabled: false,
        frequency,
        ...custom,
        startAt: startAt ? new Date(startAt).toISOString() : null,
        nextRunAt: null,
      };
    }
    const startIso = startAt ? new Date(startAt).toISOString() : null;
    const unchanged =
      board?.schedule.enabled &&
      board.schedule.frequency === frequency &&
      (board.schedule.customEvery ?? null) === (custom.customEvery ?? null) &&
      (board.schedule.customUnit ?? null) === (custom.customUnit ?? null) &&
      (board.schedule.startAt ?? null) === startIso;
    // A future start time sets the next run. A start time already in the past
    // must NOT — re-saving the board would otherwise fire a run every time.
    const upcomingStart =
      startIso && new Date(startIso).getTime() > Date.now() ? startIso : null;
    return {
      enabled: true,
      frequency,
      ...custom,
      startAt: startIso,
      nextRunAt:
        upcomingStart ??
        (unchanged ? (board?.schedule.nextRunAt ?? null) : null) ??
        nextRunFrom({ frequency, ...custom }),
    };
  }

  function submit() {
    onSubmit({
      name: name.trim() || template.name,
      description,
      systemPrompt,
      reportTemplate,
      templateTheme,
      templateAnatomy,
      cubeId,
      entityPnl: isEntityPnl ? entityPnl : null,
      timeGranularity,
      comparisonBasis: { mode: comparisonMode, periods: comparisonPeriods },
      scopeMode,
      // Only meaningful in "exclude" mode; cleared otherwise so a stale list
      // can't silently narrow a later analysis.
      excludedColumns: scopeMode === "exclude" ? excludedColumns : [],
      // Auto-commit a selection the user configured but didn't "Add".
      keyColumns:
        pendingColumn && !keyColumns.some((k) => k.column === pendingColumn)
          ? [
              ...keyColumns,
              {
                column: pendingColumn,
                label: pendingLabel.trim() || pendingColumn,
                dimension: pendingDimension || null,
                dimensionValues:
                  pendingDimension && pendingDimensionValues.length ? pendingDimensionValues : [],
              },
            ]
          : keyColumns,
      rollingForecasts: rolling,
      dataSources: sources,
      schedule: buildSchedule(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="h-1 bg-primary" />
        <div className="flex items-start gap-3 px-7 pb-4 pt-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-primary-deep">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <rect x="3" y="3" width="6" height="6" rx="1.5" />
              <rect x="11" y="3" width="6" height="6" rx="1.5" />
              <rect x="3" y="11" width="6" height="6" rx="1.5" />
              <rect x="11" y="11" width="6" height="6" rx="1.5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">
                {mode === "create" ? "Create Board" : "Edit Board"}
              </h2>
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                {template.name}
              </span>
            </span>
            <p className="mt-0.5 text-xs text-muted">
              Customise the board settings and analysis prompts, then start analysing.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col border-t border-border sm:flex-row">
          {/* Section rail — the form is one record, walked as three steps. */}
          <nav
            aria-label="Board settings sections"
            className="flex flex-col border-b border-border p-4 sm:w-64 sm:shrink-0 sm:border-b-0 sm:border-r"
          >
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:block">
              Setup · Step {sectionIndex + 1} of {SECTIONS.length} · {SECTIONS[sectionIndex].label}
            </p>
            <div className="flex gap-2 overflow-x-auto sm:mt-3 sm:flex-col sm:gap-0 sm:overflow-visible">
              {SECTIONS.map((s, i) => {
                const active = s.id === section;
                const done = i < sectionIndex;
                // Descriptions are static, except that a missing cube is called
                // out — splitting the form hides that behind a step otherwise.
                const status =
                  s.id === "data" && !cube
                    ? "No cube selected"
                    : s.id === "data" && keyColumns.length
                      ? `${s.hint} · ${keyColumns.length} mapped`
                      : s.hint;
                const warn = s.id === "data" && !cube;
                return (
                  <div key={s.id} className="contents">
                    {i > 0 && <span className="hidden h-4 w-px bg-border sm:ml-[26px] sm:block" />}
                    <button
                      type="button"
                      onClick={() => setSection(s.id)}
                      aria-current={active ? "step" : undefined}
                      className={`flex shrink-0 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition sm:shrink ${
                        active
                          ? "border border-border bg-surface shadow-sm"
                          : "border border-transparent hover:bg-surface-muted/60"
                      }`}
                    >
                      <StepMark index={i} active={active} done={done} />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold ${active ? "text-foreground" : "text-muted"}`}
                        >
                          {s.label}
                        </span>
                        <span
                          className={`hidden truncate text-[11px] sm:block ${warn ? "text-danger" : "text-muted"}`}
                          title={status}
                        >
                          {status}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            {lastRun && (
              <div className="mt-auto hidden rounded-xl border border-border bg-background/40 px-3 py-2.5 sm:block">
                <p className="text-[11px] font-semibold">Last run</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {new Date(lastRun.createdAt).toLocaleString([], {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {lastRun.durationMs != null && (
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                    Completed in {Math.max(1, Math.round(lastRun.durationMs / 1000))}s
                  </p>
                )}
              </div>
            )}
          </nav>

          {/* Tall on roomy screens, but never so tall that the footer's Save
              button is pushed off a short laptop display. */}
          <div className="max-h-[calc(100vh-16rem)] flex-1 space-y-4 overflow-y-auto px-8 py-6 sm:min-h-[min(34rem,calc(100vh-16rem))]">
          {section === "context" && (
            <>
          <label className="block">
            <span className="text-sm font-medium">Board name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Description</span>
              <span className="text-[11px] text-muted">Shown on the board card</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">Analysis context / system prompt</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                {countLabel(directiveCount, "directive")}
              </span>
            </span>
            <FileCard filename="prompt.md">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="w-full resize-y bg-transparent px-3 py-2.5 font-mono text-xs leading-relaxed outline-none"
              />
            </FileCard>
          </label>

          <div className="block">
            <span className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Compare against</span>
              <span className="text-[11px] text-muted">
                Every movement and % change is measured against this period
              </span>
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COMPARISON_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.hint}
                  onClick={() => setComparisonMode(m.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    comparisonMode === m.id
                      ? "border-primary bg-accent-soft font-medium text-primary-deep"
                      : "border-border bg-surface hover:bg-surface-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {comparisonMode === "specific" && (
              <div className="mt-2">
                <span className="text-[11px] text-muted">
                  {cubePeriods.length
                    ? "Periods to compare the closing position with — pick as many as you need"
                    : "Connect a data cube in Analysis Scope to list its periods."}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {cubePeriods.map((p) => {
                    const on = comparisonPeriods.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setComparisonPeriods((prev) =>
                            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                          on
                            ? "border-primary bg-accent-soft font-medium text-primary-deep"
                            : "border-border bg-surface hover:bg-surface-muted"
                        }`}
                      >
                        {on && "✓ "}
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
              {comparisonMode === "specific"
                ? comparisonPeriods.length
                  ? `Reporting against ${comparisonPeriods.length} period${comparisonPeriods.length === 1 ? "" : "s"}; movements use the earliest of them.`
                  : "No period chosen yet — the analysis falls back to the previous period."
                : COMPARISON_MODES.find((m) => m.id === comparisonMode)?.hint}
              {" "}Re-run the analysis after changing this.
            </span>
          </div>
            </>
          )}

          {section === "data" && (
            <>
          <div>
            <span className="text-sm font-medium">Data sources</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {DATA_SOURCE_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="flex items-start gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{row.hint}</p>
                  </div>
                  <Toggle
                    on={sources[row.key]}
                    onChange={(v) => setSources({ ...sources, [row.key]: v })}
                  />
                </div>
              ))}
            </div>
          </div>

            {isEntityPnl && (
              <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
                <span className="text-sm font-semibold">Governed Entity P&amp;L selection</span>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  The selected cube is read on every run through LedgerLM&apos;s authorized, read-only
                  service. No Enterprise Data rows are stored in this board.
                </p>
                {enterpriseError && (
                  <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                    {enterpriseError}
                  </p>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-muted">Enterprise cube</span>
                    <select
                      value={entityPnl.cubeId ?? ""}
                      onChange={(e) => {
                        const selected = enterpriseCubes.find((cube) => cube.id === e.target.value);
                        setEntityPnl((previous) => ({
                          ...previous,
                          cubeId: selected?.id ?? null,
                          cubeName: selected?.name ?? "",
                          entity: "",
                        }));
                      }}
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Select an authorized Enterprise cube</option>
                      {enterpriseCubes.map((enterpriseCube) => (
                        <option key={enterpriseCube.id} value={enterpriseCube.id}>
                          {enterpriseCube.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted">Entity</span>
                    <input
                      list="entity-pnl-entities"
                      value={entityPnl.entity}
                      onChange={(e) => setEntityPnl((previous) => ({ ...previous, entity: e.target.value }))}
                      placeholder="Select or enter an entity"
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <datalist id="entity-pnl-entities">
                      {entityOptions.map((entity) => <option key={entity} value={entity} />)}
                    </datalist>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted">As-of month</span>
                    <input
                      type="month"
                      value={entityPnl.asOf}
                      onChange={(e) => setEntityPnl((previous) => ({ ...previous, asOf: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted">Comparison</span>
                    <select
                      value={entityPnl.comparison}
                      onChange={(e) => setEntityPnl((previous) => ({ ...previous, comparison: e.target.value as EntityPnlSettings["comparison"] }))}
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="qoq">QoQ — quarter-end MTD vs prior quarter-end MTD</option>
                      <option value="yoy">YoY — YTD vs same month last year</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted">Currency</span>
                    <select
                      value={entityPnl.currency}
                      onChange={(e) => setEntityPnl((previous) => ({ ...previous, currency: e.target.value as EntityPnlSettings["currency"] }))}
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted">CF scenario <span className="font-normal">(optional)</span></span>
                    <select
                      value={entityPnl.cfVersion ?? ""}
                      onChange={(e) => setEntityPnl((previous) => ({ ...previous, cfVersion: e.target.value || null }))}
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Actual only</option>
                      {["CF02", "CF05", "CF09", "CF11", "TBP"].map((version) => (
                        <option key={version} value={version}>{version}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  Actual and CF remain separate columns. QoQ derives MTD from consecutive YTD snapshots;
                  YoY compares YTD snapshots only.
                </p>
              </div>
            )}

            {!isEntityPnl && (
          <div className="rounded-xl border border-border">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-white">
                <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.6">
                  <ellipse cx="10" cy="5.5" rx="6" ry="2.3" />
                  <path d="M4 5.5v9c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3v-9M4 10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3" />
                </svg>
              </span>
              <span className="text-sm font-semibold">Data Cube &amp; Column Mapping</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                Smart analysis
              </span>
            </div>
            <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted">Select cube</span>
              <select
                value={cubeId ?? ""}
                onChange={(e) => {
                  setCubeId(e.target.value || null);
                  setRolling([]);
                  setKeyColumns([]);
                  setPendingColumn("");
                  setPendingDimension("");
                  setPendingDimensionValues([]);
                  setPendingLabel("");
                }}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">No cube connected</option>
                {cubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Time granularity</span>
              <select
                value={timeGranularity}
                onChange={(e) => setTimeGranularity(e.target.value as TimeGranularity)}
                disabled={!cube}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted/40 disabled:text-muted"
              >
                {(Object.keys(GRANULARITY_LABELS) as TimeGranularity[]).map((g) => (
                  <option key={g} value={g}>
                    {GRANULARITY_LABELS[g]}
                  </option>
                ))}
              </select>
            </label>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Selecting a cube enables &quot;Run Analysis&quot;. Granularity is the period level the
              analysis aggregates to — quarterly rolls months up into quarters.
            </p>
            {cube && (
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">Detected schema</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted ring-1 ring-border">
                    <span className="font-semibold text-foreground">{measures.length}</span> data
                    column{measures.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted ring-1 ring-border">
                    <span className="font-semibold text-foreground">{dimensions.length}</span>{" "}
                    dimension{dimensions.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {schemaChips.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-surface px-2 py-1 font-mono text-[11px] text-muted ring-1 ring-border"
                    >
                      {c}
                    </span>
                  ))}
                  {hiddenSchemaCount > 0 && (
                    <span
                      className="rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent"
                      title={[...measures, ...dimensions].slice(MAX_SCHEMA_CHIPS).join(", ")}
                    >
                      +{hiddenSchemaCount} more
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="mt-4">
              <span className="text-xs font-medium text-muted">Column scope</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {SCOPE_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setScopeMode(m.id)}
                    aria-pressed={scopeMode === m.id}
                    disabled={!cube}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      scopeMode === m.id
                        ? "bg-primary text-white"
                        : "border border-border bg-surface text-muted hover:border-primary/40"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                {scopeMode === "all"
                  ? `Every column in the sheet is analysed${cube ? ` — ${countLabel(measures.length + dimensions.length, "column")}` : ""}. Map key data columns below only to give them names and dimensions.`
                  : scopeMode === "selected"
                    ? "Only the key data columns mapped below (plus their dimensions and the period) are analysed. Everything else is ignored."
                    : "Every column is analysed except the ones you exclude below."}
              </p>
            </div>

            {scopeMode === "exclude" && cube && (
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">
                    Excluded columns{" "}
                    <span className="font-normal text-muted">
                      {excludedColumns.length
                        ? `· ${countLabel(excludedColumns.length, "column")} held out`
                        : "· none yet"}
                    </span>
                  </span>
                  {excludedColumns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExcludedColumns([])}
                      className="text-[11px] font-medium text-accent hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </span>
                <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {[...measures, ...dimensions].map((c) => {
                    const off = excludedColumns.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setExcludedColumns((prev) =>
                            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                          )
                        }
                        className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                          off
                            ? "border-danger/40 bg-danger/10 text-danger line-through"
                            : "border-border bg-surface text-muted hover:border-primary/40"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Click a column to hold it out of the analysis. Period columns stay in scope
                  regardless — the analysis has nothing to group by without them.
                </p>
              </div>
            )}

            <div className="mt-4">
              <span className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Key data columns</span>
                {cube && availableColumns.length > 0 && (
                  <button
                    type="button"
                    onClick={addAllKeyColumns}
                    className="text-[11px] font-medium text-accent hover:underline"
                  >
                    Add all {availableColumns.length} data columns
                  </button>
                )}
              </span>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="min-w-40 flex-1">
                <span className="text-[11px] uppercase tracking-wide text-muted">1 · Dimension</span>
                <select
                value={pendingDimension}
                onChange={(e) => {
                setPendingDimension(e.target.value);
                setPendingDimensionValues([]);
                }}
                disabled={!cube || !dimensions.length}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted/40 disabled:text-muted"
                >
                <option value="">
                {!cube
                ? "Select a cube first"
                : dimensions.length
                ? "No dimension"
                : "No dimensions in this cube"}
                </option>
                {dimensions.map((d) => (
                <option key={d} value={d}>
                by {d}
                </option>
                ))}
                </select>
                </label>
                <label className="min-w-40 flex-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted">2 · Data column</span>
                  <select
                    value={pendingColumn}
                    onChange={(e) => {
                      setPendingColumn(e.target.value);
                      setPendingLabel("");
                    }}
                    disabled={!cube}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted/40 disabled:text-muted"
                  >
                    <option value="">
                      {cube
                        ? availableColumns.length
                          ? "Select a data column…"
                          : "All data columns added"
                        : "Select a cube first"}
                    </option>
                    {availableColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-40 flex-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted">3 · Data name</span>
                  <input
                    value={pendingLabel}
                    onChange={(e) => setPendingLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyColumn();
                      }
                    }}
                    placeholder={pendingColumn ? `e.g. ${pendingColumn} (display name)` : "Label for this data"}
                    disabled={!pendingColumn}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted/40"
                  />
                </label>
                <button
                  type="button"
                  onClick={addKeyColumn}
                  disabled={!pendingColumn}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {/* Sub-dimensions narrow the analysis to specific values of the
                  chosen dimension; empty means every value. Picked one at a
                  time from a dropdown, since a dimension can have hundreds. */}
              {pendingDimension && subDimensions.length > 0 && (
                <div className="mt-2 rounded-lg border border-border bg-background/40 px-3 py-2.5">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-muted">
                      Sub-dimensions of <span className="font-mono">{pendingDimension}</span> —{" "}
                      {pendingDimensionValues.length
                        ? `${pendingDimensionValues.length} of ${subDimensions.length} selected`
                        : `leave empty to include all ${subDimensions.length}`}
                    </span>
                    {pendingDimensionValues.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPendingDimensionValues([])}
                        className="text-[11px] font-medium text-accent hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </span>
                  <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-start">
                    <TypeaheadPicker
                      options={unselectedSubDimensions}
                      disabled={!unselectedSubDimensions.length}
                      placeholder={
                        unselectedSubDimensions.length
                          ? `Search ${unselectedSubDimensions.length} values…`
                          : "All values selected"
                      }
                      onSelect={(v) => {
                        if (!pendingDimensionValues.includes(v)) {
                          setPendingDimensionValues([...pendingDimensionValues, v]);
                        }
                      }}
                    />
                    <div className="flex min-h-9 min-w-0 flex-1 flex-wrap content-start gap-1.5 sm:max-h-24 sm:overflow-y-auto">
                      {pendingDimensionValues.length === 0 ? (
                        <span className="py-2 text-[11px] text-muted">
                          No values selected — all {subDimensions.length} will be analysed.
                        </span>
                      ) : (
                        pendingDimensionValues.map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-primary-deep"
                          >
                            {v}
                            <button
                              type="button"
                              aria-label={`Remove ${v}`}
                              onClick={() => removeSubDimension(v)}
                              className="text-accent hover:text-danger"
                            >
                              <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.2">
                                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                              </svg>
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {keyColumns.length > 0 && (
                <div className="mt-3 space-y-2">
                  {keyColumns.map((k) => (
                    <div
                      key={k.column}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border border-l-[3px] border-l-primary bg-surface px-3 py-2.5"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">{k.label}</span>
                        <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-muted">
                          {k.column}
                        </span>
                        {k.dimension && (
                          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                            by {k.dimension}
                          </span>
                        )}
                        {k.dimensionValues && k.dimensionValues.length > 0 && (
                          <span
                            className="min-w-0 truncate text-[11px] text-muted"
                            title={k.dimensionValues.join(", ")}
                          >
                            {k.dimensionValues.join(", ")}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${k.label}`}
                        onClick={() => removeKeyColumn(k.column)}
                        className="shrink-0 text-muted hover:text-danger"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
                          <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Pick a dimension first, then the data column and a recognisable name. The analysis
                prioritises these points and uses your names in the report. Leave empty to consider
                all columns.
              </p>
            </div>

            {cube && cube.versions.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-medium text-muted">Rolling Forecasts to Expose</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cube.versions.map((v) => {
                    const active = rolling.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggleVersion(v)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                          active
                            ? "border-primary bg-accent-soft text-primary-deep"
                            : "border-border bg-surface text-muted hover:border-primary/40"
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Checked versions will be selectable in board queries.
                </p>
              </div>
            )}
            </div>
          </div>
            )}
            </>
          )}

          {section === "schedule" && (
            <>
          <label className="block">
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Report template <span className="font-normal text-muted">optional</span>
              </span>
              <button
                type="button"
                onClick={() => templateFileInput.current?.click()}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent-soft"
              >
                ↑ Upload template file
              </button>
            </span>
            <input
              ref={templateFileInput}
              type="file"
              accept=".txt,.md,.markdown,.pptx,.ppt,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleTemplateFile(file);
                e.target.value = "";
              }}
            />
            <FileCard filename="structure.md">
              <textarea
                value={reportTemplate}
                onChange={(e) => setReportTemplate(e.target.value)}
                rows={11}
                placeholder={`Define how the analysis should be captured — sections, tables, order, tone. e.g.

1. Executive Summary (3 bullets)
2. Variance Table: Period | Actual | Budget | Var | Var %
3. Top 3 adverse variances with likely drivers
4. Recommended actions`}
                className="w-full resize-y bg-transparent px-3 py-2.5 font-mono text-xs leading-relaxed outline-none placeholder:text-muted/60"
              />
            </FileCard>
            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
              The generated report follows this structure — type it, or upload a .txt, .md or .pptx
              file (each slide becomes a report section). Reports export to PPT and PDF after each
              run.
            </span>
            {templateError && (
              <span className="mt-1 block text-[11px] text-danger">{templateError}</span>
            )}
            {templateAnatomy && <TemplateAnatomyView anatomy={templateAnatomy} />}
            {templateTheme && (
              <span className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
                <span className="text-[11px] font-medium text-muted">
                  Theme from {templateTheme.sourceFile}:
                </span>
                <span className="flex items-center gap-1">
                  {[templateTheme.colors.dk2, ...templateTheme.colors.accents.slice(0, 6)].map((c, i) => (
                    <span
                      key={i}
                      title={`#${c}`}
                      className="h-4 w-4 rounded border border-border"
                      style={{ backgroundColor: `#${c}` }}
                    />
                  ))}
                </span>
                <span className="text-[11px] text-muted">
                  {templateTheme.fonts.major} / {templateTheme.fonts.minor}
                </span>
                <button
                  type="button"
                  onClick={() => setTemplateTheme(null)}
                  className="ml-auto text-[11px] font-medium text-danger/80 hover:text-danger"
                >
                  Remove theme
                </button>
              </span>
            )}
          </label>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">Scheduled Run</span>
                <p className="mt-0.5 text-xs text-muted">
                  Automatically run the analysis and file the report under Reports.
                </p>
              </div>
              <Toggle on={scheduleEnabled} onChange={setScheduleEnabled} />
            </div>
            {scheduleEnabled && (
              <div className="mt-4 border-t border-dashed border-border pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Frequency
                  </span>
                  {(Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      aria-pressed={frequency === f}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        frequency === f
                          ? "bg-primary text-white"
                          : "border border-border bg-surface text-muted hover:border-primary/40"
                      }`}
                    >
                      {FREQUENCY_LABELS[f]}
                    </button>
                  ))}
                  {cubeId && (
                    <span className="ml-auto text-[11px] text-muted">
                      Next run ·{" "}
                      {startAt
                        ? new Date(startAt).toLocaleString()
                        : "one interval after saving"}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-muted">First run (date &amp; time)</span>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  {frequency === "custom" && (
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-muted">Run every</span>
                      <span className="mt-1 flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={customEvery}
                          onChange={(e) => setCustomEvery(e.target.value)}
                          className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        <select
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value as CustomIntervalUnit)}
                          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary sm:max-w-[12rem]"
                        >
                          {CUSTOM_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  {!cubeId
                    ? "Connect a data cube in the Analysis Scope section — a scheduled run needs one."
                    : startAt
                      ? `First run ${new Date(startAt).toLocaleString()}, then ${cadence.toLowerCase()}. Runs happen while LedgerLM is open; one that comes due while it is closed executes on next launch.`
                      : `Leave the date empty to start one interval from now. Runs happen while LedgerLM is open; one that comes due while it is closed executes on next launch.`}
                </p>
                {frequency === "custom" && belowMinimum && (
                  <p className="mt-1.5 text-[11px] text-danger">
                    Minimum interval is {MIN_CUSTOM_MINUTES} minutes — shorter values are rounded up.
                  </p>
                )}
              </div>
            )}
          </div>
            </>
          )}

          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-background/40 px-7 py-4">
          <span className="flex items-center gap-1.5" aria-hidden>
            {SECTIONS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === sectionIndex
                    ? "w-5 bg-primary"
                    : i < sectionIndex
                      ? "w-1.5 bg-primary"
                      : "w-1.5 bg-border"
                }`}
              />
            ))}
          </span>
          <span className="text-xs text-muted">
            Step {sectionIndex + 1} of {SECTIONS.length} · {SECTIONS[sectionIndex].label}
          </span>
          <span className="ml-auto flex flex-wrap gap-2.5">
            {/* Secondary slot: commit-and-stay while stepping, abandon on the
                last section where the primary button already commits. */}
            {stepping ? (
              <button
                onClick={submit}
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-accent-soft"
              >
                Save changes
              </button>
            ) : (
              <button
                onClick={onClose}
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground"
              >
                Discard
              </button>
            )}
            <button
              onClick={stepping ? goNext : submit}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {isLastSection ? "Submit" : "Next"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
