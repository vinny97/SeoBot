import "server-only";
import { randomUUID } from "node:crypto";
import { getCurrentProject, getOptionalUser } from "@/lib/auth/server";
import { getComposioClient } from "@/lib/composio/client";
import { getComposioUserId } from "@/lib/composio/identity";
import { requireGscServerEnv } from "@/lib/config/gsc-env";
import { GscComposioError, getVerifiedGscAccount, listGscProperties } from "@/lib/gsc/composio";
import { createGscOAuthProof, verifyState } from "@/lib/gsc/oauth";
import { createAdminClient } from "@/lib/supabase/admin";

export class GscConnectionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "GscConnectionError";
  }
}

function callbackUrl(appUrl: string, sessionId: string, state: string) {
  const url = new URL("/app/integrations/google-search-console/callback", appUrl);
  url.searchParams.set("session", sessionId);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function beginGscConnection() {
  const [user, project] = await Promise.all([getOptionalUser(), getCurrentProject()]);
  if (!user || !project) throw new GscConnectionError("authentication_required", "Authentication required.", 401);
  const env = requireGscServerEnv();
  const admin = createAdminClient();
  const { data: website } = await admin.from("websites").select("id").eq("project_id", project.id).eq("is_primary", true).maybeSingle();
  if (!website) throw new GscConnectionError("website_required", "A project website is required.");
  const { data: existing } = await admin.from("gsc_connections").select("id,composio_connected_account_id").eq("website_id", website.id).maybeSingle();
  const connectionId = existing?.id || randomUUID();
  const state = createGscOAuthProof();
  const composioUserId = getComposioUserId(user.id);
  const { data: session, error: sessionError } = await admin.from("gsc_oauth_sessions").insert({
    workspace_id: project.workspace_id,
    project_id: project.id,
    website_id: website.id,
    user_id: user.id,
    connection_id: connectionId,
    state_hash: state.stateHash,
    code_verifier: "composio-managed",
    composio_user_id: composioUserId,
    composio_auth_config_id: env.COMPOSIO_GSC_AUTH_CONFIG_ID,
    previous_connected_account_id: existing?.composio_connected_account_id || null,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }).select("id").single();
  if (sessionError || !session) throw new GscConnectionError("connection_create_failed", "The secure Search Console connection could not be started.", 500);

  const connectionValues = {
    id: connectionId,
    workspace_id: project.workspace_id,
    project_id: project.id,
    website_id: website.id,
    user_id: user.id,
    connection_method: "composio",
    composio_user_id: composioUserId,
    composio_auth_config_id: env.COMPOSIO_GSC_AUTH_CONFIG_ID,
    encrypted_refresh_token: null,
    credential_version: 2,
    granted_scopes: ["composio-managed"],
    status: "pending",
    last_error_code: null,
    last_error_message: null,
    disconnected_at: null,
  };
  const { error: connectionError } = await admin.from("gsc_connections").upsert(connectionValues, { onConflict: "website_id" });
  if (connectionError) {
    await admin.from("gsc_oauth_sessions").delete().eq("id", session.id);
    throw new GscConnectionError("connection_create_failed", "The secure Search Console connection could not be started.", 500);
  }

  try {
    const request = await getComposioClient().connectedAccounts.link(
      composioUserId,
      env.COMPOSIO_GSC_AUTH_CONFIG_ID,
      {
        callbackUrl: callbackUrl(env.APP_URL, session.id, state.state),
        alias: `searchhand-gsc-${connectionId.slice(0, 8)}`,
        allowMultiple: true,
      },
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!request.redirectUrl) throw new Error("Missing redirect URL");
    const { error: updateError } = await admin.from("gsc_oauth_sessions").update({ composio_connected_account_id: request.id }).eq("id", session.id);
    if (updateError) {
      await getComposioClient().connectedAccounts.delete(request.id).catch(() => undefined);
      throw updateError;
    }
    return request.redirectUrl;
  } catch {
    await admin.from("gsc_connections").update({
      status: existing?.composio_connected_account_id ? "connected" : "error",
      last_error_code: "connect_link_failed",
      last_error_message: "The secure Search Console sign-in link could not be created.",
    }).eq("id", connectionId);
    throw new GscConnectionError("connect_link_failed", "The secure Search Console sign-in link could not be created.", 502);
  }
}

export async function completeGscCallback(input: { sessionId: string; state: string; callbackStatus: string | null }) {
  const user = await getOptionalUser();
  if (!user) throw new GscConnectionError("authentication_required", "Authentication required.", 401);
  const env = requireGscServerEnv();
  const admin = createAdminClient();
  const { data: session } = await admin.from("gsc_oauth_sessions").select("*")
    .eq("id", input.sessionId).eq("user_id", user.id).is("consumed_at", null).maybeSingle();
  if (!session || new Date(session.expires_at) < new Date() || !verifyState(input.state, session.state_hash)) {
    throw new GscConnectionError("invalid_or_expired_state", "This Search Console connection link is invalid or expired.", 403);
  }
  if (session.composio_auth_config_id !== env.COMPOSIO_GSC_AUTH_CONFIG_ID || !session.composio_connected_account_id || !session.composio_user_id) {
    throw new GscConnectionError("connection_identity_mismatch", "Search Console could not verify this connection.", 403);
  }
  if (input.callbackStatus !== "success") {
    await admin.from("gsc_connections").update({
      status: session.previous_connected_account_id ? "connected" : "error",
      last_error_code: "authorization_cancelled",
      last_error_message: "Google Search Console authorization was cancelled or did not complete.",
    }).eq("id", session.connection_id);
    throw new GscConnectionError("authorization_cancelled", "Google Search Console authorization did not complete.");
  }
  const identity = {
    userId: session.composio_user_id,
    connectedAccountId: session.composio_connected_account_id,
    authConfigId: session.composio_auth_config_id,
  };
  try {
    const properties = await listGscProperties(identity);
    const { error } = await admin.from("gsc_connections").update({
      user_id: user.id,
      connection_method: "composio",
      composio_user_id: identity.userId,
      composio_connected_account_id: identity.connectedAccountId,
      composio_auth_config_id: identity.authConfigId,
      encrypted_refresh_token: null,
      credential_version: 2,
      granted_scopes: ["composio-managed"],
      status: "pending",
      last_error_code: null,
      last_error_message: null,
      disconnected_at: null,
    }).eq("id", session.connection_id);
    if (error) throw error;
    await admin.from("gsc_oauth_sessions").update({ available_properties: properties }).eq("id", session.id);
    return { sessionId: session.id };
  } catch (error) {
    const status = error instanceof GscComposioError && error.code === "connection_not_active" ? "needs_reauthentication" : "error";
    await admin.from("gsc_connections").update({
      status,
      last_error_code: error instanceof GscComposioError ? error.code : "property_list_failed",
      last_error_message: "Search Console connected, but verified properties could not be loaded.",
    }).eq("id", session.connection_id);
    throw error;
  }
}

export async function disconnectGscConnection(projectId: string) {
  const admin = createAdminClient();
  const { data: connection } = await admin.from("gsc_connections")
    .select("id,composio_user_id,composio_connected_account_id,composio_auth_config_id")
    .eq("project_id", projectId).maybeSingle();
  if (!connection) return;
  if (connection.composio_user_id && connection.composio_connected_account_id && connection.composio_auth_config_id) {
    const identity = {
      userId: connection.composio_user_id,
      connectedAccountId: connection.composio_connected_account_id,
      authConfigId: connection.composio_auth_config_id,
    };
    await getVerifiedGscAccount(identity);
    await getComposioClient().connectedAccounts.delete(identity.connectedAccountId, { signal: AbortSignal.timeout(15_000) });
  }
  const { error } = await admin.from("gsc_connections").update({
    status: "disconnected",
    composio_connected_account_id: null,
    encrypted_refresh_token: null,
    disconnected_at: new Date().toISOString(),
    last_error_code: null,
    last_error_message: null,
  }).eq("id", connection.id).eq("project_id", projectId);
  if (error) throw error;
}
