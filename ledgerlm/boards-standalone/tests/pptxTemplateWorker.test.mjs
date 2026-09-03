import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import JSZip from "jszip";

const workerPath = fileURLToPath(
  new URL("../workers/pptxTemplateWorker.mjs", import.meta.url),
);

function runWorker(inputPath, valuesPath, outputPath) {
  return new Promise((resolve, reject) => {
    const child = fork(workerPath, [inputPath, valuesPath, outputPath], {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("message", (message) => {
      if (message?.type === "completed") resolve();
      if (message?.type === "error") reject(new Error(message.error));
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code && code !== 0) {
        reject(new Error(stderr || `Worker exited with code ${code}.`));
      }
    });
  });
}

test("multiline placeholders do not duplicate surrounding slide XML", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ledgerlm-pptx-worker-"));
  const inputPath = join(directory, "input.pptx");
  const valuesPath = join(directory, "values.json");
  const outputPath = join(directory, "output.pptx");
  const prefixes = ["ww", "in", "vn", "mx"];

  try {
    const zip = new JSZip();
    prefixes.forEach((prefix, index) => {
      const key = `${prefix}_budget_revenue_detail`;
      zip.file(
        `ppt/slides/slide${index + 1}.xml`,
        `<p:sld><a:p>` +
          `<a:r><a:rPr/><a:t>PRELUDE-${prefix}</a:t></a:r>` +
          `<a:r><a:rPr/><a:t>{{${key}}}</a:t></a:r>` +
          `<a:r><a:rPr/><a:t>TAIL-${prefix}</a:t></a:r>` +
          `</a:p></p:sld>`,
      );
    });
    await writeFile(inputPath, await zip.generateAsync({ type: "nodebuffer" }));
    await writeFile(
      valuesPath,
      JSON.stringify(
        prefixes.map((prefix) => ({
          label: prefix.toUpperCase(),
          values: {
            [`${prefix}_budget_revenue_detail`]:
              `${prefix.toUpperCase()} analysis line one\n${prefix.toUpperCase()} analysis line two`,
          },
        })),
      ),
    );

    await runWorker(inputPath, valuesPath, outputPath);

    const output = await JSZip.loadAsync(await readFile(outputPath));
    for (const [index, prefix] of prefixes.entries()) {
      const xml = await output
        .file(`ppt/slides/slide${index + 1}.xml`)
        .async("string");
      assert.equal(xml.match(new RegExp(`PRELUDE-${prefix}`, "g"))?.length, 1);
      assert.equal(xml.match(new RegExp(`TAIL-${prefix}`, "g"))?.length, 1);
      assert.equal(
        xml.match(new RegExp(`${prefix.toUpperCase()} analysis line one`, "g"))
          ?.length,
        1,
      );
      assert.equal(
        xml.match(new RegExp(`${prefix.toUpperCase()} analysis line two`, "g"))
          ?.length,
        1,
      );
      assert.doesNotMatch(xml, /\{\{[^}]+\}\}/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});