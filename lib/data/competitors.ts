import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competitor } from "@/lib/types";
import { replaceProjectRows } from "@/lib/data/rows";
export async function replaceCompetitors(client:SupabaseClient,projectId:string,items:Competitor[]){await replaceProjectRows(client,"competitors",projectId,items.map(item=>({id:item.id,project_id:projectId,name:item.name,domain:item.domain,url:item.url,notes:item.notes||null,status:"confirmed",source:item.source,confirmed_at:item.createdAt})))}
