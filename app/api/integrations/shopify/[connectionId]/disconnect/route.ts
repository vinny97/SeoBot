import { NextResponse } from "next/server";
import { z } from "zod";
import { ComposioShopifyPublisher } from "@/lib/publishing/composio-shopify-publisher";
import { safePublishingError } from "@/lib/publishing/errors";

const bodySchema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    if (!bodySchema.safeParse(await request.json().catch(() => null)).success) {
      return NextResponse.json({ error: "Confirm before disconnecting Shopify." }, { status: 400 });
    }
    const { connectionId } = await params;
    await new ComposioShopifyPublisher().disconnect(connectionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
