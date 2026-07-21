import { NextResponse } from "next/server";
import { readCrawlerLab } from "@/lib/crawler-lab/server";
export const dynamic = "force-dynamic";
export async function GET() { const data = await readCrawlerLab(); return data ? NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } }) : NextResponse.json({ error: "Not found." }, { status: 404 }); }
