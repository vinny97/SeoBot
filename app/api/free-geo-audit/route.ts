import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildGeoAuditReport, type GeoAuditResource } from "@/lib/geo-audit";
import {
  auditFetch,
  commonAiCrawlersAllowed,
  extractAuditHtml,
  GeoAuditFetchError,
  normaliseAuditHomepage,
} from "@/lib/geo-audit-server";

export const dynamic = "force-dynamic";

const inputSchema = z.object({ websiteUrl: z.string().trim().min(3).max(2048) });
const attempts = new Map<string, { count: number; resetAt: number }>();
const decoder = new TextDecoder();
const userAgent = "SearchhandAudit/1.0 (+https://searchhand.example)";

function rateLimit(key: string) {
  const now = Date.now();
  if (attempts.size > 1_000) {
    for (const [storedKey, value] of attempts) if (value.resetAt <= now) attempts.delete(storedKey);
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  if (current.count >= 6) return false;
  current.count += 1;
  return true;
}

async function fetchResource(url: string, startUrl: string, accept: string, maxBytes: number): Promise<GeoAuditResource> {
  try {
    const result = await auditFetch(url, {
      userAgent,
      timeoutMs: 8_000,
      maxBytes,
      maxRedirects: 3,
      startUrl,
      accept,
    });
    return { status: result.status, contentType: result.contentType, text: decoder.decode(result.body) };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 10_000) return NextResponse.json({ error: "That request is too large." }, { status: 413 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "anonymous";
  if (!rateLimit(key)) {
    return NextResponse.json({ error: "Too many audits from this connection. Please try again in 15 minutes." }, { status: 429 });
  }

  try {
    const body = inputSchema.parse(await request.json());
    const startUrl = normaliseAuditHomepage(body.websiteUrl);
    const homepage = await auditFetch(startUrl, {
      userAgent,
      timeoutMs: 12_000,
      maxBytes: 2_000_000,
      maxRedirects: 4,
      startUrl,
      accept: "text/html,application/xhtml+xml",
    });
    if (homepage.status < 200 || homepage.status >= 400) {
      return NextResponse.json({ error: `The homepage returned HTTP ${homepage.status}.` }, { status: 422 });
    }
    const html = decoder.decode(homepage.body);
    if (!homepage.contentType.includes("html") && !/<html\b/i.test(html)) {
      return NextResponse.json({ error: "The address did not return a public HTML homepage." }, { status: 422 });
    }

    const finalUrl = homepage.finalUrl;
    const origin = new URL(finalUrl).origin;
    const [robots, sitemap, llmsTxt] = await Promise.all([
      fetchResource(`${origin}/robots.txt`, finalUrl, "text/plain,*/*;q=0.1", 250_000),
      fetchResource(`${origin}/sitemap.xml`, finalUrl, "application/xml,text/xml,*/*;q=0.1", 1_000_000),
      fetchResource(`${origin}/llms.txt`, finalUrl, "text/plain,*/*;q=0.1", 250_000),
    ]);

    let aiCrawlersAllowed = true;
    if (robots && robots.status >= 200 && robots.status < 300) {
      const robotsUrl = `${origin}/robots.txt`;
      aiCrawlersAllowed = commonAiCrawlersAllowed(robotsUrl, robots.text, finalUrl);
    }

    const report = buildGeoAuditReport({
      websiteUrl: finalUrl,
      responseTimeMs: homepage.responseTimeMs,
      xRobotsTag: homepage.xRobotsTag,
      extraction: extractAuditHtml(html, finalUrl),
      robots,
      sitemap,
      llmsTxt,
      aiCrawlersAllowed,
    });

    return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid public website domain." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof GeoAuditFetchError ? error.message : "The audit could not complete this website analysis." },
      { status: 422 },
    );
  }
}
