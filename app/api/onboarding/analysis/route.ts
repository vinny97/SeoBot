import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/server";
import { getProjectSnapshot } from "@/lib/data/project-snapshot";
import { createClient } from "@/lib/supabase/server";

const activeStatuses = new Set(["queued", "running"]);

export async function POST() {
  const user = await getOptionalUser();
  const supabase = await createClient();
  if (!user || !supabase) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const snapshot = await getProjectSnapshot();
  if (!snapshot || snapshot.project.onboardingStatus !== "completed") {
    return NextResponse.json({ error: "Complete onboarding before starting website analysis." }, { status: 409 });
  }
  if (!snapshot.website) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  if (snapshot.currentCrawl && activeStatuses.has(snapshot.currentCrawl.status)) {
    return NextResponse.json({ crawlRunId: snapshot.currentCrawl.id, status: snapshot.currentCrawl.status }, { status: 202 });
  }

  const authorisedAt = new Date().toISOString();
  const { error: authorisationError } = await supabase.from("websites").update({ crawl_authorised_at: authorisedAt }).eq("id", snapshot.website.id);
  if (authorisationError) return NextResponse.json({ error: "Website analysis permission could not be saved." }, { status: 400 });

  const { data, error } = await supabase.rpc("enqueue_website_crawl", { target_website_id: snapshot.website.id, requested_trigger: "onboarding" });
  if (error && !error.message.toLowerCase().includes("crawl_already_active")) {
    return NextResponse.json({ error: "Your workspace is ready, but website analysis could not be queued." }, { status: 503 });
  }
  return NextResponse.json({ crawlRunId: data ?? snapshot.currentCrawl?.id ?? null, status: "queued" }, { status: 202 });
}
