import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentProject, getOptionalUser } from "@/lib/auth/server";
import { requireNextJsPublishingServerEnv } from "@/lib/config/publishing-env";
import { createPublishingAdminClient } from "@/lib/supabase/admin";
import { decryptCredentialJson, encryptCredentialJson, encryptionKeyId, type EncryptedCredentialEnvelope } from "@/lib/publishing/credentials";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import type { PublishingConnectionStatus, SafePublishingConnection, TestConnectionResult } from "@/lib/publishing/types";
import { checkNextJsIntegration, type NextJsConnectionInput } from "./nextjs-client";

const inputSchema = z.object({ siteUrl: z.string().trim().min(4).max(2_048), apiToken: z.string().trim().min(16).max(1_000) });
const columns = "id,workspace_id,project_id,website_id,user_id,provider,connection_method,status,encrypted_credentials,credential_version,credential_key_id,external_account_name,external_site_url,metadata,last_connected_at,last_checked_at,last_used_at,last_error_code,last_error_message,created_at";
type ConnectionRow = { id:string; project_id:string; user_id:string; status:string; encrypted_credentials:Json|null; credential_version:number|null; credential_key_id:string|null; external_account_name:string|null; external_site_url:string|null; last_connected_at:string|null; last_checked_at:string|null; last_used_at:string|null; last_error_message:string|null };

async function requireContext() {
  const [user, project] = await Promise.all([getOptionalUser(), getCurrentProject()]);
  if (!user) throw new PublishingIntegrationError("authentication_required", "Sign in to manage Next.js connections.", 401);
  if (!project) throw new PublishingIntegrationError("project_required", "Complete Searchhand setup before connecting Next.js.", 404);
  return { user, project, admin: createPublishingAdminClient() };
}

function publicConnection(row: ConnectionRow): SafePublishingConnection {
  return { id:row.id, provider:"nextjs", status:row.status as PublishingConnectionStatus, storeName:row.external_account_name, storeUrl:row.external_site_url, connectedAt:row.last_connected_at, lastCheckedAt:row.last_checked_at, lastUsedAt:row.last_used_at, errorMessage:row.last_error_message, testDraftStatus:null, testDraftUrl:null, testDraftAdminUrl:null };
}

function decryptConnection(row: ConnectionRow): NextJsConnectionInput {
  const env = requireNextJsPublishingServerEnv();
  const key = !row.credential_key_id || row.credential_key_id === encryptionKeyId(env.INTEGRATION_ENCRYPTION_KEY) ? env.INTEGRATION_ENCRYPTION_KEY : env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS && row.credential_key_id === encryptionKeyId(env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS) ? env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS : null;
  if (!key || !row.encrypted_credentials || row.credential_version !== 1) throw new PublishingIntegrationError("nextjs_credentials_missing", "Reconnect Next.js before testing this connection.", 409);
  const value = decryptCredentialJson<unknown>(row.encrypted_credentials as EncryptedCredentialEnvelope, key, `nextjs:${row.id}`);
  const parsed = inputSchema.safeParse(value);
  if (!parsed.success) throw new PublishingIntegrationError("nextjs_credentials_missing", "Reconnect Next.js before testing this connection.", 409);
  return parsed.data;
}

export async function testNextJsConnection(input: NextJsConnectionInput) {
  await requireContext();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new PublishingIntegrationError("invalid_nextjs_credentials", "Enter the Next.js website URL and integration token.", 400);
  return checkNextJsIntegration(parsed.data);
}

export async function getOwnedNextJsConnection(connectionId: string) {
  const { user, project, admin } = await requireContext();
  const { data, error } = await admin.from("publishing_connections").select(columns).eq("id", connectionId).eq("project_id", project.id).eq("user_id", user.id).eq("provider", "nextjs").maybeSingle();
  if (error || !data) throw new PublishingIntegrationError("connection_not_found", "That Next.js connection is unavailable.", 404);
  return { row: data as unknown as ConnectionRow, user, project, admin };
}

