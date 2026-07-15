import type { SupabaseClient } from "@supabase/supabase-js";
import { blankProject } from "@/lib/demo/seed";
import type {
  ActivityItem,
  Competitor,
  Opportunity,
  ProjectState,
  SeoJob,
} from "@/lib/types";
import { projectPersistenceSchema } from "@/lib/validation/onboarding";
import { replaceProjectRows } from "@/lib/data/rows";
import { replaceOpportunities } from "@/lib/data/opportunities";
import { replaceCompetitors } from "@/lib/data/competitors";
import { replaceJobs } from "@/lib/data/jobs";
import { replaceActivities } from "@/lib/data/activities";
import { DataLayerError, databaseError } from "@/lib/data/errors";

interface GoalRow {
  goal_type: string;
}
interface CompetitorRow {
  id: string;
  name: string;
  url: string;
  domain: string;
  notes: string | null;
  source: Competitor["source"];
  status: string;
  created_at: string;
}
interface OpportunityRow {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: Opportunity["impact"];
  effort: Opportunity["effort"];
  confidence: Opportunity["confidence"];
  status: string;
  source: string;
  requires_real_data: boolean;
  metadata: { why?: string } | null;
  discovered_at: string;
}
interface JobRow {
  id: string;
  title: string;
  job_type: string;
  status: string;
  priority: number;
  progress: number | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  input_payload: Record<string, unknown> & { description?: string };
  output_payload: Record<string, unknown>;
  attempt_count: number;
  error_message: string | null;
}
interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  status: ActivityItem["status"];
  created_at: string;
}

// The UI never talks to project tables directly. This repository coordinates the
// focused table modules and is bypassed only by explicitly labelled demo mode.
export async function loadProject(
  client: SupabaseClient,
): Promise<ProjectState | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const membershipResult = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  databaseError("load your workspace", membershipResult.error);
  if (!membershipResult.data) return null;
  const projectResult = await client
    .from("projects")
    .select("*")
    .eq("workspace_id", membershipResult.data.workspace_id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  databaseError("load your project", projectResult.error);
  const project = projectResult.data;
  if (!project) return null;
  const [
    websiteResult,
    businessResult,
    goalsResult,
    competitorsResult,
    opportunitiesResult,
    jobsResult,
    activitiesResult,
  ] = await Promise.all([
    client
      .from("websites")
      .select("*")
      .eq("project_id", project.id)
      .limit(1)
      .maybeSingle(),
    client
      .from("business_profiles")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle(),
    client
      .from("project_goals")
      .select("*")
      .eq("project_id", project.id)
      .order("priority"),
    client
      .from("competitors")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at"),
    client
      .from("opportunities")
      .select("*")
      .eq("project_id", project.id)
      .order("discovered_at"),
    client
      .from("seo_jobs")
      .select("*")
      .eq("project_id", project.id)
      .order("priority"),
    client
      .from("activities")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);
  [
    websiteResult,
    businessResult,
    goalsResult,
    competitorsResult,
    opportunitiesResult,
    jobsResult,
    activitiesResult,
  ].forEach((result) => databaseError("load project details", result.error));
  const website = websiteResult.data;
  const business = businessResult.data;
  return {
    ...blankProject,
    onboardingStep: project.onboarding_step || 1,
    onboardingCompleted: project.onboarding_status === "completed",
    website: {
      url: website?.normalised_url || "",
      domain: website?.domain || "",
      displayName: website?.display_name || project.name,
    },
    metadata: {
      title: website?.title || undefined,
      description: website?.meta_description || undefined,
      favicon: website?.favicon_url || undefined,
      headings: [],
      sitemap: website?.sitemap_status || "unknown",
      robots: website?.robots_txt_status || "unknown",
      analysedAt: website?.last_analysed_at || undefined,
      status: website?.analysis_status || "idle",
      error: website?.analysis_error || undefined,
      source: website?.last_analysed_at ? "website" : "manual",
    },
    business: {
      name: business?.business_name || project.name,
      description: business?.description || "",
      industry: business?.industry || "",
      services: (business?.products_services || []).join(", "),
      customer: business?.target_customers || "",
      locations: (business?.locations || []).join(", "),
      model: business?.business_model || "Service business",
      tone: business?.tone || "Clear and helpful",
      conversion: business?.primary_conversion || "Contact the business",
      audience: business?.audience_scope || "national",
    },
    goals: ((goalsResult.data || []) as GoalRow[]).map((row) => row.goal_type),
    approvalPreference: project.approval_preference || "review_important",
    competitors: ((competitorsResult.data || []) as CompetitorRow[]).map(
      (row): Competitor => ({
        id: row.id,
        name: row.name,
        url: row.url,
        domain: row.domain,
        notes: row.notes || undefined,
        source: row.source,
        confirmed: row.status === "confirmed",
        createdAt: row.created_at,
      }),
    ),
    opportunities: ((opportunitiesResult.data || []) as OpportunityRow[]).map(
      (row): Opportunity => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        impact: row.impact,
        effort: row.effort,
        confidence: row.confidence,
        status: titleStatus(row.status),
        source: row.source,
        requiresRealData: row.requires_real_data,
        why: row.metadata?.why || row.description,
        createdAt: row.discovered_at,
      }),
    ),
    jobs: ((jobsResult.data || []) as JobRow[]).map(
      (row): SeoJob => ({
        id: row.id,
        title: row.title,
        description: row.input_payload.description || row.title,
        type: row.job_type,
        status: jobTitle(row.status),
        priority: row.priority,
        progress: row.progress ?? undefined,
        scheduledAt: row.scheduled_for || undefined,
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
        input: row.input_payload,
        output: row.output_payload,
        attemptCount: row.attempt_count,
        error: row.error_message || undefined,
      }),
    ),
    activities: ((activitiesResult.data || []) as ActivityRow[]).map(
      (row): ActivityItem => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        type: row.activity_type,
        status: row.status,
        timestamp: row.created_at,
      }),
    ),
    updatedAt: project.updated_at,
  } as ProjectState;
}

