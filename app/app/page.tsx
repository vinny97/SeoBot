"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Plane, Radar, Search, ShieldCheck, Sparkles, Target, Wrench } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { createDemoDashboard } from "@/lib/mock/dashboard";

type AnalysisState="idle"|"starting"|"running"|"complete"|"error";
type Signal={id:string;title:string;why:string;impact?:string;effort?:string};

const signalPositions=[
  {left:"58%",top:"23%",align:"left"},
  {left:"25%",top:"43%",align:"right"},
  {left:"56%",top:"66%",align:"left"},
] as const;

function RadarSignal({signal,index}:{signal:Signal;index:number}) {
  const position=signalPositions[index]||signalPositions[0];
  const label=signal.title.length>42?`${signal.title.slice(0,39)}…`:signal.title;
  return <div className="absolute z-20" style={{left:position.left,top:position.top}}>
    <span className="searchhand-signal-pulse absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-[#78e09a]/55"/>
    <span className="relative block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#a7efb9] bg-[#43995f] shadow-[0_0_18px_rgba(107,220,139,.9)]"/>
    <div className={`absolute top-[-18px] hidden w-[150px] sm:block ${position.align==="right"?"right-5 text-right":"left-5"}`}>
      <p className="text-[11px] font-semibold leading-[1.25] text-white/85">{label}</p>
      <p className="mt-1 text-[9px] font-medium text-[#79d995]">{signal.impact||signal.effort||"Opportunity"}</p>
    </div>
  </div>;
}

