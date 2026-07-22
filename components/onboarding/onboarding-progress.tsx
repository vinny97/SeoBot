import { productConfig } from "@/lib/config/product";

export function OnboardingProgress({ step }: { step: number }) {
  return <div className="mx-auto w-full max-w-4xl" aria-label={`Step ${step + 1} of ${productConfig.onboardingSteps.length}`}><div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[var(--flight-muted)]"><span>First flight plan · {step + 1}/{productConfig.onboardingSteps.length}</span><span>{productConfig.onboardingSteps[step].label}</span></div><div className="relative mt-4 grid grid-cols-7 gap-1.5">{productConfig.onboardingSteps.map((item,index)=><span key={item.id} className={`relative h-1.5 rounded-full transition-colors ${index <= step ? "bg-[var(--flight-orange)]" : "bg-[#d9d6ce]"}`}>{index === step && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--flight-bg)] bg-[var(--flight-orange)]"/>}</span>)}</div></div>;
}
