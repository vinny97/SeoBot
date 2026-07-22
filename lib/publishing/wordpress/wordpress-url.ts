import { domainToASCII } from "node:url";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import { validateWordPressHostname } from "./wordpress-network";

function validatedWordPressUrl(input: string) {
  const raw = input.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try { url = new URL(withProtocol); }
  catch { throw new PublishingIntegrationError("invalid_wordpress_url", "Enter a valid WordPress website URL.", 400); }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new PublishingIntegrationError("unsafe_wordpress_url", "Use a public HTTPS WordPress website URL without embedded credentials.", 400);
  }
  const hostname = domainToASCII(url.hostname.toLowerCase().replace(/\.$/, ""));
  if (!hostname) throw new PublishingIntegrationError("invalid_wordpress_url", "Enter a valid WordPress website URL.", 400);
  validateWordPressHostname(hostname);
  if (url.port && url.port !== "443") throw new PublishingIntegrationError("unsafe_wordpress_port", "Use the standard HTTPS port for WordPress connections.", 400);
  url.hostname = hostname;
  return url;
}

export function normaliseWordPressSiteUrl(input: string) {
  const url = validatedWordPressUrl(input);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

export function validateWordPressRequestUrl(input: string) {
  const url = validatedWordPressUrl(input);
  url.hash = "";
  return url.toString();
}

export function wordpressOriginsMatch(left: string, right: string) {
  const a = new URL(left);
  const b = new URL(right);
  return a.protocol === "https:" && b.protocol === "https:" && a.host === b.host;
}

export function wordpressHostsEquivalent(left: string, right: string) {
  const a = new URL(left);
  const b = new URL(right);
  const hostname = (value: string) => value.toLowerCase().replace(/^www\./, "");
  return a.protocol === "https:" && b.protocol === "https:" && a.port === b.port && hostname(a.hostname) === hostname(b.hostname);
}

export function buildWordPressApiUrl(restApiUrl: string, fixedPath: string) {
  if (!/^[a-z\d/-]+(?:\?[a-z\d=&_-]+)?$/i.test(fixedPath) || fixedPath.includes("..")) {
    throw new PublishingIntegrationError("invalid_wordpress_endpoint", "The WordPress operation is not allowed.", 500);
  }
  const base = new URL(restApiUrl);
  const pathname = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  base.pathname = `${pathname}${fixedPath.replace(/^\/+/, "")}`;
  base.search = fixedPath.includes("?") ? `?${fixedPath.split("?")[1]}` : "";
  if (fixedPath.includes("?")) base.pathname = `${pathname}${fixedPath.split("?")[0].replace(/^\/+/, "")}`;
  return base.toString();
}

export function safeWordPressRemoteUrl(value: unknown, trustedUrl: string) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return wordpressOriginsMatch(url.toString(), trustedUrl) && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

export function wordpressAdminUrl(siteUrl: string, postId: number) {
  const url = new URL(siteUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/wp-admin/post.php`;
  url.search = `post=${postId}&action=edit`;
  return url.toString();
}
