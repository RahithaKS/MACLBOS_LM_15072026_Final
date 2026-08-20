"use client";

import type { AnalysisResult, Kpi } from "@/lib/types";
import ResultCharts from "./ResultCharts";
import { tidyProse } from "@/lib/prose";

// Written out in full so Tailwind keeps these classes at build time.
const KPI_GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-2",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * Step the value down a size as it gets longer. Full precision figures like
 * "$2,589,415,616.03" overflowed a fixed 2xl tile and were cut off mid-number.
 */
function valueTextClass(value: string): string {
  if (value.length > 22) return "text-base";
  if (value.length > 16) return "text-lg";
  if (value.length > 11) return "text-xl";
  return "text-2xl";
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const directionColor =
    kpi.direction === "up"
      ? "text-positive"
      : kpi.direction === "down"
        ? "text-danger"
        : "text-muted";
  const arrow = kpi.direction === "up" ? "↑" : kpi.direction === "down" ? "↓" : "→";
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted" title={kpi.label}>
        {kpi.label}
      </p>
      <p
        className={`mt-1.5 break-words font-display font-semibold tabular-nums ${valueTextClass(kpi.value)}`}
        title={tidyProse(kpi.value)}
      >
        {tidyProse(kpi.value)}
      </p>
      {kpi.change && (
        <p className={`mt-1 break-words text-xs font-medium ${directionColor}`}>
          {arrow} {tidyProse(kpi.change)}
        </p>
      )}
    </div>
  );
}

export default function ResultSections({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-accent-soft/60 p-5">
        <h2 className="font-display text-lg font-semibold">Summary</h2>
        <p className="mt-2 text-[15px] leading-relaxed">{tidyProse(result.summary)}</p>
      </section>

      {result.kpis.length > 0 && (
        <section>
          {/* Fill the row: a fixed 6-column grid left a third of it empty
              whenever the model returned 4 KPIs. */}
          <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${KPI_GRID_COLS[Math.min(result.kpis.length, 6)]}`}>
            {result.kpis.map((kpi) => (
              <KpiTile key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </section>
      )}

      <ResultCharts charts={result.charts} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {result.insights.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold">Key insights</h2>
            <ul className="mt-3 space-y-3">
              {result.insights.map((insight, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  {tidyProse(insight)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.risks.length > 0 && (
          <section className="rounded-xl border border-danger/30 bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-danger">Red flags & watch items</h2>
            <ul className="mt-3 space-y-3">
              {result.risks.map((risk, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 shrink-0 text-danger">⚠</span>
                  {tidyProse(risk)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {result.commentary?.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">Root cause commentary</h2>
          <ul className="mt-3 space-y-3.5">
            {result.commentary.map((c, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{tidyProse(c.area)}</span>
                  {c.recurrence && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">
                      {c.recurrence}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-muted">{tidyProse(c.explanation)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.actions?.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">Recommended actions</h2>
          <p className="mt-1 text-xs text-muted">
            Owner and due date are left blank for you to assign.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Expected impact</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 font-medium">Due date</th>
                </tr>
              </thead>
              <tbody>
                {result.actions.map((a, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{tidyProse(a.action)}</td>
                    <td className="py-2.5 pr-4">{tidyProse(a.expectedImpact)}</td>
                    <td className="py-2.5 pr-4 text-muted">{a.owner || "—"}</td>
                    <td className="py-2.5 text-muted">{a.dueDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result.tables.map((table) => (
        <section key={table.title} className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">{table.title}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  {table.columns.map((col) => (
                    <th key={col} className="py-2 pr-4 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/60 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2.5 pr-4">
                        {tidyProse(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
