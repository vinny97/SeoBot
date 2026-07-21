import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getComposioUserId } from "../lib/composio/identity";
import { createCallbackState, verifyCallbackState } from "../lib/composio/state";
import {
  buildShopifyDraftArguments,
  extractShopifyArticle,
  extractShopifyShop,
  mapComposioStatus,
} from "../lib/publishing/shopify-values";
import {
  COMPOSIO_SDK_VERSION,
  SHOPIFY_CREATE_ARTICLE_ACTION,
  SHOPIFY_TEST_DRAFT_IDEMPOTENCY_KEY,
  SHOPIFY_TOOLKIT_VERSION,
} from "../lib/composio/constants";

const migration = readFileSync(new URL("../supabase/migrations/202607210007_composio_shopify.sql", import.meta.url), "utf8");
const connections = readFileSync(new URL("../lib/publishing/connections.ts", import.meta.url), "utf8");
const publisher = readFileSync(new URL("../lib/publishing/composio-shopify-publisher.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../lib/composio/client.ts", import.meta.url), "utf8");
const testDraftRoute = readFileSync(new URL("../app/api/integrations/shopify/[connectionId]/test-draft/route.ts", import.meta.url), "utf8");

describe("Composio tenant identity", () => {
  const userId = "5ab069e2-1cb2-4bec-8a52-bc7f59cb8f09";
  it("derives one stable ID from the authenticated UUID", () => {
    expect(getComposioUserId(userId)).toBe(`searchhand_${userId}`);
    expect(getComposioUserId(userId)).toBe(getComposioUserId(userId));
  });
  it("rejects email and arbitrary browser identifiers", () => {
    expect(() => getComposioUserId("owner@example.com")).toThrow();
    expect(connections).toContain("getComposioUserId(user.id)");
    expect(connections).not.toMatch(/body[^\n]+composioUserId/i);
  });
});

describe("callback ownership proof", () => {
  it("accepts the one-time state and rejects tampering", () => {
    const state = createCallbackState();
    expect(verifyCallbackState(state.value, state.hash)).toBe(true);
    expect(verifyCallbackState(`${state.value}x`, state.hash)).toBe(false);
  });
  it("requires user, project, local ownership and exact remote account membership", () => {
    expect(connections).toContain("getOptionalUser()");
    expect(connections).toContain("getCurrentProject()");
    expect(connections).toContain('.eq("user_id", user.id)');
    expect(connections).toContain("userIds: [row.composio_user_id]");
    expect(connections).toContain("item.id === row.composio_connected_account_id");
    expect(connections).toContain("verifyCallbackState");
  });
});

describe("Composio and Shopify contracts", () => {
  it("pins the validated SDK and toolkit versions", () => {
    expect(COMPOSIO_SDK_VERSION).toBe("0.14.0");
    expect(SHOPIFY_TOOLKIT_VERSION).toBe("20260721_00");
    expect(SHOPIFY_CREATE_ARTICLE_ACTION).toBe("SHOPIFY_CREATE_ARTICLE");
    expect(client).toContain("toolkitVersions: { shopify: SHOPIFY_TOOLKIT_VERSION }");
  });
  it("maps remote account states without treating initialisation as success", () => {
    expect(mapComposioStatus("ACTIVE")).toBe("connected");
    expect(mapComposioStatus("EXPIRED")).toBe("needs_reauthentication");
    expect(mapComposioStatus("FAILED")).toBe("error");
    expect(mapComposioStatus("REVOKED")).toBe("disconnected");
    expect(mapComposioStatus("INITIALIZING")).toBe("pending");
  });
  it("extracts only safe shop and article display fields", () => {
    expect(extractShopifyShop({ data: { shop: { id: "gid://shopify/Shop/1", name: "Example", myshopifyDomain: "example.myshopify.com" } } })).toEqual({ id: "gid://shopify/Shop/1", name: "Example", url: "https://example.myshopify.com" });
    expect(extractShopifyArticle({ article: { id: "42", title: "Test", published_at: null } })).toMatchObject({ id: "42", published: false });
  });
});

describe("draft-only deterministic publishing", () => {
  it("always supplies published=false", () => {
    expect(buildShopifyDraftArguments({ blogId: "10", title: "Test", bodyHtml: "<p>Test</p>" })).toEqual({ blog_id: "10", title: "Test", body_html: "<p>Test</p>", published: false });
    expect(publisher).toContain("connectedAccountId: row.composio_connected_account_id");
    expect(publisher).toContain("version: SHOPIFY_TOOLKIT_VERSION");
  });
  it("requires explicit confirmation and does not return the remote ID to the browser", () => {
    expect(testDraftRoute).toContain("z.literal(true)");
    expect(testDraftRoute).not.toContain("remoteArticleId:");
  });
  it("reserves one idempotency key before the external write", () => {
    expect(SHOPIFY_TEST_DRAFT_IDEMPOTENCY_KEY).toBe("shopify_connection_test_v1");
    expect(migration).toContain("unique (publishing_connection_id,idempotency_key)");
    expect(publisher.indexOf('.from("article_publications").insert')).toBeLessThan(publisher.indexOf(`tools.execute(SHOPIFY_CREATE_ARTICLE_ACTION`));
    expect(publisher).toContain("publication_already_attempted");
  });
  it("blocks publishing from disconnected accounts", () => {
    expect(publisher).toContain('row.status !== "connected"');
    expect(publisher).toContain("connection_not_active");
  });
});

describe("database isolation and secret boundaries", () => {
  it("adds RLS policies scoped to both user and project", () => {
    for (const table of ["publishing_connections", "article_publications"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("user_id = auth.uid() and public.can_access_project(project_id)");
    expect(migration).toContain("public.can_access_project(c.project_id)");
  });
  it("allows multiple Shopify stores but makes each remote account reference unique", () => {
    expect(migration).not.toContain("unique (project_id,provider)");
    expect(migration).toContain("unique (composio_connected_account_id)");
  });
  it("has no provider-token columns and withholds tables from browser roles", () => {
    expect(migration).not.toMatch(/access_token|refresh_token|oauth_token/i);
    expect(migration).toContain("revoke all on public.publishing_connections,public.article_publications from anon,authenticated");
    expect(client).toContain('import "server-only"');
    expect(client).not.toContain("NEXT_PUBLIC_COMPOSIO");
  });
  it("preserves history during disconnect and replaces only after callback success", () => {
    expect(connections).toContain('status: "disconnected"');
    expect(connections).not.toContain('.from("article_publications").delete');
    expect(connections.indexOf('status: "connected"')).toBeLessThan(connections.indexOf("replacement_revoke_failed"));
  });
});
