import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentProject, getOptionalUser } from "@/lib/auth/server";
import { requireWordPressPublishingServerEnv } from "@/lib/config/publishing-env";
import { createPublishingAdminClient } from "@/lib/supabase/admin";
import { decryptCredentialJson, encryptCredentialJson, encryptionKeyId, type EncryptedCredentialEnvelope } from "@/lib/publishing/credentials";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import type { PublishingConnectionStatus, SafePublishingConnection, TestConnectionResult } from "@/lib/publishing/types";
import { discoverWordPressRestApi, WordPressClient } from "./wordpress-client";
import { logWordPressOperation } from "./wordpress-log";
import type { WordPressConnectionInput, WordPressConnectionTestResult, WordPressCredentials, WordPressTransport } from "./wordpress-types";

const inputSchema = z.object({
  siteUrl: z.string().trim().min(4).max(2_048),
  username: z.string().trim().min(1).max(160),
  applicationPassword: z.string().trim().min(8).max(500),
});

export type WordPressConnectionRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  website_id: string | null;
  user_id: string;
  provider: "wordpress";
  connection_method: "application_password";
  status: string;
  encrypted_credentials: Json | null;
  credential_version: number | null;
  credential_key_id: string | null;
  external_account_id: string | null;
  external_account_name: string | null;
  external_site_url: string | null;
  metadata: Json;
  last_connected_at: string | null;
  last_checked_at: string | null;
  last_used_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
};

const selectColumns = "id,workspace_id,project_id,website_id,user_id,provider,connection_method,status,encrypted_credentials,credential_version,credential_key_id,external_account_id,external_account_name,external_site_url,metadata,last_connected_at,last_checked_at,last_used_at,last_error_code,last_error_message,created_at";

async function requireWordPressContext() {
  const [user, project] = await Promise.all([getOptionalUser(), getCurrentProject()]);
  if (!user) throw new PublishingIntegrationError("authentication_required", "Sign in to manage WordPress connections.", 401);
  if (!project) throw new PublishingIntegrationError("project_required", "Complete Searchhand setup before connecting WordPress.", 404);
  return { user, project, admin: createPublishingAdminClient() };
}

function metadataObject(value: Json) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {};
}

function safeConnection(row: WordPressConnectionRecord, testDraft?: { remote_status: string; remote_url: string | null; remote_admin_url: string | null }): SafePublishingConnection {
  const metadata = metadataObject(row.metadata);
  return {
    id: row.id,
    provider: "wordpress",
    status: row.status as PublishingConnectionStatus,
    storeName: row.external_account_name,
    storeUrl: row.external_site_url,
    accountName: typeof metadata.userDisplayName === "string" ? metadata.userDisplayName : null,
    connectedAt: row.last_connected_at,
    lastCheckedAt: row.last_checked_at,
    lastUsedAt: row.last_used_at,
    errorMessage: row.last_error_message,
    testDraftStatus: testDraft?.remote_status || null,
    testDraftUrl: testDraft?.remote_url || null,
    testDraftAdminUrl: testDraft?.remote_admin_url || null,
  };
}

export async function probeWordPressConnection(input: WordPressConnectionInput, transport?: WordPressTransport): Promise<WordPressConnectionTestResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new PublishingIntegrationError("invalid_wordpress_credentials", "Enter the WordPress website URL, username and Application Password.", 400);
  const discovered = await discoverWordPressRestApi(parsed.data.siteUrl, transport);
  const client = new WordPressClient(discovered.siteUrl, discovered.restApiUrl, parsed.data, transport);
  const user = await client.currentUser();
  const userId = typeof user.id === "number" && Number.isSafeInteger(user.id) ? user.id : null;
  const canCreatePosts = user.capabilities?.edit_posts === true;
  if (!userId) throw new PublishingIntegrationError("wordpress_authentication_failed", "The WordPress username or Application Password was not accepted.", 401);
  if (!canCreatePosts) throw new PublishingIntegrationError("wordpress_permission_denied", "This WordPress user can sign in but does not have permission to create posts. Use an Editor or Administrator account.", 403);
  return {
    success: true,
    siteName: discovered.siteName,
    siteUrl: discovered.siteUrl,
    restApiUrl: discovered.restApiUrl,
    userId,
    userDisplayName: typeof user.name === "string" ? user.name.slice(0, 200) : null,
    canCreatePosts,
    warnings: [],
  };
}

export async function testWordPressConnection(input: WordPressConnectionInput) {
  await requireWordPressContext();
  return probeWordPressConnection(input);
}

async function activity(admin: ReturnType<typeof createPublishingAdminClient>, projectId: string, connectionId: string, type: string, title: string) {
  await admin.from("activities").insert({
    project_id: projectId,
    activity_type: type,
    title,
    description: null,
    status: "completed",
    related_entity_type: "publishing_connection",
    related_entity_id: connectionId,
    metadata: { provider: "wordpress" },
  });
}

