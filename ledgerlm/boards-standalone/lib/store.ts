"use client";

import type { Board, ComparisonBasis, DataSource, Report } from "./types";

// Client-side persistence. Boards and uploaded data sources live in
// localStorage so the prototype needs no database; swap for an API-backed
// store when merging into the main LedgerLM codebase.

const BOARDS_KEY = "ledgerlm.boards";
const UPLOADS_KEY = "ledgerlm.uploads";
// Bundled sample datasets can't be deleted from code, so removal hides them.
const HIDDEN_SAMPLES_KEY = "ledgerlm.hiddenSamples";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
  invalidate(key);
}

// ---- Reading localStorage from React ---------------------------------------
// Components read these through useSyncExternalStore rather than loading them
// in an effect and calling setState. Pulling an external store in on mount via
// setState re-renders every page load and cascades on every write, which is
// what react-hooks/set-state-in-effect flags.
//
// useSyncExternalStore compares snapshots by reference, so each snapshot has to
// be cached: getBoards() builds a fresh array every call, and returning that
// directly would report a change on every render and loop forever. The cache is
// dropped on write and re-read lazily.

const STORE_EVENT = "ledgerlm:store-updated";

const snapshots = new Map<string, unknown>();

function invalidate(key: string) {
  snapshots.delete(key);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
  }
}

/** Subscribe to changes for one storage key, including writes from other tabs. */
function subscribeTo(key: string) {
  return (onStoreChange: () => void) => {
    const local = () => onStoreChange();
    // Another tab wrote: its dispatch doesn't reach us, so drop our cache too.
    const cross = (e: StorageEvent) => {
      if (e.key === null || e.key === key) {
        snapshots.delete(key);
        onStoreChange();
      }
    };
    window.addEventListener(STORE_EVENT, local);
    window.addEventListener("storage", cross);
    return () => {
      window.removeEventListener(STORE_EVENT, local);
      window.removeEventListener("storage", cross);
    };
  };
}

function snapshotOf<T>(key: string, build: () => T): T {
  if (!snapshots.has(key)) snapshots.set(key, build());
  return snapshots.get(key) as T;
}

/** Stable empty results for the server render, which has no localStorage. */
const NO_BOARDS: Board[] = [];
const NO_IDS: string[] = [];

export const boardsStore = {
  subscribe: subscribeTo(BOARDS_KEY),
  getSnapshot: (): Board[] => snapshotOf(BOARDS_KEY, getBoards),
  getServerSnapshot: (): Board[] => NO_BOARDS,
};

export const hiddenSamplesStore = {
  subscribe: subscribeTo(HIDDEN_SAMPLES_KEY),
  getSnapshot: (): string[] => snapshotOf(HIDDEN_SAMPLES_KEY, getHiddenSampleIds),
  getServerSnapshot: (): string[] => NO_IDS,
};

/** Fill in fields added after a board was stored, so old boards keep working. */
function normalize(board: Partial<Board> & Pick<Board, "id" | "name" | "templateId" | "createdAt">): Board {
  // keyColumns was a plain string[] in earlier versions — coerce to labelled form.
  const keyColumns = (board.keyColumns ?? []).map((k) =>
    typeof k === "string" ? { column: k, label: k } : k,
  );
  // Earlier versions stored a single `result`/`analyzedAt` — migrate to reports[].
  const legacy = board as Partial<Board> & {
    result?: Report["result"] | null;
    analyzedAt?: string | null;
  };
  const reports: Report[] =
    board.reports ??
    (legacy.result
      ? [
          {
            id: crypto.randomUUID(),
            createdAt: legacy.analyzedAt ?? board.createdAt,
            trigger: "adhoc",
            result: legacy.result,
          },
        ]
      : []);
  // `actions` and `commentary` were added after some reports were stored.
  const withActions = reports.map((r) => ({
    ...r,
    result: {
      ...r.result,
      actions: r.result.actions ?? [],
      commentary: r.result.commentary ?? [],
    },
  }));
  const threads = (board.threads ?? []).map((t) => ({
    ...t,
    trigger: t.trigger ?? "adhoc",
    reportId: t.reportId ?? null,
  }));
  // comparisonBasis held one period before several could be chosen.
  const legacyBasis = board.comparisonBasis as
    | (ComparisonBasis & { period?: string | null })
    | undefined;
  const comparisonBasis: ComparisonBasis | undefined = legacyBasis
    ? {
        mode: legacyBasis.mode ?? "previous",
        periods:
          legacyBasis.periods ?? (legacyBasis.period ? [legacyBasis.period] : []),
      }
    : undefined;

  const normalized: Board = {
    description: "",
    systemPrompt: "",
    reportTemplate: "",
    templateTheme: null,
    templateAnatomy: null,
    templatePptx: null,
    cubeId: null,
    entityPnl: null,
    kpiReport: null,
    timeGranularity: "auto",
    comparisonBasis: { mode: "previous", periods: [] },
    // Boards saved before scope modes existed meant "only these" whenever key
    // columns were mapped, and "everything" otherwise.
    scopeMode: keyColumns.length ? "selected" : "all",
    excludedColumns: [],
    rollingForecasts: [],
    dataSources: {
      enterpriseData: true,
      vaultDocuments: true,
    },
    schedule: { enabled: false, frequency: "daily", nextRunAt: null },
    ...board,
    ...(comparisonBasis ? { comparisonBasis } : {}),
    keyColumns,
    reports: withActions,
    threads,
  };
  delete (normalized as unknown as Record<string, unknown>).result;
  delete (normalized as unknown as Record<string, unknown>).analyzedAt;
  return normalized;
}

