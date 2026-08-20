"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { parseDataFile, UPLOAD_ACCEPT } from "@/lib/parseUpload";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { boardsStore, saveBoard, deleteBoard, saveUploadedSource } from "@/lib/store";
import type { Board, BoardTemplate } from "@/lib/types";
import BoardModal, { type BoardModalResult } from "@/components/board/BoardModal";

function TemplateIcon() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-muted/70">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary-deep" stroke="currentColor" strokeWidth="1.5">
        <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function BoardsPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  // Boards live in localStorage, outside React — read through the store's
  // subscription rather than loading them into state in an effect.
  const boards = useSyncExternalStore(
    boardsStore.subscribe,
    boardsStore.getSnapshot,
    boardsStore.getServerSnapshot,
  );
  const [modal, setModal] = useState<
    | { mode: "create"; template: BoardTemplate }
    | { mode: "edit"; template: BoardTemplate; board: Board }
    | null
  >(null);

  function openCreate(templateId: string) {
    const template = getTemplate(templateId);
    if (template) setModal({ mode: "create", template });
  }

  function handleSubmit(values: BoardModalResult) {
    if (!modal) return;
    if (modal.mode === "create") {
      const board: Board = {
        id: crypto.randomUUID(),
        templateId: modal.template.id,
        createdAt: new Date().toISOString(),
        threads: [],
        reports: [],
        ...values,
      };
      saveBoard(board);
      router.push(`/boards/${board.id}`);
    } else {
      saveBoard({ ...modal.board, ...values });
      setModal(null);
    }
  }

  async function handleUpload(file: File) {
    try {
      const sources = await parseDataFile(file);
      for (const source of sources) await saveUploadedSource(source);
    } catch {
      // Errors are surfaced on the Enterprise Data page; this button is a shortcut.
    }
  }

  return (
    <div className="standalone-page-shell min-h-[calc(100vh-2rem)] rounded-2xl bg-surface shadow-sm">
      <header className="standalone-page-header flex items-center justify-between rounded-t-2xl bg-band px-8 py-4">
        <h1 className="font-display text-xl font-semibold">Boards</h1>
        <button
          onClick={() => fileInput.current?.click()}
          title="Upload a CSV or Excel file to use as a data cube"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          Data Sources
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <path d="M12 3v14" />
          </svg>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </header>

      <div className="standalone-page-content px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background/40 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-surface-muted">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary-deep">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="11" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="11" width="6" height="6" rx="1" />
                <rect x="11" y="11" width="6" height="6" rx="1" />
              </svg>
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Create a new Board</h2>
              <p className="mt-0.5 text-sm text-muted">
                Group analyses, documents, and insights into one centralized financial workspace.
              </p>
            </div>
          </div>
          <button
            onClick={() => openCreate("custom-kpi-board")}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Create New Board
          </button>
        </div>

        {boards.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-xl font-semibold">My Boards</h2>
            <div className="standalone-my-boards-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {boards.map((board) => {
                const template = getTemplate(board.templateId) ?? TEMPLATES[0];
                return (
                  <div
                    key={board.id}
                    className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm"
                  >
                    <TemplateIcon />
                    <h3 className="mt-4 font-display text-[15px] font-semibold">{board.name}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                      {board.description || template.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        onClick={() => router.push(`/boards/${board.id}`)}
                        className="flex items-center gap-1.5 text-sm font-medium text-accent transition-all hover:gap-2.5"
                      >
                        Open Board
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 10h13M12 5.5 16.5 10 12 14.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2.5">
                        <button
                          aria-label="Edit board"
                          onClick={() => setModal({ mode: "edit", template, board })}
                          className="text-muted hover:text-foreground"
                        >
                          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
                            <path d="M13.5 3.5 16.5 6.5 8 15H5v-3l8.5-8.5ZM3.5 17h13" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          aria-label="Delete board"
                          onClick={() => deleteBoard(board.id)}
                          className="text-danger/70 hover:text-danger"
                        >
                          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2.5 0-.7 10a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4L5.5 6M8.5 9.5v4.5M11.5 9.5v4.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <h2 className="mt-8 font-display text-xl font-semibold">Browse Templates</h2>
        <div className="standalone-template-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <TemplateIcon />
                {template.tier && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      template.tier === "custom"
                        ? "bg-accent-soft text-accent"
                        : "bg-surface-muted text-muted"
                    }`}
                  >
                    {template.tier}
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-[15px] font-semibold">{template.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                {template.description}
              </p>
              <button
                onClick={() => openCreate(template.id)}
                className="mt-3 flex items-center gap-1.5 self-start text-sm font-medium text-accent transition-all hover:gap-2.5"
              >
                Use Template
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 10h13M12 5.5 16.5 10 12 14.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <BoardModal
          mode={modal.mode}
          template={modal.template}
          board={modal.mode === "edit" ? modal.board : undefined}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
