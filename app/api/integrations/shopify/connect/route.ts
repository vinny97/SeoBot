import { NextResponse } from "next/server";
import { beginShopifyConnection } from "@/lib/publishing/connections";
import { safePublishingError } from "@/lib/publishing/errors";

export async function POST() {
  try {
    return NextResponse.json(await beginShopifyConnection(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
