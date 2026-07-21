import { createClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../lib/config/worker-env.js";
import { claimJob, requeueStaleJobs } from "../lib/jobs/claim-job.js";
import { completeJob, failJob } from "../lib/jobs/complete-job.js";
import { crawlWebsite } from "../lib/crawler/crawler.js";
import { CrawlError, safeErrorMessage } from "../lib/crawler/errors.js";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function runWorker(
  config: WorkerConfig,
  workerId: string,
  signal: AbortSignal,
) {
  const client = createClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.secretKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await client.from("worker_heartbeats").upsert(
    {
      worker_id: workerId,
      worker_type: "crawler",
      status: "starting",
      last_heartbeat_at: new Date().toISOString(),
      capabilities: ["native_crawler"],
      runtime: "render",
    },
    { onConflict: "worker_id" },
  );
  while (!signal.aborted) {
    try {
      await requeueStaleJobs(client);
      const job = await claimJob(
        client,
        workerId,
        config.CRAWLER_JOB_LOCK_MINUTES,
      );
      if (!job) {
        await client.from("worker_heartbeats").upsert(
          {
            worker_id: workerId,
            worker_type: "crawler",
            status: "idle",
            current_job_id: null,
            last_heartbeat_at: new Date().toISOString(),
            capabilities: ["native_crawler"],
            runtime: "render",
          },
          { onConflict: "worker_id" },
        );
        await sleep(config.CRAWLER_WORKER_POLL_MS);
        continue;
      }
      const jobController = new AbortController();
      const abort = () => jobController.abort();
      signal.addEventListener("abort", abort, { once: true });
      try {
        const result = await crawlWebsite(
          client,
          job,
          workerId,
          config,
          jobController.signal,
        );
        await completeJob(
          client,
          job.job_id,
          workerId,
          result.status,
          result.counters,
        );
      } catch (error) {
        if (
          error instanceof CrawlError &&
          error.kind === "cancelled" &&
          !signal.aborted
        ) {
          await completeJob(client, job.job_id, workerId, "cancelled", {
            pages_discovered: 0,
            pages_queued: 0,
            pages_fetched: 0,
            pages_succeeded: 0,
            pages_failed: 0,
            pages_skipped: 0,
            issues_found: 0,
            progress: 0,
          });
        } else {
          const retryable =
            signal.aborted ||
            (error instanceof CrawlError ? error.retryable : true);
          await failJob(
            client,
            job.job_id,
            workerId,
            safeErrorMessage(error),
            retryable,
          );
        }
      } finally {
        signal.removeEventListener("abort", abort);
      }
    } catch (error) {
      console.error("Crawler worker loop error:", safeErrorMessage(error));
      await sleep(config.CRAWLER_WORKER_POLL_MS);
    }
  }
  await client.from("worker_heartbeats").upsert(
    {
      worker_id: workerId,
      worker_type: "crawler",
      status: "offline",
      current_job_id: null,
      last_heartbeat_at: new Date().toISOString(),
      capabilities: ["native_crawler"],
      runtime: "render",
    },
    { onConflict: "worker_id" },
  );
}
