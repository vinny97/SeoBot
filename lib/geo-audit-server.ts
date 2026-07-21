import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { domainToASCII } from "node:url";
import { createRequire } from "node:module";
import ipaddr from "ipaddr.js";
import type { GeoAuditExtraction } from "./geo-audit";

type RobotsParser = {
  isAllowed(url: string, userAgent?: string): boolean | undefined;
};

export type AuditFetchResult = {
  finalUrl: string;
  status: number;
  contentType: string;
  body: Uint8Array;
  responseTimeMs: number;
  xRobotsTag: string[];
};

type AuditFetchOptions = {
  userAgent: string;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  startUrl: string;
  accept: string;
};

export class GeoAuditFetchError extends Error {}

const require = createRequire(import.meta.url);
const robotsParser = require("robots-parser") as (url: string, content: string) => RobotsParser;
const blockedV4 = ["0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/4", "240.0.0.0/4"].map((value) => ipaddr.parseCIDR(value));
const blockedV6 = ["::/128", "::1/128", "fc00::/7", "fe80::/10", "ff00::/8"].map((value) => ipaddr.parseCIDR(value));

function blockedAddress(address: string) {
  try {
    let parsed = ipaddr.parse(address);
    if (parsed.kind() === "ipv6") {
      const ipv6 = parsed as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) parsed = ipv6.toIPv4Address();
    }
    const ranges = parsed.kind() === "ipv4" ? blockedV4 : blockedV6;
    return ranges.some((range) => parsed.match(range));
  } catch {
    return true;
  }
}

function validateHostname(hostname: string) {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower === "metadata.google.internal") {
    throw new GeoAuditFetchError("Only public website domains can be audited.");
  }
  if (isIP(lower) && blockedAddress(lower)) throw new GeoAuditFetchError("Only public website domains can be audited.");
}

async function resolvePublicAddresses(hostname: string): Promise<LookupAddress[]> {
  validateHostname(hostname);
  let records: LookupAddress[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new GeoAuditFetchError("The website domain could not be resolved.");
  }
  if (!records.length || records.some((record) => blockedAddress(record.address))) {
    throw new GeoAuditFetchError("Only public website domains can be audited.");
  }
  return records;
}

export function normaliseAuditHomepage(input: string) {
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new GeoAuditFetchError("Enter a valid public website domain.");
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new GeoAuditFetchError("Enter a valid public website domain.");
  }
  const hostname = domainToASCII(url.hostname.toLowerCase());
  if (!hostname) throw new GeoAuditFetchError("Enter a valid public website domain.");
  validateHostname(hostname);
  url.hostname = hostname;
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  return url.toString();
}

function sameScope(candidate: string, start: string) {
  const a = new URL(candidate);
  const b = new URL(start);
  return a.hostname === b.hostname || a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
}

const safeLookup: LookupFunction = (hostname, _options, callback) => {
  void resolvePublicAddresses(hostname)
    .then((records) => {
      const complete = callback as unknown as (...args: unknown[]) => void;
      if (typeof _options === "object" && _options.all) complete(null, records);
      else complete(null, records[0].address, records[0].family);
    })
    .catch((error) => (callback as unknown as (...args: unknown[]) => void)(error));
};

function requestPage(url: URL, options: AuditFetchOptions): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? httpsRequest : httpRequest;
    const outgoing = client(
      url,
      {
        method: "GET",
        headers: { "user-agent": options.userAgent, accept: options.accept, "accept-encoding": "identity" },
        lookup: safeLookup,
        timeout: options.timeoutMs,
      },
      resolve,
    );
    outgoing.on("timeout", () => outgoing.destroy(new GeoAuditFetchError("The website took too long to respond.")));
    outgoing.on("error", reject);
    outgoing.end();
  });
}

