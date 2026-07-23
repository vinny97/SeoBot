import { NextResponse } from "next/server";
import { safePublishingError } from "@/lib/publishing/errors";
import { refreshNextJsConnection } from "@/lib/publishing/nextjs/nextjs-connections";

export async function POST(_: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try { const { connectionId } = await params; return NextResponse.json(await refreshNextJsConnection(connectionId)); }
  catch (error) { const safe = safePublishingError(error); return NextResponse.json({ error:safe.message, code:safe.code }, { status:safe.status }); }
}
