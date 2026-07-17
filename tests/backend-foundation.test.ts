import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { safeRelativePath } from "../lib/auth/redirects";
import { onboardingDraftSchema, onboardingPayloadSchema } from "../lib/validation/backend";
import { defaultOnboardingData } from "../lib/onboarding/types";

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
  it("accepts a completed normalized payload",()=>expect(onboardingPayloadSchema.safeParse({...website,businessDescription:"A clear description of this example company.",industry:"Consulting",services:["Advisory"],targetCustomer:"Small businesses",selectedGoals:["Get more qualified leads"]}).success).toBe(true));
});

describe("database security migration",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202607170001_backend_foundation.sql",import.meta.url),"utf8");
  const tables=["profiles","workspaces","workspace_members","projects","websites","onboarding_progress","business_profiles","project_goals","project_settings","competitors","opportunities","keyword_topics","content_items","seo_jobs","activities","approval_requests","integrations"];
  it("enables RLS on every customer-data table",()=>tables.forEach(table=>expect(sql).toContain(`alter table public.${table} enable row level security`)));
  it("uses authenticated membership checks and no service role",()=>{expect(sql).toContain("public.can_access_project(project_id)");expect(sql).toContain("auth.uid()");expect(sql).not.toContain("service_role")});
});
