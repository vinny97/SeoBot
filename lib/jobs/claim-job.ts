import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClaimedCrawlJob } from "./types.js";
export async function claimJob(client:SupabaseClient,workerId:string,lockMinutes:number){const {data,error}=await client.rpc("claim_next_crawl_job",{claiming_worker_id:workerId,lock_minutes:lockMinutes});if(error)throw error;return data as ClaimedCrawlJob|null}
export async function requeueStaleJobs(client:SupabaseClient){const {error}=await client.rpc("requeue_stale_crawl_jobs");if(error)throw error}
