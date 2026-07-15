import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opportunity, OpportunityStatus } from "@/lib/types";
import { opportunityStatusSchema } from "@/lib/validation/opportunities";
import { replaceProjectRows } from "@/lib/data/rows";
export async function replaceOpportunities(client:SupabaseClient,projectId:string,items:Opportunity[]){await replaceProjectRows(client,"opportunities",projectId,items.map(item=>({id:isUuid(item.id)?item.id:undefined,project_id:projectId,title:item.title,description:item.description,category:item.category,impact:item.impact,effort:item.effort,confidence:item.confidence,status:opportunityStatusSchema.parse(item.status).toLowerCase().replaceAll(" ","_"),source:item.source,requires_real_data:item.requiresRealData,metadata:{why:item.why},discovered_at:item.createdAt})))}
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function updateOpportunityStatus(items:Opportunity[],id:string,status:OpportunityStatus){const valid=opportunityStatusSchema.parse(status);return items.map(item=>item.id===id?{...item,status:valid}:item)}
