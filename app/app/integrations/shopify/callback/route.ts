import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/server";
import { completeShopifyCallback } from "@/lib/publishing/connections";
import { safePublishingError } from "@/lib/publishing/errors";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!await getOptionalUser()) {
    const next = `${url.pathname}${url.search}`;
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin));
  }
  const connectionId = url.searchParams.get("connection") || "";
  const state = url.searchParams.get("state") || "";
  const callbackStatus = url.searchParams.get("status");
  try {
    const result = await completeShopifyCallback({ connectionId, state, callbackStatus });
    return NextResponse.redirect(new URL(result.ok ? "/app/integrations/shopify?connected=1" : "/app/integrations/shopify?attention=1", url.origin));
  } catch (error) {
    const safe = safePublishingError(error);
    return NextResponse.redirect(new URL(`/app/integrations/shopify?error=${encodeURIComponent(safe.code)}`, url.origin));
  }
}
