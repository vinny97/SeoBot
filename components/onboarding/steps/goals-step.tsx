"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui";
import { OnboardingNavigation } from "@/components/onboarding/onboarding-navigation";
import { StepIntro } from "@/components/onboarding/onboarding-shell";
import { goalsSchema } from "@/lib/onboarding/schema";
import type { ApprovalPreference, OnboardingData } from "@/lib/onboarding/types";

const goals = ["Get more qualified leads", "Increase online sales", "Grow local visibility", "Rank for important services", "Grow product sign-ups", "Build authority in the industry", "Promote business locations", "Improve existing website pages", "Create useful educational content", "Recover declining organic traffic"];
const approvals: [ApprovalPreference, string, string][] = [
  ["review_all", "Recommendations only", "Searchhand identifies routes. You decide what begins."],
  ["review_important", "Prepare work for my approval", "Searchhand prepares the work and requests clearance before important actions."],
  ["agreed_rules", "Autopilot within agreed rules", "A future phase can define safe boundaries. Automatic publishing is not enabled now."],
];

export function GoalsStep({ data, update, back, next }: { data: OnboardingData; update: (patch: Partial<OnboardingData>) => void; back: () => void; next: () => void }) {
  const [selected, setSelected] = useState(data.selectedGoals);
  const [approval, setApproval] = useState(data.approvalPreference);
  const [error, setError] = useState("");
  function toggle(goal: string) { setError(""); setSelected((current) => current.includes(goal) ? current.filter((item) => item !== goal) : current.length < 3 ? [...current, goal] : current); }
  function submit() { const result = goalsSchema.safeParse({ selectedGoals: selected, approvalPreference: approval }); if (!result.success) { setError(result.error.issues[0].message); return; } update(result.data); next(); }
  return <>
    <StepIntro eyebrow="Destination and control" title="Where should your website take the business?" description="Choose up to three outcomes. Searchhand uses this destination to judge which route is worth taking." />
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => { const active = selected.includes(goal); return <button type="button" key={goal} aria-pressed={active} onClick={() => toggle(goal)} className={`focus-ring flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left font-medium transition ${active ? "border-[var(--flight-orange)] bg-[#fff0e8]" : "border-[var(--border)] bg-white hover:border-[#b9c7c0]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${active ? "border-[var(--flight-orange)] bg-[var(--flight-orange)] text-white" : "border-[var(--border)]"}`}>{active && <Check size={14} />}</span>{goal}</button>; })}</div>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--error)]">{error}</p>}
      <Card className="mt-7 p-5 sm:p-6"><p className="font-mono text-[9px] font-bold tracking-[.14em] text-[var(--flight-blue)]">AUTOPILOT LEVEL</p><h2 className="mt-2 font-semibold">How much control do you want to keep?</h2><div className="mt-4 space-y-3">{approvals.map(([value, title, description]) => <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${approval === value ? "border-[var(--flight-orange)] bg-[#fff0e8]" : "border-[var(--border)]"}`}><input type="radio" name="approval" value={value} checked={approval === value} onChange={() => setApproval(value)} className="mt-1 accent-[var(--flight-orange)]" /><span><span className="block font-medium">{title}</span><span className="mt-1 block text-sm text-[var(--muted)]">{description}</span></span></label>)}</div><p className="mt-4 text-xs text-[var(--muted)]">Automatic publishing is not available in this milestone. Important actions still require clearance.</p></Card>
    </div>
    <OnboardingNavigation back={back} onNext={submit} nextLabel="Set destination" />
  </>;
}