export async function connectWordPress(input: WordPressConnectionInput, reconnectConnectionId?: string) {
  const { user, project, admin } = await requireWordPressContext();
  const env = requireWordPressPublishingServerEnv();
  const tested = await probeWordPressConnection(input);
  const id = reconnectConnectionId || randomUUID();
  let existing: WordPressConnectionRecord | null = null;
  if (reconnectConnectionId) {
    ({ row: existing } = await getOwnedWordPressConnection(reconnectConnectionId));
  }
  const credentials: WordPressCredentials = { username: input.username.trim(), applicationPassword: input.applicationPassword.trim() };
  const encrypted = encryptCredentialJson(credentials, env.INTEGRATION_ENCRYPTION_KEY, `wordpress:${id}`);
  const now = new Date().toISOString();
  const safeMetadata: Json = {
    restApiUrl: tested.restApiUrl,
    userDisplayName: tested.userDisplayName,
    userId: tested.userId,
    canCreatePosts: tested.canCreatePosts,
  };
  if (existing) {
    const { error } = await admin.from("publishing_connections").update({
      status: "connected",
      encrypted_credentials: encrypted,
      credential_version: encrypted.version,
      credential_key_id: encryptionKeyId(env.INTEGRATION_ENCRYPTION_KEY),
      external_account_id: tested.userId === null ? null : String(tested.userId),
      external_account_name: tested.siteName,
      external_site_url: tested.siteUrl,
      metadata: safeMetadata,
      last_connected_at: now,
      last_checked_at: now,
      disconnected_at: null,
      last_error_code: null,
      last_error_message: null,
    }).eq("id", existing.id).eq("user_id", user.id).eq("project_id", project.id);
    if (error) throw new PublishingIntegrationError("wordpress_connection_save_failed", "The verified WordPress connection could not be saved.", 500);
    await activity(admin, project.id, id, "wordpress_reconnected", "WordPress reconnected");
  } else {
    const { data: website } = await admin.from("websites").select("id").eq("project_id", project.id).eq("is_primary", true).maybeSingle();
    const { count } = await admin.from("publishing_connections").select("id", { count: "exact", head: true }).eq("project_id", project.id).eq("provider", "wordpress").eq("status", "connected");
    const { error } = await admin.from("publishing_connections").insert({
      id,
      workspace_id: project.workspace_id,
      project_id: project.id,
      website_id: website?.id || null,
      user_id: user.id,
      provider: "wordpress",
      connection_method: "application_password",
      status: "connected",
      encrypted_credentials: encrypted,
      credential_version: encrypted.version,
      credential_key_id: encryptionKeyId(env.INTEGRATION_ENCRYPTION_KEY),
      external_account_id: tested.userId === null ? null : String(tested.userId),
      external_account_name: tested.siteName,
      external_site_url: tested.siteUrl,
      is_default: (count || 0) === 0,
      metadata: safeMetadata,
      last_connected_at: now,
      last_checked_at: now,
    });
    if (error) throw new PublishingIntegrationError("wordpress_connection_save_failed", "The verified WordPress connection could not be saved.", 500);
    await activity(admin, project.id, id, "wordpress_connected", "WordPress connected");
  }
  logWordPressOperation({ operation: existing ? "reconnect" : "connect", connectionId: id, projectId: project.id });
  return { connectionId: id, ...tested };
}

export async function listWordPressConnections(): Promise<SafePublishingConnection[]> {
  const { user, project, admin } = await requireWordPressContext();
  const { data, error } = await admin.from("publishing_connections").select(selectColumns)
    .eq("project_id", project.id).eq("user_id", user.id).eq("provider", "wordpress").order("created_at", { ascending: false });
  if (error) throw new PublishingIntegrationError("connection_read_failed", "WordPress connections could not be loaded.", 500);
  const rows = data as unknown as WordPressConnectionRecord[];
  const { data: drafts } = rows.length ? await admin.from("article_publications")
    .select("publishing_connection_id,remote_status,remote_url,remote_admin_url")
    .in("publishing_connection_id", rows.map((row) => row.id)).eq("publication_kind", "connection_test") : { data: [] };
  const byConnection = new Map((drafts || []).map((draft) => [draft.publishing_connection_id, draft]));
  return rows.map((row) => safeConnection(row, byConnection.get(row.id)));
}

