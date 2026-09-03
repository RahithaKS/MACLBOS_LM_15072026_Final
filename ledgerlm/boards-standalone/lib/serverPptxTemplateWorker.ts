import { fork } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExportProgress, FourEntityKpiTemplatePayload } from "@/lib/exportReport";

const PPTX_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const WORKER_TIMEOUT_MS = 15 * 60 * 1000;

export async function generateFourEntityTemplateInWorker(
  payload: FourEntityKpiTemplatePayload,
  onProgress: ExportProgress,
): Promise<Blob> {
  const directory = await mkdtemp(path.join(tmpdir(), "ledgerlm-pptx-"));
  const inputPath = path.join(directory, "template.pptx");
  const valuesPath = path.join(directory, "values.json");
  const outputPath = path.join(directory, "output.pptx");

  try {
    onProgress(8, "Preparing the Bosch template worker");
    await Promise.all([
      writeFile(inputPath, Buffer.from(payload.base64, "base64")),
      writeFile(valuesPath, JSON.stringify(payload.entities), "utf8"),
    ]);

    const workerPath = fileURLToPath(new URL("../workers/pptxTemplateWorker.mjs", import.meta.url));
    await new Promise<void>((resolve, reject) => {
      const child = fork(workerPath, [inputPath, valuesPath, outputPath], {
        stdio: ["ignore", "ignore", "pipe", "ipc"],
      });
      let completed = false;
      let stderr = "";
      let lastStage = "starting the worker";
      const startedAt = Date.now();
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        reject(
          new Error(
            `PowerPoint template processing timed out after 15 minutes during ${lastStage}.`,
          ),
        );
      }, WORKER_TIMEOUT_MS);

      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("message", (message: unknown) => {
        const update = message as { type?: string; percent?: number; stage?: string; error?: string };
        if (update.type === "progress" && typeof update.percent === "number" && update.stage) {
          lastStage = update.stage;
          onProgress(update.percent, update.stage);
          if (update.percent === 12 || update.percent === 28 || update.percent === 48 || update.percent >= 96) {
            console.info(
              `[export] PPT worker ${update.percent}% ${update.stage} (${Date.now() - startedAt}ms)`,
            );
          }
        } else if (update.type === "completed") {
          completed = true;
          clearTimeout(timeout);
          console.info(`[export] PPT worker completed in ${Date.now() - startedAt}ms`);
          resolve();
        } else if (update.type === "error") {
          clearTimeout(timeout);
          reject(new Error(update.error || "PowerPoint template processing failed."));
        }
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("exit", (code) => {
        if (completed) return;
        clearTimeout(timeout);
        reject(
          new Error(
            stderr.trim() ||
              `PowerPoint template worker stopped before completion${code === null ? "" : ` (${code})`}.`,
          ),
        );
      });
    });

    const output = await readFile(outputPath);
    onProgress(96, "Finalizing the PowerPoint");
    return new Blob([new Uint8Array(output)], { type: PPTX_TYPE });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}