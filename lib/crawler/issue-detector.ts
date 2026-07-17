import { createHash } from "node:crypto";
import type { HtmlExtraction } from "./crawl-result.js";
export type DetectedIssue = {
  fingerprint: string;
  issueType: string;
  severity: "error" | "warning" | "information";
  title: string;
  description: string;
  recommendation: string;
  evidence: Record<string, unknown>;
};
const fingerprint = (
  websiteId: string,
  type: string,
  url: string,
  evidence = "",
) =>
  createHash("sha256")
    .update([websiteId, type, url, evidence].join("|"))
    .digest("hex");
export function detectPageIssues(
  websiteId: string,
  url: string,
  html: HtmlExtraction,
  status: number,
  indexabilityCode: string,
  pageType: string,
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const add = (
    issueType: DetectedIssue["issueType"],
    severity: DetectedIssue["severity"],
    title: string,
    description: string,
    recommendation: string,
    evidence: Record<string, unknown> = {},
  ) =>
    issues.push({
      fingerprint: fingerprint(
        websiteId,
        issueType,
        url,
        JSON.stringify(evidence),
      ),
      issueType,
      severity,
      title,
      description,
      recommendation,
      evidence: {
        url,
        certainty: issueType.startsWith("possible_")
          ? "heuristic"
          : "confirmed",
        ...evidence,
      },
    });
  if (status >= 400)
    add(
      "broken_page",
      "error",
      "Page returned an error response",
      `This page returned HTTP ${status} during the crawl.`,
      "Confirm the URL is correct or restore the page.",
      { status },
    );
  if (!html.title)
    add(
      "missing_title",
      "warning",
      "Page title is missing",
      "No HTML title was present in the fetched page.",
      "Add a concise, descriptive title for visitors and search results.",
    );
  else if (html.title.length > 60)
    add(
      "long_title",
      "information",
      "Page title may display incompletely",
      "The title is longer than a common search-result display heuristic.",
      "Review the title for clarity; this is not a strict ranking limit.",
      { length: html.title.length },
    );
  if (!html.metaDescription)
    add(
      "missing_meta_description",
      "warning",
      "Meta description is missing",
      "No meta description was present in the fetched HTML.",
      "Add a useful summary if this page should appear in search results.",
    );
  else if (html.metaDescription.length > 160)
    add(
      "long_meta_description",
      "information",
      "Meta description may display incompletely",
      "The description exceeds a common display heuristic.",
      "Review it for clarity; this is not a strict ranking limit.",
      { length: html.metaDescription.length },
    );
  if (html.h1Count === 0)
    add(
      "missing_h1",
      "warning",
      "Main heading is missing",
      "No visible H1 heading was found in the HTML.",
      "Give the page one clear main heading.",
    );
  if (html.h1Count > 1)
    add(
      "multiple_h1",
      "warning",
      "Multiple main headings detected",
      `${html.h1Count} H1 headings were found.`,
      "Review whether one main heading would make the structure clearer.",
      { count: html.h1Count },
    );
  if (
    indexabilityCode === "meta_noindex" ||
    indexabilityCode === "header_noindex"
  )
    add(
      "noindex",
      "warning",
      "Page asks search engines not to index it",
      "A noindex directive was detected in the fetched response.",
      "Confirm that exclusion is intentional.",
      { source: indexabilityCode },
    );
  if (!html.canonicalUrl)
    add(
      "canonical_missing",
      "information",
      "Canonical link not declared",
      "No canonical URL was declared. This is an observation, not automatically a problem.",
      "Review canonicalisation if the page has duplicate URL variants.",
    );
  if (html.structuredDataTypes.length === 0)
    add(
      "structured_data_missing",
      "information",
      "No structured data detected",
      "No JSON-LD schema type was detected in the fetched HTML.",
      "Consider structured data only where it accurately describes the page.",
    );
  if (html.possibleJsRendering)
    add(
      "possible_js_rendering",
      "warning",
      "This site may rely heavily on JavaScript",
      "The HTML response contains little meaningful text and appears to contain a client application root.",
      "Review this page manually; the current HTML-only crawler may not see all visible content.",
    );
  if (
    ["service", "product", "blog_article", "location"].includes(pageType) &&
    html.wordCount < 150
  )
    add(
      "possible_thin_content",
      "warning",
      "Page has relatively little visible text",
      "This page contains relatively little unique visible text for its apparent purpose.",
      "Review it manually before making changes.",
      { wordCount: html.wordCount },
    );
  return issues;
}

