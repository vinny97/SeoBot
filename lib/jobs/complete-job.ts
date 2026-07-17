import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrawlCounters } from "../crawler/crawl-result.js";
export async function completeJob(client:SupabaseClient,jobId:string,workerId:string,status:"completed"|"completed_with_warnings"|"cancelled",counters:CrawlCounters){const {data,error}=await client.rpc("complete_crawl_job",{target_job_id:jobId,claiming_worker_id:workerId,final_status:status,counters});if(error)throw error;return Boolean(data)}
export async function failJob(client:SupabaseClient,jobId:string,workerId:string,message:string,retryable:boolean){const {data,error}=await client.rpc("fail_crawl_job",{target_job_id:jobId,claiming_worker_id:workerId,safe_error:message,retryable});if(error)throw error;return String(data)}
