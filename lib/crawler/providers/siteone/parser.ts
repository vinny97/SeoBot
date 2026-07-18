import { createHash } from "node:crypto";
import { normaliseCrawlUrl } from "../../url-normalisation.js";
import type {
  NormalisedIssueObservation,
  NormalisedProviderPage,
} from "../types.js";
import { siteOneReportSchema, type SiteOneReport } from "./schema.js";

const text = (value: unknown, max = 2000) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
type LooseRow = Record<string, unknown>;
const rows = (report: SiteOneReport, name: string): LooseRow[] => {
  const value = (report.tables as Record<string, unknown>)[name] as
    | { rows?: LooseRow[] }
    | undefined;
  return Array.isArray(value?.rows) ? value.rows : [];
};
const urlFromPath = (value: unknown, startUrl: string) => {
  try {
    return normaliseCrawlUrl(String(value || "/"), startUrl);
  } catch {
    return null;
  }
};
const fingerprint = (websiteId: string, type: string, url: string, extra = "") =>
  createHash("sha256").update(`${websiteId}|${type}|${url}|${extra}`).digest("hex");

export function parseSiteOneReport(input: unknown) {
  return siteOneReportSchema.parse(input);
}

export function normaliseSiteOneReport(
  report: SiteOneReport,
  startUrl: string,
  websiteId: string,
) {
  const seoByUrl = new Map<string, Record<string, unknown>>();
  for (const row of rows(report, "seo")) {
    const url = urlFromPath(row.urlPathAndQuery ?? row.url, startUrl);
    if (url) seoByUrl.set(url, row);
  }
  const headingsByUrl = new Map<
    string,
    Array<{ level: 1 | 2; text: string }>
  >();
  for (const row of rows(report, "seo-headings")) {
    const url = urlFromPath(row.urlPathAndQuery ?? row.url, startUrl);
    if (!url || typeof row.headings !== "string") continue;
    const found = [...row.headings.matchAll(/<h([12])>\s*([^<]+)/gi)]
      .slice(0, 100)
      .map((match) => ({
        level: Number(match[1]) as 1 | 2,
        text: match[2].trim().slice(0, 500),
      }));
    headingsByUrl.set(url, found);
  }
  const redirectByUrl = new Map<string, Record<string, unknown>>();
  for (const row of rows(report, "redirects")) {
    const url = urlFromPath(row.url, startUrl);
    if (url) redirectByUrl.set(url, row);
  }
  const pages: NormalisedProviderPage[] = [];
  for (const result of report.results) {
    let url: string;
    try {
      url = normaliseCrawlUrl(result.url, startUrl);
    } catch {
      continue;
    }
    const seo = seoByUrl.get(url) || {};
    const headings = headingsByUrl.get(url) || [];
    const status = number(result.status);
    const robotsIndex = String(seo.robotsIndex ?? "");
    const redirect = redirectByUrl.get(url);
    const target = text(redirect?.targetUrl, 2048);
    pages.push({
      requested_url: url,
      normalised_url: url,
      final_url: target ? urlFromPath(target, startUrl) : url,
      path: new URL(url).pathname,
      page_type: "unknown",
      http_status: status,
      content_type: seoByUrl.has(url) ? "text/html" : null,
      response_time_ms:
        typeof result.elapsedTime === "number"
          ? Math.round(result.elapsedTime * 1000)
          : null,
      response_bytes: result.size ?? null,
      redirect_count: redirect ? 1 : 0,
      title: text(seo.title, 1000),
      meta_description: text(seo.description),
      canonical_url: text(seo.canonical ?? seo.canonicalUrl, 2048),
      robots_meta: robotsIndex === "0" ? ["noindex"] : [],
      x_robots_tag: [],
      indexable: robotsIndex ? robotsIndex !== "0" : status ? status < 400 : null,
      indexability_reason:
        robotsIndex === "0" ? "meta_noindex" : status && status >= 400 ? "http_error" : null,
      h1_count: headings.length
        ? headings.filter((heading) => heading.level === 1).length
        : text(seo.h1)
          ? 1
          : null,
      h2_count: headings.length
        ? headings.filter((heading) => heading.level === 2).length
        : null,
      word_count: number(seo.wordCount),
      language: text(seo.language, 50),
      structured_data_types: [],
      fetch_error_code: status && status >= 400 ? `http_${status}` : null,
      fetch_error_message: status && status >= 400 ? `HTTP ${status}` : null,
      headings,
    });
  }

  const issues: NormalisedIssueObservation[] = [];
  const add = (
    type: string,
    severity: "error" | "warning" | "information",
    url: string,
    title: string,
    description: string,
    recommendation: string,
    evidence: Record<string, unknown> = {},
  ) =>
    issues.push({
      fingerprint: fingerprint(websiteId, type, url, JSON.stringify(evidence)),
      issueType: type,
      severity,
      title,
      description,
      recommendation,
      evidence: { url, provider: "siteone", certainty: "confirmed", ...evidence },
    });
  for (const page of pages) {
    if (page.http_status && page.http_status >= 400)
      add("broken_page","error",page.normalised_url,"Page returned an error response",`SiteOne observed HTTP ${page.http_status}.`,"Restore the page or update links pointing to it.",{ status: page.http_status });
    if (page.content_type === "text/html" && !page.title)
      add("missing_title","warning",page.normalised_url,"Page title is missing","No page title was present in SiteOne's report.","Add a concise, descriptive title.");
    if (page.content_type === "text/html" && !page.meta_description)
      add("missing_meta_description","warning",page.normalised_url,"Meta description is missing","No meta description was present in SiteOne's report.","Add a useful page summary where appropriate.");
    if (page.h1_count === 0)
      add("missing_h1","warning",page.normalised_url,"Main heading is missing","No H1 was present in SiteOne's report.","Add one clear main heading.");
    if (page.indexable === false && page.indexability_reason === "meta_noindex")
      add("noindex","warning",page.normalised_url,"Page asks search engines not to index it","SiteOne reported a noindex directive.","Confirm the exclusion is intentional.");
  }
  for (const row of rows(report, "404")) {
    const url = urlFromPath(row.url, startUrl);
    if (url && !issues.some((issue) => issue.issueType === "broken_page" && issue.evidence.url === url))
      add("broken_internal_link","error",url,"Internal link points to a missing page",`SiteOne found this URL from ${String(row.sourceUqId || "another page")}.`,"Update the link or restore the destination.",{ status: number(row.statusCode) ?? 404, source: row.sourceUqId });
  }
  return { pages, issues, providerVersion: report.crawler.version };
}
