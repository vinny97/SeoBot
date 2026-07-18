import { spawn } from "node:child_process";

const processes = new Set();
let stopping = false;

function start(name, command, args) {
  const child = spawn(command, args, {
    env: process.env,
    stdio: "inherit",
  });

  processes.add(child);
  child.once("exit", (code, signal) => {
    processes.delete(child);
    if (stopping) return;

    console.error(
      `${name} stopped unexpectedly (${signal || `exit ${code ?? 1}`}).`,
    );
    shutdown(code ?? 1);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of processes) child.kill("SIGTERM");

  const forceTimer = setTimeout(() => {
    for (const child of processes) child.kill("SIGKILL");
  }, 10_000);
  forceTimer.unref();

  Promise.all(
    [...processes].map(
      (child) => new Promise((resolve) => child.once("exit", resolve)),
    ),
  ).finally(() => process.exit(exitCode));
}

process.once("SIGTERM", () => shutdown(0));
process.once("SIGINT", () => shutdown(0));

start("Next.js web server", process.execPath, [
  "node_modules/next/dist/bin/next",
  "start",
]);
start("Crawler queue processor", process.execPath, [
  "dist-worker/workers/crawl-worker.js",
]);
