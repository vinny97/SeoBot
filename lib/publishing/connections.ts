import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import { getOptionalUser, getCurrentProject } from "@/lib/auth/server";
import { createPublishingAdminClient } from "@/lib/supabase/admin";
import { getComposioClient } from "@/lib/composio/client";
import { getComposioUserId } from "@/lib/composio/identity";
import { buildShopifyCallbackUrl, createCallbackState, verifyCallbackState } from "@/lib/composio/state";
import { SHOPIFY_QUERY_SHOP_ACTION, SHOPIFY_TOOLKIT_VERSION } from "@/lib/composio/constants";
import { requirePublishingServerEnv } from "@/lib/config/publishing-env";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import { extractShopifyShop, mapComposioStatus } from "@/lib/publishing/shopify-values";
import type { PublishingConnectionStatus, SafePublishingConnection, TestConnectionResult } from "@/lib/publishing/types";

export type PublishingConnectionRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  website_id: string | null;
  user_id: string;
  provider: string;
  status: string;
  composio_user_id: string;
  composio_connected_account_id: string | null;
  composio_auth_config_id: string;
  callback_state_hash: string | null;
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

async function requirePublishingContext() {
  const [user, project] = await Promise.all([getOptionalUser(), getCurrentProject()]);
  if (!user) throw new PublishingIntegrationError("authentication_required", "Sign in to manage publishing connections.", 401);
  if (!project) throw new PublishingIntegrationError("project_required", "Complete Searchhand setup before connecting Shopify.", 404);
  return { user, project, admin: createPublishingAdminClient() };
}

function safeConnection(row: PublishingConnectionRecord, testDraft?: { remote_status: string; remote_url: string | null; remote_admin_url: string | null }): SafePublishingConnection {
  return {
    id: row.id,
    provider: "shopify",
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

export async function listPublishingConnections(): Promise<SafePublishingConnection[]> {
  const { user, project, admin } = await requirePublishingContext();
  const { data, error } = await admin
    .from("publishing_connections")
    .select("id,workspace_id,project_id,website_id,user_id,provider,status,composio_user_id,composio_connected_account_id,composio_auth_config_id,callback_state_hash,external_account_id,external_account_name,external_site_url,metadata,last_connected_at,last_checked_at,last_used_at,last_error_code,last_error_message,created_at")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("provider", "shopify")
    .order("created_at", { ascending: false });
  if (error) throw new PublishingIntegrationError("connection_read_failed", "Shopify connections could not be loaded.", 500);
  const rows = data as PublishingConnectionRecord[];
  const { data: drafts } = rows.length ? await admin.from("article_publications")
    .select("publishing_connection_id,remote_status,remote_url,remote_admin_url")
    .in("publishing_connection_id", rows.map((row) => row.id))
    .eq("publication_kind", "connection_test") : { data: [] };
  const byConnection = new Map((drafts || []).map((draft) => [draft.publishing_connection_id, draft]));
  return rows.map((row) => safeConnection(row, byConnection.get(row.id)));
}

export async function getOwnedPublishingConnection(connectionId: string) {
  const { user, project, admin } = await requirePublishingContext();
  const { data, error } = await admin
    .from("publishing_connections")
    .select("id,workspace_id,project_id,website_id,user_id,provider,status,composio_user_id,composio_connected_account_id,composio_auth_config_id,callback_state_hash,external_account_id,external_account_name,external_site_url,metadata,last_connected_at,last_checked_at,last_used_at,last_error_code,last_error_message,created_at")
    .eq("id", connectionId)
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("provider", "shopify")
    .maybeSingle();
  if (error || !data) throw new PublishingIntegrationError("connection_not_found", "That Shopify connection is unavailable.", 404);
  return { row: data as PublishingConnectionRecord, user, project, admin };
}

export async function beginShopifyConnection(replacesConnectionId?: string) {
  const { user, project, admin } = await requirePublishingContext();
  const env = requirePublishingServerEnv();
  if (replacesConnectionId) await getOwnedPublishingConnection(replacesConnectionId);
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
    provider: "shopify",
    connection_method: "composio",
    status: "pending",
    composio_user_id: composioUserId,
    composio_auth_config_id: env.COMPOSIO_SHOPIFY_AUTH_CONFIG_ID,
    callback_state_hash: state.hash,
    metadata,
  });
  if (insertError) throw new PublishingIntegrationError("connection_create_failed", "The Shopify connection could not be started.", 500);

  try {
    const callbackUrl = buildShopifyCallbackUrl(env.APP_URL, id, state.value);
    const request = await getComposioClient().connectedAccounts.link(
      composioUserId,
      env.COMPOSIO_SHOPIFY_AUTH_CONFIG_ID,
      { callbackUrl, alias: `searchhand-shopify-${id.slice(0, 8)}`, allowMultiple: true },
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
      last_error_message: "The secure Shopify sign-in link could not be created.",
    }).eq("id", id);
    throw new PublishingIntegrationError("connect_link_failed", "The secure Shopify sign-in link could not be created.", 502);
  }
}

