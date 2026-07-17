import { OpportunityCard } from "@/components/foundation";
import { PageHeader } from "@/components/ui";
import { dashboardMock } from "@/lib/mock/dashboard";
export default function OpportunitiesPage(){return <><PageHeader eyebrow="Priorities" title="Opportunities" description="Early qualitative opportunities. These are demonstration hypotheses, not measured SEO findings."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboardMock.opportunities.map(item=><OpportunityCard key={item.id} {...item}/>)}</div></>}
