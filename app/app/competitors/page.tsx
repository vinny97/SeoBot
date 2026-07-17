import { Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
export default function CompetitorsPage(){return <><PageHeader eyebrow="Market context" title="Competitors" description="Confirmed competitors will help your SEO employee understand the market without inventing statistics."/><EmptyState icon={<Users size={21}/>} title="No confirmed competitors yet" description="Competitor suggestions, scraping and performance statistics are intentionally unavailable in this foundation milestone."/></>}
