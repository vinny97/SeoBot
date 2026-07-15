export type AudienceScope = "local" | "national" | "international";
export type ApprovalPreference = "review_all" | "review_important" | "agreed_rules";
export type OpportunityStatus = "New" | "Planned" | "In progress" | "Waiting for approval" | "Completed" | "Dismissed";

export interface Competitor { id: string; name: string; url: string; domain: string; notes?: string; source: "user" | "demo_suggestion"; confirmed: boolean; createdAt: string; }
export interface Opportunity { id: string; title: string; description: string; category: string; impact: "Lower" | "Moderate" | "Strong" | "Needs data connection"; effort: "Low" | "Medium" | "High"; confidence: "Early hypothesis" | "Moderate" | "High"; status: OpportunityStatus; source: string; requiresRealData: boolean; why: string; createdAt: string; }
export interface SeoJob { id: string; title: string; description: string; type: string; status: "Queued" | "Running" | "Waiting for input" | "Waiting for approval" | "Completed" | "Failed" | "Cancelled"; priority: number; progress?: number; scheduledAt?: string; startedAt?: string; completedAt?: string; input: Record<string, unknown>; output: Record<string, unknown>; attemptCount: number; error?: string; }
export interface ActivityItem { id: string; title: string; description: string; type: string; status: "completed" | "in_progress" | "attention"; timestamp: string; }
export interface WebsiteMetadata { title?: string; description?: string; favicon?: string; headings: string[]; sitemap: "detected" | "not_detected" | "unknown"; robots: "detected" | "not_detected" | "unknown"; analysedAt?: string; status: "idle" | "analysing" | "complete" | "failed"; error?: string; source: "website" | "manual" | "demo"; }
export interface BusinessProfile { name: string; description: string; industry: string; services: string; customer: string; locations: string; model: string; tone: string; conversion: string; audience: AudienceScope; }
export interface ProjectState {
  version: 1;
  onboardingStep: number;
  onboardingCompleted: boolean;
  website: { url: string; domain: string; displayName: string };
  metadata: WebsiteMetadata;
  business: BusinessProfile;
  goals: string[];
  approvalPreference: ApprovalPreference;
  competitors: Competitor[];
  opportunities: Opportunity[];
  jobs: SeoJob[];
  activities: ActivityItem[];
  updatedAt: string;
}
