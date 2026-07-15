import type { SupabaseClient } from "@supabase/supabase-js";
import { blankProject } from "@/lib/demo/seed";
import type { ActivityItem, Competitor, Opportunity, ProjectState, SeoJob } from "@/lib/types";

// This repository is the only place the UI's project state is mapped to relational tables.
// Demo mode intentionally bypasses it and stores demonstration data in the browser.
export async function loadProject(client:SupabaseClient):Promise<ProjectState|null>{
  const {data:{user}}=await client.auth.getUser();if(!user)return null;
  const {data:membership}=await client.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)return null;
  const {data:project}=await client.from("projects").select("*").eq("workspace_id",membership.workspace_id).order("created_at").limit(1).maybeSingle();if(!project)return null;
  const [websiteRes,businessRes,goalsRes,competitorsRes,opportunitiesRes,jobsRes,activitiesRes]=await Promise.all([
    client.from("websites").select("*").eq("project_id",project.id).limit(1).maybeSingle(),
    client.from("business_profiles").select("*").eq("project_id",project.id).maybeSingle(),
    client.from("project_goals").select("*").eq("project_id",project.id).order("priority"),
    client.from("competitors").select("*").eq("project_id",project.id).order("created_at"),
    client.from("opportunities").select("*").eq("project_id",project.id).order("discovered_at"),
    client.from("seo_jobs").select("*").eq("project_id",project.id).order("priority"),
    client.from("activities").select("*").eq("project_id",project.id).order("created_at",{ascending:false}),
  ]);
  const w=websiteRes.data;const b=businessRes.data;
  return {...blankProject,
    onboardingStep:project.onboarding_step||1,onboardingCompleted:project.onboarding_status==="completed",
    website:{url:w?.normalised_url||"",domain:w?.domain||"",displayName:w?.display_name||project.name},
    metadata:{title:w?.title||undefined,description:w?.meta_description||undefined,favicon:w?.favicon_url||undefined,headings:[],sitemap:w?.sitemap_status||"unknown",robots:w?.robots_txt_status||"unknown",analysedAt:w?.last_analysed_at||undefined,status:w?.analysis_status||"idle",error:w?.analysis_error||undefined,source:w?.last_analysed_at?"website":"manual"},
    business:{name:b?.business_name||project.name,description:b?.description||"",industry:b?.industry||"",services:(b?.products_services||[]).join(", "),customer:b?.target_customers||"",locations:(b?.locations||[]).join(", "),model:b?.business_model||"Service business",tone:b?.tone||"Clear and helpful",conversion:b?.primary_conversion||"Contact the business",audience:b?.audience_scope||"national"},
    goals:(goalsRes.data||[]).map((g:any)=>g.goal_type),approvalPreference:project.approval_preference||"review_important",
    competitors:(competitorsRes.data||[]).map((c:any):Competitor=>({id:c.id,name:c.name,url:c.url,domain:c.domain,notes:c.notes||undefined,source:c.source,confirmed:c.status==="confirmed",createdAt:c.created_at})),
    opportunities:(opportunitiesRes.data||[]).map((o:any):Opportunity=>({id:o.id,title:o.title,description:o.description,category:o.category,impact:o.impact,effort:o.effort,confidence:o.confidence,status:titleStatus(o.status),source:o.source,requiresRealData:o.requires_real_data,why:o.metadata?.why||o.description,createdAt:o.discovered_at})),
    jobs:(jobsRes.data||[]).map((j:any):SeoJob=>({id:j.id,title:j.title,description:j.input_payload?.description||j.title,type:j.job_type,status:jobTitle(j.status),priority:j.priority,progress:j.progress??undefined,scheduledAt:j.scheduled_at||undefined,startedAt:j.started_at||undefined,completedAt:j.completed_at||undefined,input:j.input_payload||{},output:j.output_payload||{},attemptCount:j.attempt_count,error:j.error_message||undefined})),
    activities:(activitiesRes.data||[]).map((a:any):ActivityItem=>({id:a.id,title:a.title,description:a.description||"",type:a.activity_type,status:a.status,timestamp:a.created_at})),updatedAt:project.updated_at,
  } as ProjectState;
}

