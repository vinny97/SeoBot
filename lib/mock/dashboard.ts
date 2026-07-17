import type { OnboardingData } from "@/lib/onboarding/types";

export type WorkStatus = "In progress" | "Waiting" | "Completed" | "Needs attention";

export type DemoOpportunity = {
  id: string; title: string; description: string; why: string; category: string;
  impact: "Moderate" | "Strong" | "High potential"; effort: "Low" | "Medium" | "High";
  confidence: "Initial hypothesis" | "Based on business profile" | "Needs performance data";
  status: "New" | "Planned" | "In progress" | "Waiting for approval" | "Completed" | "Dismissed";
  source: string; requiresRealData: boolean;
};

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "your-website.example"; }
}

export function createDemoOpportunities(data: OnboardingData): DemoOpportunity[] {
  const service = data.services[0] || "main service";
  const customer = data.targetCustomer || "priority customer";
  return [
    { id: "service-page", title: `Create a dedicated page for ${service}`, description: `Give ${customer.toLowerCase()} a clear explanation of the offer and next step.`, why: "A focused page can answer customer questions more clearly than a broad homepage section.", category: "Content", impact: "High potential", effort: "Medium", confidence: "Based on business profile", status: "New", source: "Business profile", requiresRealData: false },
    { id: "homepage", title: "Improve how the homepage explains the main offer", description: `Make ${data.businessName || "the business"} easier for customers and search engines to understand.`, why: "Clear positioning helps the right visitor quickly recognise that they are in the right place.", category: "Existing page", impact: "Strong", effort: "Low", confidence: "Initial hypothesis", status: "New", source: "Initial hypothesis", requiresRealData: false },
    { id: "measurement", title: "Connect Search Console for real customer-search data", description: "Replace early hypotheses with genuine queries, impressions and page performance.", why: "First-party data will show which pages and searches deserve attention first.", category: "Measurement", impact: "Strong", effort: "Low", confidence: "Needs performance data", status: "New", source: "Search Console required", requiresRealData: true },
    { id: "internal-links", title: "Prepare internal-link recommendations", description: `Help visitors move between useful pages about ${service}.`, why: "Clear connections between related pages can improve navigation and understanding.", category: "Internal linking", impact: "Moderate", effort: "Medium", confidence: "Needs performance data", status: "New", source: "Website analysis required", requiresRealData: true },
  ];
}

export function createDemoDashboard(data: OnboardingData) {
  const website = hostname(data.websiteUrl);
  const service = data.services[0] || "main services";
  return {
    website,
    businessName: data.businessName || "Harbour & Pine",
    employeeStatus: data.completed ? "Active" : "Demo preview",
    currentWork: [
      { id: "structure", title: "Reviewing website structure", description: `Organising the important pages for ${website}.`, status: "In progress" as WorkStatus, progress: 64, timing: "Started today" },
      { id: "topics", title: "Preparing initial topic opportunities", description: `Developing useful hypotheses around ${service}.`, status: "In progress" as WorkStatus, progress: 38, timing: "Started today" },
      { id: "competitors", title: "Organising competitor monitoring", description: data.competitors.length ? `Preparing context for ${data.competitors.length} confirmed competitor${data.competitors.length === 1 ? "" : "s"}.` : "Waiting for confirmed competitors.", status: data.competitors.length ? "In progress" as WorkStatus : "Waiting" as WorkStatus, timing: "Planned next" },
      { id: "search-console", title: "Waiting for Search Console connection", description: "Real performance data will replace hypotheses when this integration is available.", status: "Waiting" as WorkStatus, timing: "Connection required" },
    ],
    completed: [
      { id: "website", title: "Website added", description: `${website} is now the primary demonstration website.` },
      { id: "profile", title: "Business profile confirmed", description: `${data.industry || "Business"} context is ready for review.` },
      { id: "plan", title: "Initial SEO plan prepared", description: "A practical first sequence of work has been outlined." },
      ...(data.competitors.length ? [{ id: "competitors-added", title: "Competitors added", description: `${data.competitors.length} competitor${data.competitors.length === 1 ? "" : "s"} confirmed by you.` }] : []),
    ],
    opportunities: createDemoOpportunities(data).slice(0, 3),
    upcoming: ["Prepare the first content plan", "Review page titles and descriptions", "Develop topic hypotheses", "Connect real search data"],
  };
}

