import type { ApprovalPreference, CompetitorInput, OnboardingData } from "@/lib/onboarding/types";

type SnapshotCollectionsInput = {
  completed: boolean;
  draft: Partial<OnboardingData>;
  persistedGoals: string[];
  persistedCompetitors: CompetitorInput[];
  persistedApprovalPreference: ApprovalPreference | null;
};

export function resolveOnboardingCollections({
  completed,
  draft,
  persistedGoals,
  persistedCompetitors,
  persistedApprovalPreference,
}: SnapshotCollectionsInput) {
  if (completed) {
    return {
      selectedGoals: persistedGoals,
      competitors: persistedCompetitors,
      approvalPreference:
        persistedApprovalPreference ||
        draft.approvalPreference ||
        "review_important",
    } satisfies Pick<
      OnboardingData,
      "selectedGoals" | "competitors" | "approvalPreference"
    >;
  }

  return {
    selectedGoals: draft.selectedGoals ?? persistedGoals,
    competitors: draft.competitors ?? persistedCompetitors,
    approvalPreference:
      draft.approvalPreference ||
      persistedApprovalPreference ||
      "review_important",
  } satisfies Pick<
    OnboardingData,
    "selectedGoals" | "competitors" | "approvalPreference"
  >;
}
