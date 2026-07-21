import { describe, expect, it } from "vitest";
import { resolveOnboardingCollections } from "../lib/onboarding/snapshot-merge";

const draftCompetitor = {
  id: "competitor-1",
  name: "Example competitor",
  websiteUrl: "https://competitor.example/",
  note: "Customer alternative",
  addedAt: "2026-07-21T00:00:00.000Z",
};

describe("onboarding snapshot reconstruction", () => {
  it("preserves draft answers while onboarding is still in progress", () => {
    expect(resolveOnboardingCollections({
      completed: false,
      draft: {
        selectedGoals: ["Get more qualified leads"],
        competitors: [draftCompetitor],
        approvalPreference: "agreed_rules",
      },
      persistedGoals: [],
      persistedCompetitors: [],
      persistedApprovalPreference: "review_important",
    })).toEqual({
      selectedGoals: ["Get more qualified leads"],
      competitors: [draftCompetitor],
      approvalPreference: "agreed_rules",
    });
  });

  it("uses canonical tables after onboarding is complete", () => {
    expect(resolveOnboardingCollections({
      completed: true,
      draft: {
        selectedGoals: ["Old goal"],
        competitors: [draftCompetitor],
        approvalPreference: "review_all",
      },
      persistedGoals: ["Increase online sales"],
      persistedCompetitors: [],
      persistedApprovalPreference: "agreed_rules",
    })).toEqual({
      selectedGoals: ["Increase online sales"],
      competitors: [],
      approvalPreference: "agreed_rules",
    });
  });
});