export async function saveProject(client: SupabaseClient, state: ProjectState) {
  if (!state.website.domain) return;
  projectPersistenceSchema.parse(state);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  const profileResult = await client
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    });
  databaseError("save your profile", profileResult.error);
  let membership = (
    await client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
  ).data;
  if (!membership) {
    const workspaceResult = await client
      .from("workspaces")
      .insert({
        name: `${state.business.name || state.website.displayName} workspace`,
        created_by: user.id,
      })
      .select("id")
      .single();
    databaseError("create your workspace", workspaceResult.error);
    if (!workspaceResult.data)
      throw new DataLayerError("create your workspace");
    const memberResult = await client
      .from("workspace_members")
      .insert({
        workspace_id: workspaceResult.data.id,
        user_id: user.id,
        role: "owner",
      });
    databaseError("create your workspace membership", memberResult.error);
    membership = { workspace_id: workspaceResult.data.id };
  }
  let project = (
    await client
      .from("projects")
      .select("id")
      .eq("workspace_id", membership.workspace_id)
      .limit(1)
      .maybeSingle()
  ).data;
  const now = new Date().toISOString();
  const values = {
    workspace_id: membership.workspace_id,
    name: state.business.name || state.website.displayName,
    slug: slug(state.website.domain),
    status: "active",
    onboarding_status: state.onboardingCompleted ? "completed" : "in_progress",
    onboarding_step: state.onboardingStep,
    onboarding_completed_at: state.onboardingCompleted ? now : null,
    approval_preference: state.approvalPreference,
    updated_at: now,
  };
  if (!project) {
    const result = await client
      .from("projects")
      .insert(values)
      .select("id")
      .single();
    databaseError("create your project", result.error);
    project = result.data;
  } else {
    const result = await client
      .from("projects")
      .update(values)
      .eq("id", project.id);
    databaseError("update your project", result.error);
  }
  if (!project) throw new DataLayerError("create your project");
  const projectId = project.id;
  const existingWebsite = (
    await client
      .from("websites")
      .select("id")
      .eq("project_id", projectId)
      .limit(1)
      .maybeSingle()
  ).data;
  const websiteValues = {
    project_id: projectId,
    url: state.website.url,
    normalised_url: state.website.url,
    domain: state.website.domain,
    display_name: state.website.displayName,
    favicon_url: state.metadata.favicon || null,
    title: state.metadata.title || null,
    meta_description: state.metadata.description || null,
    robots_txt_status: state.metadata.robots,
    sitemap_status: state.metadata.sitemap,
    last_analysed_at: state.metadata.analysedAt || null,
    analysis_status: state.metadata.status,
    analysis_error: state.metadata.error || null,
    updated_at: now,
  };
  const websiteResult = existingWebsite
    ? await client
        .from("websites")
        .update(websiteValues)
        .eq("id", existingWebsite.id)
    : await client.from("websites").insert(websiteValues);
  databaseError("save your website", websiteResult.error);
  const businessResult = await client
    .from("business_profiles")
    .upsert(
      {
        project_id: projectId,
        business_name: state.business.name,
        description: state.business.description,
        industry: state.business.industry,
        products_services: split(state.business.services),
        target_customers: state.business.customer,
        locations: split(state.business.locations),
        business_model: state.business.model,
        tone: state.business.tone,
        primary_conversion: state.business.conversion,
        audience_scope: state.business.audience,
        updated_at: now,
      },
      { onConflict: "project_id" },
    );
  databaseError("save your business profile", businessResult.error);
  await replaceProjectRows(
    client,
    "project_goals",
    projectId,
    state.goals.map((goal, index) => ({
      project_id: projectId,
      goal_type: goal,
      priority: index + 1,
    })),
  );
  await replaceCompetitors(client, projectId, state.competitors);
  await replaceOpportunities(client, projectId, state.opportunities);
  const services = split(state.business.services);
  const topicNames = [
    ...new Set(
      services.concat(
        `${services[0] || state.business.industry || "priority service"} for ${state.business.customer || "priority customers"}`,
      ),
    ),
  ];
  await replaceProjectRows(
    client,
    "keyword_topics",
    projectId,
    topicNames.map((keyword, index) => ({
      project_id: projectId,
      keyword,
      intent: index === 0 ? "commercial" : "informational",
      relevance: index < 2 ? "high" : "to_confirm",
      status: "hypothesis",
      source: index < 2 ? "business_profile" : "initial_hypothesis",
      is_hypothesis: true,
    })),
  );
  await replaceProjectRows(
    client,
    "content_items",
    projectId,
    state.opportunities
      .filter((item) => item.category === "Content")
      .map((item) => ({
        project_id: projectId,
        title: item.title,
        content_type: "content_idea",
        status: item.status === "Dismissed" ? "archived" : "idea",
        source: item.source,
        target_url: null,
        brief: { summary: item.description, hypothesis: true },
        draft: null,
      })),
  );
  const settingsResult = await client
    .from("project_settings")
    .upsert(
      {
        project_id: projectId,
        approval_mode: state.approvalPreference,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        weekly_summary_enabled: true,
        updated_at: now,
      },
      { onConflict: "project_id" },
    );
  databaseError("save your project settings", settingsResult.error);
  if (state.onboardingCompleted) {
    await replaceJobs(client, projectId, state.jobs);
    await replaceActivities(client, projectId, state.activities);
  }
}

const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "project";
function titleStatus(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ") as Opportunity["status"];
}
function jobTitle(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ") as SeoJob["status"];
}
