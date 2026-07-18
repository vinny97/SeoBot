import { createClient } from "@supabase/supabase-js";
import { loadSiteOneWorkerConfig } from "../lib/config/siteone-worker-env.js";
import { resolvePublicAddresses } from "../lib/crawler/dns-security.js";
import { normaliseCrawlUrl } from "../lib/crawler/url-normalisation.js";
import { SiteOneProvider } from "../lib/crawler/providers/siteone/provider.js";
import { inspectSiteOne } from "../lib/crawler/providers/siteone/runner.js";
import { claimSiteOneJob, completeSiteOneJob, createSiteOneRpcSink, failSiteOneJob, registerSiteOneWorker } from "../lib/jobs/siteone-rpc.js";
import type { Database } from "../lib/supabase/database.types.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const controller = new AbortController();
let stopping = false;
const stop = () => { if (!stopping) { stopping = true; controller.abort(); } };
process.once("SIGTERM", stop); process.once("SIGINT", stop);

try {
  const config = loadSiteOneWorkerConfig();
  const version = await inspectSiteOne(config.SITEONE_BINARY_PATH);
  const client = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const provider = new SiteOneProvider({ binaryPath: config.SITEONE_BINARY_PATH, workDir: config.SITEONE_WORK_DIR, maxPages: config.SITEONE_MAX_PAGES, maxDepth: config.SITEONE_MAX_DEPTH, processTimeoutMs: config.SITEONE_PROCESS_TIMEOUT_MINUTES * 60_000 });
  await registerSiteOneWorker(client, config.SITEONE_WORKER_TOKEN, config.WORKER_ID, version);
  console.info(`SiteOne worker started with SiteOne ${version}.`);
  while (!controller.signal.aborted) {
    const job = await claimSiteOneJob(client, config.SITEONE_WORKER_TOKEN, config.WORKER_ID, config.CRAWLER_JOB_LOCK_MINUTES);
    if (!job) { await sleep(config.CRAWLER_WORKER_POLL_MS); continue; }
    try {
      if (!config.allowedProjects.has(job.project_id)) throw new Error("Project is not allowlisted by this worker.");
      const startUrl = normaliseCrawlUrl(job.url);
      await resolvePublicAddresses(new URL(startUrl).hostname);
      const sink = createSiteOneRpcSink(client, config.SITEONE_WORKER_TOKEN, config.WORKER_ID, job.job_id, config.CRAWLER_JOB_LOCK_MINUTES);
      const result = await provider.execute({ jobId: job.job_id, crawlRunId: job.crawl_run_id, projectId: job.project_id, websiteId: job.website_id, startUrl, maxPages: Math.min(job.max_pages,config.SITEONE_MAX_PAGES), maxDepth: Math.min(job.max_depth,config.SITEONE_MAX_DEPTH), signal: controller.signal, sink });
      await completeSiteOneJob(client, config.SITEONE_WORKER_TOKEN, config.WORKER_ID, job.job_id, result.status, result.reason, result.providerVersion, result.metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SiteOne crawl failed.";
      await failSiteOneJob(client, config.SITEONE_WORKER_TOKEN, config.WORKER_ID, job.job_id, message, !/not allowlisted|private|credentials|invalid/i.test(message));
    }
  }
  console.info("SiteOne worker stopped.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "SiteOne worker failed during startup.");
  process.exitCode = 1;
}
