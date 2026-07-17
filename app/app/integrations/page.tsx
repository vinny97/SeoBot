import { BarChart3, Building2, PanelsTopLeft, Search, ShoppingBag, Store } from "lucide-react";
import { ComingSoonState } from "@/components/foundation";
import { PageHeader } from "@/components/ui";
const integrations=[
  {name:"Google Search Console",icon:Search,description:"Use verified search queries and page performance."},
  {name:"Google Analytics",icon:BarChart3,description:"Understand how organic visitors use the website."},
  {name:"WordPress",icon:Store,description:"Prepare an approval-based publishing workflow."},
  {name:"Webflow",icon:PanelsTopLeft,description:"Support approved page and content workflows."},
  {name:"Shopify",icon:ShoppingBag,description:"Support future ecommerce SEO workflows."},
  {name:"Google Business Profile",icon:Building2,description:"Add verified local business context."},
];
export default function IntegrationsPage(){return <><PageHeader eyebrow="Future connections" title="Integrations" description="These connections will replace hypotheses with real data or enable approved actions. None are active yet."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{integrations.map(item=><div key={item.name} className="relative"><item.icon className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 text-[var(--accent)]" size={20}/><ComingSoonState title={item.name} description={item.description}/></div>)}</div></>}
