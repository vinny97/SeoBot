import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getOptionalUser, getUserAppDestination } from "@/lib/auth/server";
import { isDemoMode } from "@/lib/config/env";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function OnboardingPage({searchParams}:{searchParams:Promise<{website?:string}>}){const params=await searchParams;if(!isDemoMode()){if(!await getOptionalUser()){const next=params.website?`/onboarding?website=${encodeURIComponent(params.website)}`:"/onboarding";redirect(`/signup?next=${encodeURIComponent(next)}`)}if(await getUserAppDestination()==="/app")redirect("/app")}return <OnboardingWizard initialWebsite={params.website||""}/>}
