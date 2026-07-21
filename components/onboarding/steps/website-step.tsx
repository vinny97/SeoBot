"use client";
import { useState } from "react";
import { Globe2, ShieldCheck } from "lucide-react";
import { Card, Input } from "@/components/ui";
import { OnboardingNavigation } from "@/components/onboarding/onboarding-navigation";
import { StepIntro } from "@/components/onboarding/onboarding-shell";
import { normaliseWebsite, websiteSchema } from "@/lib/onboarding/schema";
import type { OnboardingData } from "@/lib/onboarding/types";

export function WebsiteStep({data,initialWebsite,update,next}:{data:OnboardingData;initialWebsite?:string;update:(patch:Partial<OnboardingData>)=>void;next:()=>void}){
  const [websiteUrl,setWebsiteUrl]=useState(data.websiteUrl||initialWebsite||"");const [error,setError]=useState("");
  function submit(event:React.FormEvent){event.preventDefault();let businessName=data.businessName;try{const normalised=normaliseWebsite(websiteUrl);const host=new URL(normalised).hostname.replace(/^www\./,"");businessName=businessName||host.split(".")[0].replace(/[-_]+/g," ").replace(/\b\w/g,letter=>letter.toUpperCase())}catch{}const result=websiteSchema.safeParse({websiteUrl,businessName:businessName||"My business",location:data.location});if(!result.success){setError(result.error.issues.find(issue=>String(issue.path[0])==="websiteUrl")?.message||"Enter a valid public website.");return}update({...result.data,websiteUrl:normaliseWebsite(result.data.websiteUrl),crawlAuthorised:true});next()}
  return <form onSubmit={submit}><StepIntro eyebrow="Work order 001 · Website" title="Which website should SEObot work on?" description="Enter your website and the agent will begin its first public inspection."/><Card className="mx-auto max-w-2xl overflow-hidden"><div className="border-b border-[var(--border)] bg-[#faf8f3] px-5 py-3"><p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[.14em] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"/>READY TO INSPECT</p></div><div className="p-5 sm:p-8"><div className="mx-auto max-w-xl"><Input label="Website URL" placeholder="https://yourwebsite.com" autoComplete="url" value={websiteUrl} onChange={event=>{setWebsiteUrl(event.target.value);setError("")}} error={error} className="py-4 pl-4 font-mono text-sm" required/><div className="mt-5 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-2"><p className="flex items-start gap-2"><Globe2 size={17} className="mt-0.5 shrink-0 text-[var(--agent)]"/>SEObot inspects public pages only.</p><p className="flex items-start gap-2"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--success)]"/>Nothing is published or changed.</p></div></div></div></Card><OnboardingNavigation nextType="submit" nextLabel="Start inspection"/></form>
}
