import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildWixCallbackUrl, createCallbackState, verifyCallbackState } from "../lib/composio/state";
import {
  WIX_CREATE_DRAFT_ENDPOINT,
  WIX_RICOS_CONVERT_ENDPOINT,
  WIX_TEST_DRAFT_IDEMPOTENCY_KEY,
  WIX_TOOLKIT_VERSION,
} from "../lib/composio/constants";
import {
  extractWixAuthorMemberId,
  extractWixDraft,
  extractWixRicosDocument,
  extractWixSite,
  mapWixComposioStatus,
  parseWixHashtags,
} from "../lib/publishing/wix-values";

const migration = readFileSync(new URL("../supabase/migrations/202607220001_composio_wix.sql", import.meta.url), "utf8");
const connections = readFileSync(new URL("../lib/publishing/wix-connections.ts", import.meta.url), "utf8");
const publisher = readFileSync(new URL("../lib/publishing/composio-wix-publisher.ts", import.meta.url), "utf8");
const testDraftRoute = readFileSync(new URL("../app/api/integrations/wix/[connectionId]/test-draft/route.ts", import.meta.url), "utf8");

describe("Wix connection identity", () => {
  it("builds a provider-specific callback and rejects state tampering", () => {
    const state = createCallbackState();
    const callback = buildWixCallbackUrl("https://searchhand.example", "connection-id", state.value);
    expect(callback).toContain("/app/integrations/wix/callback");
    expect(verifyCallbackState(state.value, state.hash)).toBe(true);
    expect(verifyCallbackState(`${state.value}x`, state.hash)).toBe(false);
  });

  it("matches the exact user, auth config, account and wix toolkit", () => {
    expect(connections).toContain("getComposioUserId(user.id)");
    expect(connections).toContain("userIds: [row.composio_user_id]");
    expect(connections).toContain("authConfigIds: [row.composio_auth_config_id]");
    expect(connections).toContain('toolkitSlugs: ["wix"]');
    expect(connections).toContain("item.id === row.composio_connected_account_id");
  });
});

describe("Wix safe values", () => {
  it("extracts app-instance and site display data", () => {
    expect(extractWixSite({ data: { instance: { instance_id: "instance-1", permissions: ["Manage Blog"] }, site: { site_display_name: "Example", locale: "en" } } })).toEqual({
      id: "instance-1",
      name: "Example",
      url: null,
      locale: "en",
      permissions: ["Manage Blog"],
    });
  });

  it("extracts drafts, authors and Ricos documents without credentials", () => {
    expect(extractWixAuthorMemberId({ posts: [{ memberId: "author-1" }] })).toBe("author-1");
    expect(extractWixDraft({ draftPost: { id: "draft-1", title: "Test", memberId: "author-1", status: "UNPUBLISHED", url: { base: "https://example.com/blog", path: "/post/test" } } })).toMatchObject({ id: "draft-1", published: false });
    expect(extractWixRicosDocument({ document: { nodes: [], metadata: { version: 1 } } })).toMatchObject({ nodes: [] });
    expect(parseWixHashtags("#seo, AI search, seo")).toEqual(["seo", "AI search"]);
  });

  it("maps Composio connection states conservatively", () => {
    expect(mapWixComposioStatus("ACTIVE")).toBe("connected");
    expect(mapWixComposioStatus("EXPIRED")).toBe("needs_reauthentication");
    expect(mapWixComposioStatus("FAILED")).toBe("error");
    expect(mapWixComposioStatus("INITIALIZING")).toBe("pending");
  });
});

describe("Wix draft publishing safety", () => {
  it("uses pinned endpoints and Composio proxy authentication", () => {
    expect(WIX_TOOLKIT_VERSION).toBe("20260721_00");
    expect(WIX_RICOS_CONVERT_ENDPOINT).toBe("/ricos/v1/ricos-document/convert/to-ricos");
    expect(WIX_CREATE_DRAFT_ENDPOINT).toBe("/blog/v3/draft-posts");
    expect(publisher).toContain("tools.proxyExecute");
    expect(publisher).toContain("connectedAccountId");
    expect(publisher).toContain("publish: false");
  });

  it("requires explicit confirmation and reserves idempotency before draft creation", () => {
    expect(testDraftRoute).toContain("z.literal(true)");
    expect(WIX_TEST_DRAFT_IDEMPOTENCY_KEY).toBe("wix_connection_test_v1");
    expect(publisher.indexOf('.from("article_publications").insert')).toBeLessThan(publisher.indexOf("endpoint: WIX_CREATE_DRAFT_ENDPOINT"));
    expect(publisher).toContain("publication_already_attempted");
  });

  it("expands database provider constraints without weakening isolation", () => {
    expect(migration).toContain("check (provider in ('shopify','wix'))");
    expect(migration).not.toMatch(/access_token|refresh_token|oauth_token/i);
  });
});
