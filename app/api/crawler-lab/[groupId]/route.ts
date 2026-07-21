/* Comparison table types are generated after the accompanying migration is applied. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { compareNormalisedCrawls } from "@/lib/crawler-lab/comparison";
import { getCrawlerLabContext } from "@/lib/crawler-lab/server";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params; if (!z.string().uuid().safeParse(groupId).success) return NextResponse.json({ error: "Invalid comparison." }, { status: 400 });
  const context = await getCrawlerLabContext(); if (!context) return NextResponse.json({ error: "Not found." }, { status: 404 }); const { client, website } = context;
  const { data: group } = await client.from("crawl_comparison_groups").select("*").eq("id", groupId).eq("website_id", website.id).maybeSingle(); if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const runIds = [group.native_crawl_run_id, group.siteone_crawl_run_id];
  const [runsResult, pagesResult, issuesResult] = await Promise.all([client.from("crawl_runs").select("id,status,provider,provider_version,completion_reason,pages_discovered,pages_fetched,pages_succeeded,pages_failed,issues_found,started_at,completed_at,created_at").in("id", runIds), client.from("crawl_page_snapshots").select("crawl_run_id,normalised_url,final_url,http_status,content_type,fetch_error_message,title,indexable").in("crawl_run_id", runIds).limit(200), client.from("crawl_issue_observations").select("crawl_run_id,fingerprint,issue_type,severity,title,description,recommendation,evidence,website_page_id").in("crawl_run_id", runIds).limit(300)]);
  const runs = runsResult.data || []; const nativeId = group.native_crawl_run_id; const siteoneId = group.siteone_crawl_run_id;
  const comparison = compareNormalisedCrawls((pagesResult.data || []).filter((page: any) => page.crawl_run_id === nativeId), (pagesResult.data || []).filter((page: any) => page.crawl_run_id === siteoneId), (issuesResult.data || []).filter((issue: any) => issue.crawl_run_id === nativeId), (issuesResult.data || []).filter((issue: any) => issue.crawl_run_id === siteoneId));
  return NextResponse.json({ group, native: runs.find((run: any) => run.id === nativeId), siteone: runs.find((run: any) => run.id === siteoneId), comparison }, { headers: { "Cache-Control": "private, no-store" } });
}
