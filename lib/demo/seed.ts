import type { ActivityItem, Opportunity, ProjectState, SeoJob } from "@/lib/types";

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();
const later = (minutes: number) => new Date(now + minutes * 60000).toISOString();

export function buildOpportunities(name: string, services: string): Opportunity[] {
  const focus = services.split(",")[0]?.trim() || "your main service";
  return [
    { id: "opp-home", title: `Make ${focus} clearer on the homepage`, description: `Help visitors and search engines quickly understand what ${name || "the business"} offers and who it helps.`, category: "Existing page", impact: "Strong", effort: "Medium", confidence: "Moderate", status: "New", source: "Initial business profile hypothesis", requiresRealData: false, why: "A focused homepage can attract better-fit visitors and guide them toward the next step.", createdAt: ago(8) },
    { id: "opp-audience", title: "Create a page for a priority customer group", description: "Give one important audience a focused page that answers their needs in plain language.", category: "Content", impact: "Moderate", effort: "Medium", confidence: "Early hypothesis", status: "New", source: "Initial business profile hypothesis", requiresRealData: false, why: "Dedicated pages can match specific customer searches more closely than a general page.", createdAt: ago(7) },
    { id: "opp-gsc", title: "Connect Search Console for real search data", description: "Replace early hypotheses with actual queries, impressions, clicks and page performance.", category: "Measurement", impact: "Needs data connection", effort: "Low", confidence: "High", status: "New", source: "System recommendation", requiresRealData: true, why: "Real first-party data lets future recommendations focus on proven demand.", createdAt: ago(6) },
    { id: "opp-links", title: "Review how important pages link together", description: "Identify useful paths between relevant pages so visitors can explore naturally.", category: "Internal linking", impact: "Moderate", effort: "Low", confidence: "Early hypothesis", status: "New", source: "Initial plan", requiresRealData: false, why: "Clear internal paths help people find related information and clarify site structure.", createdAt: ago(5) },
  ];
}

export function buildJobs(): SeoJob[] {
  return [
    { id: "job-structure", title: "Reviewing website structure", description: "Mapping the pages and signals already available on your website.", type: "website_review", status: "Running", priority: 1, progress: 64, startedAt: ago(12), input: {}, output: {}, attemptCount: 1 },
    { id: "job-topics", title: "Preparing topic opportunities", description: "Turning your business priorities into useful starting hypotheses.", type: "content_plan", status: "Queued", priority: 2, scheduledAt: later(45), input: {}, output: {}, attemptCount: 0 },
    { id: "job-metadata", title: "Website details collected", description: "Read the public homepage details available during setup.", type: "metadata_analysis", status: "Completed", priority: 1, progress: 100, completedAt: ago(15), input: {}, output: {}, attemptCount: 1 },
    { id: "job-integration", title: "Prepare measurement connection", description: "Search Console will replace hypotheses with real performance data when available.", type: "integration_reminder", status: "Queued", priority: 3, scheduledAt: later(1440), input: {}, output: {}, attemptCount: 0 },
  ];
}

export function buildActivities(domain: string): ActivityItem[] {
  return [
    { id: "act-plan", title: "Initial SEO plan prepared", description: "Created a practical starting plan from your confirmed business details.", type: "plan_created", status: "completed", timestamp: ago(4) },
    { id: "act-opps", title: "Four opportunities identified", description: "Added transparent, qualitative hypotheses for review.", type: "opportunity_discovered", status: "completed", timestamp: ago(6) },
    { id: "act-profile", title: "Business profile confirmed", description: "Your goals, audience and preferred way of working were saved.", type: "profile_updated", status: "completed", timestamp: ago(10) },
    { id: "act-site", title: "Website added", description: `${domain} is now the primary website for this project.`, type: "project_created", status: "completed", timestamp: ago(18) },
  ];
}

export const blankProject: ProjectState = {
  version: 1, onboardingStep: 1, onboardingCompleted: false,
  website: { url: "", domain: "", displayName: "" },
  metadata: { headings: [], sitemap: "unknown", robots: "unknown", status: "idle", source: "manual" },
  business: { name: "", description: "", industry: "", services: "", customer: "", locations: "", model: "Service business", tone: "Clear and helpful", conversion: "Contact the business", audience: "national" },
  goals: [], approvalPreference: "review_important", competitors: [], opportunities: [], jobs: [], activities: [], updatedAt: new Date().toISOString(),
};
