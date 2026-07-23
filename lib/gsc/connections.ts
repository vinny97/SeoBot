import "server-only";
import { randomUUID } from "node:crypto";
import { getCurrentProject, getOptionalUser } from "@/lib/auth/server";
import { requireGscServerEnv } from "@/lib/config/gsc-env";
import { createGscOAuthProof, hashState, verifyState } from "@/lib/gsc/oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptCredentialJson } from "@/lib/publishing/credentials";
import { exchangeGscAuthorizationCode, googleAuthorizationUrl, listDirectGscProperties } from "@/lib/gsc/direct-client";

export class GscConnectionError extends Error { constructor(public code:string,message:string,public status=400){super(message)} }
const sessionIdFromState=(state:string)=>state.split(".",1)[0]||null;

export async function beginGscConnection(){
  const [user,project]=await Promise.all([getOptionalUser(),getCurrentProject()]);
  if(!user||!project)throw new GscConnectionError("authentication_required","Authentication required.",401);
  const env=requireGscServerEnv();const admin=createAdminClient();
  const {data:website}=await admin.from("websites").select("id").eq("project_id",project.id).eq("is_primary",true).maybeSingle();
  if(!website)throw new GscConnectionError("website_required","A project website is required.");
  const {data:existing}=await admin.from("gsc_connections").select("id").eq("website_id",website.id).maybeSingle();
  const connectionId=existing?.id||randomUUID(), sessionId=randomUUID(), proof=createGscOAuthProof(), state=`${sessionId}.${proof.state}`;
  const {error:sessionError}=await admin.from("gsc_oauth_sessions").insert({id:sessionId,workspace_id:project.workspace_id,project_id:project.id,website_id:website.id,user_id:user.id,connection_id:connectionId,state_hash:hashState(state),code_verifier:proof.codeVerifier,expires_at:new Date(Date.now()+30*60*1000).toISOString()});
  if(sessionError)throw new GscConnectionError("connection_create_failed","The secure Search Console connection could not be started.",500);
  const {error:connectionError}=await admin.from("gsc_connections").upsert({id:connectionId,workspace_id:project.workspace_id,project_id:project.id,website_id:website.id,user_id:user.id,connection_method:"direct_oauth",encrypted_refresh_token:null,credential_version:1,granted_scopes:["https://www.googleapis.com/auth/webmasters.readonly"],status:"pending",last_error_code:null,last_error_message:null,disconnected_at:null},{onConflict:"website_id"});
  if(connectionError){await admin.from("gsc_oauth_sessions").delete().eq("id",sessionId);throw new GscConnectionError("connection_create_failed","The secure Search Console connection could not be started.",500)}
  return googleAuthorizationUrl(env,{state,codeChallenge:proof.codeChallenge});
}

export async function completeGscCallback(input:{state:string;code:string|null}){
  const user=await getOptionalUser();if(!user)throw new GscConnectionError("authentication_required","Authentication required.",401);
  const env=requireGscServerEnv(),admin=createAdminClient(),sessionId=sessionIdFromState(input.state);
  const {data:session}=await admin.from("gsc_oauth_sessions").select("*").eq("id",sessionId).eq("user_id",user.id).is("consumed_at",null).maybeSingle();
  if(!session||new Date(session.expires_at)<new Date()||!verifyState(input.state,session.state_hash))throw new GscConnectionError("invalid_or_expired_state","This Search Console connection link is invalid or expired.",403);
  if(!input.code)throw new GscConnectionError("authorization_cancelled","Google Search Console authorization did not complete.");
  try {const exchanged=await exchangeGscAuthorizationCode(env,{code:input.code,codeVerifier:session.code_verifier});const properties=await listDirectGscProperties(exchanged.accessToken);const {error}=await admin.from("gsc_connections").update({connection_method:"direct_oauth",composio_user_id:null,composio_connected_account_id:null,composio_auth_config_id:null,encrypted_refresh_token:encryptCredentialJson(exchanged.refreshToken,env.GSC_TOKEN_ENCRYPTION_KEY,`gsc:${session.connection_id}`),credential_version:1,granted_scopes:["https://www.googleapis.com/auth/webmasters.readonly"],status:"pending",last_error_code:null,last_error_message:null,disconnected_at:null}).eq("id",session.connection_id);if(error)throw error;await admin.from("gsc_oauth_sessions").update({available_properties:properties}).eq("id",session.id);return{sessionId:session.id};
  } catch(error) {const code=error instanceof Error&&"code" in error?String((error as {code:unknown}).code):"property_list_failed";await admin.from("gsc_connections").update({status:code==="google_reauthentication_required"?"needs_reauthentication":"error",last_error_code:code,last_error_message:"Search Console could not load verified properties."}).eq("id",session.connection_id);throw error}
}

export async function disconnectGscConnection(projectId:string){const admin=createAdminClient();const {data:connection}=await admin.from("gsc_connections").select("id").eq("project_id",projectId).maybeSingle();if(!connection)return;const {error}=await admin.from("gsc_connections").update({status:"disconnected",encrypted_refresh_token:null,composio_connected_account_id:null,disconnected_at:new Date().toISOString(),last_error_code:null,last_error_message:null}).eq("id",connection.id).eq("project_id",projectId);if(error)throw error}
