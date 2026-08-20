"use client";

import { useEffect, useRef } from "react";
import { getBoards, saveBoard } from "@/lib/store";
import { runBoardAnalysis, nextRunFrom, announceBoardsUpdated } from "@/lib/runAnalysis";

const CHECK_INTERVAL_MS = 30_000;

/**
 * Client-side scheduler for board runs. While the app is open it checks every
 * 30s for boards whose schedule is due (including runs that came due while the
 * app was closed), runs their analysis, and advances the next-run time.
 */
export default function ScheduleRunner() {
  const running = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isEmbedded = new URLSearchParams(window.location.search).get("embedded") === "1";
    const isEnterpriseDataPage = window.location.pathname.endsWith("/enterprise-data");

    // When LedgerLM prewarms both standalone frames, only the Boards frame
    // owns the scheduler. This keeps scheduled analysis behavior intact while
    // avoiding duplicate background runs from the hidden Enterprise Data frame.
    if (isEmbedded && isEnterpriseDataPage) return;

    async function tick() {
      const now = Date.now();
      for (const board of getBoards()) {
        const { schedule } = board;
        if (!schedule.enabled || !schedule.nextRunAt || !board.cubeId) continue;
        if (new Date(schedule.nextRunAt).getTime() > now) continue;
        if (running.current.has(board.id)) continue;

        running.current.add(board.id);
        // Advance the clock first so a failing run doesn't retry every tick.
        const fresh = getBoards().find((b) => b.id === board.id);
        if (!fresh) {
          running.current.delete(board.id);
          continue;
        }
        saveBoard({
          ...fresh,
          schedule: { ...schedule, nextRunAt: nextRunFrom(schedule) },
        });
        announceBoardsUpdated();
        try {
          await runBoardAnalysis(board.id, "scheduled");
        } catch (error) {
          console.warn(`[scheduler] run failed for board ${board.name}:`, error);
        } finally {
          running.current.delete(board.id);
        }
      }
    }

    tick();
    const interval = setInterval(tick, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