export async function auditFetch(input: string, options: AuditFetchOptions): Promise<AuditFetchResult> {
  let current = new URL(input).toString();
  let redirects = 0;
  const started = Date.now();
  while (true) {
    const url = new URL(current);
    await resolvePublicAddresses(url.hostname);
    const response = await requestPage(url, options);
    const status = response.statusCode || 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      if (redirects >= options.maxRedirects) {
        response.resume();
        throw new GeoAuditFetchError("The website redirected too many times.");
      }
      const next = new URL(String(response.headers.location), current).toString();
      if (!sameScope(next, options.startUrl)) {
        response.resume();
        throw new GeoAuditFetchError("The website redirected to a different domain.");
      }
      response.resume();
      current = next;
      redirects += 1;
      continue;
    }
    const declared = Number(response.headers["content-length"] || 0);
    if (declared > options.maxBytes) {
      response.destroy();
      throw new GeoAuditFetchError("The website response was too large for a quick audit.");
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response) {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer);
      size += bytes.byteLength;
      if (size > options.maxBytes) {
        response.destroy();
        throw new GeoAuditFetchError("The website response was too large for a quick audit.");
      }
      chunks.push(bytes);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      finalUrl: current,
      status,
      contentType: String(response.headers["content-type"] || "").toLowerCase().split(";")[0].trim(),
      body,
      responseTimeMs: Date.now() - started,
      xRobotsTag: String(response.headers["x-robots-tag"] || "").toLowerCase().split(",").map((value) => value.trim()).filter(Boolean),
    };
  }
}

function clean(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max) || null;
}

function collectSchemaTypes(value: unknown, result: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, result));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (typeof type === "string") result.add(type.slice(0, 100));
  if (Array.isArray(type)) type.filter((item) => typeof item === "string").forEach((item) => result.add(String(item).slice(0, 100)));
  if (record["@graph"]) collectSchemaTypes(record["@graph"], result);
}

export function extractAuditHtml(html: string, pageUrl: string): GeoAuditExtraction {
  const $ = cheerio.load(html);
  const title = clean($("title").first().text(), 600);
  const metaDescription = clean($("meta[name='description' i]").attr("content") || "", 1_000);
  const canonicalRaw = $("link[rel~='canonical' i]").first().attr("href");
  let canonicalUrl: string | null = null;
  if (canonicalRaw) {
    try { canonicalUrl = new URL(canonicalRaw, pageUrl).toString(); } catch { canonicalUrl = canonicalRaw.slice(0, 2_048); }
  }
  const robotsMeta = ($("meta[name='robots' i]").attr("content") || "").toLowerCase().split(/[,\s]+/).filter(Boolean).slice(0, 20);
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const schema = new Set<string>();
  let structuredDataValid = true;
  $("script[type='application/ld+json']").slice(0, 20).each((_, element) => {
    try { collectSchemaTypes(JSON.parse($(element).text().slice(0, 200_000)), schema); } catch { structuredDataValid = false; }
  });
  const links: GeoAuditExtraction["links"] = [];
  $("a[href]").slice(0, 500).each((_, element) => {
    const href = ($(element).attr("href") || "").trim();
    if (!href || href.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(href)) return;
    try {
      const target = new URL(href, pageUrl);
      const page = new URL(pageUrl);
      const type = sameScope(target.toString(), page.toString()) ? "internal" : "external";
      const rel = ($(element).attr("rel") || "").toLowerCase().split(/\s+/);
      links.push({ type, followed: type === "internal" && !rel.includes("nofollow") });
    } catch {
      links.push({ type: "other", followed: false });
    }
  });
  $("script,style,template,noscript,svg,nav,footer,header,aside,form").remove();
  const visibleText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = visibleText ? visibleText.split(/\s+/).length : 0;
  return { title, metaDescription, canonicalUrl, robotsMeta, h1Count, h2Count, wordCount, structuredDataTypes: [...schema].slice(0, 50), structuredDataValid, links };
}

export function commonAiCrawlersAllowed(robotsUrl: string, content: string, pageUrl: string) {
  const parsed = robotsParser(robotsUrl, content);
  return ["GPTBot", "ClaudeBot", "PerplexityBot"].every((agent) => parsed.isAllowed(pageUrl, agent) !== false);
}
