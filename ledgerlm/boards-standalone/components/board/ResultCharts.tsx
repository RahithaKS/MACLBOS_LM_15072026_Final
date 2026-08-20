"use client";

import type { ChartSpec } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Rectangle,
  ReferenceLine,
  Tooltip,
  Legend,
} from "recharts";

// Categorical palette validated for CVD separation and contrast on the light
// surface (dataviz six-checks validator). Hues are assigned in fixed order.
// Brand pair first — teal, magenta — then tints of the same two, so on-screen
// charts match the exported ones.
const SERIES_COLORS = ["#439798", "#bc4096", "#8fc3c4", "#da95c2"];

// Negative periods read as red regardless of which series they belong to.
const NEGATIVE_COLOR = "#b4552f";

const AXIS_TICK = { fill: "#5f7472", fontSize: 11 };
const GRID_STROKE = "#e5ebe9";

function toRows(spec: ChartSpec): Record<string, string | number>[] {
  const xs: string[] = [];
  for (const s of spec.series) {
    for (const p of s.points) {
      if (!xs.includes(p.x)) xs.push(p.x);
    }
  }
  return xs.map((x) => {
    const row: Record<string, string | number> = { x };
    for (const s of spec.series) {
      const point = s.points.find((p) => p.x === x);
      if (point) row[s.name] = point.y;
    }
    return row;
  });
}

/**
 * Compact axis labels. The previous version only stepped down once (÷1000), so
 * a 215,000,000 tick rendered as "215000.0k" and was clipped by the axis gutter.
 */
function numberFormat(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = abs / size;
      // 1.2M / 12M / 120M — keep a decimal only where it adds information.
      return `${sign}${scaled < 10 ? scaled.toFixed(1) : Math.round(scaled)}${suffix}`;
    }
  }
  return `${sign}${abs % 1 === 0 ? abs : abs.toFixed(1)}`;
}

/** Full-precision values for tooltips, where there is room for them. */
const tooltipFormat = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v ?? "");

interface WaterfallBar {
  x: string;
  /** Invisible riser that lifts the bar to where its segment starts. */
  base: number;
  value: number;
  total: number;
  kind: "total" | "delta";
}

/**
 * Lay out a bridge: the first and last points are totals sitting on the axis,
 * everything between is a signed step floating on a hidden riser.
 */
function waterfallBars(spec: ChartSpec): WaterfallBar[] {
  const points = spec.series[0]?.points ?? [];
  const bars: WaterfallBar[] = [];
  let running = 0;
  for (const [i, p] of points.entries()) {
    if (i === 0 || i === points.length - 1) {
      running = p.y;
      bars.push({ x: p.x, base: 0, value: p.y, total: p.y, kind: "total" });
      continue;
    }
    bars.push({
      x: p.x,
      base: p.y >= 0 ? running : running + p.y,
      value: Math.abs(p.y),
      total: p.y,
      kind: "delta",
    });
    running += p.y;
  }
  return bars;
}

type BarShapeProps = { payload?: Record<string, unknown> };

/**
 * Per-bar colouring: losses read red. Done with `shape` rather than <Cell>,
 * which recharts 3.10 renders as an empty bar layer inside <Bar>.
 */
function negativeAwareBar(seriesName: string, color: string) {
  function Shape(props: BarShapeProps) {
    const value = props.payload?.[seriesName];
    const negative = typeof value === "number" && value < 0;
    return (
      <Rectangle
        {...props}
        fill={negative ? NEGATIVE_COLOR : color}
        radius={negative ? [0, 0, 4, 4] : [4, 4, 0, 0]}
      />
    );
  }
  return <Shape />;
}

function ChartBody({ spec }: { spec: ChartSpec }) {
  const rows = toRows(spec);
  const multiSeries = spec.series.length > 1;
  const hasNegative = spec.series.some((s) => s.points.some((p) => p.y < 0));

  const shared = (
    <>
      <CartesianGrid stroke={GRID_STROKE} vertical={false} />
      <XAxis dataKey="x" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" />
      <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={numberFormat} />
      {/* Anchor the eye when a series crosses zero. */}
      {hasNegative && <ReferenceLine y={0} stroke="#b9c7c4" strokeWidth={1} />}
      <Tooltip
        cursor={{ stroke: "#c6d2cf", fill: "rgba(78,127,128,0.06)" }}
        formatter={tooltipFormat}
        contentStyle={{
          borderRadius: 10,
          border: "1px solid #dde5e3",
          fontSize: 12,
          boxShadow: "0 4px 12px rgba(28,50,48,0.08)",
        }}
      />
      {multiSeries && <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />}
    </>
  );

  if (spec.type === "pie") {
    const slices = spec.series[0]?.points ?? [];
    return (
      <PieChart>
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #dde5e3", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
        <Pie
          data={slices.map((p) => ({ name: p.x, value: p.y }))}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {slices.map((p, i) => (
            <Cell key={p.x} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  // Bridge: an invisible riser lifts each delta bar to where it starts, so the
  // eye follows budget → contributions → actual. First/last points are totals.
  if (spec.type === "waterfall") {
    const bars = waterfallBars(spec);
    return (
      <BarChart data={bars} margin={{ top: 8 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="x" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={0} angle={-25} textAnchor="end" height={58} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={numberFormat} />
        <Tooltip
          cursor={{ fill: "rgba(78,127,128,0.06)" }}
          formatter={(_v, _n, item) => tooltipFormat(item?.payload?.total)}
          contentStyle={{ borderRadius: 10, border: "1px solid #dde5e3", fontSize: 12 }}
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="w" maxBarSize={44} isAnimationActive={false}>
          {bars.map((b, i) => (
            <Cell
              key={i}
              fill={b.kind === "total" ? "#5f7472" : b.total < 0 ? NEGATIVE_COLOR : SERIES_COLORS[0]}
            />
          ))}
        </Bar>
      </BarChart>
    );
  }

  if (spec.type === "bar") {
    return (
      <BarChart data={rows} barGap={2}>
        {shared}
        {spec.series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            shape={negativeAwareBar(s.name, SERIES_COLORS[i % SERIES_COLORS.length])}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    );
  }

  if (spec.type === "area") {
    return (
      <AreaChart data={rows}>
        {shared}
        {spec.series.map((s, i) => (
          <Area
            key={s.name}
            dataKey={s.name}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            fillOpacity={0.14}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    );
  }

  return (
    <LineChart data={rows}>
      {shared}
      {spec.series.map((s, i) => (
        <Line
          key={s.name}
          dataKey={s.name}
          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      ))}
    </LineChart>
  );
}

export default function ResultCharts({ charts }: { charts: ChartSpec[] }) {
  if (!charts.length) return null;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {charts.map((spec) => (
        <div key={spec.title} className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-display text-[15px] font-semibold">{spec.title}</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ChartBody spec={spec} />
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
