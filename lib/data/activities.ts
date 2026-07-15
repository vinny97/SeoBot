import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityItem } from "@/lib/types";
import { replaceProjectRows } from "@/lib/data/rows";
export async function replaceActivities(client:SupabaseClient,projectId:string,activities:ActivityItem[]){await replaceProjectRows(client,"activities",projectId,activities.map(item=>({project_id:projectId,title:item.title,description:item.description,activity_type:item.type,status:item.status,created_at:item.timestamp})))}