export async function connectNextJs(input: NextJsConnectionInput, existingId?: string) {
  const { user, project, admin } = await requireContext();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new PublishingIntegrationError("invalid_nextjs_credentials", "Enter the Next.js website URL and integration token.", 400);
  if (existingId) await getOwnedNextJsConnection(existingId);
  const tested = await checkNextJsIntegration(parsed.data);
  const id = existingId || randomUUID();
  const env = requireNextJsPublishingServerEnv();
  const encrypted = encryptCredentialJson({ siteUrl: tested.siteUrl, apiToken: parsed.data.apiToken }, env.INTEGRATION_ENCRYPTION_KEY, `nextjs:${id}`);
  const now = new Date().toISOString();
  const values = { status:"connected", encrypted_credentials:encrypted, credential_version:encrypted.version, credential_key_id:encryptionKeyId(env.INTEGRATION_ENCRYPTION_KEY), external_account_name:tested.siteName, external_site_url:tested.siteUrl, metadata:{ adapter:"searchhand-nextjs-v1" }, last_connected_at:now, last_checked_at:now, disconnected_at:null, last_error_code:null, last_error_message:null };
  if (existingId) {
    const { error } = await admin.from("publishing_connections").update(values).eq("id", id).eq("project_id", project.id).eq("user_id", user.id);
    if (error) throw new PublishingIntegrationError("nextjs_connection_save_failed", "The verified Next.js connection could not be saved.", 500);
  } else {
    const { data: website } = await admin.from("websites").select("id").eq("project_id", project.id).eq("is_primary", true).maybeSingle();
    const { error } = await admin.from("publishing_connections").insert({ id, workspace_id:project.workspace_id, project_id:project.id, website_id:website?.id || null, user_id:user.id, provider:"nextjs", connection_method:"api_token", ...values });
    if (error) throw new PublishingIntegrationError("nextjs_connection_save_failed", "The verified Next.js connection could not be saved.", 500);
  }
  return { connectionId:id, ...tested };
}

export async function listNextJsConnections() {
  const { user, project, admin } = await requireContext();
  const { data, error } = await admin.from("publishing_connections").select(columns).eq("project_id", project.id).eq("user_id", user.id).eq("provider", "nextjs").order("created_at", { ascending:false });
  if (error) throw new PublishingIntegrationError("connection_read_failed", "Next.js connections could not be loaded.", 500);
  return (data as unknown as ConnectionRow[]).map(publicConnection);
}

export async function refreshNextJsConnection(connectionId: string): Promise<TestConnectionResult> {
  const { row, admin } = await getOwnedNextJsConnection(connectionId);
  try {
    const tested = await checkNextJsIntegration(decryptConnection(row));
    await admin.from("publishing_connections").update({ status:"connected", external_account_name:tested.siteName, external_site_url:tested.siteUrl, last_checked_at:new Date().toISOString(), last_error_code:null, last_error_message:null }).eq("id", row.id);
    return { ok:true, status:"connected", storeName:tested.siteName, storeUrl:tested.siteUrl };
  } catch (error) {
    const safe = error instanceof PublishingIntegrationError ? error : new PublishingIntegrationError("nextjs_connection_check_failed", "Next.js needs attention. Reconnect and try again.", 502);
    await admin.from("publishing_connections").update({ status:"needs_reauthentication", last_checked_at:new Date().toISOString(), last_error_code:safe.code, last_error_message:safe.message }).eq("id", row.id);
    throw safe;
  }
}

export async function disconnectNextJs(connectionId: string) {
  const { row, admin } = await getOwnedNextJsConnection(connectionId);
  await admin.from("publishing_connections").update({ status:"disconnected", encrypted_credentials:null, credential_version:null, credential_key_id:null, disconnected_at:new Date().toISOString(), last_error_code:null, last_error_message:null }).eq("id", row.id);
}
