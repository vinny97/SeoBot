import { productConfig } from "@/lib/config/product";

export function OnboardingProgress({ step }: { step: number }) {
  return <div className="mx-auto w-full max-w-4xl" aria-label={`Step ${step + 1} of ${productConfig.onboardingSteps.length}`}><div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[var(--muted)]"><span>First work order · {step + 1}/{productConfig.onboardingSteps.length}</span><span>{productConfig.onboardingSteps[step].label}</span></div><div className="mt-3 grid grid-cols-8 gap-1.5">{productConfig.onboardingSteps.map((item,index)=><span key={item.id} className={`h-1.5 rounded-full transition-colors ${index <= step ? "bg-[var(--accent)]" : "bg-[#dfdbd2]"}`}/>)}</div></div>;
}
