import { NextResponse } from "next/server";
import { z } from "zod";
import { safePublishingError } from "@/lib/publishing/errors";
import { createWordPressConnectionTestDraft } from "@/lib/publishing/wordpress/direct-wordpress-publisher";

const schema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    if (!schema.safeParse(await request.json().catch(() => null)).success) return NextResponse.json({ error: "Confirm before creating the WordPress test draft." }, { status: 400 });
    const { connectionId } = await params;
    const result = await createWordPressConnectionTestDraft(connectionId);
    return NextResponse.json({ ...result, message: result.reused ? "The existing WordPress test draft was found; no duplicate was created." : "WordPress test draft created." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
