import "server-only";
import { Agent, request } from "undici";
import { createPublicLookup, resolvePublicAddresses } from "@/lib/crawler/dns-security";
import { PublishingIntegrationError } from "@/lib/publishing/errors";

export type NextJsConnectionInput = { siteUrl: string; apiToken: string };
export type NextJsHealth = { siteName: string; siteUrl: string };

export function normaliseNextJsSiteUrl(value: string) {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); }
  catch { throw new PublishingIntegrationError("invalid_nextjs_url", "Enter a valid public HTTPS Next.js website URL.", 400); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new PublishingIntegrationError("invalid_nextjs_url", "Use a public HTTPS Next.js website URL without embedded credentials.", 400);
  }
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

function integrationUrl(siteUrl: string, path: string) {
  const url = new URL(siteUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
  return url;
}

async function adapterRequest(siteUrl: string, apiToken: string, path: string) {
  const url = integrationUrl(siteUrl, path);
  await resolvePublicAddresses(url.hostname);
  const dispatcher = new Agent({ connect: { lookup: createPublicLookup(), timeout: 10_000 } });
  try {
    const response = await request(url, {
      dispatcher,
      method: "GET",
      headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
      headersTimeout: 15_000,
      bodyTimeout: 15_000,
    });
    const raw = await response.body.text();
    if (response.statusCode === 401 || response.statusCode === 403) {
      throw new PublishingIntegrationError("nextjs_authentication_failed", "The Next.js integration token was not accepted.", 401);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new PublishingIntegrationError("nextjs_request_failed", "The Next.js integration did not complete its health check.", 502);
    }
    try { return JSON.parse(raw) as unknown; }
    catch { throw new PublishingIntegrationError("nextjs_adapter_invalid", "The Next.js integration returned an invalid health response.", 502); }
  } catch (error) {
    if (error instanceof PublishingIntegrationError) throw error;
    throw new PublishingIntegrationError("nextjs_request_failed", "The Next.js integration could not be reached. Check its URL and deployment.", 502);
  } finally {
    await dispatcher.close();
  }
}

export async function checkNextJsIntegration(input: NextJsConnectionInput): Promise<NextJsHealth> {
  const siteUrl = normaliseNextJsSiteUrl(input.siteUrl);
  const apiToken = input.apiToken.trim();
  if (apiToken.length < 16 || apiToken.length > 1_000) throw new PublishingIntegrationError("invalid_nextjs_token", "Enter the Next.js integration token.", 400);
  const data = await adapterRequest(siteUrl, apiToken, "/api/searchhand/v1/health") as { name?: unknown; capabilities?: { drafts?: unknown } };
  if (data?.capabilities?.drafts !== true) throw new PublishingIntegrationError("nextjs_adapter_invalid", "This website does not expose the required Searchhand Next.js draft endpoint.", 422);
  return { siteUrl, siteName: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 200) : new URL(siteUrl).hostname };
}
