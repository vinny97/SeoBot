"use client";
import { Search } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { SetupNotice } from "@/components/foundation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { createTopicHypotheses } from "@/lib/mock/dashboard";
export default function KeywordsPage(){const {data}=useDemo();const topics=createTopicHypotheses(data);return <><PageHeader eyebrow="Foundation" title="Keyword and topic opportunities" description="Initial themes based on your onboarding answers, without fake volume or ranking information."/><SetupNotice title="Connect real search data later" description="Search Console or a future keyword provider will add genuine impressions, clicks and rankings."/><Card className="mt-5 divide-y divide-[var(--border)]">{topics.map(item=><div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div className="flex items-center gap-3"><Search size={18} className="text-[var(--accent)]"/><div><h2 className="font-semibold">{item.topic}</h2><p className="mt-1 text-xs text-[var(--muted)]">{item.status} · {item.source}</p></div></div><Badge>{item.intent}</Badge><Badge tone={item.relevance==="High"?"green":"amber"}>{item.relevance}</Badge></div>)}</Card></>}
