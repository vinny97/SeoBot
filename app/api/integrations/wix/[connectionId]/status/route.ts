import { NextResponse } from "next/server";
import { refreshWixConnectionStatus } from "@/lib/publishing/wix-connections";
import { safePublishingError } from "@/lib/publishing/errors";

export async function POST(_: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params;
    return NextResponse.json(await refreshWixConnectionStatus(connectionId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
