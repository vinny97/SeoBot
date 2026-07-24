"use client";
import { Database, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { OnboardingNavigation } from "@/components/onboarding/onboarding-navigation";
import { StepIntro } from "@/components/onboarding/onboarding-shell";
import type { OnboardingData } from "@/lib/onboarding/types";

export function PlanStep({back,next}:{data:OnboardingData;back:()=>void;next:()=>void}){return <><StepIntro eyebrow="Website analysis" title="Your plan will use the website data being collected." description="Searchhand does not show generated opportunities or made-up search data during setup."/><div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2"><Card className="p-6"><Database className="text-[var(--flight-blue)]" size={24}/><h2 className="mt-4 font-semibold">Public website crawl</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">The crawler reads permitted pages, titles, descriptions, headings, links, sitemap data and technical signals.</p></Card><Card className="p-6"><ShieldCheck className="text-[var(--flight-green)]" size={24}/><h2 className="mt-4 font-semibold">Evidence before recommendations</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Recommendations appear in your Flight Deck only after the crawler has gathered enough evidence.</p></Card></div><OnboardingNavigation back={back} onNext={next} nextLabel="Finish setup"/></>}
