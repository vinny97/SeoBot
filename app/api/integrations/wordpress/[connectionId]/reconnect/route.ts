import { NextResponse } from "next/server";
import { z } from "zod";
import { safePublishingError } from "@/lib/publishing/errors";
import { connectWordPress } from "@/lib/publishing/wordpress/wordpress-connections";

const schema = z.object({ siteUrl: z.string(), username: z.string(), applicationPassword: z.string() });

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Enter replacement WordPress connection details." }, { status: 400 });
    const { connectionId } = await params;
    await connectWordPress(input.data, connectionId);
    return NextResponse.json({ message: "WordPress reconnected. Existing draft history was preserved." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
