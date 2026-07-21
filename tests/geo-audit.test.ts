import { describe, expect, it } from "vitest";
import { extractHtml } from "../lib/crawler/html-extractor.js";
import { buildGeoAuditReport } from "../lib/geo-audit.js";

const strongHtml = `<!doctype html><html><head><title>Example business</title><meta name="description" content="A clear description"><link rel="canonical" href="https://example.com/"><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>Example business</h1><h2>Services</h2><p>${"Useful business context ".repeat(100)}</p>${Array.from({ length: 6 }, (_, index) => `<a href="/page-${index}">Page ${index}</a>`).join("")}</body></html>`;

function evidence(html = strongHtml) {
  return {
    websiteUrl: "https://example.com/",
    responseTimeMs: 500,
    xRobotsTag: [] as string[],
    extraction: extractHtml(html, "https://example.com/", "https://example.com/"),
    robots: { status: 200, contentType: "text/plain", text: "User-agent: *\nAllow: /" },
    sitemap: { status: 200, contentType: "application/xml", text: "<urlset><url><loc>https://example.com/</loc></url></urlset>" },
    llmsTxt: { status: 200, contentType: "text/plain", text: "# Example\nA useful summary for language models." },
    aiCrawlersAllowed: true,
  };
}

describe("free GEO audit scoring", () => {
  it("awards a strong score when machine-readable signals are present", () => {
    const report = buildGeoAuditReport(evidence());
    expect(report.score).toBe(100);
    expect(report.grade).toBe("Strong foundation");
    expect(report.topFixes).toHaveLength(0);
  });

  it("prioritises blocking and missing signals", () => {
    const weakHtml = "<html><head><meta name='robots' content='noindex'></head><body><p>Small</p></body></html>";
    const report = buildGeoAuditReport({
      ...evidence(weakHtml),
      robots: { status: 200, contentType: "text/plain", text: "User-agent: *\nDisallow: /" },
      sitemap: null,
      llmsTxt: null,
      aiCrawlersAllowed: false,
    });
    expect(report.score).toBeLessThan(40);
    expect(report.topFixes[0]).toContain("GPTBot");
    expect(report.checks.find((item) => item.id === "indexability")?.status).toBe("fail");
  });
});
