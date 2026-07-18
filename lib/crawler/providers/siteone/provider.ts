import type { CrawlerProvider, CrawlerProviderContext } from "../types.js";
import { normaliseSiteOneReport, parseSiteOneReport } from "./parser.js";
import { inspectSiteOne, removeSuccessfulRun, runSiteOne, type SiteOneRunnerConfig } from "./runner.js";

export class SiteOneProvider implements CrawlerProvider {
  readonly id = "siteone" as const;
  readonly capability = "siteone_crawler" as const;
  constructor(private readonly config: SiteOneRunnerConfig) {}
  async isAvailable() {
    try { return { available: true, version: await inspectSiteOne(this.config.binaryPath) }; }
    catch (error) { return { available: false, version: null, reason: error instanceof Error ? error.message : "SiteOne unavailable." }; }
  }
  async execute(context: CrawlerProviderContext) {
    await context.sink.phase("Starting SiteOne");
    const { report: raw, runDir } = await runSiteOne(context.crawlRunId, context.startUrl, { ...this.config, maxPages: Math.min(context.maxPages,50), maxDepth: Math.min(context.maxDepth,4) }, context.signal);
    await context.sink.phase("Processing SiteOne report");
    const report = parseSiteOneReport(raw);
    const normalised = normaliseSiteOneReport(report, context.startUrl, context.websiteId);
    const startPage = normalised.pages.find((page) => page.normalised_url === context.startUrl || page.requested_url === context.startUrl);
    if (!startPage || !startPage.http_status || startPage.http_status >= 400) throw new Error("SiteOne did not receive a successful start page.");
    for (let index=0; index<normalised.pages.length; index+=10) await context.sink.pages(normalised.pages.slice(index,index+10));
    for (let index=0; index<normalised.issues.length; index+=100) await context.sink.issues(normalised.issues.slice(index,index+100));
    const limited = normalised.pages.length >= Math.min(context.maxPages,50);
    await removeSuccessfulRun(runDir, this.config.workDir);
    return { status: limited ? "completed_with_warnings" as const : "completed" as const, reason: limited ? "page_limit_reached" as const : "completed" as const, providerVersion: normalised.providerVersion, metadata: { parser_version: 1, report_pages: normalised.pages.length, quality_score_imported: false }, pages: normalised.pages.length, issues: normalised.issues.length };
  }
}
