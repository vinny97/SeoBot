import { defaultOnboardingData, type OnboardingData } from "@/lib/onboarding/types";

export const ONBOARDING_STORAGE_KEY = "northstar-onboarding-v2";
export const DEMO_STATUS_STORAGE_KEY = "northstar-demo-status-v2";

export function loadOnboarding(): OnboardingData {
  if (typeof window === "undefined") return defaultOnboardingData;
  try {
    const saved = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!saved) return defaultOnboardingData;
    return { ...defaultOnboardingData, ...JSON.parse(saved) } as OnboardingData;
  } catch {
    return defaultOnboardingData;
  }
}

export function saveOnboarding(data: OnboardingData) {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
}

export function loadDemoStatuses(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(DEMO_STATUS_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

export function saveDemoStatuses(statuses: Record<string, string>) {
  window.localStorage.setItem(DEMO_STATUS_STORAGE_KEY, JSON.stringify(statuses));
}

export function clearDemoWorkspace() {
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  window.localStorage.removeItem(DEMO_STATUS_STORAGE_KEY);
}
