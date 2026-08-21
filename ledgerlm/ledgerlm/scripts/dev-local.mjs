import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const ledgerLmDir = path.resolve(scriptDir, "..");
const boardsDir = path.resolve(ledgerLmDir, "..", "boards-standalone");
const boardsPort = process.env.STANDALONE_BOARDS_PORT || "3000";
const ledgerLmPort = process.env.PORT || "5000";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, cwd, args, env) {
  const child = spawn(npmCommand, args, {
    cwd,
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });

  child.on("error", (error) => {
    console.error(`[${label}] Could not start: ${error.message}`);
    shutdown("SIGTERM", 1);
  });

  return child;
}

const boards = run(
  "boards",
  boardsDir,
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", boardsPort],
  {
    ...process.env,
    BASE_PATH: "/standalone-boards",
  },
);

const ledgerLm = run(
  "ledgerlm",
  ledgerLmDir,
  ["run", "dev"],
  {
    ...process.env,
    PORT: ledgerLmPort,
    STANDALONE_BOARDS_URL: `http://127.0.0.1:${boardsPort}`,
  },
);

let shuttingDown = false;

function stopChild(child, signal) {
  if (!child.pid || child.killed) return;
  if (process.platform === "win32") {
    const taskkill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    taskkill.on("error", () => child.kill(signal));
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function shutdown(signal, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopChild(boards, signal);
  stopChild(ledgerLm, signal);
  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 1_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT", 0));
process.on("SIGTERM", () => shutdown("SIGTERM", 0));

boards.on("exit", (code, signal) => {
  if (shuttingDown) return;
  console.error(`[boards] stopped unexpectedly${signal ? ` (${signal})` : ` with exit code ${code ?? 0}`}`);
  shutdown("SIGTERM", code || 1);
});

ledgerLm.on("exit", (code, signal) => {
  if (shuttingDown) return;
  console.error(`[ledgerlm] stopped unexpectedly${signal ? ` (${signal})` : ` with exit code ${code ?? 0}`}`);
  shutdown("SIGTERM", code || 1);
});

console.log("");
console.log("LedgerLM local workspace is starting.");
console.log(`Open http://localhost:${ledgerLmPort}`);
console.log(`Boards are available through http://localhost:${ledgerLmPort}/standalone-boards`);
console.log("");