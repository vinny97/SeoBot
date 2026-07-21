import { notFound } from "next/navigation";
import { getCrawlerLabContext } from "@/lib/crawler-lab/server";
import { CrawlerLab } from "@/components/crawler-lab";
export const dynamic = "force-dynamic";
export default async function CrawlerLabPage() { if (!await getCrawlerLabContext()) notFound(); return <CrawlerLab />; }
