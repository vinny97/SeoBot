"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronDown, FileText, Globe, Home, LogOut, Menu, Plug, Route, Search, Settings, Sparkles, Users, X } from "lucide-react";
import { productConfig } from "@/lib/config/product";
import { cn } from "@/lib/utils";
import { useDemo } from "@/components/demo-provider";
import { logoutAction } from "@/lib/actions/auth";

const icons = { Home, Activity, Sparkles, Search, FileText, Users, Globe, Plug, Settings };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, demoMode, snapshot } = useDemo();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navigation = <nav aria-label="Main navigation" className="space-y-1 px-3">{productConfig.navigation.map((item) => {
    const Icon = icons[item.icon];
    const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cn("focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-white text-[var(--flight-ink)] shadow-sm" : "text-[var(--flight-muted)] hover:bg-white/60 hover:text-[var(--flight-ink)]")}><Icon size={18}/>{item.label}</Link>;
  })}</nav>;

  return <div className="min-h-screen bg-[var(--flight-bg)] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--flight-border)] bg-[#ebe9e3] transition-[transform,visibility] lg:visible lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0", open ? "visible translate-x-0" : "invisible -translate-x-full")}>
      <div className="flex h-[72px] items-center justify-between px-5"><Link href="/app" className="focus-ring flex items-center gap-2 rounded-full font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--flight-orange)] text-white"><Route size={18}/></span>{productConfig.name}</Link><button onClick={() => setOpen(false)} className="focus-ring rounded-lg p-2 lg:hidden" aria-label="Close navigation"><X size={20}/></button></div>
      <div className="px-4 pb-4"><div className="flex w-full items-center justify-between rounded-xl border border-[var(--flight-border)] bg-white px-3 py-2.5" aria-label="Current website"><span><span className="block font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[var(--flight-muted)]">Aircraft</span><span className="block max-w-[170px] truncate text-sm font-semibold">{data.websiteUrl ? new URL(data.websiteUrl).hostname.replace(/^www\./,"") : "demo-website.example"}</span></span><ChevronDown size={16} className="text-[var(--flight-muted)]"/></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto">{navigation}</div>
      <div className="border-t border-[var(--flight-border)] p-4"><div className="flex w-full items-center gap-3 rounded-xl p-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--flight-ink)] text-sm font-semibold text-white">{demoMode?"DE":(snapshot?.user.fullName||snapshot?.user.email||"U").slice(0,2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{demoMode?"Demo owner":snapshot?.user.fullName||"Account owner"}</span><span className="block truncate text-xs text-[var(--flight-muted)]">{demoMode?"Local Flight Deck":snapshot?.user.email}</span></span>{demoMode?<ChevronDown size={15}/>:<form action={logoutAction}><button className="focus-ring rounded-lg p-2 text-[var(--flight-muted)] hover:text-[var(--flight-ink)]" aria-label="Log out"><LogOut size={16}/></button></form>}</div></div>
    </aside>
    {open && <button className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay"/>}
    <div className="min-w-0"><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-[var(--flight-border)] bg-[var(--flight-bg)]/95 px-4 py-3 backdrop-blur lg:px-8"><button onClick={() => setOpen(true)} className="focus-ring rounded-lg p-2 lg:hidden" aria-label="Open navigation" aria-expanded={open}><Menu size={21}/></button><div className="hidden min-w-0 items-center gap-3 sm:flex"><span className="font-mono text-[9px] font-bold tracking-[.13em] text-[var(--flight-blue)]">SEARCHHAND AGENT</span><span className="h-4 w-px bg-[var(--flight-border)]"/><span className="truncate text-xs text-[var(--flight-muted)]">Current task: analysing the highest-priority route</span></div><div className="flex items-center gap-2 text-sm"><span className="relative grid h-2.5 w-2.5 place-items-center"><span className="flight-beacon absolute inset-0 rounded-full border border-[var(--flight-green)]"/><span className="h-1.5 w-1.5 rounded-full bg-[var(--flight-green)]"/></span><span className="font-mono text-[9px] font-bold tracking-[.12em]">RUNNING</span></div></header><main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</main></div>
  </div>;
}
