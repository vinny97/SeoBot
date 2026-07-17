import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrawlCounters } from "../crawler/crawl-result.js";
export async function heartbeatJob(client:SupabaseClient,jobId:string,workerId:string,counters:CrawlCounters,currentUrl:string|null,lockMinutes:number){const {data,error}=await client.rpc("heartbeat_crawl_job",{target_job_id:jobId,claiming_worker_id:workerId,counters,active_url:currentUrl,lock_minutes:lockMinutes});if(error)throw error;return Boolean(data)}
