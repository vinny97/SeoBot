import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";
const foundation=readFileSync(resolve("supabase/migrations/202607150001_v1_foundation.sql"),"utf8");
const completion=readFileSync(resolve("supabase/migrations/202607150002_complete_v1_foundation.sql"),"utf8");

describe("project access boundaries",()=>{
  it("uses membership-based project access",()=>{expect(foundation).toContain("can_access_project");expect(foundation).toContain("is_workspace_member")});
  it.each(["websites","business_profiles","project_goals","competitors","opportunities","keyword_topics","seo_jobs","activities","integrations"])("enables RLS for %s",table=>expect(foundation).toContain(`alter table public.${table} enable row level security`));
  it.each(["content_items","approval_requests","project_settings"])("protects completion table %s",table=>{expect(completion).toContain(`alter table public.${table} enable row level security`);expect(completion).toContain(`public.can_access_project(project_id)`) });
  it("never disables RLS",()=>expect(`${foundation}${completion}`).not.toMatch(/disable row level security/i));
});
