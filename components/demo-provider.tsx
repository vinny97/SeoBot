"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOnboardingState } from "@/hooks/use-onboarding";

type DemoContextValue = ReturnType<typeof useOnboardingState>;
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useOnboardingState();
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
