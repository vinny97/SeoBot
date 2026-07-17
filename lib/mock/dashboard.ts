export type WorkStatus = "In progress" | "Waiting" | "Completed" | "Needs attention";

export const dashboardMock = {
  website: "harbourandpine.co.uk",
  employeeStatus: "Active",
  currentWork: [
    {
      id: "structure",
      title: "Reviewing website structure",
      description: "Organising the pages we know about into a clear first review.",
      status: "In progress" as WorkStatus,
      progress: 64,
    },
    {
      id: "topics",
      title: "Preparing initial topic opportunities",
      description: "Turning the business profile into useful, testable topic hypotheses.",
      status: "In progress" as WorkStatus,
      progress: 38,
    },
    {
      id: "search-console",
      title: "Waiting for Search Console connection",
      description: "Real performance data will replace hypotheses when this integration is available.",
      status: "Waiting" as WorkStatus,
    },
  ],
  completed: [
    { id: "website", title: "Website added", description: "The demonstration workspace now has a primary website." },
    { id: "profile", title: "Business profile prepared", description: "Core services and customer context are ready for review." },
    { id: "plan", title: "Initial SEO plan created", description: "A calm first sequence of work has been outlined." },
  ],
  opportunities: [
    {
      id: "homepage",
      title: "Improve the homepage service explanation",
      description: "Make the main offer easier for potential customers and search engines to understand.",
      category: "Website",
      impact: "Strong",
      effort: "Low",
      status: "New",
    },
    {
      id: "customer-page",
      title: "Create a dedicated page for an important customer type",
      description: "Give one high-priority audience a clearer path to the right service.",
      category: "Content",
      impact: "Moderate",
      effort: "Medium",
      status: "Initial hypothesis",
    },
    {
      id: "gsc",
      title: "Connect Search Console to use real performance data",
      description: "Base future decisions on measured queries and page performance.",
      category: "Integration",
      impact: "Strong",
      effort: "Low",
      status: "Coming soon",
    },
  ],
  upcoming: [
    "Prepare the first content plan",
    "Review page titles and descriptions",
    "Add confirmed competitors",
  ],
} as const;

export const activityMock = [
  { id: "a1", title: "Website added", description: "The demonstration website was added to the workspace.", status: "Completed" as WorkStatus, kind: "work", when: "Today" },
  { id: "a2", title: "Reviewing website structure", description: "A first structural review is underway using demonstration context.", status: "In progress" as WorkStatus, kind: "work", when: "Today" },
  { id: "a3", title: "Search Console is not connected", description: "Real search performance will remain unavailable until the integration is built.", status: "Needs attention" as WorkStatus, kind: "work", when: "Next step" },
  { id: "a4", title: "Homepage explanation opportunity prepared", description: "An initial hypothesis is ready for later validation with real data.", status: "Completed" as WorkStatus, kind: "opportunity", when: "Today" },
];

export const topicHypotheses = [
  { topic: "Bespoke garden room design", intent: "Service research", relevance: "High" },
  { topic: "Garden office planning advice", intent: "Educational", relevance: "Promising" },
  { topic: "Garden rooms for small businesses", intent: "Customer-specific", relevance: "To confirm" },
];

export const contentHypotheses = [
  { title: "A practical guide to planning a garden office", purpose: "Answer early planning questions before a customer requests a quote." },
  { title: "How the design and installation process works", purpose: "Make the service feel clear, predictable and trustworthy." },
  { title: "Garden rooms for consultants and small teams", purpose: "Explore a dedicated page for an important customer type." },
];
