"use client";

import { SAMPLE_DATA_SOURCES } from "./sample-data";
import { getUploadedSources, getHiddenSampleIds } from "./store";
import type { DataCube } from "./types";

// Data cubes are the datasets a board's Smart Analysis runs on. In the
// prototype they are backed by the bundled sample datasets plus any CSVs the
// user uploads; in production this maps to the Enterprise Data cube registry.

const SAMPLE_VERSIONS: Record<string, string[]> = {
  "sample-pnl": [
    "CF02 2025",
    "CF02 2025 Top Down",
    "CF05 2025",
    "CF05 2025 Top Down",
    "CF09 2025",
    "CF09 2025 Top Down",
    "CF11 2025 Top Down",
    "TBP 2025",
    "TBP 2025 Top Down",
  ],
};

export function getCubes(): DataCube[] {
  const hidden = getHiddenSampleIds();
  const samples: DataCube[] = SAMPLE_DATA_SOURCES.filter((s) => !hidden.includes(s.id)).map((s) => ({
    id: s.id,
    name:
      s.id === "sample-pnl"
        ? "Testing 2025"
        : s.name.replace("Meridian Retail — ", "Meridian "),
    description: s.description,
    versions: SAMPLE_VERSIONS[s.id] ?? [],
    records: s.records,
  }));
  const uploads: DataCube[] = getUploadedSources().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    versions: [],
    records: s.records,
  }));
  return [...samples, ...uploads];
}

export function getCube(id: string | null): DataCube | undefined {
  if (!id) return undefined;
  return getCubes().find((c) => c.id === id);
}

/**
 * Split a cube's columns into data columns (measures — numeric values) and
 * dimensions (entities, periods, categories — anything non-numeric).
 */
export function classifyColumns(records: Record<string, string | number>[]): {
  measures: string[];
  dimensions: string[];
} {
  const keys = Object.keys(records[0] ?? {});
  const measures: string[] = [];
  const dimensions: string[] = [];
  for (const key of keys) {
    const numeric = records.every((r) => r[key] == null || typeof r[key] === "number");
    (numeric ? measures : dimensions).push(key);
  }
  return { measures, dimensions };
}
