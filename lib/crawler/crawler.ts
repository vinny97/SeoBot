import pLimit from "p-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../config/worker-env.js";
import type { ClaimedCrawlJob } from "../jobs/types.js";
import { heartbeatJob } from "../jobs/heartbeat-job.js";
import { CrawlError, safeErrorMessage } from "./errors.js";
import { safeFetch } from "./safe-http-client.js";
import { parseRobots } from "./robots.js";
import { parseSitemap } from "./sitemaps.js";
import { extractHtml } from "./html-extractor.js";
import { calculateIndexability } from "./indexability.js";
import {
  detectCrossPageIssues,
  detectFetchIssue,
  detectPageIssues,
  detectSiteIssue,
  type PageObservation,
} from "./issue-detector.js";
import { CrawlPersistence } from "./persistence.js";
import {
  hasUnknownQueryParameters,
  isUnsafeActionUrl,
  normaliseCrawlUrl,
} from "./url-normalisation.js";
import { isWithinCrawlScope } from "./url-scope.js";
import type { CrawlCounters, QueueItem } from "./crawl-result.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function crawlWebsite(
  client: SupabaseClient,
  job: ClaimedCrawlJob,
  workerId: string,
  config: WorkerConfig,
  signal: AbortSignal,
) {
  const startUrl = normaliseCrawlUrl(job.url);
  const origin = new URL(startUrl).origin;
  const fullSite = job.configuration.full_site === true;
  const maxPages = Math.min(job.max_pages, fullSite ? config.CRAWLER_FULL_SITE_MAX_PAGES : config.CRAWLER_MAX_PAGES);
  const maxDepth = Math.min(job.max_depth, fullSite ? config.CRAWLER_FULL_SITE_MAX_DEPTH : config.CRAWLER_MAX_DEPTH);
  const maxDurationMs = fullSite ? config.CRAWLER_FULL_SITE_MAX_DURATION_MS : config.CRAWLER_MAX_DURATION_MS;
  const concurrency = Math.min(
    job.configuration.concurrency || config.CRAWLER_CONCURRENCY,
    2,
  );
  const delay = Math.max(
    job.configuration.request_delay_ms || config.CRAWLER_REQUEST_DELAY_MS,
    250,
  );
  const persistence = new CrawlPersistence(client, job);
  const counters: CrawlCounters = {
    pages_discovered: 1,
    pages_queued: 1,
    pages_fetched: 0,
    pages_succeeded: 0,
    pages_failed: 0,
    pages_skipped: 0,
    issues_found: 0,
    progress: 0,
  };
  const queue: QueueItem[] = [
    { url: startUrl, normalisedUrl: startUrl, depth: 0, source: "start_url" },
  ];
  const seen = new Set([startUrl]);
  const fingerprints = new Set<string>();
  const observations: PageObservation[] = [];
  const incoming = new Map<string, number>();
  const crawlStarted = Date.now();
  let crawlWarnings = false;
  let nextRequestAt = 0;
  const politeness = async () => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    nextRequestAt = Math.max(nextRequestAt, Date.now()) + delay;
    if (wait) await sleep(wait);
  };
  const fetchOptions = {
    userAgent: config.userAgent,
    timeoutMs: config.CRAWLER_REQUEST_TIMEOUT_MS,
    maxBytes: config.CRAWLER_MAX_HTML_BYTES,
    maxRedirects: config.CRAWLER_MAX_REDIRECTS,
    startUrl,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
  };
  const robotsUrl = `${origin}/robots.txt`;
  let robots: ReturnType<typeof parseRobots> | null = null;
  try {
    await politeness();
    const fetched = await safeFetch(robotsUrl, {
      ...fetchOptions,
      maxBytes: 500000,
      accept: "text/plain,text/*;q=0.8",
    });
    if ([401, 403].includes(fetched.status))
      throw new CrawlError(
        "robots_access_denied",
        "robots.txt denied access, so the crawl stopped safely.",
        "robots_blocked",
      );
    const content = new TextDecoder().decode(fetched.body);
    robots = parseRobots(
      robotsUrl,
      fetched.status === 404 ? "" : content,
      config.CRAWLER_USER_AGENT,
    );
    await persistence.saveRobots({
      url: robotsUrl,
      status: fetched.status,
      content: fetched.status === 404 ? null : content,
      hash: robots.contentHash,
      rules: robots.rules,
    });
    if (fetched.status === 404) {
      const issue = detectSiteIssue(
        job.website_id,
        origin,
        "robots_unavailable",
        "robots.txt was not found",
        "The site returned HTTP 404 for robots.txt.",
        "Add a robots.txt file if you need to publish crawler rules or sitemap locations.",
        { status: 404 },
      );
      await persistence.saveIssues(null, [issue]);
      fingerprints.add(issue.fingerprint);
      counters.issues_found++;
    }
  } catch (error) {
    if (error instanceof CrawlError && error.kind === "robots_blocked")
      throw error;
    await persistence.saveRobots({
      url: robotsUrl,
      status: null,
      content: null,
      hash: null,
      errorCode:
        error instanceof CrawlError ? error.code : "robots_unavailable",
      errorMessage: safeErrorMessage(error),
    });
    const issue = detectSiteIssue(
      job.website_id,
      origin,
      "robots_unavailable",
      "robots.txt could not be checked",
      safeErrorMessage(error),
      "Confirm that robots.txt is publicly reachable if crawler rules are required.",
      { code: error instanceof CrawlError ? error.code : "robots_unavailable" },
    );
    await persistence.saveIssues(null, [issue]);
    fingerprints.add(issue.fingerprint);
    counters.issues_found++;
    crawlWarnings = true;
  }
  const sitemapCandidates = [
    ...(robots?.sitemaps || []),
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ];
  const inspected = new Set<string>();
  const pendingSitemaps = sitemapCandidates.map((url) => ({ url, depth: 0 }));
  const maxSitemaps = fullSite ? 1000 : 10;
  let validSitemap = false;
  while (pendingSitemaps.length && inspected.size < maxSitemaps) {
    const candidate = pendingSitemaps.shift()!;
    let normalised: string;
    try {
      normalised = normaliseCrawlUrl(candidate.url, startUrl);
      if (
        !isWithinCrawlScope(normalised, startUrl) ||
        inspected.has(normalised) ||
        candidate.depth > 2
      )
        continue;
    } catch {
      continue;
    }
    inspected.add(normalised);
    try {
      await politeness();
      const fetched = await safeFetch(normalised, {
        ...fetchOptions,
        maxBytes: config.CRAWLER_MAX_SITEMAP_BYTES,
        accept: "application/xml,text/xml,text/plain;q=0.8",
      });
      if (fetched.status !== 200)
        throw new CrawlError(
          "sitemap_http_error",
          `Sitemap returned HTTP ${fetched.status}.`,
          "invalid_response",
        );
      const parsed = parseSitemap(new TextDecoder().decode(fetched.body));
      if (parsed.type !== "unknown") validSitemap = true;
      await persistence.saveSitemap({
        url: normalised,
        type: parsed.type,
        status: fetched.status,
        urlCount: parsed.urls.length,
        hash: parsed.contentHash,
        lastModified: parsed.lastModifiedMax,
      });
      for (const url of parsed.urls.slice(0, 5000)) {
        try {
          const value = normaliseCrawlUrl(url, startUrl);
          if (isWithinCrawlScope(value, startUrl) && !seen.has(value)) {
            seen.add(value);
            queue.push({
              url: value,
              normalisedUrl: value,
              depth: 0,
              source: "sitemap",
            });
            counters.pages_discovered++;
          }
        } catch {}
      }
      for (const nested of parsed.nested.slice(0, fullSite ? 1000 : 20))
        pendingSitemaps.push({ url: nested, depth: candidate.depth + 1 });
    } catch (error) {
      await persistence.saveSitemap({
        url: normalised,
        type: "unknown",
        status: null,
        urlCount: 0,
        hash: null,
        lastModified: null,
        errorCode: error instanceof CrawlError ? error.code : "invalid_sitemap",
        errorMessage: safeErrorMessage(error),
      });
    }
  }
  if (!validSitemap) {
    const issue = detectSiteIssue(
      job.website_id,
      origin,
      "sitemap_missing",
      "No valid XML sitemap was found",
      "The crawler did not find a readable sitemap in robots.txt or at the common sitemap locations.",
      "Publish an XML sitemap when it would help search engines discover important pages.",
    );
    await persistence.saveIssues(null, [issue]);
    fingerprints.add(issue.fingerprint);
    counters.issues_found++;
  }
  counters.pages_queued = Math.min(queue.length, maxPages);
  const limit = pLimit(concurrency);
  while (queue.length && counters.pages_fetched < maxPages) {
    if (signal.aborted)
      throw new CrawlError(
        "cancelled",
        "Website analysis was cancelled.",
        "cancelled",
      );
    if (Date.now() - crawlStarted > maxDurationMs)
      throw new CrawlError(
        "crawl_timed_out",
        "Website analysis exceeded the configured time limit.",
        "transient",
        true,
      );
    const batch = queue.splice(
      0,
      Math.min(concurrency, maxPages - counters.pages_fetched),
    );
    await Promise.all(
      batch.map((item) =>
        limit(async () => {
          if (
            item.depth > maxDepth ||
            isUnsafeActionUrl(item.url) ||
            (hasUnknownQueryParameters(item.url) && item.source !== "sitemap")
          ) {
            counters.pages_skipped++;
            return;
          }
          if (
            robots &&
            !robots.parser.isAllowed(item.url, config.CRAWLER_USER_AGENT)
          ) {
            counters.pages_skipped++;
            await persistence.saveFailure(
              item,
              "robots_blocked",
              "Crawling was disallowed by robots.txt.",
            );
            return;
          }
          const { data: run } = await client
            .from("crawl_runs")
            .select("cancel_requested_at")
            .eq("id", job.crawl_run_id)
            .single();
          if (run?.cancel_requested_at)
            throw new CrawlError(
              "cancelled",
              "Website analysis was cancelled.",
              "cancelled",
            );
          try {
            await politeness();
            const fetched = await safeFetch(item.url, fetchOptions);
            counters.pages_fetched++;
            if (
              !["text/html", "application/xhtml+xml"].includes(
                fetched.contentType,
              )
            )
              throw new CrawlError(
                "unsupported_content_type",
                "The response was not an HTML page.",
                "invalid_response",
              );
            const html = extractHtml(
              new TextDecoder().decode(fetched.body),
              fetched.finalUrl,
              startUrl,
            );
            const indexability = calculateIndexability({
              status: fetched.status,
              contentType: fetched.contentType,
              robotsAllowed: true,
              robotsMeta: html.robotsMeta,
              xRobotsTag: fetched.xRobotsTag,
              canonicalUrl: html.canonicalUrl,
              finalUrl: fetched.finalUrl,
            });
            const pageType = (
              await persistence.savePage(item, fetched, html, indexability, [])
            ).pageType;
            const issues = detectPageIssues(
              job.website_id,
              item.normalisedUrl,
              html,
              fetched.status,
              indexability.code,
              pageType,
            );
            await persistence.saveIssues(
              (
                await client
                  .from("website_pages")
                  .select("id")
                  .eq("website_id", job.website_id)
                  .eq("normalised_url", item.normalisedUrl)
                  .single()
              ).data?.id || null,
              issues,
            );
            issues.forEach((issue) => fingerprints.add(issue.fingerprint));
            counters.issues_found += issues.length;
            counters.pages_succeeded++;
            observations.push({
              url: item.normalisedUrl,
              title: html.title,
              description: html.metaDescription,
              status: fetched.status,
              incoming: 0,
              fromSitemap: item.source === "sitemap",
              pageType,
            });
            for (const link of html.links) {
              if (link.type === "internal" && link.normalisedTargetUrl)
                incoming.set(
                  link.normalisedTargetUrl,
                  (incoming.get(link.normalisedTargetUrl) || 0) + 1,
                );
              if (
                link.type !== "internal" ||
                !link.followed ||
                !link.normalisedTargetUrl ||
                item.depth >= maxDepth ||
                seen.has(link.normalisedTargetUrl) ||
                seen.size >= maxPages * 10
              )
                continue;
              seen.add(link.normalisedTargetUrl);
              queue.push({
                url: link.targetUrl,
                normalisedUrl: link.normalisedTargetUrl,
                depth: item.depth + 1,
                source: "internal_link",
              });
              counters.pages_discovered++;
            }
          } catch (error) {
            if (error instanceof CrawlError && error.kind === "cancelled")
              throw error;
            counters.pages_fetched++;
            counters.pages_failed++;
            await persistence.saveFailure(
              item,
              error instanceof CrawlError ? error.code : "fetch_failed",
              safeErrorMessage(error),
            );
            const fetchIssue = detectFetchIssue(
              job.website_id,
              item.normalisedUrl,
              error instanceof CrawlError ? error.code : "fetch_failed",
              safeErrorMessage(error),
            );
            await persistence.saveIssues(null, [fetchIssue]);
            fingerprints.add(fetchIssue.fingerprint);
            counters.issues_found++;
          } finally {
            counters.pages_queued = Math.min(
              counters.pages_fetched + queue.length,
              maxPages,
            );
            counters.progress = Math.min(
              99,
              Math.round(
                (counters.pages_fetched /
                  Math.max(counters.pages_discovered, 1)) *
                  100,
              ),
            );
            await heartbeatJob(
              client,
              job.job_id,
              workerId,
              counters,
              item.normalisedUrl,
              config.CRAWLER_JOB_LOCK_MINUTES,
            );
          }
        }),
      ),
    );
  }
  const completeEnough =
    counters.pages_failed === 0 && queue.length === 0;
  observations.forEach((page) => {
    page.incoming = incoming.get(page.url) || 0;
  });
  await persistence.finaliseInternalLinks(incoming);
  const crossIssues = detectCrossPageIssues(
    job.website_id,
    observations,
    completeEnough,
  );
  await persistence.saveIssues(null, crossIssues);
  crossIssues.forEach((issue) => fingerprints.add(issue.fingerprint));
  counters.issues_found += crossIssues.length;
  if (completeEnough && !crawlWarnings)
    await persistence.resolveAbsentIssues(fingerprints);
  return {
    counters,
    status:
      completeEnough && !crawlWarnings
        ? ("completed" as const)
        : ("completed_with_warnings" as const),
  };
}
