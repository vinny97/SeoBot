import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeoJob } from "@/lib/types";
import { replaceProjectRows } from "@/lib/data/rows";
export async function replaceJobs(client:SupabaseClient,projectId:string,jobs:SeoJob[]){await replaceProjectRows(client,"seo_jobs",projectId,jobs.map(job=>({project_id:projectId,job_type:job.type,title:job.title,status:job.status.toLowerCase().replaceAll(" ","_"),priority:job.priority,input_payload:{...job.input,description:job.description},output_payload:job.output,progress:job.progress??null,attempt_count:job.attemptCount,error_message:job.error||null,scheduled_for:job.scheduledAt||null,started_at:job.startedAt||null,completed_at:job.completedAt||null})))}
