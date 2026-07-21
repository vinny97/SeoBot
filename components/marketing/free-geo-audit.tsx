"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CircleAlert,
  Globe2,
  LoaderCircle,
  SearchCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { GeoAuditReport, GeoAuditStatus } from "@/lib/geo-audit";

const loadingSteps = [
  "Opening your public homepage",
  "Checking AI crawler access",
  "Reading schema and page structure",
  "Looking for sitemap and llms.txt",
  "Prioritising the clearest fixes",
] as const;

function StatusIcon({ status }: { status: GeoAuditStatus }) {
  if (status === "pass") return <CheckCircle2 size={18} className="text-[#2f9d68]" />;
  if (status === "warning") return <TriangleAlert size={18} className="text-[#d89522]" />;
  return <CircleAlert size={18} className="text-[#d95050]" />;
}

export function FreeGeoAudit() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [report, setReport] = useState<GeoAuditReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const onboardingUrl = useMemo(() => {
    const value = report?.websiteUrl || websiteUrl.trim();
    const destination = value ? `/onboarding?website=${encodeURIComponent(value)}` : "/onboarding";
    return `/signup?next=${encodeURIComponent(destination)}`;
  }, [report, websiteUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!websiteUrl.trim() || loading) return;
    setError("");
    setReport(null);
    setLoading(true);
    setLoadingStep(0);
    const timer = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, loadingSteps.length - 1)), 900);
    try {
      const response = await fetch("/api/free-geo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: websiteUrl.trim() }),
      });
      const data = (await response.json()) as GeoAuditReport | { error?: string };
      if (!response.ok || !("score" in data)) throw new Error("error" in data ? data.error : "The audit could not be completed.");
      setReport(data);
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : "The audit could not be completed.");
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <section id="geo-audit" className="border-b border-[#dedad1] bg-[#171717] text-white">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 font-mono text-[10px] font-bold tracking-[.15em] text-[#f0b14b]"><Bot size={14} />FREE GEO AUDIT</span>
            <h2 className="text-balance mt-6 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Can AI search understand your website?</h2>
            <p className="mt-5 max-w-lg leading-7 text-white/60">Enter your domain. Searchhand checks the public signals that help Google and AI crawlers discover, read and interpret your business.</p>
            <form onSubmit={submit} className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 sm:flex-row">
              <label htmlFor="geo-audit-domain" className="sr-only">Website domain</label>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2"><Globe2 size={17} className="shrink-0 text-white/45" /><input id="geo-audit-domain" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="yourwebsite.com" inputMode="url" autoCapitalize="none" autoCorrect="off" className="w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/35" /></div>
              <button disabled={loading} className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f26a2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95620] disabled:cursor-wait disabled:opacity-70">{loading ? <LoaderCircle size={16} className="animate-spin" /> : <SearchCheck size={16} />}Run free audit</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45"><span className="flex items-center gap-1.5"><Check size={14} className="text-[#8bc75b]" />No signup</span><span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#8bc75b]" />Public pages only</span><span>Usually under a minute</span></div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-[#d95050]/40 bg-[#d95050]/10 px-4 py-3 text-sm text-[#ffb7b7]">{error}</p>}
          </div>

          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#222] shadow-2xl shadow-black/20">
            {!loading && !report && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="font-mono text-[10px] font-bold tracking-[.16em] text-white/40">QUICK TECHNICAL REPORT</p><h3 className="mt-2 text-xl font-semibold">What Searchhand checks</h3></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#6d5dfb]/15 text-[#9c91ff]"><SearchCheck size={21} /></span></div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">{["AI crawler access", "Structured data", "Title and description", "Content structure", "XML sitemap", "llms.txt", "Internal links", "Indexability"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.035] px-4 py-3 text-sm text-white/70"><span className="h-2 w-2 rounded-full bg-[#6d5dfb]" />{item}</div>)}</div>
                <div className="mt-7 rounded-xl border border-[#f0b14b]/20 bg-[#f0b14b]/8 px-4 py-3 text-xs leading-5 text-white/50">This is a technical GEO readiness check. It does not pretend to measure live citations inside AI tools.</div>
              </div>
            )}

            {loading && (
              <div className="p-6 sm:p-8" aria-live="polite">
                <div className="flex items-center gap-3"><LoaderCircle size={24} className="animate-spin text-[#f26a2e]" /><div><p className="font-mono text-[10px] font-bold tracking-[.16em] text-[#f26a2e]">AUDIT IN PROGRESS</p><h3 className="mt-1 text-xl font-semibold">Reading {websiteUrl.trim()}</h3></div></div>
                <div className="mt-8 space-y-3">{loadingSteps.map((step, index) => <div key={step} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${index < loadingStep ? "border-[#2f9d68]/25 bg-[#2f9d68]/8 text-white/70" : index === loadingStep ? "border-[#f26a2e]/35 bg-[#f26a2e]/8 text-white" : "border-white/8 text-white/30"}`}>{index < loadingStep ? <CheckCircle2 size={18} className="text-[#8bc75b]" /> : index === loadingStep ? <LoaderCircle size={18} className="animate-spin text-[#f26a2e]" /> : <span className="h-[18px] w-[18px] rounded-full border border-white/15" />}<span className="text-sm font-medium">{step}</span></div>)}</div>
              </div>
            )}

            {report && (
              <div className="p-6 sm:p-8" aria-live="polite">
                <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center">
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[conic-gradient(#f26a2e_var(--score),rgba(255,255,255,.08)_0)] p-2" style={{ "--score": `${report.score}%` } as React.CSSProperties}><div className="grid h-full w-full place-items-center rounded-full bg-[#222]"><div className="text-center"><span className="text-3xl font-semibold">{report.score}</span><span className="block font-mono text-[9px] text-white/35">/ 100</span></div></div></div>
                  <div><p className="font-mono text-[10px] font-bold tracking-[.16em] text-[#f26a2e]">{report.domain.toUpperCase()}</p><h3 className="mt-2 text-2xl font-semibold">{report.grade}</h3><p className="mt-2 text-sm leading-6 text-white/55">{report.summary}</p></div>
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">{report.checks.map((item) => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-center gap-2"><StatusIcon status={item.status} /><span className="text-sm font-semibold">{item.label}</span></div><p className="mt-2 text-xs leading-5 text-white/45">{item.summary}</p></div>)}</div>
                {report.topFixes.length > 0 && <div className="mt-6 rounded-2xl bg-[#fffefb] p-5 text-[#171717]"><p className="font-mono text-[10px] font-bold tracking-[.15em] text-[#f26a2e]">YOUR FIRST THREE FIXES</p><div className="mt-4 space-y-3">{report.topFixes.map((fix, index) => <div key={fix} className="flex gap-3 text-sm leading-6"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fff0e8] font-mono text-[10px] font-bold text-[#d95620]">{index + 1}</span><span>{fix}</span></div>)}</div></div>}
                <div className="mt-6 rounded-2xl border border-[#f26a2e]/25 bg-[#f26a2e]/10 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><p className="font-mono text-[10px] font-bold tracking-[.15em] text-[#ff9a6d]">WE CAN HELP WITH THIS</p><h4 className="mt-2 text-xl font-semibold">Help AI search understand—and recommend—your business.</h4><p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Searchhand turns the gaps in this audit into a prioritised plan, then helps you improve the pages and signals AI systems rely on.</p></div><Link href={onboardingUrl} className="mt-5 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f26a2e] px-5 py-3 text-sm font-semibold text-white sm:mt-0">Sign up free today <ArrowRight size={16} /></Link></div>
                <p className="mt-4 text-[11px] leading-5 text-white/35">{report.scopeNote}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
