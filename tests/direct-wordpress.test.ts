import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decryptCredentialJson, encryptCredentialJson, encryptionKeyId } from "../lib/publishing/credentials";
import { PublishingIntegrationError } from "../lib/publishing/errors";
import { sanitiseWordPressHtml } from "../lib/publishing/wordpress/direct-wordpress-publisher";
import { discoverWordPressRestApi, WordPressClient } from "../lib/publishing/wordpress/wordpress-client";
import type { WordPressRequest, WordPressResponse, WordPressTransport } from "../lib/publishing/wordpress/wordpress-types";
import { buildWordPressApiUrl, normaliseWordPressSiteUrl, safeWordPressRemoteUrl, wordpressAdminUrl } from "../lib/publishing/wordpress/wordpress-url";

const key = Buffer.alloc(32, 7).toString("base64url");

describe("WordPress credential encryption", () => {
  it("encrypts credentials with authenticated encryption and connection-bound context", () => {
    const credentials = { username: "editor", applicationPassword: "secret app password" };
    const encrypted = encryptCredentialJson(credentials, key, "wordpress:connection-a");
    expect(JSON.stringify(encrypted)).not.toContain(credentials.applicationPassword);
    expect(encrypted.algorithm).toBe("aes-256-gcm");
    expect(encryptionKeyId(key)).toHaveLength(16);
    expect(decryptCredentialJson(encrypted, key, "wordpress:connection-a")).toEqual(credentials);
    expect(() => decryptCredentialJson(encrypted, key, "wordpress:connection-b")).toThrow(PublishingIntegrationError);
  });

  it("fails closed for malformed keys and envelopes", () => {
    expect(() => encryptCredentialJson({}, "not-a-key", "wordpress:x")).toThrow("not configured correctly");
    const encrypted = encryptCredentialJson({}, key, "wordpress:x");
    expect(() => decryptCredentialJson({ ...encrypted, tag: "broken" }, key, "wordpress:x")).toThrow("could not unlock");
  });
});

describe("WordPress URL policy", () => {
  it("normalises public HTTPS root and subdirectory sites", () => {
    expect(normaliseWordPressSiteUrl("example.com/")).toBe("https://example.com");
    expect(normaliseWordPressSiteUrl("https://example.com/blog/?ignored=1")).toBe("https://example.com/blog");
    expect(buildWordPressApiUrl("https://example.com/blog/wp-json/", "wp/v2/users/me?context=edit")).toBe("https://example.com/blog/wp-json/wp/v2/users/me?context=edit");
  });

  it.each(["http://example.com", "https://localhost", "https://127.0.0.1", "https://10.0.0.2", "https://user:pass@example.com", "file:///tmp/site"])("rejects unsafe site URL %s", (value) => {
    expect(() => normaliseWordPressSiteUrl(value)).toThrow(PublishingIntegrationError);
  });

  it("only returns remote and admin URLs within the trusted WordPress origin", () => {
    expect(safeWordPressRemoteUrl("https://example.com/post", "https://example.com")).toBe("https://example.com/post");
    expect(safeWordPressRemoteUrl("https://evil.example/post", "https://example.com")).toBeNull();
    expect(wordpressAdminUrl("https://example.com/blog", 42)).toBe("https://example.com/blog/wp-admin/post.php?post=42&action=edit");
  });
});

