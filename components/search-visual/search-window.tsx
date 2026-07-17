"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui";
import { createSearchQueries } from "@/lib/mock/onboarding";
import type { OnboardingData } from "@/lib/onboarding/types";

export function SearchWindow({ data }: { data: OnboardingData }) {
  const queries=createSearchQueries(data);const reduce=useReducedMotion();const [query,setQuery]=useState(0);
  useEffect(()=>{if(reduce)return;const timer=window.setInterval(()=>setQuery(value=>(value+1)%queries.length),1800);return()=>window.clearInterval(timer)},[queries.length,reduce]);
  return <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[#f5f3ed] shadow-[0_24px_70px_rgba(30,41,37,.12)]"><div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3"><div className="flex items-center gap-2 font-semibold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#263d4a] text-white"><Search size={14}/></span>OpenFind</div><Badge tone="amber">Illustrative search</Badge></div><div className="p-4 sm:p-6"><div className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#cfd4d1] bg-white px-4 shadow-sm"><Search size={18} className="shrink-0 text-[var(--muted)]"/><motion.span key={queries[query]} initial={reduce?false:{opacity:0,y:4}} animate={{opacity:1,y:0}} className="min-w-0 text-sm font-medium sm:text-base">{queries[query]}</motion.span></div><p className="mt-2 text-xs text-[var(--muted)]">Example customer search</p><div className="mt-5 space-y-3">{[
    {name:"Clearway Services",copy:`A focused page about ${data.services[0]||"the service"}, with a clear customer promise.`,label:"Illustrative competitor"},
    {name:"Northfield Group",copy:"Helpful guidance and a direct path to speak with the team.",label:"Illustrative competitor"},
    {name:data.businessName||"Your business",copy:"Your website has room to become more relevant for searches like this.",label:"Initial opportunity",own:true},
  ].map((result,index)=><motion.article key={result.name} initial={reduce?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:reduce?0:index*.08}} className={`rounded-2xl border p-4 ${result.own?"border-[#b9d0c5] bg-[var(--accent-soft)]":"border-[var(--border)] bg-white"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[var(--muted)]">{result.own?data.websiteUrl:"example-business.test"}</p><Badge tone={result.own?"green":"neutral"}>{result.label}</Badge></div><h3 className="mt-1 font-semibold text-[#274b73]">{result.name}</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{result.copy}</p></motion.article>)}</div><div className="mt-4 flex gap-3 rounded-2xl bg-[#273f4b] p-4 text-white"><Sparkles size={20} className="shrink-0 text-[#a9d8c2]"/><div><p className="font-semibold">Opportunity to improve</p><p className="mt-1 text-sm leading-6 text-white/75">Needs real ranking data before any measured visibility claim can be made.</p></div></div></div></div>;
}
