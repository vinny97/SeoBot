import { NextResponse } from "next/server";
import { getOptionalUser,getCurrentProject } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGscServerEnv } from "@/lib/config/gsc-env";
import { buildGscAuthorizationUrl,createGscOAuthProof } from "@/lib/gsc/oauth";

export async function GET(){const [user,project]=await Promise.all([getOptionalUser(),getCurrentProject()]);if(!user||!project)return NextResponse.json({error:"Authentication required."},{status:401});const admin=createAdminClient();const {data:website}=await admin.from("websites").select("id").eq("project_id",project.id).eq("is_primary",true).single();if(!website)return NextResponse.json({error:"A project website is required."},{status:400});const env=requireGscServerEnv();const proof=createGscOAuthProof();const {error}=await admin.from("gsc_oauth_sessions").insert({workspace_id:project.workspace_id,project_id:project.id,website_id:website.id,user_id:user.id,state_hash:proof.stateHash,code_verifier:proof.verifier,expires_at:new Date(Date.now()+10*60*1000).toISOString()});if(error)return NextResponse.json({error:"The secure Google connection could not be started."},{status:500});return NextResponse.redirect(buildGscAuthorizationUrl(env,proof))}
