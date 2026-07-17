import { productConfig } from "@/lib/config/product";

export function OnboardingProgress({ step }: { step: number }) {
  return <div className="mx-auto w-full max-w-4xl" aria-label={`Step ${step + 1} of ${productConfig.onboardingSteps.length}`}><div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]"><span>Step {step + 1} of {productConfig.onboardingSteps.length}</span><span>{productConfig.onboardingSteps[step].label}</span></div><div className="mt-3 grid grid-cols-8 gap-1.5">{productConfig.onboardingSteps.map((item,index)=><span key={item.id} className={`h-1.5 rounded-full transition-colors ${index <= step ? "bg-[var(--accent)]" : "bg-[#dfdfd9]"}`}/>)}</div></div>;
}
