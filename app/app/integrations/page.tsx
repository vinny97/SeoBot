import { BarChart3, Building2, PanelsTopLeft, Search, ShoppingBag, Store } from "lucide-react";
import { IntegrationCard } from "@/components/foundation";
import { PageHeader } from "@/components/ui";
const integrations=[
  {name:"Google Search Console",icon:<Search size={21}/>,purpose:"Use genuine search queries, impressions and page performance.",enables:"Measured opportunities and query context"},
  {name:"Google Analytics",icon:<BarChart3 size={21}/>,purpose:"Understand how organic visitors use the website.",enables:"Traffic and conversion context"},
  {name:"WordPress",icon:<Store size={21}/>,purpose:"Prepare an approval-based content workflow.",enables:"Approved draft and publishing steps"},
  {name:"Webflow",icon:<PanelsTopLeft size={21}/>,purpose:"Support approved page and content workflows.",enables:"Approved Webflow site changes"},
  {name:"Shopify",icon:<ShoppingBag size={21}/>,purpose:"Support future ecommerce SEO workflows.",enables:"Product, collection and editorial context"},
  {name:"Google Business Profile",icon:<Building2 size={21}/>,purpose:"Add verified local business context.",enables:"Local visibility opportunities"},
];
export default function IntegrationsPage(){return <><PageHeader eyebrow="Future connections" title="Integrations" description="Connections that will replace hypotheses with real data or enable approved actions. None are active."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{integrations.map(item=><IntegrationCard key={item.name} title={item.name} icon={item.icon} purpose={item.purpose} enables={item.enables}/>)}</div></>}