export async function getOwnedWordPressConnection(connectionId: string) {
  const { user, project, admin } = await requireWordPressContext();
  const { data, error } = await admin.from("publishing_connections").select(selectColumns)
    .eq("id", connectionId).eq("project_id", project.id).eq("user_id", user.id).eq("provider", "wordpress").maybeSingle();
  if (error || !data) throw new PublishingIntegrationError("connection_not_found", "That WordPress connection is unavailable.", 404);
  return { row: data as unknown as WordPressConnectionRecord, user, project, admin };
}

export function decryptWordPressCredentials(row: WordPressConnectionRecord): WordPressCredentials {
  const env = requireWordPressPublishingServerEnv();
  if (!row.encrypted_credentials || row.credential_version !== 1) {
    throw new PublishingIntegrationError("wordpress_credentials_missing", "Reconnect WordPress before publishing.", 409);
  }
  const currentKeyId = encryptionKeyId(env.INTEGRATION_ENCRYPTION_KEY);
  const previous = env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS;
  const key = !row.credential_key_id || row.credential_key_id === currentKeyId
    ? env.INTEGRATION_ENCRYPTION_KEY
    : previous && row.credential_key_id === encryptionKeyId(previous)
      ? previous
      : null;
  if (!key) throw new PublishingIntegrationError("credential_decryption_failed", "Searchhand could not unlock this WordPress connection. Reconnect it before publishing.", 409);
  const value = decryptCredentialJson<WordPressCredentials>(row.encrypted_credentials as unknown as EncryptedCredentialEnvelope, key, `wordpress:${row.id}`);
  const parsed = z.object({ username: z.string().min(1), applicationPassword: z.string().min(8) }).safeParse(value);
  if (!parsed.success) throw new PublishingIntegrationError("credential_decryption_failed", "Searchhand could not unlock this WordPress connection. Reconnect it before publishing.", 409);
  return parsed.data;
}

function connectionClient(row: WordPressConnectionRecord) {
  const metadata = metadataObject(row.metadata);
  const restApiUrl = typeof metadata.restApiUrl === "string" ? metadata.restApiUrl : null;
  if (!row.external_site_url || !restApiUrl) throw new PublishingIntegrationError("wordpress_connection_incomplete", "Reconnect WordPress before publishing.", 409);
  return new WordPressClient(row.external_site_url, restApiUrl, decryptWordPressCredentials(row));
}

export async function refreshWordPressConnection(connectionId: string): Promise<TestConnectionResult> {
  const { row, admin } = await getOwnedWordPressConnection(connectionId);
  if (row.status === "disconnected" || row.status === "revoked") throw new PublishingIntegrationError("connection_disconnected", "Reconnect WordPress before testing this website.", 409);
  try {
    const user = await connectionClient(row).currentUser();
    if (user.capabilities?.edit_posts !== true) throw new PublishingIntegrationError("wordpress_permission_denied", "This WordPress user no longer has permission to create posts.", 403);
    const now = new Date().toISOString();
    const metadata = metadataObject(row.metadata);
    const userDisplayName = typeof user.name === "string" ? user.name.slice(0, 200) : null;
    await admin.from("publishing_connections").update({
      status: "connected",
      last_checked_at: now,
      external_account_id: typeof user.id === "number" ? String(user.id) : row.external_account_id,
      metadata: { ...metadata, userDisplayName, canCreatePosts: true },
      last_error_code: null,
      last_error_message: null,
    }).eq("id", row.id);
    logWordPressOperation({ operation: "health_check", connectionId: row.id, projectId: row.project_id });
    return { ok: true, status: "connected", storeName: row.external_account_name, storeUrl: row.external_site_url };
  } catch (error) {
    const safe = error instanceof PublishingIntegrationError ? error : new PublishingIntegrationError("wordpress_connection_check_failed", "WordPress needs attention. Reconnect and try again.", 502);
    await admin.from("publishing_connections").update({
      status: safe.code === "wordpress_permission_denied" ? "error" : "needs_reauthentication",
      last_checked_at: new Date().toISOString(),
      last_error_code: safe.code,
      last_error_message: safe.message,
    }).eq("id", row.id);
    throw safe;
  }
}

export async function disconnectWordPress(connectionId: string) {
  const { row, project, admin } = await getOwnedWordPressConnection(connectionId);
  await admin.from("publishing_connections").update({
    status: "disconnected",
    encrypted_credentials: null,
    credential_version: null,
    credential_key_id: null,
    disconnected_at: new Date().toISOString(),
    last_error_code: null,
    last_error_message: null,
  }).eq("id", row.id);
  await activity(admin, project.id, row.id, "wordpress_disconnected", "WordPress disconnected");
  logWordPressOperation({ operation: "disconnect", connectionId: row.id, projectId: project.id });
}

export async function getWordPressClientForConnection(connectionId: string) {
  const context = await getOwnedWordPressConnection(connectionId);
  return { ...context, client: connectionClient(context.row) };
}
