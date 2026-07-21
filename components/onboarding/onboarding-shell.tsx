import Link from "next/link";
import { Route } from "lucide-react";
import { productConfig } from "@/lib/config/product";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";

export function OnboardingShell({ step, children }: { step: number; children: React.ReactNode }) {
  return <main className="flight-grid min-h-screen bg-[var(--flight-bg)]"><header className="border-b border-[var(--flight-border)] bg-[var(--flight-bg)]/92 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/" className="focus-ring flex items-center gap-2 rounded-full font-semibold tracking-[-.03em]"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--flight-orange)] text-white"><Route size={16}/></span>{productConfig.name}</Link><span className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[.12em] text-[var(--flight-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--flight-green)]"/>PROGRESS SAVED</span></div></header><div className="mx-auto max-w-5xl px-5 py-7 sm:py-10"><OnboardingProgress step={step}/><div className="mt-9">{children}</div></div></main>;
}

export function StepIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto mb-8 max-w-3xl text-center"><p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[var(--flight-blue)]">{eyebrow}</p><h1 className="text-balance mt-3 text-3xl font-semibold tracking-[-.05em] sm:text-5xl">{title}</h1><p className="mx-auto mt-4 max-w-2xl leading-7 text-[var(--flight-muted)]">{description}</p></div>;
}
