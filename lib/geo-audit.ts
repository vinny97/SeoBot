export type GeoAuditStatus = "pass" | "warning" | "fail";

export type GeoAuditExtraction = {
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string[];
  h1Count: number;
  h2Count: number;
  wordCount: number;
  structuredDataTypes: string[];
  structuredDataValid: boolean;
  links: Array<{ type: string; followed: boolean }>;
};

export type GeoAuditCheck = {
  id: string;
  label: string;
  status: GeoAuditStatus;
  summary: string;
  recommendation: string | null;
  weight: number;
  points: number;
};

export type GeoAuditReport = {
  websiteUrl: string;
  domain: string;
  scannedAt: string;
  score: number;
  grade: "Strong foundation" | "Needs attention" | "Hard to discover";
  summary: string;
  checks: GeoAuditCheck[];
  topFixes: string[];
  scopeNote: string;
};

export type GeoAuditResource = {
  status: number;
  contentType: string;
  text: string;
} | null;

export type GeoAuditEvidence = {
  websiteUrl: string;
  responseTimeMs: number;
  xRobotsTag: string[];
  extraction: GeoAuditExtraction;
  robots: GeoAuditResource;
  sitemap: GeoAuditResource;
  llmsTxt: GeoAuditResource;
  aiCrawlersAllowed: boolean;
};

function check(
  id: string,
  label: string,
  status: GeoAuditStatus,
  summary: string,
  recommendation: string | null,
  weight: number,
): GeoAuditCheck {
  const multiplier = status === "pass" ? 1 : status === "warning" ? 0.5 : 0;
  return { id, label, status, summary, recommendation, weight, points: weight * multiplier };
}

