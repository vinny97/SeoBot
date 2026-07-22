import { NextResponse } from "next/server";
import { safePublishingError } from "@/lib/publishing/errors";
import { refreshWordPressConnection } from "@/lib/publishing/wordpress/wordpress-connections";

export async function POST(_: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params;
    return NextResponse.json(await refreshWordPressConnection(connectionId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