export type PageObservation = {
  url: string;
  title: string | null;
  description: string | null;
  status: number;
  incoming: number;
  fromSitemap: boolean;
  pageType: string;
};
export function detectFetchIssue(
  websiteId: string,
  url: string,
  code: string,
  message: string,
): DetectedIssue {
  return {
    fingerprint: fingerprint(websiteId, "page_fetch_failed", url, code),
    issueType: "page_fetch_failed",
    severity: "warning",
    title: "Page could not be fetched",
    description: message,
    recommendation:
      "Check that the page is publicly reachable and returns an HTML response.",
    evidence: { url, code, certainty: "confirmed" },
  };
}

export function detectSiteIssue(
  websiteId: string,
  origin: string,
  issueType: string,
  title: string,
  description: string,
  recommendation: string,
  evidence: Record<string, unknown> = {},
): DetectedIssue {
  return {
    fingerprint: fingerprint(
      websiteId,
      issueType,
      origin,
      JSON.stringify(evidence),
    ),
    issueType,
    severity: "information",
    title,
    description,
    recommendation,
    evidence: { url: origin, certainty: "confirmed", ...evidence },
  };
}
export function detectCrossPageIssues(
  websiteId: string,
  pages: PageObservation[],
  complete: boolean,
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const add = (
    issueType: string,
    severity: DetectedIssue["severity"],
    title: string,
    description: string,
    recommendation: string,
    url: string,
    evidence: Record<string, unknown>,
  ) =>
    issues.push({
      fingerprint: fingerprint(
        websiteId,
        issueType,
        url,
        JSON.stringify(evidence),
      ),
      issueType,
      severity,
      title,
      description,
      recommendation,
      evidence: {
        url,
        certainty: issueType.startsWith("possible_")
          ? "heuristic"
          : "confirmed",
        ...evidence,
      },
    });
  const titles = new Map<string, PageObservation[]>();
  const descriptions = new Map<string, PageObservation[]>();
  for (const page of pages) {
    if (page.status >= 400 && page.incoming > 0)
      add(
        "broken_internal_link",
        "error",
        "Internal link points to an error page",
        `A crawled internal URL returned HTTP ${page.status}.`,
        "Update or remove links to this URL, or restore the destination page.",
        page.url,
        { status: page.status, incoming_links: page.incoming },
      );
    if (page.title)
      titles.set(page.title.toLowerCase(), [
        ...(titles.get(page.title.toLowerCase()) || []),
        page,
      ]);
    if (page.description)
      descriptions.set(page.description.toLowerCase(), [
        ...(descriptions.get(page.description.toLowerCase()) || []),
        page,
      ]);
    if (
      complete &&
      page.fromSitemap &&
      page.incoming === 0 &&
      new URL(page.url).pathname !== "/"
    )
      add(
        "possible_orphan",
        "warning",
        "Possible orphan page",
        "This sitemap page received no internal links from successfully crawled pages.",
        "Check whether visitors can reach it through useful navigation or contextual links.",
        page.url,
        { incoming_links: 0 },
      );
  }
  for (const group of titles.values())
    if (group.length > 1)
      for (const page of group)
        add(
          "duplicate_title",
          "warning",
          "Duplicate page title detected",
          `The same title was found on ${group.length} crawled pages.`,
          "Give distinct pages descriptive titles where practical.",
          page.url,
          { title: page.title, count: group.length },
        );
  for (const group of descriptions.values())
    if (group.length > 1)
      for (const page of group)
        add(
          "duplicate_meta_description",
          "warning",
          "Duplicate meta description detected",
          `The same description was found on ${group.length} crawled pages.`,
          "Review whether each important page needs a more specific summary.",
          page.url,
          { count: group.length },
        );
  return issues;
}
