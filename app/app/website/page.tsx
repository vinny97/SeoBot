import { Globe2 } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { SetupNotice } from "@/components/foundation";
const fields=[
  ["URL","https://harbourandpine.co.uk"],
  ["Homepage title","Harbour & Pine — Demonstration website"],
  ["Meta description","A sample description used only to demonstrate the website profile layout."],
  ["Sitemap status","Not checked"],
  ["Robots.txt status","Not checked"],
];
export default function WebsitePage(){return <><PageHeader eyebrow="Website profile" title="Harbour & Pine" description="A clear home for basic website context before any real analysis is introduced."/><SetupNotice title="Demonstration data" description="This page does not fetch, crawl or inspect a website. All details below are static examples."/><Card className="mt-5 p-5 sm:p-6"><div className="flex items-center gap-3 border-b border-[var(--border)] pb-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Globe2 size={21}/></span><div><h2 className="font-semibold">harbourandpine.co.uk</h2><p className="text-sm text-[var(--muted)]">Primary website placeholder</p></div><Badge tone="amber"><span className="ml-auto">Demo</span></Badge></div><dl className="divide-y divide-[var(--border)]">{fields.map(([label,value])=><div key={label} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]"><dt className="text-sm font-semibold">{label}</dt><dd className="text-sm leading-6 text-[var(--muted)]">{value}</dd></div>)}</dl></Card></>}