export function createDemoActivities(data: OnboardingData) {
  return [
    { id: "project", title: "Project created", description: `${data.businessName || "Demo workspace"} was prepared.`, status: "Completed" as WorkStatus, type: "Project", when: "Today" },
    { id: "website", title: "Website added", description: `${hostname(data.websiteUrl)} was added as the primary website.`, status: "Completed" as WorkStatus, type: "Website", when: "Today" },
    { id: "business", title: "Business profile confirmed", description: "Customer, service and conversion context was saved locally.", status: "Completed" as WorkStatus, type: "Profile", when: "Today" },
    ...(data.competitors[0] ? [{ id: "competitor", title: "Competitor added", description: `${data.competitors[0].name} was confirmed by you.`, status: "Completed" as WorkStatus, type: "Competitor", when: "Today" }] : []),
    { id: "opportunity", title: "Initial opportunity prepared", description: "A qualitative homepage opportunity is ready for review.", status: "Completed" as WorkStatus, type: "Opportunity", when: "Today" },
    { id: "job-started", title: "Website review started", description: "The demonstration work queue has started its first task.", status: "In progress" as WorkStatus, type: "Job", when: "Today" },
    { id: "data", title: "Real search data required", description: "Search Console is needed before measured performance can appear.", status: "Needs attention" as WorkStatus, type: "Connection", when: "Next step" },
  ];
}

export function createTopicHypotheses(data: OnboardingData) {
  const services = data.services.length ? data.services : ["Primary service", "Customer advice"];
  return [
    { id: "topic-1", topic: services[0], intent: "Service research", relevance: "High", status: "Initial hypothesis", source: "Business profile" },
    { id: "topic-2", topic: `${services[0]} advice`, intent: "Educational", relevance: "Promising", status: "Initial hypothesis", source: "Initial hypothesis" },
    { id: "topic-3", topic: `${services[1] || services[0]} for ${data.targetCustomer || "priority customers"}`, intent: "Customer-specific", relevance: "To confirm", status: "Needs real data", source: "Search Console required" },
  ];
}

export function createContentHypotheses(data: OnboardingData) {
  const service = data.services[0] || "main service";
  return [
    { id: "content-1", title: `A practical guide to choosing ${service}`, contentType: "Service guide", purpose: "Answer early questions before a customer gets in touch.", customer: data.targetCustomer || "Priority customers", source: "Business profile" },
    { id: "content-2", title: `How ${service} works from start to finish`, contentType: "Customer question article", purpose: "Make the process feel clear and trustworthy.", customer: data.targetCustomer || "Potential customers", source: "Initial hypothesis" },
    { id: "content-3", title: `${service} in ${data.location || "your service area"}`, contentType: "Location page", purpose: "Explore a clearer page for customers in an important location.", customer: "Local customers", source: "User supplied" },
  ];
}

export function createInitialPlan(data: OnboardingData) {
  const service = data.services[0] || "main services";
  return [
    { category: "Understand the website", items: [
      { title: "Review the main service pages", explanation: `Check how clearly the site explains ${service}.`, impact: "Strong", effort: "Medium", confidence: "Based on business profile", status: "Planned next", needsData: false },
      { title: "Review page titles and descriptions", explanation: "Prepare clear summaries for important pages.", impact: "Moderate", effort: "Low", confidence: "Needs performance data", status: "Waiting for data", needsData: true },
    ]},
    { category: "Build search visibility", items: [
      { title: "Develop service topic ideas", explanation: `Prepare useful themes around ${service}.`, impact: "High potential", effort: "Medium", confidence: "Based on business profile", status: "Planned next", needsData: false },
      { title: "Create a starting content plan", explanation: "Organise customer questions into a practical first sequence.", impact: "Strong", effort: "Medium", confidence: "Initial hypothesis", status: "Planned next", needsData: false },
    ]},
    { category: "Monitor the market", items: [
      { title: "Organise confirmed competitors", explanation: `Prepare context for ${data.competitors.length || "future"} confirmed competitors.`, impact: "Moderate", effort: "Low", confidence: "Based on business profile", status: data.competitors.length ? "Ready" : "Needs your input", needsData: false },
      { title: "Compare content themes", explanation: "Wait for real competitor and website sources before comparison.", impact: "Moderate", effort: "High", confidence: "Needs performance data", status: "Waiting for data", needsData: true },
    ]},
    { category: "Improve over time", items: [
      { title: "Prepare internal-link recommendations", explanation: "Connect helpful pages once the real site structure is available.", impact: "Moderate", effort: "Medium", confidence: "Needs performance data", status: "Waiting for data", needsData: true },
      { title: "Review existing pages regularly", explanation: "Create a calm review rhythm around approved goals.", impact: "Strong", effort: "Medium", confidence: "Based on business profile", status: "Planned next", needsData: false },
    ]},
  ] as const;
}
