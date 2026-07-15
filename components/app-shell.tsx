"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Compass,
  FileText,
  Globe,
  Home,
  LogOut,
  Menu,
  Plug,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { productConfig } from "@/lib/config/product";
import { cn } from "@/lib/utils";
import { useProject } from "@/components/project-provider";
import { createClient } from "@/lib/supabase/client";

const icons = {
  Home,
  Activity,
  Sparkles,
  Search,
  FileText,
  Users,
  Globe,
  Plug,
  Settings,
};
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { project, hydrated, syncError } = useProject();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (hydrated && !project.onboardingCompleted) router.replace("/onboarding");
  }, [hydrated, project.onboardingCompleted, router]);
  async function logout() {
    const client = createClient();
    if (client) await client.auth.signOut();
    document.cookie = "northstar-demo-session=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }
  if (!hydrated || !project.onboardingCompleted)
    return (
      <div
        className="min-h-screen animate-pulse p-6"
        aria-label="Opening your workspace"
      >
        <div className="h-12 w-52 rounded-xl bg-black/5" />
        <div className="mt-12 h-8 w-2/3 rounded-xl bg-black/5" />
        <div className="mt-8 h-40 rounded-2xl bg-black/5" />
      </div>
    );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-[#d8dad4] bg-[#eef0eb] transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-18 items-center justify-between px-5">
          <Link href="/app" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-white">
              <Compass size={19} />
            </span>
            {productConfig.name}
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 hover:bg-black/5 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mx-3 mb-4 rounded-xl border border-[#d7dad3] bg-white/70 p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {project.website.displayName}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {project.website.domain}
              </p>
            </div>
            <ChevronDown size={15} className="text-[var(--muted)]" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />{" "}
            Employee active
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {productConfig.navigation.map((item) => {
            const Icon = icons[item.icon as keyof typeof icons];
            const exact =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                onClick={() => setOpen(false)}
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  exact
                    ? "bg-white text-[var(--ink)] shadow-sm"
                    : "text-[#59635e] hover:bg-white/65 hover:text-[var(--ink)]",
                )}
              >
                <Icon size={18} />
                {item.label}
                {item.label === "Integrations" && (
                  <span className="ml-auto rounded-full bg-[#e5e5df] px-2 py-0.5 text-[10px]">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#d8dad4] p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#59635e] hover:bg-white/60"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--background)]/90 px-4 backdrop-blur sm:px-7 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 hover:bg-black/5"
          >
            <Menu size={21} />
          </button>
          <span className="text-sm font-semibold">
            {project.website.domain}
          </span>
          <span className="relative h-8 w-8 rounded-full bg-[var(--accent-soft)]">
            <span className="absolute inset-0 grid place-items-center text-xs font-bold text-[var(--accent)]">
              {project.business.name.slice(0, 1) || "N"}
            </span>
          </span>
        </header>
        {syncError && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-[#e5cfa9] bg-[#fcf2df] p-3 text-sm text-[#765020] sm:mx-7"
          >
            <AlertTriangle size={18} className="shrink-0" />
            <span>
              {syncError} Changes remain saved locally and cloud sync will retry
              automatically.
            </span>
          </div>
        )}
        <main className="page-enter mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