export function buildGeoAuditReport(evidence: GeoAuditEvidence): GeoAuditReport {
  const { extraction } = evidence;
  const robotsExists = Boolean(evidence.robots && evidence.robots.status >= 200 && evidence.robots.status < 300);
  const sitemapExists = Boolean(
    evidence.sitemap &&
      evidence.sitemap.status >= 200 &&
      evidence.sitemap.status < 300 &&
      /<(?:urlset|sitemapindex)\b/i.test(evidence.sitemap.text),
  );
  const llmsExists = Boolean(
    evidence.llmsTxt &&
      evidence.llmsTxt.status >= 200 &&
      evidence.llmsTxt.status < 300 &&
      evidence.llmsTxt.text.trim().length >= 20,
  );
  const noindex = [...extraction.robotsMeta, ...evidence.xRobotsTag].some((value) =>
    value.toLowerCase().includes("noindex"),
  );
  const internalLinks = extraction.links.filter((link) => link.type === "internal" && link.followed).length;

  const checks: GeoAuditCheck[] = [
    check(
      "crawler-access",
      "AI crawler access",
      evidence.aiCrawlersAllowed ? "pass" : "fail",
      evidence.aiCrawlersAllowed
        ? robotsExists
          ? "Common AI crawlers are not blocked by your robots rules."
          : "No blocking robots rules were found."
        : "Your robots rules block one or more common AI crawlers from the homepage.",
      evidence.aiCrawlersAllowed
        ? null
        : "Allow GPTBot, ClaudeBot and PerplexityBot to access the public pages you want discovered.",
      18,
    ),
    check(
      "indexability",
      "Search indexability",
      noindex ? "fail" : "pass",
      noindex ? "The homepage contains a noindex instruction." : "The homepage is not marked noindex.",
      noindex ? "Remove the noindex instruction if this page should appear in search." : null,
      14,
    ),
    check(
      "structured-data",
      "Structured data",
      !extraction.structuredDataValid
        ? "fail"
        : extraction.structuredDataTypes.length > 0
          ? "pass"
          : "warning",
      !extraction.structuredDataValid
        ? "At least one JSON-LD block could not be parsed."
        : extraction.structuredDataTypes.length > 0
          ? `Found ${extraction.structuredDataTypes.slice(0, 3).join(", ")} schema.`
          : "No JSON-LD schema was found on the homepage.",
      extraction.structuredDataValid && extraction.structuredDataTypes.length > 0
        ? null
        : "Add valid Organization and relevant business or service schema so machines can identify your entity.",
      14,
    ),
    check(
      "metadata",
      "Title and description",
      extraction.title && extraction.metaDescription
        ? "pass"
        : extraction.title || extraction.metaDescription
          ? "warning"
          : "fail",
      extraction.title && extraction.metaDescription
        ? "The homepage has both a title and meta description."
        : `Missing ${[!extraction.title && "title", !extraction.metaDescription && "meta description"].filter(Boolean).join(" and ")}.`,
      extraction.title && extraction.metaDescription
        ? null
        : "Write a clear title and description that say what the business does and who it helps.",
      12,
    ),
    check(
      "content-structure",
      "Content structure",
      extraction.h1Count === 1 && extraction.h2Count > 0 && extraction.wordCount >= 250
        ? "pass"
        : extraction.h1Count > 0 && extraction.wordCount >= 100
          ? "warning"
          : "fail",
      `Found ${extraction.h1Count} H1, ${extraction.h2Count} H2${extraction.h2Count === 1 ? "" : "s"} and about ${extraction.wordCount} visible words.`,
      extraction.h1Count === 1 && extraction.h2Count > 0 && extraction.wordCount >= 250
        ? null
        : "Give the page one descriptive H1, useful subheadings and enough plain-language context to explain the offer.",
      12,
    ),
    check(
      "sitemap",
      "XML sitemap",
      sitemapExists ? "pass" : "warning",
      sitemapExists ? "A valid XML sitemap was found at /sitemap.xml." : "A valid sitemap was not found at /sitemap.xml.",
      sitemapExists ? null : "Publish an XML sitemap and reference it from robots.txt.",
      10,
    ),
    check(
      "llms-txt",
      "llms.txt guidance",
      llmsExists ? "pass" : "warning",
      llmsExists ? "An llms.txt file was found." : "No useful llms.txt file was found.",
      llmsExists ? null : "Consider adding llms.txt as optional guidance for AI systems; it complements, rather than replaces, strong pages and schema.",
      6,
    ),
    check(
      "internal-links",
      "Internal discovery",
      internalLinks >= 5 ? "pass" : internalLinks >= 2 ? "warning" : "fail",
      `Found ${internalLinks} followed internal link${internalLinks === 1 ? "" : "s"} on the homepage.`,
      internalLinks >= 5 ? null : "Link clearly to your most important services, proof, about and contact pages.",
      8,
    ),
    check(
      "response-speed",
      "Homepage response",
      evidence.responseTimeMs <= 1_500 ? "pass" : evidence.responseTimeMs <= 3_000 ? "warning" : "fail",
      `The server responded in ${(evidence.responseTimeMs / 1000).toFixed(1)} seconds during this check.`,
      evidence.responseTimeMs <= 1_500 ? null : "Improve server response time so crawlers and visitors can reach the content reliably.",
      6,
    ),
  ];

  const score = Math.round(checks.reduce((total, item) => total + item.points, 0));
  const grade = score >= 80 ? "Strong foundation" : score >= 55 ? "Needs attention" : "Hard to discover";
  const topFixes = checks
    .filter((item) => item.status !== "pass" && item.recommendation)
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))
    .slice(0, 3)
    .map((item) => item.recommendation as string);

  return {
    websiteUrl: evidence.websiteUrl,
    domain: new URL(evidence.websiteUrl).hostname.replace(/^www\./, ""),
    scannedAt: new Date().toISOString(),
    score,
    grade,
    summary:
      score >= 80
        ? "Your homepage gives search engines and AI crawlers a strong technical foundation."
        : score >= 55
          ? "Your site is discoverable, but a few technical gaps make it harder for search and AI systems to understand."
          : "Important technical signals are missing or blocked, which can limit discovery in search and AI systems.",
    checks,
    topFixes,
    scopeNote:
      "This quick audit checks public technical GEO readiness. It does not measure live mentions or citations inside ChatGPT, Claude, Gemini or Perplexity.",
  };
}
