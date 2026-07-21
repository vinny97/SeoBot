import { NextResponse } from "next/server";
import { z } from "zod";
import { createShopifyConnectionTestDraft } from "@/lib/publishing/composio-shopify-publisher";
import { safePublishingError } from "@/lib/publishing/errors";

const bodySchema = z.object({ confirm: z.literal(true), blogId: z.string().trim().min(1).max(120) });

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Confirm the unpublished test and enter a Shopify blog ID." }, { status: 400 });
    const { connectionId } = await params;
    const result = await createShopifyConnectionTestDraft(connectionId, body.data.blogId);
    return NextResponse.json({
      status: result.status,
      remoteUrl: result.remoteUrl,
      remoteAdminUrl: result.remoteAdminUrl,
      reused: result.reused,
      message: result.reused ? "The existing test draft was found; no duplicate was created." : "Unpublished Shopify test draft created.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
