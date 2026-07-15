"use client";
import { useState } from "react";
import { OpportunityList } from "@/components/opportunity-list";
import { PageHeader } from "@/components/ui";
import { useProject } from "@/components/project-provider";

export default function OpportunitiesPage(){const {project}=useProject();const [filter,setFilter]=useState("Active");const items=project.opportunities.filter(o=>filter==="All"||(filter==="Dismissed"?o.status==="Dismissed":o.status!=="Dismissed"));return <><PageHeader eyebrow="Priorities" title="Opportunities" description="Useful work your SEO employee has identified, with transparent sources and qualitative impact."/><div className="mb-5 flex gap-2">{["Active","Dismissed","All"].map(f=><button key={f} onClick={()=>setFilter(f)} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${filter===f?"bg-[var(--ink)] text-white":"border border-[var(--line)] bg-white"}`}>{f}</button>)}</div><OpportunityList items={items}/></>}
