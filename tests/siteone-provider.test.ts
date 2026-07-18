import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { CrawlerProviderRegistry } from "../lib/crawler/providers/registry";
import { nativeProviderDescriptor } from "../lib/crawler/providers/native-provider";
import { buildSiteOneArgs } from "../lib/crawler/providers/siteone/runner";
import { normaliseSiteOneReport, parseSiteOneReport } from "../lib/crawler/providers/siteone/parser";
import type { CrawlerProvider } from "../lib/crawler/providers/types";

const config = { binaryPath: "/usr/bin/siteone-crawler", workDir: "/tmp/siteone", maxPages: 50, maxDepth: 4, processTimeoutMs: 900000 };

describe("crawler provider registry", () => {
  it("rejects unknown providers", () => expect(() => new CrawlerProviderRegistry().get("shell")).toThrow("Unknown"));
  it("registers the native descriptor", () => {
    const provider = { ...nativeProviderDescriptor, execute: async () => { throw new Error("not used"); } } as CrawlerProvider;
    expect(new CrawlerProviderRegistry().register(provider).get("native").capability).toBe("native_crawler");
  });
});

describe("SiteOne command", () => {
  it("passes a hostile URL as one inert argument", () => {
    const url = "https://example.com/;--workers=999";
    const args = buildSiteOneArgs(url, "/tmp/run/report.json", config);
    expect(args[0]).toBe(`--url=${url}`);
    expect(args).toContain("--workers=1");
    expect(args).not.toContain("--workers=999");
    expect(args).toContain("--disable-all-assets");
    expect(args).toContain("--no-cache");
  });
  it("hard caps pages and depth", () => {
    const args = buildSiteOneArgs("https://example.com", "/tmp/report.json", { ...config, maxPages: 500, maxDepth: 20 });
    expect(args).toContain("--max-visited-urls=50");
    expect(args).toContain("--max-depth=4");
  });
});

describe("SiteOne v2 parser", () => {
  it("normalises facts and curated issues without importing quality score", async () => {
    const raw = JSON.parse(await readFile("tests/fixtures/siteone-v2-report.json", "utf8"));
    const report = parseSiteOneReport(raw);
    const result = normaliseSiteOneReport(report, "https://example.com/", "00000000-0000-4000-8000-000000000001");
    expect(result.providerVersion).toBe("2.5.1.20260627");
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].headings).toEqual([{ level: 1, text: "Welcome" }, { level: 2, text: "Services" }]);
    expect(result.issues.some((issue) => issue.issueType === "missing_title")).toBe(true);
    expect(result.issues.some((issue) => issue.issueType === "noindex")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("9.9");
  });
  it("rejects truncated or structurally invalid reports", () => expect(() => parseSiteOneReport({ crawler: {}, results: [] })).toThrow());
});
