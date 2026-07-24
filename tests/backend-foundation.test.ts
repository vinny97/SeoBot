import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { safeRelativePath } from "../lib/auth/redirects";
import { onboardingDraftSchema, onboardingPayloadSchema } from "../lib/validation/backend";
import { defaultOnboardingData, ONBOARDING_LAST_STEP } from "../lib/onboarding/types";

describe("authentication redirects",()=>{
  it("keeps only intended relative application paths",()=>{
    expect(safeRelativePath("/app/settings")).toBe("/app/settings");
    expect(safeRelativePath("https://attacker.example")).toBe("/app");
    expect(safeRelativePath("//attacker.example")).toBe("/app");
    expect(safeRelativePath("/api/private")).toBe("/app");
  });
});

describe("onboarding validation",()=>{
  const website={...defaultOnboardingData,websiteUrl:"https://example.com/",businessName:"Example Ltd"};
  it("accepts an incomplete resumable draft",()=>expect(onboardingDraftSchema.safeParse(website).success).toBe(true));
  it("rejects an incomplete final payload",()=>expect(onboardingPayloadSchema.safeParse(website).success).toBe(false));
  it("accepts a completed normalized payload",()=>expect(onboardingPayloadSchema.safeParse({...website,businessDescription:"A clear description of this example company.",industry:"Consulting",services:["Advisory"],targetCustomer:"Small businesses",selectedGoals:["Get more qualified leads"],crawlAuthorised:true}).success).toBe(true));
  it("uses the final visible onboarding step",()=>{
    expect(onboardingPayloadSchema.safeParse({...website,businessDescription:"A clear description of this example company.",industry:"Consulting",services:["Advisory"],targetCustomer:"Small businesses",selectedGoals:["Get more qualified leads"],crawlAuthorised:true,currentStep:ONBOARDING_LAST_STEP}).success).toBe(true);
    expect(onboardingDraftSchema.safeParse({...website,currentStep:ONBOARDING_LAST_STEP+1}).success).toBe(false);
  });
});

describe("onboarding analysis",()=>{
  const onboardingRoute=readFileSync(new URL("../app/api/onboarding/route.ts",import.meta.url),"utf8");
  const analysisRoute=readFileSync(new URL("../app/api/onboarding/analysis/route.ts",import.meta.url),"utf8");
  const wizard=readFileSync(new URL("../components/onboarding-wizard.tsx",import.meta.url),"utf8");
  it("queues a small initial crawl as soon as the website is saved",()=>{expect(onboardingRoute).toContain("enqueue_website_crawl");expect(onboardingRoute).toContain('requested_trigger:"manual"')});
  it("queues the crawl from a separate post-redirect endpoint",()=>{expect(analysisRoute).toContain("enqueue_website_crawl");expect(analysisRoute).toContain('requested_trigger: "onboarding"')});
  it("shows real crawl progress during onboarding",()=>expect(wizard).toContain("DiscoveryStep"));
});

describe("database security migration",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202607170001_backend_foundation.sql",import.meta.url),"utf8");
  const tables=["profiles","workspaces","workspace_members","projects","websites","onboarding_progress","business_profiles","project_goals","project_settings","competitors","opportunities","keyword_topics","content_items","seo_jobs","activities","approval_requests","integrations"];
  it("enables RLS on every customer-data table",()=>tables.forEach(table=>expect(sql).toContain(`alter table public.${table} enable row level security`)));
  it("uses authenticated membership checks and no service role",()=>{expect(sql).toContain("public.can_access_project(project_id)");expect(sql).toContain("auth.uid()");expect(sql).not.toContain("service_role")});
});

describe("crawler queue migration",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202607170002_website_intelligence.sql",import.meta.url),"utf8");
  it("claims jobs atomically and recovers expired locks",()=>{expect(sql).toContain("for update skip locked limit 1");expect(sql).toContain("lock_expires_at<now()");expect(sql).toContain("requeue_stale_crawl_jobs")});
  it("deduplicates active crawls and limits authenticated writes",()=>{expect(sql).toContain("crawl_runs_one_active_per_website");expect(sql).not.toMatch(/grant insert[^;]+crawl_page_snapshots[^;]+authenticated/i);expect(sql).not.toMatch(/grant update[^;]+crawl_runs[^;]+authenticated/i)});
  it("keeps worker RPCs service-role only",()=>expect(sql).toContain("to service_role"));
  it("enforces hard platform crawl limits",()=>{expect(sql).toContain("max_pages between 1 and 50");expect(sql).toContain("concurrency between 1 and 2");expect(sql).toContain("request_delay_ms between 250 and 10000")});
});

describe("full-site onboarding crawl migration",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202607220003_full_site_onboarding_crawl.sql",import.meta.url),"utf8");
  it("uses full-site settings for onboarding",()=>{expect(sql).toContain("full_site:=requested_trigger='onboarding'");expect(sql).toContain("case when full_site then 50000");expect(sql).toContain("case when full_site then 20")});
  it("keeps routine crawls on the smaller limits",()=>{expect(sql).toContain("least(settings.max_pages,50)");expect(sql).toContain("least(settings.max_depth,4)")});
});
