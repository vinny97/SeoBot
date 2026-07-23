import { NextResponse } from "next/server";
import { z } from "zod";
import { safePublishingError } from "@/lib/publishing/errors";
import { testNextJsConnection } from "@/lib/publishing/nextjs/nextjs-connections";

const schema = z.object({ siteUrl: z.string(), apiToken: z.string() });

export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Enter the Next.js website URL and integration token." }, { status: 400 });
    return NextResponse.json(await testNextJsConnection(input.data), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
