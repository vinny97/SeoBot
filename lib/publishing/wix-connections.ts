import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import { getOptionalUser, getCurrentProject } from "@/lib/auth/server";
import { createPublishingAdminClient } from "@/lib/supabase/admin";
import { getComposioClient } from "@/lib/composio/client";
import { getComposioUserId } from "@/lib/composio/identity";
import { buildWixCallbackUrl, createCallbackState, verifyCallbackState } from "@/lib/composio/state";
import { WIX_GET_APP_INSTANCE_ACTION, WIX_TOOLKIT_VERSION } from "@/lib/composio/constants";
import { requireWixPublishingServerEnv } from "@/lib/config/publishing-env";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import type { PublishingConnectionRecord } from "@/lib/publishing/connections";
import { extractWixSite, mapWixComposioStatus } from "@/lib/publishing/wix-values";
import type { PublishingConnectionStatus, SafePublishingConnection, TestConnectionResult } from "@/lib/publishing/types";

async function requireWixPublishingContext() {
  const [user, project] = await Promise.all([getOptionalUser(), getCurrentProject()]);
  if (!user) throw new PublishingIntegrationError("authentication_required", "Sign in to manage publishing connections.", 401);
  if (!project) throw new PublishingIntegrationError("project_required", "Complete Searchhand setup before connecting Wix.", 404);
  return { user, project, admin: createPublishingAdminClient() };
}

function safeWixConnection(
  row: PublishingConnectionRecord,
  testDraft?: { remote_status: string; remote_url: string | null; remote_admin_url: string | null },
): SafePublishingConnection {
  return {
    id: row.id,
    provider: "wix",
    status: row.status as PublishingConnectionStatus,
    storeName: row.external_account_name,
    storeUrl: row.external_site_url,
    connectedAt: row.last_connected_at,
    lastCheckedAt: row.last_checked_at,
    lastUsedAt: row.last_used_at,
    errorMessage: row.last_error_message,
    testDraftStatus: testDraft?.remote_status || null,
    testDraftUrl: testDraft?.remote_url || null,
    testDraftAdminUrl: testDraft?.remote_admin_url || null,
  };
}

export async function listWixPublishingConnections(): Promise<SafePublishingConnection[]> {
  const { user, project, admin } = await requireWixPublishingContext();
  const { data, error } = await admin
    .from("publishing_connections")
    .select("id,workspace_id,project_id,website_id,user_id,provider,status,composio_user_id,composio_connected_account_id,composio_auth_config_id,callback_state_hash,external_account_id,external_account_name,external_site_url,metadata,last_connected_at,last_checked_at,last_used_at,last_error_code,last_error_message,created_at")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("provider", "wix")
    .order("created_at", { ascending: false });
  if (error) throw new PublishingIntegrationError("connection_read_failed", "Wix connections could not be loaded.", 500);
  const rows = data as PublishingConnectionRecord[];
  const { data: drafts } = rows.length
    ? await admin.from("article_publications")
      .select("publishing_connection_id,remote_status,remote_url,remote_admin_url")
      .in("publishing_connection_id", rows.map((row) => row.id))
      .eq("publication_kind", "connection_test")
    : { data: [] };
  const byConnection = new Map((drafts || []).map((draft) => [draft.publishing_connection_id, draft]));
  return rows.map((row) => safeWixConnection(row, byConnection.get(row.id)));
}

export async function getOwnedWixPublishingConnection(connectionId: string) {
  const { user, project, admin } = await requireWixPublishingContext();
  const { data, error } = await admin
    .from("publishing_connections")
    .select("id,workspace_id,project_id,website_id,user_id,provider,status,composio_user_id,composio_connected_account_id,composio_auth_config_id,callback_state_hash,external_account_id,external_account_name,external_site_url,metadata,last_connected_at,last_checked_at,last_used_at,last_error_code,last_error_message,created_at")
    .eq("id", connectionId)
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("provider", "wix")
    .maybeSingle();
  if (error || !data) throw new PublishingIntegrationError("connection_not_found", "That Wix connection is unavailable.", 404);
  return { row: data as PublishingConnectionRecord, user, project, admin };
}

