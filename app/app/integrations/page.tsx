import { BarChart3, Building2, ChartNoAxesCombined, Search, ShoppingBag, Store } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";

const integrations=[
 {name:"Google Search Console",icon:Search,purpose:"Use real search queries, impressions, clicks and page performance.",enables:"Measured opportunities and future rank context"},
 {name:"Google Analytics",icon:BarChart3,purpose:"Understand how organic visitors use the website.",enables:"Traffic and conversion context"},
 {name:"WordPress",icon:Store,purpose:"Prepare an approval-based publishing workflow.",enables:"Draft and publish approved content"},
 {name:"Webflow",icon:ChartNoAxesCombined,purpose:"Connect content and page workflows to Webflow.",enables:"Approved site changes"},
 {name:"Shopify",icon:ShoppingBag,purpose:"Support product, collection and editorial SEO workflows.",enables:"Ecommerce content workflows"},
 {name:"Google Business Profile",icon:Building2,purpose:"Bring local presence and customer actions into context.",enables:"Local visibility work"},
];
export default function IntegrationsPage(){return <><PageHeader eyebrow="Data & publishing" title="Integrations" description="Planned connections that will replace hypotheses with real data or enable approved actions. None connect in V1."/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{integrations.map(x=><Card key={x.name} className="flex flex-col p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><x.icon size={21}/></span><Badge tone="amber">Coming soon</Badge></div><h2 className="mt-5 font-semibold">{x.name}</h2><p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">{x.purpose}</p><div className="mt-4 rounded-xl bg-[#f2f1ec] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Will enable</p><p className="mt-1 text-sm">{x.enables}</p></div><Button disabled variant="secondary" className="mt-4 w-full">Not available in V1</Button></Card>)}</div></>}
