export type AudienceScope = "local" | "national" | "international";
export type ApprovalPreference = "review_all" | "review_important" | "agreed_rules";
export type BrandTone = "Professional" | "Friendly" | "Expert" | "Direct" | "Premium" | "Approachable";

export const ONBOARDING_LAST_STEP = 6;

export type CompetitorInput = {
  id: string;
  name: string;
  websiteUrl: string;
  note: string;
  addedAt: string;
};

export type OnboardingData = {
  websiteUrl: string;
  businessName: string;
  location: string;
  businessDescription: string;
  industry: string;
  services: string[];
  targetCustomer: string;
  audienceScope: AudienceScope;
  primaryConversion: string;
  brandTone: BrandTone;
  selectedGoals: string[];
  approvalPreference: ApprovalPreference;
  competitors: CompetitorInput[];
  currentStep: number;
  completed: boolean;
  crawlAuthorised: boolean;
};

export const defaultOnboardingData: OnboardingData = {
  websiteUrl: "",
  businessName: "",
  location: "",
  businessDescription: "",
  industry: "",
  services: [],
  targetCustomer: "",
  audienceScope: "national",
  primaryConversion: "Request a quote",
  brandTone: "Professional",
  selectedGoals: [],
  approvalPreference: "review_important",
  competitors: [],
  currentStep: 0,
  completed: false,
  crawlAuthorised: false,
};
