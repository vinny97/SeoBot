import "server-only";
import type { LookupFunction } from "node:net";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import { resolveWordPressPublicAddresses } from "./wordpress-network";
import { buildWordPressApiUrl, normaliseWordPressSiteUrl, validateWordPressRequestUrl, wordpressHostsEquivalent, wordpressOriginsMatch } from "./wordpress-url";
import type { WordPressCredentials, WordPressPost, WordPressRequest, WordPressResponse, WordPressTransport } from "./wordpress-types";

const USER_AGENT = "Searchhand-WordPress/1.0 (+https://searchhand.ai)";
const DEFAULT_MAX_BYTES = 1_000_000;

function safeLookup(): LookupFunction {
  return (hostname, options, callback) => {
    void resolveWordPressPublicAddresses(hostname).then((records) => {
      const complete = callback as unknown as (...args: unknown[]) => void;
      if (typeof options === "object" && options.all) complete(null, records);
      else complete(null, records[0].address, records[0].family);
    }).catch((error) => (callback as unknown as (...args: unknown[]) => void)(error));
  };
}

export const secureWordPressTransport: WordPressTransport = async (input, options = {}) => {
  const { Agent, request: undiciRequest } = await import("undici");
  let current = validateWordPressRequestUrl(input);
  let redirects = 0;
  const initial = current;
  const dispatcher = new Agent({ connect: { lookup: safeLookup(), timeout: 8_000 } });
  try {
    while (true) {
      const url = new URL(current);
      await resolveWordPressPublicAddresses(url.hostname);
      const headers: Record<string, string> = {
        accept: "application/json, text/html;q=0.8",
        "accept-encoding": "identity",
        "user-agent": USER_AGENT,
      };
      let body: string | undefined;
      if (options.credentials) {
        headers.authorization = `Basic ${Buffer.from(`${options.credentials.username}:${options.credentials.applicationPassword}`, "utf8").toString("base64")}`;
      }
      if (options.json !== undefined) {
        headers["content-type"] = "application/json";
        body = JSON.stringify(options.json);
      }
      let response;
      try {
        response = await undiciRequest(current, {
          dispatcher,
          method: options.method || "GET",
          headers,
          body,
          headersTimeout: 12_000,
          bodyTimeout: 15_000,
        });
      } catch {
        throw new PublishingIntegrationError("wordpress_unreachable", "Searchhand could not reach the WordPress website. Check the URL and try again.", 502);
      }
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        await response.body.dump();
        if (redirects >= 3) throw new PublishingIntegrationError("wordpress_redirects", "The WordPress website redirected too many times.", 502);
        const next = validateWordPressRequestUrl(new URL(String(response.headers.location), current).toString());
        if (options.credentials && !wordpressOriginsMatch(next, current)) {
          throw new PublishingIntegrationError("unsafe_wordpress_redirect", "WordPress redirected authentication to a different website, so Searchhand stopped safely.", 400);
        }
        if (!wordpressHostsEquivalent(next, initial)) {
          throw new PublishingIntegrationError("unsafe_wordpress_redirect", "The website redirected outside the expected WordPress domain.", 400);
        }
        current = next;
        redirects += 1;
        continue;
      }
      const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
      const declared = Number(response.headers["content-length"] || 0);
      if (declared > maxBytes) {
        await response.body.dump();
        throw new PublishingIntegrationError("wordpress_response_too_large", "WordPress returned an unexpectedly large response.", 502);
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer);
        size += bytes.byteLength;
        if (size > maxBytes) throw new PublishingIntegrationError("wordpress_response_too_large", "WordPress returned an unexpectedly large response.", 502);
        chunks.push(bytes);
      }
      const data = Buffer.concat(chunks).toString("utf8");
      const responseHeaders: Record<string, string> = {};
      for (const [name, value] of Object.entries(response.headers)) if (value !== undefined) responseHeaders[name] = String(value);
      return { status: response.statusCode, url: current, headers: responseHeaders, body: data };
    }
  } finally { await dispatcher.close(); }
};

function safeJson<T>(response: WordPressResponse): T {
  try { return JSON.parse(response.body) as T; }
  catch { throw new PublishingIntegrationError("wordpress_invalid_response", "WordPress returned an unexpected response. A security plugin may be blocking the REST API.", 502); }
}

function apiError(response: WordPressResponse): never {
  let code = "";
  try { code = String((JSON.parse(response.body) as { code?: unknown }).code || ""); } catch { /* safe generic mapping */ }
  if (response.status === 404) throw new PublishingIntegrationError("wordpress_post_missing", "The WordPress draft no longer exists.", 404);
  if (response.headers["content-type"]?.includes("text/html")) {
    throw new PublishingIntegrationError("wordpress_auth_header_blocked", "The website was reached, but its hosting or security configuration may be blocking WordPress API authentication.", 502);
  }
  if (response.status === 401 || code.includes("application_password") || code === "rest_not_logged_in") {
    throw new PublishingIntegrationError("wordpress_authentication_failed", "The WordPress username or Application Password was not accepted. Create a new Application Password under Users → Profile.", 401);
  }
  if (response.status === 403) {
    throw new PublishingIntegrationError("wordpress_permission_denied", "This WordPress user can sign in but does not have permission to create posts. Use an Editor or Administrator account.", 403);
  }
  throw new PublishingIntegrationError("wordpress_api_error", "WordPress could not complete the request. Check the site REST API and security-plugin settings.", 502);
}

