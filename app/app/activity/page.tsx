"use client";
import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { ActivityItem } from "@/components/foundation";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { createDemoActivities } from "@/lib/mock/dashboard";
const filters=["All","Completed","In progress","Needs attention"] as const;
export default function ActivityPage(){const {data}=useDemo();const [filter,setFilter]=useState<(typeof filters)[number]>("All");const activities=createDemoActivities(data);const items=activities.filter(item=>filter==="All"||item.status===filter);return <><PageHeader eyebrow="Work history" title="Activity" description="A chronological record of completed work, current work and anything that needs attention."/><div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Activity filters">{filters.map(item=><button key={item} onClick={()=>setFilter(item)} aria-pressed={filter===item} className={`focus-ring shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${filter===item?"bg-[var(--foreground)] text-white":"border border-[var(--border)] bg-white"}`}>{item}</button>)}</div>{items.length?<Card className="divide-y divide-[var(--border)]">{items.map(item=><div key={item.id}><ActivityItem {...item}/><p className="-mt-4 px-5 pb-4 pl-14 text-xs text-[var(--muted)]">Type: {item.type}</p></div>)}</Card>:<EmptyState title="No matching activity" description="Try a different filter. New activity will appear here as work progresses."/>}</>}