export async function saveProject(client:SupabaseClient,state:ProjectState){
  if(!state.website.domain)return;
  const {data:{user}}=await client.auth.getUser();if(!user)return;
  await client.from("profiles").upsert({id:user.id,full_name:user.user_metadata?.full_name||null,avatar_url:user.user_metadata?.avatar_url||null,updated_at:new Date().toISOString()});
  let {data:membership}=await client.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership){const {data:workspace,error}=await client.from("workspaces").insert({name:`${state.business.name||state.website.displayName} workspace`,created_by:user.id}).select("id").single();if(error)throw error;await client.from("workspace_members").insert({workspace_id:workspace.id,user_id:user.id,role:"owner"});membership={workspace_id:workspace.id};}
  let {data:project}=await client.from("projects").select("id").eq("workspace_id",membership.workspace_id).limit(1).maybeSingle();
  const projectValues={workspace_id:membership.workspace_id,name:state.business.name||state.website.displayName,slug:slug(state.website.domain),status:"active",onboarding_status:state.onboardingCompleted?"completed":"in_progress",onboarding_step:state.onboardingStep,onboarding_completed_at:state.onboardingCompleted?new Date().toISOString():null,approval_preference:state.approvalPreference,updated_at:new Date().toISOString()};
  if(!project){const created=await client.from("projects").insert(projectValues).select("id").single();if(created.error)throw created.error;project=created.data}else await client.from("projects").update(projectValues).eq("id",project.id);
  const pid=project.id;
  const {data:existingWebsite}=await client.from("websites").select("id").eq("project_id",pid).limit(1).maybeSingle();
  const websiteValues={project_id:pid,url:state.website.url,normalised_url:state.website.url,domain:state.website.domain,display_name:state.website.displayName,favicon_url:state.metadata.favicon||null,title:state.metadata.title||null,meta_description:state.metadata.description||null,robots_txt_status:state.metadata.robots,sitemap_status:state.metadata.sitemap,last_analysed_at:state.metadata.analysedAt||null,analysis_status:state.metadata.status,analysis_error:state.metadata.error||null,updated_at:new Date().toISOString()};
  if(existingWebsite)await client.from("websites").update(websiteValues).eq("id",existingWebsite.id);else await client.from("websites").insert(websiteValues);
  await client.from("business_profiles").upsert({project_id:pid,business_name:state.business.name,description:state.business.description,industry:state.business.industry,products_services:split(state.business.services),target_customers:state.business.customer,locations:split(state.business.locations),business_model:state.business.model,tone:state.business.tone,primary_conversion:state.business.conversion,audience_scope:state.business.audience,updated_at:new Date().toISOString()},{onConflict:"project_id"});
  await replace(client,"project_goals",pid,state.goals.map((g,i)=>({project_id:pid,goal_type:g,priority:i+1})));
  await replace(client,"competitors",pid,state.competitors.map(c=>({id:isUuid(c.id)?c.id:undefined,project_id:pid,name:c.name,domain:c.domain,url:c.url,notes:c.notes||null,status:"confirmed",source:c.source,confirmed_at:c.createdAt})));
  await replace(client,"opportunities",pid,state.opportunities.map(o=>({id:isUuid(o.id)?o.id:undefined,project_id:pid,title:o.title,description:o.description,category:o.category,impact:o.impact,effort:o.effort,confidence:o.confidence,status:o.status.toLowerCase().replaceAll(" ","_"),source:o.source,requires_real_data:o.requiresRealData,metadata:{why:o.why},discovered_at:o.createdAt})));
  if(state.onboardingCompleted){await replace(client,"seo_jobs",pid,state.jobs.map(j=>({id:isUuid(j.id)?j.id:undefined,project_id:pid,job_type:j.type,title:j.title,status:j.status.toLowerCase().replaceAll(" ","_"),priority:j.priority,input_payload:{...j.input,description:j.description},output_payload:j.output,progress:j.progress||null,attempt_count:j.attemptCount,error_message:j.error||null,scheduled_at:j.scheduledAt||null,started_at:j.startedAt||null,completed_at:j.completedAt||null})));await replace(client,"activities",pid,state.activities.map(a=>({id:isUuid(a.id)?a.id:undefined,project_id:pid,title:a.title,description:a.description,activity_type:a.type,status:a.status,created_at:a.timestamp})));}
}
async function replace(client:SupabaseClient,table:string,projectId:string,rows:Record<string,unknown>[]){const removed=await client.from(table).delete().eq("project_id",projectId);if(removed.error)throw removed.error;if(rows.length){const clean=rows.map(r=>Object.fromEntries(Object.entries(r).filter(([,v])=>v!==undefined)));const inserted=await client.from(table).insert(clean);if(inserted.error)throw inserted.error;}}
const split=(v:string)=>v.split(",").map(x=>x.trim()).filter(Boolean);const slug=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60)||"project";const isUuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function titleStatus(v:string){return v.split("_").map((x:string)=>x[0]?.toUpperCase()+x.slice(1)).join(" ") as Opportunity["status"]}function jobTitle(v:string){return v.split("_").map((x:string)=>x[0]?.toUpperCase()+x.slice(1)).join(" ") as SeoJob["status"]}