function apiRootCandidate(siteUrl: string) {
  const url = new URL(siteUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/wp-json/`;
  return url.toString();
}

export async function discoverWordPressRestApi(siteInput: string, transport: WordPressTransport = secureWordPressTransport) {
  const submittedUrl = normaliseWordPressSiteUrl(siteInput);
  const homepage = await transport(submittedUrl, { maxBytes: 600_000 });
  const candidates: string[] = [];
  const link = homepage.headers.link?.match(/<([^>]+)>\s*;\s*rel=["']?https:\/\/api\.w\.org\/["']?/i)?.[1];
  const htmlLink = homepage.body.match(/<link[^>]+rel=["'][^"']*https:\/\/api\.w\.org\/[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1]
    || homepage.body.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*https:\/\/api\.w\.org\/[^"']*["']/i)?.[1];
  for (const value of [link, htmlLink, apiRootCandidate(homepage.url), apiRootCandidate(submittedUrl)]) {
    if (!value) continue;
    try {
      const candidate = normaliseWordPressSiteUrl(new URL(value, homepage.url).toString());
      if (wordpressOriginsMatch(candidate, homepage.url) && !candidates.includes(candidate)) candidates.push(candidate);
    } catch { /* ignore untrusted discovery hints */ }
  }
  for (const candidate of candidates) {
    try {
      const response = await transport(candidate, { maxBytes: 1_000_000 });
      if (response.status < 200 || response.status >= 300) continue;
      const root = safeJson<{ name?: unknown; url?: unknown; home?: unknown; namespaces?: unknown; routes?: unknown }>(response);
      const namespaces = Array.isArray(root.namespaces) ? root.namespaces.map(String) : [];
      if (!namespaces.includes("wp/v2") && !(root.routes && typeof root.routes === "object")) continue;
      const siteUrl = typeof root.url === "string" && wordpressOriginsMatch(root.url, response.url)
        ? normaliseWordPressSiteUrl(root.url)
        : submittedUrl;
      return {
        siteName: typeof root.name === "string" ? root.name.slice(0, 200) : null,
        siteUrl,
        restApiUrl: response.url.endsWith("/") ? response.url : `${response.url}/`,
      };
    } catch (error) {
      if (error instanceof PublishingIntegrationError && ["private_wordpress_url", "unsafe_wordpress_redirect"].includes(error.code)) throw error;
    }
  }
  throw new PublishingIntegrationError("wordpress_rest_unavailable", "Searchhand could not reach the WordPress REST API. Check the website URL and confirm the REST API is enabled.", 400);
}

export class WordPressClient {
  constructor(
    readonly siteUrl: string,
    readonly restApiUrl: string,
    private readonly credentials: WordPressCredentials,
    private readonly transport: WordPressTransport = secureWordPressTransport,
  ) {}

  private async request<T>(path: string, options: Omit<WordPressRequest, "credentials"> = {}) {
    const response = await this.transport(buildWordPressApiUrl(this.restApiUrl, path), { ...options, credentials: this.credentials });
    if (response.status < 200 || response.status >= 300) apiError(response);
    return safeJson<T>(response);
  }

  async currentUser() {
    return this.request<{ id?: unknown; name?: unknown; capabilities?: Record<string, unknown> }>("wp/v2/users/me?context=edit");
  }

  async createDraft(input: { title: string; content: string; excerpt?: string; slug?: string }) {
    const post = await this.request<Record<string, unknown>>("wp/v2/posts", {
      method: "POST",
      json: { title: input.title, content: input.content, excerpt: input.excerpt, slug: input.slug, status: "draft" },
    });
    return parsePost(post);
  }

  async getPost(postId: string) {
    if (!/^\d+$/.test(postId)) throw new PublishingIntegrationError("invalid_remote_post", "The WordPress draft reference is invalid.", 400);
    return this.request<Record<string, unknown>>(`wp/v2/posts/${postId}?context=edit`);
  }

  async updateDraft(postId: string, input: { title: string; content: string; excerpt?: string; slug?: string }) {
    const current = await this.getPost(postId);
    if (current.status !== "draft") throw new PublishingIntegrationError("wordpress_post_not_draft", "This WordPress post is no longer a draft, so Searchhand did not overwrite it.", 409);
    const post = await this.request<Record<string, unknown>>(`wp/v2/posts/${postId}`, {
      method: "POST",
      json: { title: input.title, content: input.content, excerpt: input.excerpt, slug: input.slug, status: "draft" },
    });
    return parsePost(post);
  }
}

function parsePost(value: Record<string, unknown>): WordPressPost {
  const id = typeof value.id === "number" ? value.id : Number.NaN;
  if (!Number.isSafeInteger(id) || id <= 0) throw new PublishingIntegrationError("wordpress_invalid_post", "WordPress returned an invalid draft record.", 502);
  return {
    id,
    link: typeof value.link === "string" ? value.link : null,
    status: typeof value.status === "string" ? value.status : "unknown",
    slug: typeof value.slug === "string" ? value.slug : null,
  };
}
