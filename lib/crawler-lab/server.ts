/* The crawler-lab tables are introduced by the migration in this milestone; regenerate database types after applying it. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentProject, getOptionalUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const crawlerLabEnabled = () => process.env.CRAWLER_LAB_ENABLED === "true";
export const crawlerLabOfflineAfterSeconds = () => Math.min(900, Math.max(15, Number(process.env.CRAWLER_WORKER_OFFLINE_AFTER_SECONDS || 60) || 60));

export async function getCrawlerLabContext() {
  const [user, project, client] = await Promise.all([getOptionalUser(), getCurrentProject(), createClient()]);
  if (!user || !project || !client || !crawlerLabEnabled()) return null;
  const db = client as any;
  const { data: allowed } = await db.rpc("can_access_crawler_lab", { target_project_id: project.id });
  if (!allowed) return null;
  const { data: website } = await db.from("websites").select("id,url,domain,display_name,crawl_authorised_at,official_crawl_run_id").eq("project_id", project.id).eq("is_primary", true).maybeSingle();
  if (!website) return null;
  return { user, project, website, client: db };
}

export async function readCrawlerLab() {
  const context = await getCrawlerLabContext();
  if (!context) return null;
  const { client, project, website } = context;
  const [availabilityResult, groupsResult] = await Promise.all([
    client.rpc("crawler_lab_worker_availability", { target_project_id: project.id, stale_after_seconds: crawlerLabOfflineAfterSeconds() }),
    client.from("crawl_comparison_groups").select("id,status,review_result,review_notes,promoted_provider,promoted_at,created_at,completed_at,native_crawl_run_id,siteone_crawl_run_id").eq("website_id", website.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const groups = groupsResult.data || [];
  const runIds = groups.flatMap((group: any) => [group.native_crawl_run_id, group.siteone_crawl_run_id]);
  const { data: runs } = runIds.length ? await client.from("crawl_runs").select("id,status,provider,provider_version,completion_reason,pages_discovered,pages_fetched,pages_succeeded,pages_failed,issues_found,started_at,completed_at,created_at").in("id", runIds) : { data: [] };
  const byId = new Map((runs || []).map((run: any) => [run.id, run]));
  return { website, project: { id: project.id, name: project.name, workspaceId: project.workspace_id }, availability: availabilityResult.data, groups: groups.map((group: any) => ({ ...group, native: byId.get(group.native_crawl_run_id) || null, siteone: byId.get(group.siteone_crawl_run_id) || null })) };
}
