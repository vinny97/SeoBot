export const productConfig = {
  name: "Northstar",
  description: "Your autonomous SEO employee for steady organic growth.",
  supportEmail: "support@northstar.example",
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  metadata: {
    title: "Northstar — Your SEO employee",
    description: "A calm, proactive SEO workspace that turns opportunities into completed work.",
  },
  navigation: [
    { label: "Home", href: "/app", icon: "Home" },
    { label: "Activity", href: "/app/activity", icon: "Activity" },
    { label: "Opportunities", href: "/app/opportunities", icon: "Sparkles" },
    { label: "Keywords", href: "/app/keywords", icon: "Search" },
    { label: "Content", href: "/app/content", icon: "FileText" },
    { label: "Competitors", href: "/app/competitors", icon: "Users" },
    { label: "Website", href: "/app/website", icon: "Globe" },
    { label: "Integrations", href: "/app/integrations", icon: "Plug" },
    { label: "Settings", href: "/app/settings", icon: "Settings" },
  ],
  featureFlags: {
    realPublishing: false,
    billing: false,
    searchConsole: false,
    autonomousExecution: false,
  },
} as const;
