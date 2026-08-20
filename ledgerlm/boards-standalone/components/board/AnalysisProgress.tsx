"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisProgress as Progress } from "@/lib/runAnalysis";

/**
 * The phases a run passes through, as segments of the bar. `from`/`to` match
 * the checkpoints the server reports, so a tick lands on a boundary. Labels sit
 * under the middle of their own segment — never on a boundary, where two labels
 * would collide.
 */
const PHASES: { from: number; to: number; label: string }[] = [
  { from: 0, to: 22, label: "Data" },
  { from: 22, to: 55, label: "Summary" },
  { from: 55, to: 92, label: "Commentary" },
  { from: 92, to: 100, label: "Report" },
];

/** How long a model pass usually takes; used to pace the bar between ticks. */
const PHASE_MS = 24_000;

/**
 * Progress for a running analysis. The server reports where it is and where the
 * current stage ends; between ticks the bar advances smoothly toward that end
 * without ever reaching it, so it never claims a stage is done before it is.
 */
export default function AnalysisProgress({
  progress,
  onStop,
  stopping,
}: {
  progress: Progress;
  onStop: () => void;
  stopping: boolean;
}) {
  const [shown, setShown] = useState(progress.pct);
  // Mirror of `shown` for the timer, so the effect never has to depend on it
  // (that would restart the tween on every frame it draws).
  const shownRef = useRef(progress.pct);
  const startedAt = useRef<number>(0);
  const from = useRef<number>(progress.pct);

  // Driven by a timer, not requestAnimationFrame: browsers pause rAF in a
  // background tab, and a run left in another tab should still show where it
  // is when the user comes back. On each server tick the bar jumps to at least
  // that figure, then eases toward — but short of — the end of the stage.
  useEffect(() => {
    if (progress.pct >= 100) return;
    from.current = Math.max(shownRef.current, progress.pct);
    startedAt.current = Date.now();
    const cap = Math.max(progress.pct, progress.until - 1);
    const step = () => {
      const t = Math.min(1, (Date.now() - startedAt.current) / PHASE_MS);
      const eased = 1 - Math.pow(1 - t, 2);
      const next = from.current + (cap - from.current) * eased;
      const value = Math.max(shownRef.current, Math.min(next, cap));
      shownRef.current = value;
      setShown(value);
    };
    const kick = window.setTimeout(step, 0);
    const id = window.setInterval(step, 120);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [progress.pct, progress.until, progress.stage]);

  const pct = progress.pct >= 100 ? 100 : Math.round(shown);
  const done = progress.pct >= 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-accent-soft/60 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-6">
        {/* Big number — the one thing to read from across the room. */}
        <div className="flex items-baseline gap-1">
          <span className="font-display text-5xl font-semibold tabular-nums leading-none text-primary-deep">
            {pct}
          </span>
          <span className="text-lg font-medium text-primary-deep/70">%</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!done && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
            )}
            <p className="truncate text-sm font-semibold">
              {stopping ? "Stopping…" : done ? "Analysis complete" : progress.stage}
            </p>
          </div>

          {/* The bar */}
          <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="analysis-progress-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
            {/* Phase boundaries */}
            {PHASES.slice(1).map((ph) => (
              <span
                key={ph.from}
                className="absolute inset-y-0 w-px bg-surface/80"
                style={{ left: `${ph.from}%` }}
                aria-hidden
              />
            ))}
          </div>
          <div className="relative mt-1.5 h-4 text-[10px] font-medium uppercase tracking-wider text-muted">
            {PHASES.map((ph, i) => {
              const last = i === PHASES.length - 1;
              const first = i === 0;
              const reached = pct >= ph.from;
              // First label hugs the left edge, last hugs the right, the rest
              // are centred in their segment.
              const style = first
                ? { left: 0 }
                : last
                  ? { right: 0 }
                  : { left: `${(ph.from + ph.to) / 2}%`, transform: "translateX(-50%)" };
              return (
                <span
                  key={ph.label}
                  // On a narrow bar the middle labels would crowd the ends; only
                  // the first and last are shown there.
                  className={`absolute whitespace-nowrap ${reached ? "text-primary-deep" : ""} ${
                    first || last ? "" : "hidden lg:inline"
                  }`}
                  style={style}
                >
                  {ph.label}
                </span>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] text-muted">
            Nothing is saved until the run completes — stopping discards it entirely.
          </p>
        </div>

        <button
          type="button"
          onClick={onStop}
          disabled={stopping || done}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-danger/40 bg-surface px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <rect x="4" y="4" width="12" height="12" rx="2" />
          </svg>
          {stopping ? "Stopping…" : "Stop analysis"}
        </button>
      </div>
    </div>
  );
}
