import Link from "next/link";
import { Compass } from "lucide-react";
import { productConfig } from "@/lib/config/product";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";

export function OnboardingShell({ step, children }: { step: number; children: React.ReactNode }) {
  return <main className="min-h-screen"><header className="border-b border-[var(--border)] bg-[var(--background)]/95 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/" className="focus-ring flex items-center gap-2 rounded-lg font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-white"><Compass size={17}/></span>{productConfig.name}</Link><span className="text-sm text-[var(--muted)]">Progress saves locally</span></div></header><div className="mx-auto max-w-5xl px-5 py-7 sm:py-10"><OnboardingProgress step={step}/><div className="mt-9">{children}</div></div></main>;
}

export function StepIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto mb-8 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">{title}</h1><p className="mx-auto mt-3 max-w-2xl leading-7 text-[var(--muted)]">{description}</p></div>;
}
