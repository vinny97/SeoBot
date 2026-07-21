import Link from "next/link";
import { BarChart3, Building2, PanelsTopLeft, Search, ShoppingBag, Store, ArrowRight, ShieldCheck } from "lucide-react";
import { IntegrationCard } from "@/components/foundation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getPublishingServerEnv } from "@/lib/config/publishing-env";

const integrations = [
  { name: "Google Search Console", icon: <Search size={21}/>, purpose: "Use genuine search queries, impressions and page performance.", enables: "Measured opportunities and query context" },
  { name: "Google Analytics", icon: <BarChart3 size={21}/>, purpose: "Understand how organic visitors use the website.", enables: "Traffic and conversion context" },
  { name: "WordPress", icon: <Store size={21}/>, purpose: "Prepare an approval-based content workflow.", enables: "Approved draft and publishing steps" },
  { name: "Webflow", icon: <PanelsTopLeft size={21}/>, purpose: "Support approved page and content workflows.", enables: "Approved Webflow site changes" },
  { name: "Google Business Profile", icon: <Building2 size={21}/>, purpose: "Add verified local business context.", enables: "Local visibility opportunities" },
];

export default function IntegrationsPage() {
  const configured = Boolean(getPublishingServerEnv());
  return <><PageHeader eyebrow="Publishing connections" title="Integrations" description="Connect an approved destination without sharing provider credentials with Searchhand."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Card className="flex flex-col p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f3ed] text-[var(--flight-green)]"><ShoppingBag size={21}/></span><Badge tone={configured ? "green" : "amber"}>{configured ? "Available" : "Setup required"}</Badge></div><h2 className="mt-5 font-semibold">Shopify through Composio</h2><p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">Authorize one or more Shopify stores. Searchhand stores only the connected-account reference and safe store details.</p><div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f2f1ec] p-3 text-xs text-[var(--muted)]"><ShieldCheck size={16} className="text-[var(--flight-green)]"/>Draft-only proof of concept</div><Link href="/app/integrations/shopify" className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--flight-ink)] px-4 text-sm font-semibold text-white">Manage Shopify <ArrowRight size={15}/></Link></Card>{integrations.map((item) => <IntegrationCard key={item.name} title={item.name} icon={item.icon} purpose={item.purpose} enables={item.enables}/>)}</div></>;
}