function fixture(options: { subdirectory?: boolean; userCanEdit?: boolean; userStatus?: number } = {}) {
  const base = options.subdirectory ? "https://example.com/blog" : "https://example.com";
  const rest = `${base}/wp-json`;
  const calls: Array<{ url: string; request: WordPressRequest }> = [];
  let postStatus = "draft";
  const transport: WordPressTransport = async (url, request = {}) => {
    calls.push({ url, request });
    const response = (status: number, body: unknown, headers: Record<string, string> = { "content-type": "application/json" }): WordPressResponse => ({ status, url, headers, body: typeof body === "string" ? body : JSON.stringify(body) });
    if (url === base || url === `${base}/`) return response(200, `<html><head><link rel="https://api.w.org/" href="${rest}/"></head></html>`, { "content-type": "text/html" });
    if (url.replace(/\/$/, "") === rest) return response(200, { name: "Fixture Site", url: base, namespaces: ["wp/v2"] });
    if (url === `${rest}/wp/v2/users/me?context=edit`) return response(options.userStatus || 200, options.userStatus ? { code: "rest_not_logged_in" } : { id: 9, name: "Test Editor", capabilities: { edit_posts: options.userCanEdit !== false } });
    if (url === `${rest}/wp/v2/posts` && request.method === "POST") return response(201, { id: 42, status: request.json && (request.json as Record<string, unknown>).status, slug: "searchhand-test", link: `${base}/?p=42` });
    if (url === `${rest}/wp/v2/posts/42?context=edit`) return response(200, { id: 42, status: postStatus, link: `${base}/?p=42` });
    if (url === `${rest}/wp/v2/posts/42` && request.method === "POST") return response(200, { id: 42, status: "draft", link: `${base}/?p=42` });
    return response(404, { code: "rest_post_invalid_id" });
  };
  return { base, rest, calls, transport, publishRemotely: () => { postStatus = "publish"; } };
}

describe("WordPress REST fixture", () => {
  it.each([false, true])("discovers the REST API and preserves subdirectories=%s", async (subdirectory) => {
    const site = fixture({ subdirectory });
    const result = await discoverWordPressRestApi(site.base, site.transport);
    expect(result.siteName).toBe("Fixture Site");
    expect(result.restApiUrl).toBe(`${site.rest}/`);
  });

  it("authenticates, forces draft status, and updates the same remote post", async () => {
    const site = fixture();
    const client = new WordPressClient(site.base, `${site.rest}/`, { username: "editor", applicationPassword: "app password" }, site.transport);
    const user = await client.currentUser();
    expect(user.capabilities?.edit_posts).toBe(true);
    const created = await client.createDraft({ title: "Test", content: "<p>Draft</p>" });
    expect(created).toMatchObject({ id: 42, status: "draft" });
    const createCall = site.calls.find((call) => call.url === `${site.rest}/wp/v2/posts`)!;
    expect(createCall.request.json).toMatchObject({ status: "draft" });
    const updated = await client.updateDraft("42", { title: "Updated", content: "<p>Updated</p>" });
    expect(updated.id).toBe(42);
    expect(site.calls.filter((call) => call.url === `${site.rest}/wp/v2/posts`)).toHaveLength(1);
  });

  it("does not overwrite a post that was published remotely", async () => {
    const site = fixture();
    site.publishRemotely();
    const client = new WordPressClient(site.base, `${site.rest}/`, { username: "editor", applicationPassword: "app password" }, site.transport);
    await expect(client.updateDraft("42", { title: "Updated", content: "<p>Updated</p>" })).rejects.toMatchObject({ code: "wordpress_post_not_draft" });
  });

  it("maps rejected credentials without exposing provider bodies", async () => {
    const site = fixture({ userStatus: 401 });
    const client = new WordPressClient(site.base, `${site.rest}/`, { username: "editor", applicationPassword: "wrong password" }, site.transport);
    await expect(client.currentUser()).rejects.toMatchObject({ code: "wordpress_authentication_failed", status: 401 });
  });
});

describe("WordPress draft safety", () => {
  it("removes active content while keeping article markup", () => {
    const cleaned = sanitiseWordPressHtml('<h1 onclick="steal()">Title</h1><script>alert(1)</script><a href="javascript:bad()">Link</a><p>Safe</p>');
    expect(cleaned).toContain("<h1>Title</h1>");
    expect(cleaned).toContain("<p>Safe</p>");
    expect(cleaned).not.toMatch(/script|onclick|javascript/i);
  });

  it("keeps WordPress direct and browser-inaccessible at the database boundary", () => {
    const migration = readFileSync("supabase/migrations/202607220002_direct_wordpress.sql", "utf8");
    expect(migration).toContain("connection_method in ('composio','application_password')");
    expect(migration).toContain("encrypted_credentials jsonb");
    expect(migration).toContain("revoke all on public.publishing_connections,public.article_publications from anon,authenticated");
    expect(migration).toContain("provider in ('shopify','wix','wordpress')");
  });
});
