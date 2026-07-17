import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getUserAppDestination, requireUser } from "@/lib/auth/server";
import { isDemoMode } from "@/lib/config/env";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function OnboardingPage(){if(!isDemoMode()){await requireUser("/onboarding");if(await getUserAppDestination()==="/app")redirect("/app")}return <OnboardingWizard/>}