export async function beginWixConnection(replacesConnectionId?: string) {
  const { user, project, admin } = await requireWixPublishingContext();
  const env = requireWixPublishingServerEnv();
  if (replacesConnectionId) await getOwnedWixPublishingConnection(replacesConnectionId);
  const { data: website } = await admin
    .from("websites")
    .select("id")
    .eq("project_id", project.id)
    .eq("is_primary", true)
    .maybeSingle();
  const id = randomUUID();
  const state = createCallbackState();
  const composioUserId = getComposioUserId(user.id);
  const metadata: Json = replacesConnectionId ? { replacesConnectionId } : {};
  const { error: insertError } = await admin.from("publishing_connections").insert({
    id,
    workspace_id: project.workspace_id,
    project_id: project.id,
    website_id: website?.id || null,
    user_id: user.id,
    provider: "wix",
    connection_method: "composio",
    status: "pending",
    composio_user_id: composioUserId,
    composio_auth_config_id: env.COMPOSIO_WIX_AUTH_CONFIG_ID,
    callback_state_hash: state.hash,
    metadata,
  });
  if (insertError) throw new PublishingIntegrationError("connection_create_failed", "The Wix connection could not be started.", 500);

  try {
    const callbackUrl = buildWixCallbackUrl(env.APP_URL, id, state.value);
    const request = await getComposioClient().connectedAccounts.link(
      composioUserId,
      env.COMPOSIO_WIX_AUTH_CONFIG_ID,
      { callbackUrl, alias: `searchhand-wix-${id.slice(0, 8)}`, allowMultiple: true },
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!request.redirectUrl) throw new Error("Missing redirect URL");
    const { error: updateError } = await admin
      .from("publishing_connections")
      .update({ composio_connected_account_id: request.id })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) {
      await getComposioClient().connectedAccounts.delete(request.id).catch(() => undefined);
      throw updateError;
    }
    return { redirectUrl: request.redirectUrl };
  } catch {
    await admin.from("publishing_connections").update({
      status: "error",
      last_error_code: "connect_link_failed",
      last_error_message: "The secure Wix sign-in link could not be created.",
    }).eq("id", id);
    throw new PublishingIntegrationError("connect_link_failed", "The secure Wix sign-in link could not be created.", 502);
  }
}

export async function getVerifiedWixRemoteAccount(row: PublishingConnectionRecord) {
  if (!row.composio_connected_account_id) {
    throw new PublishingIntegrationError("connection_initialising", "The Wix connection is still initialising.", 409);
  }
  const result = await getComposioClient().connectedAccounts.list({
    userIds: [row.composio_user_id],
    authConfigIds: [row.composio_auth_config_id],
    toolkitSlugs: ["wix"],
    limit: 100,
  }, { signal: AbortSignal.timeout(12_000) });
  const account = result.items.find((item) => item.id === row.composio_connected_account_id);
  if (!account || account.toolkit.slug.toLowerCase() !== "wix" || account.authConfig.id !== row.composio_auth_config_id) {
    throw new PublishingIntegrationError("connection_identity_mismatch", "Wix could not verify this connection.", 403);
  }
  return account;
}

async function queryWixSite(row: PublishingConnectionRecord) {
  const account = await getVerifiedWixRemoteAccount(row);
  const status = mapWixComposioStatus(account.status);
  if (status !== "connected") {
    return { account, status, site: { id: null, name: null, url: null, locale: null, permissions: [] as string[] } };
  }
  const result = await getComposioClient().tools.execute(WIX_GET_APP_INSTANCE_ACTION, {
    userId: row.composio_user_id,
    connectedAccountId: row.composio_connected_account_id!,
    version: WIX_TOOLKIT_VERSION,
    arguments: {},
  }, { signal: AbortSignal.timeout(15_000) });
  if (!result.successful) {
    throw new PublishingIntegrationError("wix_test_failed", "Wix accepted the connection, but the site check failed.", 502);
  }
  return { account, status, site: extractWixSite(result.data) };
}

