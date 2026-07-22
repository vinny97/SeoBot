import Link from "next/link";
import { ArrowRight, BarChart3, Building2, FileText, PanelsTopLeft, Search, ShieldCheck, ShoppingBag, WandSparkles } from "lucide-react";
import { IntegrationCard } from "@/components/foundation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getPublishingServerEnv, getWixPublishingServerEnv, getWordPressPublishingServerEnv } from "@/lib/config/publishing-env";

const integrations = [
  { name: "Google Search Console", icon: <Search size={21}/>, purpose: "Use genuine search queries, impressions and page performance.", enables: "Measured opportunities and query context" },
  { name: "Google Analytics", icon: <BarChart3 size={21}/>, purpose: "Understand how organic visitors use the website.", enables: "Traffic and conversion context" },
  { name: "Webflow", icon: <PanelsTopLeft size={21}/>, purpose: "Support approved page and content workflows.", enables: "Approved Webflow site changes" },
  { name: "Google Business Profile", icon: <Building2 size={21}/>, purpose: "Add verified local business context.", enables: "Local visibility opportunities" },
];

function PublishingCard({ name, description, note, href, available, icon, iconClass }: { name: string; description: string; note: string; href: string; available: boolean; icon: React.ReactNode; iconClass: string }) {
  return <Card className="flex flex-col p-5"><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${iconClass}`}>{icon}</span><Badge tone={available ? "green" : "amber"}>{available ? "Available" : "Setup required"}</Badge></div><h2 className="mt-5 font-semibold">{name}</h2><p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">{description}</p><div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f2f1ec] p-3 text-xs text-[var(--muted)]"><ShieldCheck size={16} className="text-[var(--flight-green)]"/>{note}</div><Link href={href} className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--flight-ink)] px-4 text-sm font-semibold text-white">Manage {name.split(" ")[0]} <ArrowRight size={15}/></Link></Card>;
}

export default function IntegrationsPage() {
  const shopifyConfigured = Boolean(getPublishingServerEnv());
  const wixConfigured = Boolean(getWixPublishingServerEnv());
  const wordpressConfigured = Boolean(getWordPressPublishingServerEnv());
  return <><PageHeader eyebrow="Publishing connections" title="Integrations" description="Connect approved publishing destinations and keep every first release in draft mode."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><PublishingCard name="WordPress" description="Connect directly with an Application Password, then create and update WordPress drafts without a plugin." note="Encrypted credentials · drafts only" href="/app/integrations/wordpress" available={wordpressConfigured} icon={<FileText size={21}/>} iconClass="bg-[#e7f3ed] text-[var(--flight-green)]"/><PublishingCard name="Shopify through Composio" description="Authorize one or more Shopify stores. Searchhand stores only the connected-account reference and safe store details." note="Draft-only proof of concept" href="/app/integrations/shopify" available={shopifyConfigured} icon={<ShoppingBag size={21}/>} iconClass="bg-[#e7f3ed] text-[var(--flight-green)]"/><PublishingCard name="Wix through Composio" description="Connect a Wix site securely, preserve rich article formatting and prepare unpublished Wix Blog drafts." note="OAuth tokens stay with Composio" href="/app/integrations/wix" available={wixConfigured} icon={<WandSparkles size={21}/>} iconClass="bg-[#eef0ff] text-[#6657d9]"/>{integrations.map((item) => <IntegrationCard key={item.name} title={item.name} icon={item.icon} purpose={item.purpose} enables={item.enables}/>)}</div></>;
}
