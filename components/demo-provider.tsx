"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useOnboardingState } from "@/hooks/use-onboarding";
import { clearDemoWorkspace, loadOnboarding } from "@/lib/onboarding/storage";
import { defaultOnboardingData, ONBOARDING_LAST_STEP, type OnboardingData } from "@/lib/onboarding/types";
import type { ProjectSnapshot } from "@/lib/data/project-snapshot";

type DemoContextValue = ReturnType<typeof useOnboardingState> & {
  demoMode:boolean;snapshot:ProjectSnapshot|null;loading:boolean;saving:boolean;error:string|null;
  legacyData:OnboardingData|null;dismissLegacy:()=>void;importLegacy:()=>Promise<boolean>;
  saveProgress:(nextStep:number)=>Promise<boolean>;completeOnboarding:()=>Promise<boolean>;
  refresh:()=>Promise<void>;mutateRecord:(path:string,method:string,body?:unknown)=>Promise<boolean>;
};
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children, demoMode }: { children: ReactNode; demoMode:boolean }) {
  const state = useOnboardingState(demoMode);
  const {replace}=state;
  const [snapshot,setSnapshot]=useState<ProjectSnapshot|null>(null);const [loading,setLoading]=useState(!demoMode);const [saving,setSaving]=useState(false);const [error,setError]=useState<string|null>(null);const [legacyData,setLegacyData]=useState<OnboardingData|null>(null);
  const refresh=useCallback(async()=>{if(demoMode)return;setLoading(true);try{const response=await fetch("/api/project-state",{cache:"no-store"});if(response.ok){const next=await response.json() as ProjectSnapshot;setSnapshot(next);replace(next.onboarding)}else if(response.status===404){const legacy=loadOnboarding();if(legacy.websiteUrl||legacy.businessName)setLegacyData(legacy)}}finally{setLoading(false)}},[demoMode,replace]);
  useEffect(()=>{queueMicrotask(()=>void refresh())},[refresh]);
  async function request(path:string,method:string,body?:unknown){setSaving(true);setError(null);try{const response=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json().catch(()=>({}));if(!response.ok){setError(typeof payload.error==="string"?payload.error:"Your change could not be saved.");return false}if(payload?.project&&payload?.onboarding){setSnapshot(payload);state.replace(payload.onboarding)}else await refresh();return true}catch{setError("The server could not be reached. Your answers remain on screen.");return false}finally{setSaving(false)}}
  const saveProgress=async(nextStep:number)=>demoMode?(state.goToStep(nextStep),true):request("/api/onboarding",snapshot?"PUT":"POST",{data:{...state.getCurrent(),currentStep:nextStep},nextStep});
  const completeOnboarding=async()=>demoMode?(state.update({completed:true,currentStep:ONBOARDING_LAST_STEP}),true):request("/api/onboarding","PATCH",{data:{...state.getCurrent(),completed:true,currentStep:ONBOARDING_LAST_STEP}});
  const importLegacy=async()=>{if(!legacyData)return false;const bounded={...legacyData,currentStep:Math.min(ONBOARDING_LAST_STEP,legacyData.currentStep)};state.replace(bounded);const ok=await request("/api/onboarding","POST",{data:bounded,nextStep:bounded.currentStep});if(ok){clearDemoWorkspace();setLegacyData(null)}return ok};
  const dismissLegacy=()=>{setLegacyData(null);state.replace(defaultOnboardingData)};
  const mutateRecord=(path:string,method:string,body?:unknown)=>request(path,method,body);
  return <DemoContext.Provider value={{...state,demoMode,snapshot,loading,saving,error,legacyData,dismissLegacy,importLegacy,saveProgress,completeOnboarding,refresh,mutateRecord}}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