export async function refreshWixConnectionStatus(connectionId: string): Promise<TestConnectionResult> {
  const { row, admin } = await getOwnedWixPublishingConnection(connectionId);
  if (row.status === "disconnected" || row.status === "revoked") {
    throw new PublishingIntegrationError("connection_disconnected", "Reconnect Wix before testing this site.", 409);
  }
  try {
    const { status, site } = await queryWixSite(row);
    const now = new Date().toISOString();
    const existingMetadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
    await admin.from("publishing_connections").update({
      status,
      external_account_id: site.id || row.external_account_id,
      external_account_name: site.name || row.external_account_name,
      external_site_url: site.url || row.external_site_url,
      granted_scopes: site.permissions,
      metadata: { ...existingMetadata, locale: site.locale },
      last_checked_at: now,
      last_error_code: null,
      last_error_message: null,
    }).eq("id", row.id);
    return {
      ok: status === "connected",
      status,
      storeName: site.name || row.external_account_name,
      storeUrl: site.url || row.external_site_url,
    };
  } catch (error) {
    const status = error instanceof PublishingIntegrationError && error.code === "connection_identity_mismatch"
      ? "error"
      : "needs_reauthentication";
    await admin.from("publishing_connections").update({
      status,
      last_checked_at: new Date().toISOString(),
      last_error_code: "connection_check_failed",
      last_error_message: "Wix needs attention. Refresh the connection or reconnect.",
    }).eq("id", row.id);
    if (error instanceof PublishingIntegrationError) throw error;
    throw new PublishingIntegrationError("connection_check_failed", "Wix needs attention. Refresh the connection or reconnect.", 502);
  }
}

export async function completeWixCallback(input: { connectionId: string; state: string; callbackStatus: string | null }) {
  const { row, admin } = await getOwnedWixPublishingConnection(input.connectionId);
  if (!row.callback_state_hash || !verifyCallbackState(input.state, row.callback_state_hash)) {
    throw new PublishingIntegrationError("invalid_callback_state", "This Wix connection link is invalid or expired.", 403);
  }
  if (input.callbackStatus !== "success") {
    await admin.from("publishing_connections").update({
      status: "error",
      callback_state_hash: null,
      last_error_code: "authorization_cancelled",
      last_error_message: "Wix authorization was cancelled or did not complete.",
    }).eq("id", row.id);
    return { ok: false };
  }
  const { status, site } = await queryWixSite(row);
  if (status !== "connected") {
    await admin.from("publishing_connections").update({
      status,
      callback_state_hash: null,
      last_checked_at: new Date().toISOString(),
      last_error_code: "authorization_incomplete",
      last_error_message: "Wix authorization is not active yet.",
    }).eq("id", row.id);
    return { ok: false };
  }
  const now = new Date().toISOString();
  const existingMetadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  await admin.from("publishing_connections").update({
    status: "connected",
    callback_state_hash: null,
    external_account_id: site.id,
    external_account_name: site.name,
    external_site_url: site.url,
    granted_scopes: site.permissions,
    metadata: { ...existingMetadata, locale: site.locale },
    last_connected_at: now,
    last_checked_at: now,
    last_error_code: null,
    last_error_message: null,
  }).eq("id", row.id);

  const replacedId = typeof existingMetadata.replacesConnectionId === "string" ? existingMetadata.replacesConnectionId : null;
  if (replacedId) {
    const { data: replaced } = await admin.from("publishing_connections")
      .select("id,composio_connected_account_id")
      .eq("id", replacedId)
      .eq("project_id", row.project_id)
      .eq("user_id", row.user_id)
      .eq("provider", "wix")
      .maybeSingle();
    if (replaced) {
      await admin.from("publishing_connections").update({ status: "disconnected", disconnected_at: now }).eq("id", replaced.id);
      if (replaced.composio_connected_account_id) {
        await getComposioClient().connectedAccounts.delete(replaced.composio_connected_account_id).catch(async () => {
          await admin.from("publishing_connections").update({
            last_error_code: "replacement_revoke_failed",
            last_error_message: "The previous Composio connection may require manual removal.",
          }).eq("id", replaced.id);
        });
      }
    }
  }
  return { ok: true };
}

export async function disconnectWixConnection(connectionId: string) {
  const { row, admin } = await getOwnedWixPublishingConnection(connectionId);
  if (row.composio_connected_account_id) {
    await getVerifiedWixRemoteAccount(row);
    await getComposioClient().connectedAccounts.delete(
      row.composio_connected_account_id,
      { signal: AbortSignal.timeout(15_000) },
    );
  }
  await admin.from("publishing_connections").update({
    status: "disconnected",
    disconnected_at: new Date().toISOString(),
    callback_state_hash: null,
    last_error_code: null,
    last_error_message: null,
  }).eq("id", row.id);
}
