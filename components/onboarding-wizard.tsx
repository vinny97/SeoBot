"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/foundation";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { WebsiteStep } from "@/components/onboarding/steps/website-step";
import { BusinessStep } from "@/components/onboarding/steps/business-step";
import { SearchVisibilityStep } from "@/components/onboarding/steps/search-visibility-step";
import { GoalsStep } from "@/components/onboarding/steps/goals-step";
import { CompetitorsStep } from "@/components/onboarding/steps/competitors-step";
import { PlanStep } from "@/components/onboarding/steps/plan-step";
import { ReadyStep } from "@/components/onboarding/steps/ready-step";
import { useDemo } from "@/components/demo-provider";
import { Button, Card } from "@/components/ui";
import { ONBOARDING_LAST_STEP } from "@/lib/onboarding/types";

export function OnboardingWizard({initialWebsite=""}:{initialWebsite?:string}) {
  const {data,hydrated,loading,saving,error,legacyData,update,goToStep,saveProgress,completeOnboarding,importLegacy,dismissLegacy}=useDemo();const router=useRouter();const reduce=useReducedMotion();const step=data.currentStep;
  async function go(next:number){if(await saveProgress(next)){goToStep(next);window.scrollTo({top:0,behavior:reduce?"auto":"smooth"})}}
  async function finish(){if(await completeOnboarding()){update({completed:true,currentStep:ONBOARDING_LAST_STEP});router.push("/app?startAnalysis=1");router.refresh()}}
  if(!hydrated||loading)return <main className="mx-auto min-h-screen max-w-4xl px-5 py-12"><LoadingSkeleton/></main>;
  if(legacyData)return <main className="grid min-h-screen place-items-center px-5"><Card className="max-w-xl p-7"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">Saved setup found</p><h1 className="mt-2 text-2xl font-semibold">Continue with the answers saved on this device?</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">We found your earlier local demonstration setup for {legacyData.businessName||legacyData.websiteUrl}. Importing copies validated answers into your private account. Local data is removed only after the server confirms the save.</p>{error&&<p role="alert" className="mt-4 text-sm text-[var(--error)]">{error}</p>}<div className="mt-6 flex flex-wrap gap-3"><Button disabled={saving} onClick={async()=>{await importLegacy()}}>{saving?"Importing…":"Import saved setup"}</Button><Button variant="ghost" disabled={saving} onClick={dismissLegacy}>Start fresh</Button></div></Card></main>;
  const content=[
    <WebsiteStep key="website" data={data} initialWebsite={initialWebsite} update={update} next={()=>go(1)}/>,
    <BusinessStep key="business" data={data} update={update} back={()=>go(0)} next={()=>go(2)}/>,
    <SearchVisibilityStep key="visibility" data={data} back={()=>go(1)} next={()=>go(3)}/>,
    <GoalsStep key="goals" data={data} update={update} back={()=>go(2)} next={()=>go(4)}/>,
    <CompetitorsStep key="competitors" data={data} update={update} back={()=>go(3)} next={()=>go(5)}/>,
    <PlanStep key="plan" data={data} back={()=>go(4)} next={()=>go(6)}/>,
    <ReadyStep key="ready" data={data} back={()=>go(5)} finish={finish}/>,
  ][step];
  return <OnboardingShell step={step}>{(saving||error)&&<div className="mx-auto mb-4 max-w-4xl" aria-live="polite">{saving&&<p className="text-sm text-[var(--muted)]">Saving securely…</p>}{error&&<p role="alert" className="text-sm text-[var(--error)]">{error}</p>}</div>}<AnimatePresence mode="wait" initial={false}><motion.div key={step} initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={reduce?undefined:{opacity:0,y:-6}} transition={{duration:.22}}>{content}</motion.div></AnimatePresence></OnboardingShell>;
}
