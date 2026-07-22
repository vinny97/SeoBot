import { NextResponse } from "next/server";
import { z } from "zod";
import { safePublishingError } from "@/lib/publishing/errors";
import { disconnectWordPress } from "@/lib/publishing/wordpress/wordpress-connections";

const schema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    if (!schema.safeParse(await request.json().catch(() => null)).success) return NextResponse.json({ error: "Confirm before disconnecting WordPress." }, { status: 400 });
    const { connectionId } = await params;
    await disconnectWordPress(connectionId);
    return NextResponse.json({ message: "Searchhand has forgotten the WordPress credentials. Delete the Searchhand Application Password in WordPress to revoke it there too." });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
