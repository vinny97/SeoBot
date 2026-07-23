import { NextResponse } from "next/server";
import { z } from "zod";
import { safePublishingError } from "@/lib/publishing/errors";
import { disconnectNextJs } from "@/lib/publishing/nextjs/nextjs-connections";

const schema = z.object({ confirm: z.literal(true) });
export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    if (!schema.safeParse(await request.json().catch(() => null)).success) return NextResponse.json({ error:"Confirm before disconnecting Next.js." }, { status:400 });
    const { connectionId } = await params;
    await disconnectNextJs(connectionId);
    return NextResponse.json({ message:"Searchhand has forgotten the Next.js integration token." });
  } catch (error) { const safe = safePublishingError(error); return NextResponse.json({ error:safe.message, code:safe.code }, { status:safe.status }); }
}
