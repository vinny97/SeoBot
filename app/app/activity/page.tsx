"use client";
import { useState } from "react";
import { ActivityItem } from "@/components/foundation";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { activityMock } from "@/lib/mock/dashboard";
const filters = ["All","Completed","In progress","Needs attention","Opportunities"] as const;
export default function ActivityPage(){const [filter,setFilter]=useState<(typeof filters)[number]>("All");const items=activityMock.filter(item=>filter==="All"||(filter==="Opportunities"?item.kind==="opportunity":item.status===filter));return <><PageHeader eyebrow="Work history" title="Activity" description="A simple record of completed work, current work and anything that needs attention."/><div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Activity filters">{filters.map(item=><button key={item} onClick={()=>setFilter(item)} aria-pressed={filter===item} className={`focus-ring shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${filter===item?"bg-[var(--foreground)] text-white":"border border-[var(--border)] bg-white"}`}>{item}</button>)}</div>{items.length?<Card className="divide-y divide-[var(--border)]">{items.map(item=><ActivityItem key={item.id} {...item}/>)}</Card>:<EmptyState title="No matching activity" description="Try a different filter. New activity will appear here as work progresses."/>}</>}