function SeoRadar({signals}:{signals:Signal[]}) {
  return <div className="relative min-h-[430px] overflow-hidden bg-[#171a18] sm:min-h-[520px]">
    <div className="absolute left-5 top-5 z-30 rounded-2xl border border-white/15 bg-black/20 px-4 py-3 backdrop-blur sm:left-6 sm:top-6">
      <div className="flex items-center gap-2.5"><span className="relative grid h-7 w-7 place-items-center rounded-full border border-[#62bc7b]/50 bg-[#24462d]"><span className="searchhand-signal-pulse absolute inset-0 rounded-full border border-[#7ae29a]"/><span className="h-2.5 w-2.5 rounded-full bg-[#7ae29a] shadow-[0_0_12px_#7ae29a]"/></span><div><p className="text-sm font-semibold text-white">Agent working</p><p className="mt-0.5 text-[10px] text-white/45">Scanning. Analysing. Improving.</p></div></div>
    </div>

    <div className="absolute left-1/2 top-1/2 aspect-square w-[min(92%,610px)] -translate-x-1/2 -translate-y-1/2">
      <div className="searchhand-radar absolute inset-0 rounded-full border border-white/10"/>
      <div className="searchhand-radar-sweep absolute inset-[1px] rounded-full"/>
      <svg viewBox="0 0 600 600" aria-hidden="true" className="absolute inset-0 h-full w-full opacity-80">
        <path d="M300 300 C250 247 178 336 96 254" fill="none" stroke="#ef6b3c" strokeWidth="1.4" strokeDasharray="4 5"/>
        <path d="M300 300 C370 275 397 188 356 137" fill="none" stroke="#ef6b3c" strokeWidth="1.4" strokeDasharray="4 5"/>
        <path d="M300 300 C356 338 346 416 340 438" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" strokeDasharray="3 6"/>
        <path d="M300 300 C377 315 425 309 486 296" fill="none" stroke="#ef6b3c" strokeWidth="1.4" strokeDasharray="4 5"/>
      </svg>
      {signals.slice(0,3).map((signal,index)=><RadarSignal key={signal.id} signal={signal} index={index}/>) }
      <div className="absolute left-1/2 top-1/2 z-20 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#212522] text-white shadow-[0_8px_26px_rgba(0,0,0,.35)]"><Plane size={23} className="-rotate-12" fill="currentColor"/></div>
      <div className="absolute left-[78%] top-1/2 z-20 -translate-y-1/2 text-[var(--flight-orange)]"><Plane size={30} className="rotate-[-8deg]" fill="currentColor"/></div>
      {["0°","45°","90°","135°","180°","225°","270°","315°"].map((label,index)=><span key={label} className="absolute text-[10px] text-white/38" style={{left:`${50+Math.cos((index*45-90)*Math.PI/180)*46}%`,top:`${50+Math.sin((index*45-90)*Math.PI/180)*46}%`,transform:"translate(-50%,-50%)"}}>{label}</span>)}
    </div>

    <div className="absolute bottom-5 left-5 z-30 rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-[10px] text-white/60 backdrop-blur sm:bottom-6 sm:left-6"><div className="space-y-2"><p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full border border-[#7ae29a]"/>Opportunities</p><p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--flight-orange)]"/>In progress</p><p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-white/65"/>Monitored</p></div></div>
  </div>;
}

function Metric({icon:Icon,value,label}:{icon:typeof FileText;value:number;label:string}) {
  return <div className="min-w-0 px-3 py-1 text-center"><Icon size={21} strokeWidth={1.8} className="mx-auto text-[#7cde91]"/><p className="mt-3 text-[28px] font-semibold tracking-[-.04em] text-white">{value}</p><p className="mt-1 text-[10px] leading-4 text-white/45">{label}</p></div>;
}

export default function DashboardPage() {
  const {data,hydrated,demoMode,snapshot,refresh}=useDemo();
  const router=useRouter();
  const analysisRequested=useRef(false);
  const [analysisState,setAnalysisState]=useState<AnalysisState>("idle");
  const crawlId=snapshot?.currentCrawl?.id;
  const crawlStatus=snapshot?.currentCrawl?.status;
  useEffect(()=>{
    if(analysisRequested.current||typeof window==="undefined"||new URLSearchParams(window.location.search).get("startAnalysis")!=="1")return;
    analysisRequested.current=true;
    if(demoMode){router.replace("/app");return}
    queueMicrotask(()=>setAnalysisState("starting"));
    void fetch("/api/onboarding/analysis",{method:"POST"}).then(async response=>{if(!response.ok)throw new Error("analysis_not_queued");router.replace("/app");await refresh();setAnalysisState("running")}).catch(()=>{setAnalysisState("error");router.replace("/app")});
  },[demoMode,refresh,router]);
  useEffect(()=>{
    const active=crawlStatus&&["queued","running"].includes(crawlStatus);if(!active)return;
    const timer=window.setInterval(()=>void refresh(),5000);return()=>window.clearInterval(timer);
  },[crawlId,crawlStatus,refresh]);
  useEffect(()=>{
    if(analysisState!=="running"||!crawlStatus||["queued","running"].includes(crawlStatus))return;
    queueMicrotask(()=>setAnalysisState(crawlStatus.startsWith("completed")?"complete":"error"));
  },[analysisState,crawlStatus]);

  const dashboard=createDemoDashboard(data);
  const currentWork=snapshot?.jobs.length?snapshot.jobs:dashboard.currentWork;
  const opportunities=(snapshot?.opportunities.length?snapshot.opportunities:dashboard.opportunities) as Signal[];
  const completed=snapshot?.activities.length?snapshot.activities.filter(item=>item.status==="Completed"):dashboard.completed;
  const current=currentWork.find(item=>item.status==="In progress"||item.status==="Waiting")||currentWork[0];
  const crawl=snapshot?.currentCrawl;
  const pagesReviewed=crawl?.pagesSucceeded??(demoMode?34:0);
  const opportunityCount=snapshot?.opportunities.length??dashboard.opportunities.length;
  const issuesFixed=Math.min(completed.length,99);
  const progress="progress" in (current||{})?Number((current as {progress?:number}).progress||0):0;
  const activeAnalysis=analysisState==="starting"||analysisState==="running"||(crawl&&["queued","running"].includes(crawl.status));
  const recent=completed.slice(0,3);
  const attention=snapshot?.approvals.length||0;
  const crawlCouldNotReadSite=Boolean(crawl&&!["queued","running"].includes(crawl.status)&&crawl.pagesSucceeded===0&&crawl.pagesFailed>0);
  const crawlFailureCopy=crawl?.lastFetchErrorCode==="rate_limited"||crawl?.lastHttpStatus===503
    ? "The website returned repeated 503 responses. Make sure it is live and not suspended, then retry from Website."
    : crawl?.lastFetchErrorMessage||"The crawler could not read any public pages. Check that the website is live, then retry from Website.";

  return <>
    <h1 className="sr-only">Searchhand SEO radar dashboard</h1>
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#171a18] shadow-[0_32px_80px_rgba(25,24,21,.18)] xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
      <SeoRadar signals={opportunities}/>
      <aside className="border-t border-white/10 bg-[#191c1a] text-white xl:border-l xl:border-t-0">
        <div className="border-b border-white/10 p-6"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/70">Overview</p><div className="mt-6 grid grid-cols-3 divide-x divide-white/10"><Metric icon={FileText} value={pagesReviewed} label="Pages reviewed"/><Metric icon={Target} value={opportunityCount} label="Opportunities found"/><Metric icon={Wrench} value={issuesFixed} label="Jobs completed"/></div></div>
        <div className="border-b border-white/10 p-6"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/70">Working now</p><div className="mt-5 flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--flight-orange)] text-[var(--flight-orange)]"><Plane size={21} fill="currentColor"/></span><div className="min-w-0"><h2 className="text-[15px] font-semibold leading-5">{current?.title||"Choosing the most useful next improvement"}</h2><p className="mt-1 text-xs leading-5 text-white/45">{current?.description||"Comparing impact and effort"}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full bg-[var(--flight-orange)] transition-[width] duration-700" style={{width:`${Math.max(8,progress)}%`}}/></div></div></div></div>
        <div className="p-6"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/70">Recent activity</p><Sparkles size={14} className="text-[#7cde91]"/></div><div className="mt-4 divide-y divide-white/10">{recent.map((item,index)=><div key={item.id} className="grid grid-cols-[42px_10px_1fr] items-center gap-2 py-3 text-xs"><span className="text-white/30">{index===0?"Now":`−${index*2+1}m`}</span><span className="h-2 w-2 rounded-full bg-[#79dd91] shadow-[0_0_8px_rgba(121,221,145,.55)]"/><span className="truncate text-white/72">{item.title}</span></div>)}</div><Link href="/app/activity" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-[11px] font-medium text-white/65 transition hover:border-white/30 hover:text-white">View full activity <ArrowRight size={13}/></Link></div>
      </aside>
    </section>

    <section className={`relative mt-4 overflow-hidden rounded-2xl border px-5 py-4 sm:px-6 ${crawlCouldNotReadSite||analysisState==="error"?"border-amber-300/60 bg-amber-50/80":activeAnalysis?"border-[#c7d9cf] bg-[#edf6f0]":"border-[var(--flight-border)] bg-[var(--flight-surface)]/55"}`} role={crawlCouldNotReadSite||analysisState==="error"?"alert":"status"}>
      <div className="relative z-10 flex items-center gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${crawlCouldNotReadSite||analysisState==="error"?"bg-amber-100 text-amber-700":activeAnalysis?"bg-[#dcefe3] text-[#438f5d]":"bg-[#e4f2e7] text-[#438f5d]"}`}>{crawlCouldNotReadSite?<AlertTriangle size={21}/>:analysisState==="error"?<Search size={21}/>:activeAnalysis?<Radar size={21}/>:attention?<ShieldCheck size={21}/>:<CheckCircle2 size={21}/>}</span><div><h2 className="font-semibold">{crawlCouldNotReadSite?"Website analysis couldn’t read the site.":analysisState==="error"?"Your workspace is ready, but analysis needs another try.":activeAnalysis?"Website analysis is running in the background.":attention?`${attention} item${attention===1?"":"s"} need your attention.`:"Nothing needs your attention right now."}</h2><p className="mt-1 text-xs leading-5 text-[var(--flight-muted)]">{crawlCouldNotReadSite?crawlFailureCopy:analysisState==="error"?"Retry from Website without repeating onboarding.":activeAnalysis?`Keep using Searchhand while we work${crawl?` · ${crawl.pagesSucceeded} pages analysed`:""}.`:attention?"Open the relevant work item when you are ready to review it.":"We’ll keep working in the background and notify you when something is important."}</p></div></div>
      <svg aria-hidden="true" viewBox="0 0 520 70" className="absolute -right-5 bottom-0 hidden h-[74px] w-[520px] opacity-35 md:block"><path d="M0 50 C90 45 120 30 180 35 S260 58 320 24 S390 48 520 16" fill="none" stroke="#9ba39d" strokeWidth="1" strokeDasharray="4 5"/><g transform="translate(462 8) rotate(-8)"><path d="M0 10 L28 2 L20 12 L29 17 L25 20 L15 16 L7 24 L3 23 L7 14 Z" fill="none" stroke="#4c514d" strokeWidth="1.5"/></g></svg>
    </section>

    {!hydrated&&<span className="sr-only">Loading workspace</span>}
  </>;
}
