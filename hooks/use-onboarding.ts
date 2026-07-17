"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearDemoWorkspace, loadDemoStatuses, loadOnboarding, saveDemoStatuses, saveOnboarding } from "@/lib/onboarding/storage";
import { defaultOnboardingData, type OnboardingData } from "@/lib/onboarding/types";

export function useOnboardingState() {
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const dataRef = useRef(defaultOnboardingData);
  const statusesRef = useRef<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedData = loadOnboarding();
      const savedStatuses = loadDemoStatuses();
      dataRef.current = savedData;
      statusesRef.current = savedStatuses;
      setData(savedData);
      setStatuses(savedStatuses);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const update = useCallback((patch: Partial<OnboardingData>) => {
    const next = { ...dataRef.current, ...patch };
    dataRef.current = next;
    saveOnboarding(next);
    setData(next);
  }, []);
  const goToStep = useCallback((currentStep: number) => {
    const next = { ...dataRef.current, currentStep: Math.max(0, Math.min(7, currentStep)) };
    dataRef.current = next;
    saveOnboarding(next);
    setData(next);
  }, []);
  const setDemoStatus = useCallback((id: string, status: string) => {
    const next = { ...statusesRef.current, [id]: status };
    statusesRef.current = next;
    saveDemoStatuses(next);
    setStatuses(next);
  }, []);
  const reset = useCallback(() => { clearDemoWorkspace(); dataRef.current=defaultOnboardingData; statusesRef.current={}; setData(defaultOnboardingData); setStatuses({}); }, []);

  return { data, statuses, hydrated, update, goToStep, setDemoStatus, reset };
}
