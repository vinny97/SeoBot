import { NextResponse } from "next/server";
import { refreshShopifyConnectionStatus } from "@/lib/publishing/connections";
import { safePublishingError } from "@/lib/publishing/errors";

export async function POST(_: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params;
    return NextResponse.json(await refreshShopifyConnectionStatus(connectionId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
