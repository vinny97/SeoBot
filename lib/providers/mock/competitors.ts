import type { CompetitorDiscoveryProvider } from "@/lib/providers/types";

// Demonstration-only provider. It never claims to discover live competitors.
export const demoCompetitorProvider: CompetitorDiscoveryProvider = {
  async discover({ industry }) {
    return [
      { name: `Example ${industry || "industry"} competitor`, url: "https://example.com", reason: "A placeholder to demonstrate the confirmation flow.", source: "demo_suggestion" },
    ];
  },
};
