"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, FileText, Globe, Home, LogOut, Moon, Plug, Route, Search, Settings, Sparkles, Sun, Users } from "lucide-react";
import { productConfig } from "@/lib/config/product";
import { cn } from "@/lib/utils";
import { useDemo } from "@/components/demo-provider";
import { logoutAction } from "@/lib/actions/auth";

const icons = { Home, Activity, Sparkles, Search, FileText, Users, Globe, Plug, Settings };

function displayHostname(value:string) {
  try{return new URL(value).hostname.replace(/^www\./,"")}catch{return "your website"}
}

function DockTooltip({children}:{children:React.ReactNode}) {
  return <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#171917] px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100">{children}<span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#171917]"/></span>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, demoMode, snapshot } = useDemo();
  const website = displayHostname(data.websiteUrl);
  const [theme,setTheme]=useState<"light"|"dark">("light");

  useEffect(()=>{
    const saved=window.localStorage.getItem("searchhand-theme");
    const next=saved==="dark"||saved==="light"?saved:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
    document.documentElement.dataset.theme=next;
    window.requestAnimationFrame(()=>setTheme(next));
  },[]);

  function toggleTheme(){
    const next=theme==="dark"?"light":"dark";
    setTheme(next);
    document.documentElement.dataset.theme=next;
    window.localStorage.setItem("searchhand-theme",next);
  }

  return <div className="min-h-screen bg-[var(--flight-bg)] text-[var(--flight-ink)]">
    <header className="sticky top-0 z-40 border-b border-[var(--flight-border)] bg-[var(--flight-bg)]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/app" className="focus-ring flex items-center gap-3 rounded-xl font-semibold tracking-[-.035em]">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[var(--flight-orange)] text-white shadow-[0_7px_20px_rgba(255,105,51,.24)]"><Route size={18} strokeWidth={2.5}/></span>
          <span className="text-[20px]">{productConfig.name}</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden max-w-[220px] truncate text-xs text-[var(--flight-muted)] sm:block">{website}</span>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#438f5d]"><span className="relative grid h-2.5 w-2.5 place-items-center"><span className="flight-beacon absolute inset-0 rounded-full border border-[#4da56a]"/><span className="h-2 w-2 rounded-full bg-[#4da56a]"/></span>Agent active</span>
          <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme==="dark"?"light":"dark"} theme`} title={`Switch to ${theme==="dark"?"light":"dark"} theme`} className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-[var(--flight-border)] bg-[var(--flight-surface)] text-[var(--flight-ink)] transition hover:-translate-y-0.5">{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}</button>
          <Link href="/app/settings" aria-label="Account settings" className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-[var(--flight-ink)] text-[11px] font-bold text-[var(--flight-bg)] transition hover:-translate-y-0.5">{demoMode?"DE":(snapshot?.user.fullName||snapshot?.user.email||"U").slice(0,2).toUpperCase()}</Link>
        </div>
      </div>
    </header>

    <main className="mx-auto w-full max-w-[1220px] px-5 pb-36 pt-5 sm:px-8 sm:pt-6 lg:px-10">{children}</main>

    <nav aria-label="Main navigation" className="fixed bottom-4 left-1/2 z-50 max-w-[calc(100vw-24px)] -translate-x-1/2 sm:bottom-6">
      <div className="searchhand-dock no-scrollbar flex items-center gap-1 overflow-x-auto rounded-[25px] border p-2 backdrop-blur-xl sm:gap-1.5 sm:overflow-visible sm:p-2.5">
        {productConfig.navigation.map((item) => {
          const Icon = icons[item.icon];
          const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={active?"page":undefined} className={cn("group focus-ring relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-all duration-200 sm:h-12 sm:w-12",active?"border-[#ffc7b2] bg-[#fff0e9] text-[var(--flight-orange)] shadow-[inset_0_0_0_1px_rgba(255,105,51,.05)]":"border-transparent text-[var(--flight-muted)] hover:-translate-y-0.5 hover:bg-[var(--flight-bg)] hover:text-[var(--flight-ink)]")}><Icon size={20} strokeWidth={active?2.4:2}/><DockTooltip>{item.label}</DockTooltip></Link>;
        })}
        {!demoMode&&<><span className="mx-1 h-7 w-px shrink-0 bg-black/10"/><form action={logoutAction}><button type="submit" aria-label="Log out" className="group focus-ring relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#747570] transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 sm:h-12 sm:w-12"><LogOut size={19}/><DockTooltip>Log out</DockTooltip></button></form></>}
      </div>
    </nav>
  </div>;
}