export function getBoards(): Board[] {
  return read<Board>(BOARDS_KEY).map(normalize);
}

export function getBoard(id: string): Board | undefined {
  return getBoards().find((b) => b.id === id);
}

export function saveBoard(board: Board) {
  const boards = getBoards();
  const idx = boards.findIndex((b) => b.id === board.id);
  if (idx >= 0) boards[idx] = board;
  else boards.unshift(board);
  write(BOARDS_KEY, boards);
}

export function deleteBoard(id: string) {
  write(
    BOARDS_KEY,
    getBoards().filter((b) => b.id !== id),
  );
}

// ---- Uploaded datasets ------------------------------------------------------
// Datasets live in IndexedDB, not localStorage: localStorage caps out around
// 5MB, which a single real Excel/CSV upload can exceed ("exceeded the quota").
// A synchronous in-memory cache (hydrated via ensureDatasetsLoaded) keeps the
// read API sync for render paths.

const DATASET_DB = "ledgerlm-datasets";
const DATASET_STORE = "uploads";

let uploadsCache: DataSource[] | null = null;
let uploadsReady: Promise<void> | null = null;

function openDatasetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DATASET_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DATASET_STORE)) {
        req.result.createObjectStore(DATASET_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open dataset storage."));
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Dataset storage operation failed."));
  });
}

async function withDatasetStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatasetDb();
  try {
    return await fn(db.transaction(DATASET_STORE, mode).objectStore(DATASET_STORE));
  } finally {
    db.close();
  }
}

/**
 * Hydrate the dataset cache (and migrate any datasets stranded in
 * localStorage from earlier versions, freeing its quota). Call before relying
 * on getUploadedSources()/getCubes(); safe to call repeatedly.
 */
export function ensureDatasetsLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!uploadsReady) {
    uploadsReady = (async () => {
      // Migrate legacy localStorage uploads into IndexedDB.
      const legacy = read<DataSource>(UPLOADS_KEY);
      if (legacy.length) {
        const now = Date.now();
        await withDatasetStore("readwrite", async (store) => {
          legacy.forEach((s, i) => {
            // Preserve the old newest-first array order via descending stamps.
            store.put({ ...s, uploadedAt: s.uploadedAt ?? new Date(now - i).toISOString() });
          });
          await idbRequest(store.getAll());
        });
      }
      window.localStorage.removeItem(UPLOADS_KEY);

      const all = await withDatasetStore("readonly", (store) =>
        idbRequest(store.getAll() as IDBRequest<DataSource[]>),
      );
      uploadsCache = all.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    })().catch((e) => {
      console.warn("[store] dataset hydration failed:", e);
      uploadsCache = uploadsCache ?? [];
    });
  }
  return uploadsReady;
}

/** Synchronous view of uploaded datasets (empty until ensureDatasetsLoaded resolves). */
export function getUploadedSources(): DataSource[] {
  if (typeof window !== "undefined") void ensureDatasetsLoaded();
  return uploadsCache ?? [];
}

export async function saveUploadedSource(source: DataSource) {
  await ensureDatasetsLoaded();
  const stamped: DataSource = { ...source, uploadedAt: new Date().toISOString() };
  await withDatasetStore("readwrite", async (store) => idbRequest(store.put(stamped)));
  uploadsCache = [stamped, ...(uploadsCache ?? [])];
}

/** Detach a removed cube from any board that referenced it. */
function detachCubeFromBoards(id: string) {
  const boards = read<Board>(BOARDS_KEY);
  let changed = false;
  for (const b of boards) {
    if (b.cubeId === id) {
      b.cubeId = null;
      changed = true;
    }
  }
  if (changed) write(BOARDS_KEY, boards);
}

export async function deleteUploadedSource(id: string) {
  await ensureDatasetsLoaded();
  await withDatasetStore("readwrite", async (store) => idbRequest(store.delete(id)));
  uploadsCache = (uploadsCache ?? []).filter((s) => s.id !== id);
  detachCubeFromBoards(id);
}

export function getHiddenSampleIds(): string[] {
  return read<string>(HIDDEN_SAMPLES_KEY);
}

export function hideSampleSource(id: string) {
  const hidden = getHiddenSampleIds();
  if (!hidden.includes(id)) write(HIDDEN_SAMPLES_KEY, [...hidden, id]);
  detachCubeFromBoards(id);
}

export function restoreSampleSources() {
  write(HIDDEN_SAMPLES_KEY, []);
}
