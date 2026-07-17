import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config/env";

export async function getOptionalUser(){
  if(isDemoMode())return null;
  const supabase=await createClient();if(!supabase)return null;
  const {data,error}=await supabase.auth.getClaims();
  if(error||!data?.claims?.sub)return null;
  return {id:String(data.claims.sub),email:typeof data.claims.email==="string"?data.claims.email:null,claims:data.claims};
}

export async function requireUser(next="/app"){
  const user=await getOptionalUser();
  if(!user)redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function getCurrentProject(){
  const user=await getOptionalUser();if(!user)return null;
  const supabase=await createClient();if(!supabase)return null;
  const {data}=await supabase.from("projects").select("id,workspace_id,name,slug,status,is_primary,onboarding_status,onboarding_step,onboarding_completed_at").eq("status","active").order("is_primary",{ascending:false}).order("created_at",{ascending:true}).limit(1).maybeSingle();
  return data;
}

export async function requireCurrentProject(){
  await requireUser("/app");const project=await getCurrentProject();
  if(!project||project.onboarding_status!=="completed")redirect("/onboarding");
  return project;
}

export async function getUserAppDestination(){
  const user=await getOptionalUser();if(!user)return null;
  const project=await getCurrentProject();
  return project?.onboarding_status==="completed"?"/app":"/onboarding";
}
