# Next.js integration

Searchhand connects to a small route you host inside the Next.js application that owns your website. It uses a bearer token stored encrypted in Searchhand and only accepts public HTTPS destinations.

## Add the health route

Create `app/api/searchhand/v1/health/route.ts` in the destination application. Set `SEARCHHAND_INTEGRATION_TOKEN` to a long random value in its deployment environment.

```ts
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function authorised(request: Request) {
  const expected = process.env.SEARCHHAND_INTEGRATION_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  return Boolean(expected && supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)));
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ name: "Example website", capabilities: { drafts: true } });
}
```

The health response must include `capabilities.drafts: true`. This declares the application can support Searchhand draft workflows; this initial integration verifies and monitors the connection.

## Connect

1. Deploy the route on the production website.
2. Apply `supabase/migrations/202607230002_nextjs_publishing.sql`.
3. In **Connections → Next.js**, test the URL and token before saving.
4. Rotate the environment token and reconnect whenever access should be revoked.
