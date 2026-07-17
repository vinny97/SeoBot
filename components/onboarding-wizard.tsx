"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { productConfig } from "@/lib/config/product";

const steps = [
  { id: "website", label: "Website" },
  { id: "next", label: "Next steps" },
] as const;

function normaliseUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const parsed = new URL(withProtocol);
  if (!parsed.hostname.includes(".") || parsed.username || parsed.password) throw new Error("Enter a valid public website, such as yourbusiness.com.");
  return parsed.toString();
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [website, setWebsite] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [confirmedWebsite, setConfirmedWebsite] = useState("");
  const [error, setError] = useState("");
  function continueSetup(event: React.FormEvent) {
    event.preventDefault();
    try { setConfirmedWebsite(normaliseUrl(website)); setError(""); setStep(1); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Enter a valid website."); }
  }
  return <main className="min-h-screen"><header className="border-b border-[var(--border)] px-5 py-4"><div className="mx-auto flex max-w-4xl items-center justify-between"><Link href="/" className="focus-ring flex items-center gap-2 rounded-lg font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-white"><Compass size={17}/></span>{productConfig.name}</Link><span className="text-sm text-[var(--muted)]">Foundation preview</span></div></header><div className="mx-auto max-w-4xl px-5 py-8 sm:py-12"><div className="mx-auto mb-10 max-w-2xl"><div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]"><span>Step {step + 1} of {steps.length}</span><span>{steps[step].label}</span></div><div className="mt-3 grid grid-cols-2 gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((item,index)=><span key={item.id} className={`h-1.5 rounded-full ${index <= step ? "bg-[var(--accent)]" : "bg-[#dfdfd9]"}`}/>)}</div></div>{step === 0 ? <form onSubmit={continueSetup}><div className="mx-auto mb-8 max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Let’s begin</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">What website do you want to grow?</h1><p className="mt-3 leading-7 text-[var(--muted)]">Add the basics now. This milestone validates the details locally and does not fetch or analyse your website.</p></div><Card className="mx-auto max-w-2xl p-5 sm:p-7"><div className="space-y-5"><Input label="Website URL" placeholder="yourbusiness.com" autoComplete="url" value={website} onChange={(event)=>{setWebsite(event.target.value);setError("")}} error={error} required/><Input label="Business name" placeholder="Your business name" autoComplete="organization" value={businessName} onChange={(event)=>setBusinessName(event.target.value)} required/></div></Card><div className="mx-auto mt-7 flex max-w-2xl items-center justify-between"><span/><Button size="lg" type="submit">Analyse website <ArrowRight size={17}/></Button></div></form> : <div className="mx-auto max-w-2xl"><Card className="p-7 text-center"><CheckCircle2 className="mx-auto text-[var(--success)]" size={42}/><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">Details saved temporarily</p><h1 className="mt-2 text-3xl font-semibold">The setup foundation is ready.</h1><p className="mt-3 leading-7 text-[var(--muted)]">We validated <strong>{confirmedWebsite}</strong> for <strong>{businessName}</strong>. No website request or analysis was performed. Additional guided steps can be added here in the next milestone.</p></Card><div className="mt-7 flex items-center justify-between"><Button variant="ghost" onClick={()=>setStep(0)}><ArrowLeft size={17}/>Back</Button><Link href="/app" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3.5 font-semibold text-white">Preview workspace <ArrowRight size={17}/></Link></div></div>}</div></main>;
}
