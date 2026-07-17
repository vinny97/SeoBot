"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/foundation";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { WebsiteStep } from "@/components/onboarding/steps/website-step";
import { DiscoveryStep } from "@/components/onboarding/steps/discovery-step";
import { BusinessStep } from "@/components/onboarding/steps/business-step";
import { SearchVisibilityStep } from "@/components/onboarding/steps/search-visibility-step";
import { GoalsStep } from "@/components/onboarding/steps/goals-step";
import { CompetitorsStep } from "@/components/onboarding/steps/competitors-step";
import { PlanStep } from "@/components/onboarding/steps/plan-step";
import { ReadyStep } from "@/components/onboarding/steps/ready-step";
import { useDemo } from "@/components/demo-provider";

export function OnboardingWizard() {
  const {data,hydrated,update,goToStep}=useDemo();const router=useRouter();const reduce=useReducedMotion();const step=data.currentStep;
  function go(next:number){goToStep(next);window.scrollTo({top:0,behavior:reduce?"auto":"smooth"})}
  function finish(){update({completed:true,currentStep:7});router.push("/app")}
  if(!hydrated)return <main className="mx-auto min-h-screen max-w-4xl px-5 py-12"><LoadingSkeleton/></main>;
  const content=[
    <WebsiteStep key="website" data={data} update={update} next={()=>go(1)}/>,
    <DiscoveryStep key="discovery" data={data} back={()=>go(0)} next={()=>go(2)}/>,
    <BusinessStep key="business" data={data} update={update} back={()=>go(1)} next={()=>go(3)}/>,
    <SearchVisibilityStep key="visibility" data={data} back={()=>go(2)} next={()=>go(4)}/>,
    <GoalsStep key="goals" data={data} update={update} back={()=>go(3)} next={()=>go(5)}/>,
    <CompetitorsStep key="competitors" data={data} update={update} back={()=>go(4)} next={()=>go(6)}/>,
    <PlanStep key="plan" data={data} back={()=>go(5)} next={()=>go(7)}/>,
    <ReadyStep key="ready" data={data} back={()=>go(6)} finish={finish}/>,
  ][step];
  return <OnboardingShell step={step}><AnimatePresence mode="wait" initial={false}><motion.div key={step} initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={reduce?undefined:{opacity:0,y:-6}} transition={{duration:.22}}>{content}</motion.div></AnimatePresence></OnboardingShell>;
}
