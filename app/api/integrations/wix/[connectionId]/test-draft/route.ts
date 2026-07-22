import { NextResponse } from "next/server";
import { z } from "zod";
import { createWixConnectionTestDraft } from "@/lib/publishing/composio-wix-publisher";
import { safePublishingError } from "@/lib/publishing/errors";

const bodySchema = z.object({
  confirm: z.literal(true),
  authorMemberId: z.string().trim().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Confirm the unpublished Wix test and check the optional author member ID." }, { status: 400 });
    const { connectionId } = await params;
    const result = await createWixConnectionTestDraft(connectionId, body.data.authorMemberId);
    return NextResponse.json({
      status: result.status,
      remoteUrl: result.remoteUrl,
      remoteAdminUrl: result.remoteAdminUrl,
      reused: result.reused,
      message: result.reused ? "The existing Wix test draft was found; no duplicate was created." : "Unpublished Wix test draft created.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
