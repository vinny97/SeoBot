import { createClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/server";
import type { OnboardingData, CompetitorInput } from "@/lib/onboarding/types";
import { defaultOnboardingData } from "@/lib/onboarding/types";
import type { WorkStatus } from "@/lib/mock/dashboard";

export type ProjectSnapshot = {
  user:{id:string;email:string|null;fullName:string|null;avatarUrl:string|null};
  project:{id:string;workspaceId:string;name:string;slug:string;onboardingStatus:string;onboardingStep:number};
  onboarding:OnboardingData;
  activities:Array<{id:string;title:string;description:string;status:WorkStatus;type:string;when:string}>;
  jobs:Array<{id:string;title:string;description:string;status:WorkStatus;progress:number|undefined;timing:string;jobType:string}>;
  opportunities:Array<{id:string;title:string;description:string;category:string;impact:string;effort:string;confidence:string;status:string;source:string;requiresRealData:boolean;why:string}>;
  topics:Array<{id:string;topic:string;intent:string;relevance:string;status:string;source:string}>;
  content:Array<{id:string;title:string;contentType:string;purpose:string;customer:string;status:string;source:string}>;
  approvals:Array<{id:string;status:string}>;
};

const titleCase=(value:string)=>value.split("_").map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
const workStatus=(value:string):WorkStatus=>value==="completed"?"Completed":value==="running"||value==="in_progress"?"In progress":value.includes("waiting")||value==="queued"?"Waiting":"Needs attention";

export async function getProjectSnapshot():Promise<ProjectSnapshot|null>{
  const user=await getOptionalUser();if(!user)return null;const supabase=await createClient();if(!supabase)return null;
  const {data:project}=await supabase.from("projects").select("id,workspace_id,name,slug,onboarding_status,onboarding_step").eq("status","active").order("is_primary",{ascending:false}).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(!project)return null;
  const [profileResult,websiteResult,businessResult,goalsResult,settingsResult,competitorsResult,progressResult,activitiesResult,jobsResult,opportunitiesResult,topicsResult,contentResult,approvalsResult]=await Promise.all([
    supabase.from("profiles").select("full_name,avatar_url").eq("id",user.id).maybeSingle(),
    supabase.from("websites").select("url,domain,display_name").eq("project_id",project.id).eq("is_primary",true).maybeSingle(),
    supabase.from("business_profiles").select("*").eq("project_id",project.id).maybeSingle(),
    supabase.from("project_goals").select("goal_type,priority").eq("project_id",project.id).order("priority"),
    supabase.from("project_settings").select("approval_mode").eq("project_id",project.id).maybeSingle(),
    supabase.from("competitors").select("id,name,domain,url,notes,status,source,created_at").eq("project_id",project.id).eq("status","confirmed").order("created_at"),
    supabase.from("onboarding_progress").select("current_step,draft_data,completed").eq("project_id",project.id).maybeSingle(),
    supabase.from("activities").select("id,title,description,status,activity_type,created_at").eq("project_id",project.id).order("created_at",{ascending:false}).limit(50),
    supabase.from("seo_jobs").select("id,job_type,status,progress,scheduled_for,started_at").eq("project_id",project.id).order("priority",{ascending:false}),
    supabase.from("opportunities").select("id,title,description,category,impact,effort,confidence,status,source,requires_real_data,metadata").eq("project_id",project.id).order("created_at"),
    supabase.from("keyword_topics").select("id,topic,intent,relevance,status,source").eq("project_id",project.id).order("created_at"),
    supabase.from("content_items").select("id,title,content_type,purpose,target_customer,status,source").eq("project_id",project.id).order("created_at"),
    supabase.from("approval_requests").select("id,status").eq("project_id",project.id).eq("status","pending"),
  ]);
  const draft=(progressResult.data?.draft_data&&typeof progressResult.data.draft_data==="object"&&!Array.isArray(progressResult.data.draft_data)?progressResult.data.draft_data:{}) as Partial<OnboardingData>;
  const business=businessResult.data;const website=websiteResult.data;const settings=settingsResult.data;
  const competitors:CompetitorInput[]=(competitorsResult.data||[]).map(item=>({id:item.id,name:item.name,websiteUrl:item.url||"",note:item.notes||"",addedAt:item.created_at}));
  const onboarding:OnboardingData={...defaultOnboardingData,...draft,websiteUrl:website?.url||draft.websiteUrl||"",businessName:business?.business_name||draft.businessName||project.name,location:business?.main_location||draft.location||"",businessDescription:business?.description||draft.businessDescription||"",industry:business?.industry||draft.industry||"",services:business?.products_services||draft.services||[],targetCustomer:business?.target_customers||draft.targetCustomer||"",audienceScope:business?.audience_scope||draft.audienceScope||"national",primaryConversion:business?.primary_conversion||draft.primaryConversion||"Request a quote",brandTone:(business?.brand_tone||draft.brandTone||"Professional") as OnboardingData["brandTone"],selectedGoals:(goalsResult.data||[]).map(goal=>goal.goal_type),approvalPreference:settings?.approval_mode==="autonomous_within_rules"?"agreed_rules":(settings?.approval_mode as OnboardingData["approvalPreference"]||draft.approvalPreference||"review_important"),competitors,currentStep:Math.max(0,(progressResult.data?.current_step||project.onboarding_step)-1),completed:progressResult.data?.completed||project.onboarding_status==="completed"};
  return {
    user:{id:user.id,email:user.email,fullName:profileResult.data?.full_name||null,avatarUrl:profileResult.data?.avatar_url||null},
    project:{id:project.id,workspaceId:project.workspace_id,name:project.name,slug:project.slug,onboardingStatus:project.onboarding_status,onboardingStep:project.onboarding_step},onboarding,
    activities:(activitiesResult.data||[]).map(item=>({id:item.id,title:item.title,description:item.description||"",status:workStatus(item.status),type:titleCase(item.activity_type),when:new Date(item.created_at).toLocaleDateString()})),
    jobs:(jobsResult.data||[]).map(item=>({id:item.id,title:titleCase(item.job_type),description:`Initial ${titleCase(item.job_type).toLowerCase()} task based on confirmed onboarding context.`,status:workStatus(item.status),progress:item.progress??undefined,timing:item.started_at?"Started recently":item.scheduled_for?"Scheduled":"Planned next",jobType:item.job_type})),
    opportunities:(opportunitiesResult.data||[]).map(item=>({id:item.id,title:item.title,description:item.description,category:titleCase(item.category),impact:titleCase(item.impact),effort:titleCase(item.effort),confidence:titleCase(item.confidence),status:titleCase(item.status),source:item.source==="onboarding_seed"?"Onboarding plan":"User added",requiresRealData:item.requires_real_data,why:typeof item.metadata==="object"&&item.metadata&&!Array.isArray(item.metadata)&&typeof item.metadata.why==="string"?item.metadata.why:item.description})),
    topics:(topicsResult.data||[]).map(item=>({id:item.id,topic:item.topic,intent:titleCase(item.intent||"unknown"),relevance:titleCase(item.relevance||"to_confirm"),status:titleCase(item.status),source:item.source})),
    content:(contentResult.data||[]).map(item=>({id:item.id,title:item.title,contentType:titleCase(item.content_type),purpose:item.purpose||"Initial content hypothesis.",customer:item.target_customer||"Priority customers",status:titleCase(item.status),source:item.source==="onboarding_seed"?"Onboarding plan":"User added"})),approvals:approvalsResult.data||[],
  };
}
