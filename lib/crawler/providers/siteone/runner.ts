import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type SiteOneRunnerConfig = {
  binaryPath: string;
  workDir: string;
  maxPages: number;
  maxDepth: number;
  processTimeoutMs: number;
};

const MAX_LOG_BYTES = 1_000_000;
const MAX_REPORT_BYTES = 25_000_000;

async function runCapture(binary: string, args: string[], timeoutMs = 10_000) {
  return new Promise<{ code: number; output: string }>((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const append = (chunk: Buffer) => {
      if (output.length < 20_000) output += chunk.toString("utf8").slice(0, 20_000 - output.length);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code: code ?? 1, output: output.trim() }));
    setTimeout(() => child.kill("SIGKILL"), timeoutMs).unref();
  });
}

export async function inspectSiteOne(binaryPath: string) {
  await access(binaryPath, constants.X_OK);
  const version = await runCapture(binaryPath, ["--version"]);
  if (![0, 2].includes(version.code)) throw new Error("SiteOne version check failed.");
  const match = version.output.match(/(\d+\.\d+\.\d+(?:\.\d+)?)/);
  if (!match || !match[1].startsWith("2.")) throw new Error("Unsupported SiteOne version.");
  const help = await runCapture(binaryPath, ["--help"]);
  if (![0, 2].includes(help.code)) throw new Error("SiteOne help check failed.");
  for (const option of ["--max-visited-urls", "--disable-all-assets", "--output-json-file"])
    if (!help.output.includes(option)) throw new Error(`SiteOne does not support ${option}.`);
  return match[1];
}

export function buildSiteOneArgs(url: string, reportPath: string, config: SiteOneRunnerConfig) {
  return [
    `--url=${url}`,
    "--workers=1",
    "--max-reqs-per-sec=2",
    `--max-visited-urls=${Math.min(config.maxPages, 50)}`,
    `--max-depth=${Math.min(config.maxDepth, 4)}`,
    "--memory-limit=512M",
    "--timeout=15",
    "--disable-all-assets",
    "--no-cache",
    "--no-color",
    `--output-json-file=${reportPath}`,
    "--output-html-report=",
    "--output-text-file=",
  ];
}

export async function runSiteOne(
  crawlRunId: string,
  url: string,
  config: SiteOneRunnerConfig,
  signal: AbortSignal,
) {
  if (!/^[0-9a-f-]{36}$/i.test(crawlRunId)) throw new Error("Invalid crawl run ID.");
  const root = path.resolve(config.workDir);
  const runDir = path.resolve(root, crawlRunId);
  if (!runDir.startsWith(`${root}${path.sep}`)) throw new Error("Unsafe SiteOne work path.");
  await mkdir(runDir, { recursive: true, mode: 0o700 });
  const reportPath = path.join(runDir, "siteone-report.json");
  const stdoutPath = path.join(runDir, "siteone-stdout.log");
  const stderrPath = path.join(runDir, "siteone-stderr.log");
  const args = buildSiteOneArgs(url, reportPath, config);
  const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(config.binaryPath, args, { shell: false, cwd: runDir, env: { ...process.env, PATH: process.env.PATH || "/usr/bin:/bin", HOME: runDir, LANG: "C.UTF-8" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let killed = false;
    const append = (target: "stdout" | "stderr", chunk: Buffer) => {
      const value = chunk.toString("utf8");
      if (target === "stdout" && stdout.length < MAX_LOG_BYTES) stdout += value.slice(0, MAX_LOG_BYTES - stdout.length);
      if (target === "stderr" && stderr.length < MAX_LOG_BYTES) stderr += value.slice(0, MAX_LOG_BYTES - stderr.length);
    };
    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk)); child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    const terminate = () => { if (killed) return; killed = true; child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 5_000).unref(); };
    const timer = setTimeout(terminate, config.processTimeoutMs); const abort = () => terminate(); signal.addEventListener("abort", abort, { once: true });
    child.once("error", reject);
    child.once("exit", (code: number | null) => { clearTimeout(timer); signal.removeEventListener("abort", abort); resolve({ code: code ?? 1, stdout, stderr }); });
  });
  await Promise.all([writeFile(stdoutPath, result.stdout, { mode: 0o600 }), writeFile(stderrPath, result.stderr, { mode: 0o600 })]);
  if (signal.aborted) throw new Error("SiteOne crawl was cancelled.");
  if (result.code !== 0) throw new Error(`SiteOne exited with code ${result.code}.`);
  const report = await readFile(reportPath);
  if (report.byteLength > MAX_REPORT_BYTES) throw new Error("SiteOne report exceeded the import limit.");
  return { report: JSON.parse(report.toString("utf8")) as unknown, runDir };
}

export async function removeSuccessfulRun(runDir: string, configuredRoot: string) {
  const root = path.resolve(configuredRoot); const target = path.resolve(runDir);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Refusing unsafe cleanup path.");
  await rm(target, { recursive: true, force: true });
}
