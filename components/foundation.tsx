import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Info, Sparkles } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import type { WorkStatus } from "@/lib/mock/dashboard";

const tones = {
  "In progress": "blue",
  Waiting: "amber",
  Completed: "green",
  "Needs attention": "red",
} as const;

export function StatusBadge({ status }: { status: WorkStatus }) {
  return <Badge tone={tones[status]}>{status}</Badge>;
}

export function ProgressBadge({ progress }: { progress: number }) {
  return <Badge tone="blue">{progress}% complete</Badge>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-[-.02em]">{title}</h2>{description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}</div>{action}</div>;
}

export function JobItem({ title, description, status, progress }: { title: string; description: string; status: WorkStatus; progress?: number }) {
  return <div className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Clock3 size={19}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{title}</h3><StatusBadge status={status}/></div><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>{typeof progress === "number" && <div className="mt-4 flex items-center gap-3" aria-label={`${progress}% complete`}><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8e8e2]"><div className="h-full rounded-full bg-[var(--accent)]" style={{width:`${progress}%`}}/></div><span className="text-xs font-semibold text-[var(--muted)]">{progress}%</span></div>}</div></div></div>;
}

export function ActivityItem({ title, description, status, when }: { title: string; description: string; status: WorkStatus; when: string }) {
  return <div className="flex gap-4 p-5"><span className="mt-0.5 text-[var(--accent)]">{status === "Completed" ? <CheckCircle2 size={20}/> : status === "Needs attention" ? <AlertTriangle size={20}/> : <Clock3 size={20}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{title}</h3><StatusBadge status={status}/></div><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p></div><span className="hidden text-xs text-[var(--muted)] sm:block">{when}</span></div>;
}

export function OpportunityCard({ title, description, category, impact, effort, status }: { title: string; description: string; category: string; impact: string; effort: string; status: string }) {
  return <Card className="p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Sparkles size={18}/></span><div><div className="flex flex-wrap gap-2"><Badge>{category}</Badge><Badge tone="green">{impact} impact</Badge><Badge>{effort} effort</Badge></div><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p><p className="mt-3 text-xs font-semibold text-[var(--accent)]">{status}</p></div></div></Card>;
}

export function SetupNotice({ title, description }: { title: string; description: string }) {
  return <div className="flex gap-3 rounded-2xl border border-[#c8d8e6] bg-[#edf4fa] p-4 text-sm leading-6 text-[#3e5a72]"><Info size={20} className="mt-0.5 shrink-0"/><div><strong>{title}</strong><p>{description}</p></div></div>;
}

export function ComingSoonState({ title, description }: { title: string; description: string }) {
  return <Card className="p-6 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><Clock3 size={20}/></span><Badge tone="amber"><span className="mt-4">Coming soon</span></Badge><h3 className="mt-3 font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p></Card>;
}

export function IntegrationCard({ icon, title, purpose, enables }: { icon: ReactNode; title: string; purpose: string; enables: string }) {
  return <Card className="flex h-full flex-col p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</span><Badge tone="amber">Coming soon</Badge></div><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{purpose}</p><div className="mt-4 flex-1 rounded-xl bg-[#f2f1ec] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Will enable</p><p className="mt-1 text-sm">{enables}</p></div><button disabled className="mt-4 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--muted)]">Connection unavailable</button></Card>;
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description: string }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><div className="flex gap-3"><AlertTriangle size={20}/><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm">{description}</p></div></div></div>;
}

export function LoadingSkeleton() {
  return <div aria-label="Loading" className="animate-pulse space-y-4"><div className="h-8 w-2/5 rounded-lg bg-black/5"/><div className="h-28 rounded-2xl bg-black/5"/><div className="h-28 rounded-2xl bg-black/5"/></div>;
}
