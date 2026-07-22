"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearDemoWorkspace, loadDemoStatuses, loadOnboarding, saveDemoStatuses, saveOnboarding } from "@/lib/onboarding/storage";
import { defaultOnboardingData, ONBOARDING_LAST_STEP, type OnboardingData } from "@/lib/onboarding/types";

export function useOnboardingState(persistLocally = true) {
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const dataRef = useRef(defaultOnboardingData);
  const statusesRef = useRef<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedData = persistLocally ? loadOnboarding() : defaultOnboardingData;
      const savedData = { ...storedData, currentStep: Math.min(ONBOARDING_LAST_STEP, storedData.currentStep) };
      const savedStatuses = persistLocally ? loadDemoStatuses() : {};
      dataRef.current = savedData;
      statusesRef.current = savedStatuses;
      setData(savedData);
      setStatuses(savedStatuses);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [persistLocally]);
  const update = useCallback((patch: Partial<OnboardingData>) => {
    const next = { ...dataRef.current, ...patch };
    dataRef.current = next;
    if (persistLocally) saveOnboarding(next);
    setData(next);
  }, [persistLocally]);
  const goToStep = useCallback((currentStep: number) => {
    const next = { ...dataRef.current, currentStep: Math.max(0, Math.min(ONBOARDING_LAST_STEP, currentStep)) };
    dataRef.current = next;
    if (persistLocally) saveOnboarding(next);
    setData(next);
  }, [persistLocally]);
  const setDemoStatus = useCallback((id: string, status: string) => {
    const next = { ...statusesRef.current, [id]: status };
    statusesRef.current = next;
    if (persistLocally) saveDemoStatuses(next);
    setStatuses(next);
  }, [persistLocally]);
  const replace = useCallback((next: OnboardingData) => {
    const bounded = { ...next, currentStep: Math.min(ONBOARDING_LAST_STEP, Math.max(0, next.currentStep)) };
    dataRef.current = bounded;
    if (persistLocally) saveOnboarding(bounded);
    setData(bounded);
  }, [persistLocally]);
  const getCurrent = useCallback(() => dataRef.current, []);
  const reset = useCallback(() => { clearDemoWorkspace(); dataRef.current=defaultOnboardingData; statusesRef.current={}; setData(defaultOnboardingData); setStatuses({}); }, []);

  return { data, statuses, hydrated, update, goToStep, setDemoStatus, reset, replace, getCurrent };
}
