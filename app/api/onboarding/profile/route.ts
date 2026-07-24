import { NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/data/project-snapshot";
import { createCrawlProfile } from "@/lib/onboarding/crawl-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getProjectSnapshot();
  const supabase = await createClient();
  if (!snapshot || !supabase || !snapshot.website) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: pages } = await supabase.from("website_pages").select("id").eq("website_id", snapshot.website.id).limit(8);
  const pageIds = (pages || []).map(page => page.id);
  if (!pageIds.length) return NextResponse.json({ status: "waiting" });
  const { data } = await supabase.from("crawl_page_snapshots").select("title,meta_description,main_content,final_url").in("website_page_id", pageIds).not("main_content", "is", null).order("created_at", { ascending: false }).limit(8);
  const source = (data || []).map(page => `URL: ${page.final_url || ""}\nTitle: ${page.title || ""}\nDescription: ${page.meta_description || ""}\nContent:\n${page.main_content || ""}`).join("\n\n---\n\n");
  if (source.length < 300) return NextResponse.json({ status: "waiting" });
  const profile = await createCrawlProfile(source);
  if (!profile) return NextResponse.json({ status: process.env.OPENAI_API_KEY ? "unavailable" : "ai_not_configured" });
  return NextResponse.json({ status: "ready", profile });
}
