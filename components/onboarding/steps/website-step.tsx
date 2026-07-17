"use client";
import { useState } from "react";
import { Card, Input } from "@/components/ui";
import { OnboardingNavigation } from "@/components/onboarding/onboarding-navigation";
import { StepIntro } from "@/components/onboarding/onboarding-shell";
import { normaliseWebsite, websiteSchema } from "@/lib/onboarding/schema";
import type { OnboardingData } from "@/lib/onboarding/types";

export function WebsiteStep({ data, update, next }: { data: OnboardingData; update: (patch: Partial<OnboardingData>) => void; next: () => void }) {
  const [values,setValues]=useState({websiteUrl:data.websiteUrl,businessName:data.businessName,location:data.location});
  const [errors,setErrors]=useState<Record<string,string>>({});
  function submit(event:React.FormEvent){event.preventDefault();const result=websiteSchema.safeParse(values);if(!result.success){setErrors(Object.fromEntries(result.error.issues.map(issue=>[String(issue.path[0]),issue.message])));return;}update({...result.data,websiteUrl:normaliseWebsite(result.data.websiteUrl)});next();}
  return <form onSubmit={submit}><StepIntro eyebrow="Let’s begin" title="What website do you want to grow?" description="We will learn about your business and prepare an initial organic growth plan."/><Card className="mx-auto max-w-3xl p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Input label="Website URL" placeholder="screenfizz.com" autoComplete="url" value={values.websiteUrl} onChange={event=>{setValues({...values,websiteUrl:event.target.value});setErrors({...errors,websiteUrl:""})}} error={errors.websiteUrl} hint="We’ll add https:// when it is omitted. No website request is made." required/></div><Input label="Business name" placeholder="Screenfizz" autoComplete="organization" value={values.businessName} onChange={event=>{setValues({...values,businessName:event.target.value});setErrors({...errors,businessName:""})}} error={errors.businessName} required/><Input label="Main business location (optional)" placeholder="Bristol, UK" value={values.location} onChange={event=>setValues({...values,location:event.target.value})}/></div></Card><OnboardingNavigation nextType="submit" nextLabel="Analyse website"/></form>;
}