async function getVerifiedRemoteAccount(row: PublishingConnectionRecord) {
  if (!row.composio_connected_account_id) throw new PublishingIntegrationError("connection_initialising", "The Shopify connection is still initialising.", 409);
  const result = await getComposioClient().connectedAccounts.list({
    userIds: [row.composio_user_id],
    authConfigIds: [row.composio_auth_config_id],
    toolkitSlugs: ["shopify"],
    limit: 100,
  }, { signal: AbortSignal.timeout(12_000) });
  const account = result.items.find((item) => item.id === row.composio_connected_account_id);
  if (!account || account.toolkit.slug.toLowerCase() !== "shopify" || account.authConfig.id !== row.composio_auth_config_id) {
    throw new PublishingIntegrationError("connection_identity_mismatch", "Shopify could not verify this connection.", 403);
  }
  return account;
}

async function queryShop(row: PublishingConnectionRecord) {
  const account = await getVerifiedRemoteAccount(row);
  const status = mapComposioStatus(account.status);
  if (status !== "connected") return { account, status, shop: { id: null, name: null, url: null } };
  const result = await getComposioClient().tools.execute(SHOPIFY_QUERY_SHOP_ACTION, {
    userId: row.composio_user_id,
    connectedAccountId: row.composio_connected_account_id!,
    version: SHOPIFY_TOOLKIT_VERSION,
    arguments: { fields: "id name myshopifyDomain primaryDomain { url host }" },
  }, { signal: AbortSignal.timeout(15_000) });
  if (!result.successful) throw new PublishingIntegrationError("shopify_test_failed", "Shopify accepted the connection, but the store check failed.", 502);
  return { account, status, shop: extractShopifyShop(result.data) };
}

export async function refreshShopifyConnectionStatus(connectionId: string): Promise<TestConnectionResult> {
  const { row, admin } = await getOwnedPublishingConnection(connectionId);
  if (row.status === "disconnected" || row.status === "revoked") {
    throw new PublishingIntegrationError("connection_disconnected", "Reconnect Shopify before testing this store.", 409);
  }
  try {
    const { status, shop } = await queryShop(row);
    const now = new Date().toISOString();
    await admin.from("publishing_connections").update({
      status,
      external_account_id: shop.id || row.external_account_id,
      external_account_name: shop.name || row.external_account_name,
      external_site_url: shop.url || row.external_site_url,
      last_checked_at: now,
      last_error_code: null,
      last_error_message: null,
    }).eq("id", row.id);
    return { ok: status === "connected", status, storeName: shop.name || row.external_account_name, storeUrl: shop.url || row.external_site_url };
  } catch (error) {
    const status = error instanceof PublishingIntegrationError && error.code === "connection_identity_mismatch" ? "error" : "needs_reauthentication";
    await admin.from("publishing_connections").update({
      status,
      last_checked_at: new Date().toISOString(),
      last_error_code: "connection_check_failed",
      last_error_message: "Shopify needs attention. Refresh the connection or reconnect.",
    }).eq("id", row.id);
    if (error instanceof PublishingIntegrationError) throw error;
    throw new PublishingIntegrationError("connection_check_failed", "Shopify needs attention. Refresh the connection or reconnect.", 502);
  }
}

export async function completeShopifyCallback(input: { connectionId: string; state: string; callbackStatus: string | null }) {
  const { row, admin } = await getOwnedPublishingConnection(input.connectionId);
  if (!row.callback_state_hash || !verifyCallbackState(input.state, row.callback_state_hash)) {
    throw new PublishingIntegrationError("invalid_callback_state", "This Shopify connection link is invalid or expired.", 403);
  }
  if (input.callbackStatus !== "success") {
    await admin.from("publishing_connections").update({
      status: "error",
      callback_state_hash: null,
      last_error_code: "authorization_cancelled",
      last_error_message: "Shopify authorization was cancelled or did not complete.",
    }).eq("id", row.id);
    return { ok: false };
  }
  const { status, shop } = await queryShop(row);
  if (status !== "connected") {
    await admin.from("publishing_connections").update({
      status,
      callback_state_hash: null,
      last_checked_at: new Date().toISOString(),
      last_error_code: "authorization_incomplete",
      last_error_message: "Shopify authorization is not active yet.",
    }).eq("id", row.id);
    return { ok: false };
  }
  const now = new Date().toISOString();
  await admin.from("publishing_connections").update({
    status: "connected",
    callback_state_hash: null,
    external_account_id: shop.id,
    external_account_name: shop.name,
    external_site_url: shop.url,
    last_connected_at: now,
    last_checked_at: now,
    last_error_code: null,
    last_error_message: null,
  }).eq("id", row.id);

  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  const replacedId = typeof metadata.replacesConnectionId === "string" ? metadata.replacesConnectionId : null;
  if (replacedId) {
    const { data: replaced } = await admin.from("publishing_connections")
      .select("id,composio_connected_account_id")
      .eq("id", replacedId)
      .eq("project_id", row.project_id)
      .eq("user_id", row.user_id)
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

export async function disconnectShopifyConnection(connectionId: string) {
  const { row, admin } = await getOwnedPublishingConnection(connectionId);
  if (row.composio_connected_account_id) {
    await getVerifiedRemoteAccount(row);
    await getComposioClient().connectedAccounts.delete(row.composio_connected_account_id, { signal: AbortSignal.timeout(15_000) });
  }
  await admin.from("publishing_connections").update({
    status: "disconnected",
    disconnected_at: new Date().toISOString(),
    callback_state_hash: null,
    last_error_code: null,
    last_error_message: null,
  }).eq("id", row.id);
}
