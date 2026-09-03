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

function removeNonScopePptxContent(xml) {
  const shape = /<p:sp\b[\s\S]*?<\/p:sp>/gi;
  return xml.replace(shape, (candidate) =>
    /Attrition:|EBIT:|attrition_|ebit_|Red:\s*Phase 2|out of scope/i.test(candidate)
      ? ""
      : candidate,
  );
}

function addNarrativeParagraphSpacing(content) {
  const spacing =
    '<a:lnSpc><a:spcPct val="112000"/></a:lnSpc><a:spcAft><a:spcPts val="40"/></a:spcAft>';
  const selfClosing = content.match(/<a:pPr\b([^>]*)\/>/);
  if (selfClosing) {
    return content.replace(
      selfClosing[0],
      `<a:pPr${selfClosing[1]}>${spacing}</a:pPr>`,
    );
  }
  if (/<a:pPr\b[^>]*>/.test(content)) {
    return content.replace(/(<a:pPr\b[^>]*>)/, `$1${spacing}`);
  }
  return `<a:pPr>${spacing}</a:pPr>${content}`;
}

function replacePptxPlaceholder(xml, key, value) {
  const token = `{{${key}}}`;
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Do not let a placeholder match cross DrawingML run boundaries. Crossing
  // them duplicates the preceding slide markup once per inserted detail line.
  const runContent = `(?:(?!<a:r>|</a:r>)[\\s\\S])*?`;
  const run = new RegExp(
    `<a:r>(${runContent})<a:t>${escapedToken}</a:t>(${runContent})</a:r>`,
    "g",
  );
  const paragraph = new RegExp(
    `(<a:p\\b[^>]*>)([\\s\\S]*${escapedToken}[\\s\\S]*?)(</a:p>)`,
    "g",
  );
  let replaced = false;
  const withParagraphs = xml.replace(paragraph, (whole, open, content, close) => {
    const withRuns = content.replace(run, (_match, before, after) => {
      replaced = true;
      return value
        .split("\n")
        .map((line) => `<a:r>${before}<a:t>${xmlEscape(line)}</a:t>${after}</a:r>`)
        .join("<a:br/>");
    });
    return withRuns === content
      ? whole
      : `${open}${addNarrativeParagraphSpacing(withRuns)}${close}`;
  });
  return replaced
    ? withParagraphs
    : withParagraphs.replace(new RegExp(escapedToken, "g"), xmlEscape(value));
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
    let xml = removeNonScopePptxContent(await zip.file(slideName).async("string"));
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