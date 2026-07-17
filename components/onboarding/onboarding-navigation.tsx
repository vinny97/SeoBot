import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export function OnboardingNavigation({ back, nextLabel = "Continue", nextType = "button", onNext, disabled = false }: { back?: () => void; nextLabel?: string; nextType?: "button" | "submit"; onNext?: () => void; disabled?: boolean }) {
  return <div className="mx-auto mt-7 flex w-full max-w-3xl items-center justify-between"><div>{back && <Button type="button" variant="ghost" onClick={back}><ArrowLeft size={17}/>Back</Button>}</div><Button type={nextType} size="lg" onClick={onNext} disabled={disabled}>{nextLabel}<ArrowRight size={17}/></Button></div>;
}
