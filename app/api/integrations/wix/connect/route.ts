import { NextResponse } from "next/server";
import { beginWixConnection } from "@/lib/publishing/wix-connections";
import { safePublishingError } from "@/lib/publishing/errors";

export async function POST() {
  try {
    return NextResponse.json(await beginWixConnection(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
