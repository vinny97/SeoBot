import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types.js";
import type { ClaimedCrawlJob } from "./types.js";
import type { NormalisedIssueObservation, NormalisedProviderPage, ProviderObservationSink } from "../crawler/providers/types.js";

type Client = SupabaseClient<Database>;
const asJson = (value: unknown) => value as Json;

async function call<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

export const registerSiteOneWorker = (client: Client, token: string, workerId: string, version: string) =>
  call<boolean>(client.rpc("register_siteone_worker", { worker_token: token, claiming_worker_id: workerId, siteone_version: version, worker_runtime: "raspberry_pi" }));
export const claimSiteOneJob = (client: Client, token: string, workerId: string, lockMinutes: number) =>
  call<ClaimedCrawlJob | null>(client.rpc("claim_next_siteone_job", { worker_token: token, claiming_worker_id: workerId, lock_minutes: lockMinutes }));
export const completeSiteOneJob = (client: Client, token: string, workerId: string, jobId: string, status: string, reason: string, version: string, metadata: Record<string, unknown>) =>
  call<boolean>(client.rpc("complete_siteone_job", { worker_token: token, claiming_worker_id: workerId, target_job_id: jobId, final_status: status, reason, siteone_version: version, metadata: asJson(metadata) }));
export const failSiteOneJob = (client: Client, token: string, workerId: string, jobId: string, message: string, retryable: boolean) =>
  call<string>(client.rpc("fail_siteone_job", { worker_token: token, claiming_worker_id: workerId, target_job_id: jobId, safe_error: message.slice(0,1000), retryable }));

export function createSiteOneRpcSink(client: Client, token: string, workerId: string, jobId: string, lockMinutes: number): ProviderObservationSink {
  const importBatch = (pages: NormalisedProviderPage[], issues: NormalisedIssueObservation[]) => call(client.rpc("import_siteone_batch", { worker_token: token, claiming_worker_id: workerId, target_job_id: jobId, page_batch: asJson(pages), issue_batch: asJson(issues.map((issue) => ({ fingerprint: issue.fingerprint, issue_type: issue.issueType, severity: issue.severity, title: issue.title, description: issue.description, recommendation: issue.recommendation, evidence: issue.evidence }))) }));
  return {
    pages: (pages) => importBatch(pages, []).then(() => undefined),
    issues: (issues) => importBatch([], issues).then(() => undefined),
    phase: (phase, counters = {}) => call(client.rpc("heartbeat_siteone_job", { worker_token: token, claiming_worker_id: workerId, target_job_id: jobId, phase, counters: asJson(counters), lock_minutes: lockMinutes })).then(() => undefined),
  };
}
