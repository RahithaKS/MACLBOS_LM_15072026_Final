"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { parseDataFile, UPLOAD_ACCEPT, type UploadStage } from "@/lib/parseUpload";
import { SAMPLE_DATA_SOURCES } from "@/lib/sample-data";
import {
  getUploadedSources,
  saveUploadedSource,
  deleteUploadedSource,
  ensureDatasetsLoaded,
  hiddenSamplesStore,
  hideSampleSource,
  restoreSampleSources,
} from "@/lib/store";
import { getCubes } from "@/lib/cubes";
import type { DataSource } from "@/lib/types";

function CubeIcon() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-muted">
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-primary-deep" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="10" cy="5" rx="6.5" ry="2.5" />
        <path d="M3.5 5v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V5M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
      </svg>
    </span>
  );
}

function DatasetRow({
  source,
  cubeName,
  onDelete,
}: {
  source: DataSource;
  cubeName: string;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const columns = Object.keys(source.records[0] ?? {});
  const previewCols = columns.slice(0, 8);
  const previewRows = source.records.slice(0, 6);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <CubeIcon />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{source.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                source.kind === "sample"
                  ? "bg-surface-muted text-muted"
                  : "bg-accent-soft text-accent"
              }`}
            >
              {source.kind === "sample" ? "Sample data" : "Uploaded"}
            </span>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-primary-deep">
              Cube: {cubeName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {source.records.length} rows · {columns.length} columns · {source.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent-soft"
          >
            {expanded ? "Hide preview" : "Preview"}
          </button>
          {onDelete && (
            <button
              aria-label={`Delete ${source.name}`}
              onClick={onDelete}
              className="text-danger/70 hover:text-danger"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2.5 0-.7 10a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4L5.5 6M8.5 9.5v4.5M11.5 9.5v4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="overflow-x-auto border-t border-border px-5 py-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left uppercase tracking-wide text-muted">
                {previewCols.map((c) => (
                  <th key={c} className="py-1.5 pr-4 font-medium">
                    {c}
                  </th>
                ))}
                {columns.length > previewCols.length && <th className="py-1.5 font-medium">…</th>}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/60 last:border-0">
                  {previewCols.map((c) => (
                    <td key={c} className="py-1.5 pr-4">
                      {String(row[c] ?? "")}
                    </td>
                  ))}
                  {columns.length > previewCols.length && <td className="py-1.5">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {source.records.length > previewRows.length && (
            <p className="mt-2 text-[11px] text-muted">
              Showing {previewRows.length} of {source.records.length} rows.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EnterpriseDataPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<DataSource[]>([]);
  const hiddenSamples = useSyncExternalStore(
    hiddenSamplesStore.subscribe,
    hiddenSamplesStore.getSnapshot,
    hiddenSamplesStore.getServerSnapshot,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    file: string;
    index: number;
    total: number;
    stage: UploadStage;
    percent: number;
  } | null>(null);

  // Hidden sample ids live in localStorage, outside React — subscribe rather
  // than copying them into state on mount. Uploads stay in state because they
  // load asynchronously from IndexedDB.
  useEffect(() => {
    ensureDatasetsLoaded().then(() => setUploads(getUploadedSources()));
  }, []);

  const cubeNames = new Map(getCubes().map((c) => [c.id, c.name]));
  const visibleSamples = SAMPLE_DATA_SOURCES.filter((s) => !hiddenSamples.includes(s.id));

  async function removeDataset(source: DataSource) {
    const ok = window.confirm(
      `Remove "${source.name}" from Enterprise Data? Boards using it as their cube will be disconnected.`,
    );
    if (!ok) return;
    if (source.kind === "upload") {
      await deleteUploadedSource(source.id);
      setUploads(getUploadedSources());
    } else {
      hideSampleSource(source.id);
    }
    setNotice(`"${source.name}" removed. It is no longer selectable as a data cube.`);
    setError(null);
  }

  async function handleUploads(files: File[]) {
    setError(null);
    setNotice(null);
    const done: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        const report = (stage: UploadStage, percent: number) =>
          setProgress({ file: file.name, index: i + 1, total: files.length, stage, percent });
        report("reading", 0);
        const sources = await parseDataFile(file, report);
        report("saving", 100);
        for (const source of sources) await saveUploadedSource(source);
        report("done", 100);
        done.push(
          sources.length === 1
            ? sources[0].name
            : `${sources.length} sheets from "${file.name}"`,
        );
      }
      setUploads(getUploadedSources());
      setNotice(
        `Uploaded: ${done.join(", ")}. ${done.length > 1 ? "They are" : "It is"} now selectable as a data cube when creating or editing a Board.`,
      );
    } catch (e) {
      setUploads(getUploadedSources());
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="standalone-page-shell min-h-[calc(100vh-2rem)] rounded-2xl bg-surface shadow-sm">
      <header className="standalone-page-header flex items-center justify-between rounded-t-2xl bg-band px-8 py-4">
        <h1 className="font-display text-xl font-semibold">Enterprise Data</h1>
        <button
          onClick={() => fileInput.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7M4 16.5h12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload Data
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={UPLOAD_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) handleUploads(files);
            e.target.value = "";
          }}
        />
      </header>

      <div className="standalone-page-content px-8 py-6">
        <p className="text-sm text-muted">
          Company-wide datasets available to every Board. Each dataset is exposed as a data cube —
          connect one in a Board&apos;s settings to enable Smart Analysis reports and thread queries.
          Upload CSV or Excel (.xls / .xlsx) files with a header row — each Excel sheet becomes its
          own dataset. A period column (month/quarter/date) plus numeric columns works best.
        </p>

        {progress && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-accent-soft/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-primary-deep">
                Uploading {progress.file}
                {progress.total > 1 ? ` (${progress.index} of ${progress.total})` : ""}
              </span>
              <span className="text-xs text-muted">
                {progress.stage === "reading" && `Reading file… ${progress.percent}%`}
                {progress.stage === "parsing" && "Parsing…"}
                {progress.stage === "saving" && "Saving to Enterprise Data…"}
                {progress.stage === "done" && "Done"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{
                  width: `${
                    progress.stage === "reading"
                      ? Math.round(progress.percent * 0.7)
                      : progress.stage === "parsing"
                        ? 80
                        : progress.stage === "saving"
                          ? 92
                          : 100
                  }%`,
                }}
              />
            </div>
          </div>
        )}
        {notice && (
          <p className="mt-4 rounded-lg border border-primary/30 bg-accent-soft/60 px-4 py-3 text-sm text-primary-deep">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {uploads.length > 0 && (
          <>
            <h2 className="mt-6 font-display text-lg font-semibold">Uploaded datasets</h2>
            <div className="mt-3 space-y-3">
              {uploads.map((source) => (
                <DatasetRow
                  key={source.id}
                  source={source}
                  cubeName={cubeNames.get(source.id) ?? source.name}
                  onDelete={() => removeDataset(source)}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Sample datasets</h2>
          {hiddenSamples.length > 0 && (
            <button
              onClick={() => {
                restoreSampleSources();
                setNotice("Sample datasets restored.");
              }}
              className="text-sm font-medium text-accent hover:underline"
            >
              Restore removed samples ({hiddenSamples.length})
            </button>
          )}
        </div>
        <div className="mt-3 space-y-3">
          {visibleSamples.length === 0 && (
            <p className="rounded-xl border border-border px-6 py-8 text-center text-sm text-muted">
              All sample datasets have been removed.
            </p>
          )}
          {visibleSamples.map((source) => (
            <DatasetRow
              key={source.id}
              source={source}
              cubeName={cubeNames.get(source.id) ?? source.name}
              onDelete={() => removeDataset(source)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
