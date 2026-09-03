import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const [inputPath, valuesPath, outputPath] = process.argv.slice(2);

function send(message) {
  if (process.send) process.send(message);
}

let lastProgressPercent = -1;
let lastProgressAt = 0;

function sendProgress(percent, stage, force = false) {
  const roundedPercent = Math.max(0, Math.min(99, Math.round(percent)));
  const now = Date.now();
  // JSZip can call its update hook many times per second for a large
  // presentation. Throttling IPC prevents the child-process channel from
  // becoming the bottleneck while keeping the UI's percentage meaningful.
  if (
    !force &&
    roundedPercent === lastProgressPercent &&
    now - lastProgressAt < 250
  ) {
    return;
  }
  lastProgressPercent = roundedPercent;
  lastProgressAt = now;
  send({ type: "progress", percent: roundedPercent, stage });
}

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function replacePptxPlaceholder(xml, key, value) {
  const token = `{{${key}}}`;
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const run = new RegExp(
    `<a:r>([\\s\\S]*?)<a:t>${escapedToken}</a:t>([\\s\\S]*?)</a:r>`,
    "g",
  );
  let replaced = false;
  const withRuns = xml.replace(run, (_match, before, after) => {
    replaced = true;
    return value
      .split("\n")
      .map((line) => `<a:r>${before}<a:t>${xmlEscape(line)}</a:t>${after}</a:r>`)
      .join("<a:br/>");
  });
  return replaced
    ? withRuns
    : withRuns.replace(new RegExp(escapedToken, "g"), xmlEscape(value));
}

async function run() {
  sendProgress(12, "Loading the Bosch PowerPoint template", true);
  const [template, entitiesJson] = await Promise.all([
    readFile(inputPath),
    readFile(valuesPath, "utf8"),
  ]);
  const entities = JSON.parse(entitiesJson);
  const zip = await JSZip.loadAsync(template);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  if (slideNames.length < 4) throw new Error("The Bosch template does not contain four slides.");

  for (const [index, entity] of entities.entries()) {
    const slideName = slideNames[index];
    let xml = await zip.file(slideName).async("string");
    for (const [key, value] of Object.entries(entity.values)) {
      xml = replacePptxPlaceholder(xml, key, value);
    }
    zip.file(slideName, xml);
    sendProgress(
      30 + Math.round(((index + 1) / entities.length) * 15),
      `Populating ${entity.label}`,
      true,
    );
  }

  const output = await zip.generateAsync(
    {
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
    },
    (metadata) =>
      sendProgress(48 + Math.round(metadata.percent * 0.47), "Compressing the PowerPoint"),
  );
  await writeFile(outputPath, output);
  send({ type: "completed" });
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    send({ type: "error", error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });