"use client";
import { FileText } from "lucide-react";
import { OpportunityList } from "@/components/opportunity-list";
import { Badge, Card, PageHeader } from "@/components/ui";
import { useProject } from "@/components/project-provider";

export default function ContentPage(){const {project}=useProject();const items=project.opportunities.filter(o=>o.category==="Content");return <><PageHeader eyebrow="Content workflow" title="Content" description="Ideas and future drafts will move through a clear approval workflow. No articles are generated in V1."/><Card className="mb-6 p-5"><div className="flex gap-3"><FileText className="text-[var(--accent)]" size={21}/><div><h2 className="font-semibold">Future workflow</h2><div className="mt-3 flex flex-wrap gap-2">{["Idea","Brief requested","Brief ready","Drafting","Draft ready","Awaiting approval","Approved","Scheduled","Published","Refresh needed","Archived"].map(s=><Badge key={s}>{s}</Badge>)}</div></div></div></Card><OpportunityList items={items} contentMode/></>}
