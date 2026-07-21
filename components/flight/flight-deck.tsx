"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  Check,
  CircleDot,
  Gauge,
  Globe2,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function FlightBrand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-[-.035em] ${inverse ? "text-white" : "text-[var(--flight-ink)]"}`}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[var(--flight-orange)] text-white">
        <span className="absolute h-px w-full rotate-[-28deg] bg-white/40" />
        <Route size={17} strokeWidth={2.4} />
      </span>
      <span className="text-[19px]">Searchhand</span>
    </span>
  );
}

export function StatusBeacon({ label = "ACTIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[.14em] text-[var(--flight-green)]">
      <span className="relative grid h-2.5 w-2.5 place-items-center">
        <span className="flight-beacon absolute inset-0 rounded-full border border-[var(--flight-green)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--flight-green)]" />
      </span>
      {label}
    </span>
  );
}

const stages = [
  { label: "PRE-FLIGHT", title: "Website mapped", detail: "34 public pages understood", icon: Globe2 },
  { label: "ROUTE CALCULATION", title: "Best next move selected", detail: "Update existing pricing page", icon: Route },
  { label: "WORK IN PROGRESS", title: "Improvement prepared", detail: "Clarity, metadata and links", icon: Bot },
  { label: "VERIFICATION", title: "Quality gates passed", detail: "Claims and links checked", icon: ShieldCheck },
  { label: "CLEARANCE REQUIRED", title: "Ready for your review", detail: "Nothing changes without approval", icon: Gauge },
] as const;

export function FlightDeckDemo() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setStage((value) => (value + 1) % stages.length), 3200);
    return () => window.clearInterval(timer);
  }, [reduce]);
  const item = stages[stage];
  const Icon = item.icon;

  return (
    <div className="flight-glow relative overflow-hidden rounded-[30px] border border-white/10 bg-[var(--flight-night)] text-white">
      <div aria-hidden="true" className="flight-grid-night absolute inset-0 opacity-60" />
      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--flight-orange)]"><Route size={15} /></span><div><p className="font-mono text-[10px] font-bold tracking-[.16em]">SEARCHHAND FLIGHT DECK</p><p className="mt-0.5 font-mono text-[8px] tracking-[.12em] text-white/35">EXAMPLE FLIGHT PLAN</p></div></div>
        <span className="rounded-full border border-[#7563ff]/30 bg-[#7563ff]/10 px-3 py-1.5 font-mono text-[9px] font-bold tracking-[.12em] text-[#a99fff]">AUTOPILOT · ASSISTED</span>
      </div>
      <div className="relative grid sm:grid-cols-[132px_1fr]">
        <div className="hidden border-r border-white/10 px-4 py-6 sm:block">
          <p className="font-mono text-[8px] tracking-[.16em] text-white/35">FLIGHT STAGES</p>
          <div className="mt-6 space-y-1">{stages.map((step, index) => <button key={step.label} onClick={() => setStage(index)} aria-label={`Show ${step.label.toLowerCase()}`} className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition ${index === stage ? "bg-white/8 text-white" : "text-white/30 hover:text-white/60"}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[8px] ${index < stage ? "border-[var(--flight-green)] bg-[var(--flight-green)]/10 text-[var(--flight-green)]" : index === stage ? "border-[var(--flight-orange)] text-[var(--flight-orange)]" : "border-white/15"}`}>{index < stage ? <Check size={10} /> : index + 1}</span><span className="font-mono text-[8px] leading-3 tracking-[.06em]">{step.label}</span></button>)}</div>
        </div>
        <div className="min-h-[510px] p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="font-mono text-[8px] tracking-[.15em] text-white/35">AIRCRAFT</p><p className="mt-2 truncate font-mono text-xs">screenfizz.com</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="font-mono text-[8px] tracking-[.15em] text-white/35">DESTINATION</p><p className="mt-2 text-xs font-semibold">More qualified enquiries</p></div>
          </div>
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f15] p-5">
            <svg aria-hidden="true" viewBox="0 0 620 172" className="h-auto w-full">
              <path d="M22 135 C120 135 128 40 225 52 S385 152 598 34" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="2" />
              <motion.path d="M22 135 C120 135 128 40 225 52 S385 152 598 34" fill="none" stroke="#ff6933" strokeWidth="2.5" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: Math.max(.18, (stage + 1) / stages.length) }} transition={{ duration: .7 }} />
              {[{x:22,y:135},{x:225,y:52},{x:398,y:121},{x:598,y:34}].map((point,index)=><g key={index}><circle cx={point.x} cy={point.y} r="10" fill="#11131a" stroke={index <= stage ? "#ff6933" : "rgba(255,255,255,.2)"} strokeWidth="2" /><circle cx={point.x} cy={point.y} r="3" fill={index <= stage ? "#ff6933" : "rgba(255,255,255,.25)"} /></g>)}
            </svg>
            <div className="absolute left-5 top-4 font-mono text-[8px] tracking-[.14em] text-white/25">ROUTE · SEO-001</div>
          </div>
          <motion.div key={item.label} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-[#7563ff]/25 bg-[#7563ff]/10 p-5">
            <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[9px] font-bold tracking-[.14em] text-[#a99fff]">{item.label}</p><h3 className="mt-2 text-lg font-semibold">{item.title}</h3><p className="mt-1 text-sm text-white/45">{item.detail}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7563ff]/15 text-[#a99fff]"><Icon size={19} /></span></div>
          </motion.div>
          <div className={`mt-4 grid gap-2 transition-opacity ${stage >= 2 ? "opacity-100" : "opacity-35"}`}>
            <div className="rounded-lg border border-[#d64b4b]/20 bg-[#d64b4b]/8 px-3 py-2 font-mono text-[10px] text-[#e68d8d] line-through">Digital Signage Pricing</div>
            <div className="rounded-lg border border-[#249b67]/20 bg-[#249b67]/8 px-3 py-2 font-mono text-[10px] text-[#73cfaa]">Managed Digital Signage Pricing for UK Businesses</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type RadarSignal = { title: string; capability: string; angle: number; distance: number };

export function OpportunityRadar({ signals }: { signals: RadarSignal[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
      <div className="relative mx-auto aspect-square w-full max-w-[540px] overflow-hidden rounded-full border border-[#7563ff]/25 bg-[#0d0f15] p-8" aria-label="Opportunity radar showing four detected search signals">
        <div aria-hidden="true" className="flight-radar absolute inset-0 rounded-full" />
        {!reduce && <div aria-hidden="true" className="flight-radar-sweep absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-bottom-right bg-gradient-to-br from-transparent to-[#7563ff]/20" />}
        <div aria-hidden="true" className="absolute inset-[10%] rounded-full border border-[#7563ff]/10" />
        <div aria-hidden="true" className="absolute inset-[29%] rounded-full border border-[#7563ff]/10" />
        <span className="absolute left-1/2 top-1/2 z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#7563ff]/35 bg-[#191c25] text-[#a99fff]"><Radar size={21} /></span>
        {signals.map((signal,index) => {
          const radians = (signal.angle * Math.PI) / 180;
          const left = (50 + Math.cos(radians) * signal.distance).toFixed(4);
          const top = (50 + Math.sin(radians) * signal.distance).toFixed(4);
          return <span key={signal.title} className="absolute z-10" style={{ left: `${left}%`, top: `${top}%` }}><span className="flight-beacon absolute -inset-2 rounded-full border border-[var(--flight-orange)]" /><span className="relative grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--flight-orange)] bg-[#191c25] font-mono text-[8px] text-white">{index + 1}</span></span>;
        })}
        <span className="absolute bottom-[16%] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] tracking-[.16em] text-white/25">OPPORTUNITY RANGE · 90 DAYS</span>
      </div>
      <div className="space-y-3">{signals.map((signal,index) => <div key={signal.title} className="group rounded-2xl border border-white/10 bg-white/[.035] p-4 transition hover:border-[#7563ff]/35"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#7563ff]/35 font-mono text-[9px] text-[#a99fff]">{index + 1}</span><div><p className="font-semibold">{signal.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-white/40"><Sparkles size={12} />{signal.capability}<ArrowUpRight size={12} /></p></div></div></div>)}</div>
    </div>
  );
}

export function TelemetryCard({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: "blue" | "green" | "orange" }) {
  const colors = tone === "green" ? "text-[#65c99e]" : tone === "orange" ? "text-[#ff8b5f]" : "text-[#92a7ff]";
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-center justify-between"><p className="font-mono text-[9px] tracking-[.14em] text-white/35">{label.toUpperCase()}</p><CircleDot size={14} className={colors} /></div><p className={`mt-5 text-3xl font-semibold tracking-[-.04em] ${colors}`}>{value}</p><p className="mt-2 text-xs leading-5 text-white/40">{note}</p></div>;
}
