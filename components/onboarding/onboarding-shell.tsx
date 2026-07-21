import Link from "next/link";
import { Sparkles } from "lucide-react";
import { productConfig } from "@/lib/config/product";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";

export function OnboardingShell({ step, children }: { step: number; children: React.ReactNode }) {
  return <main className="soft-grid min-h-screen"><header className="border-b border-[var(--border)] bg-[var(--background)]/90 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/" className="focus-ring flex items-center gap-2 rounded-lg font-bold tracking-[-.03em]"><span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-[var(--accent)] text-white"><span className="absolute inset-y-0 left-1/2 w-px bg-white/30"/><span className="absolute inset-x-0 top-1/2 h-px bg-white/30"/><Sparkles size={15}/></span>{productConfig.name}</Link><span className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]"/>Your progress is saved</span></div></header><div className="mx-auto max-w-5xl px-5 py-7 sm:py-10"><OnboardingProgress step={step}/><div className="mt-9">{children}</div></div></main>;
}

export function StepIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto mb-8 max-w-3xl text-center"><p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[var(--agent)]">{eyebrow}</p><h1 className="text-balance mt-3 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{title}</h1><p className="mx-auto mt-3 max-w-2xl leading-7 text-[var(--muted)]">{description}</p></div>;
}
