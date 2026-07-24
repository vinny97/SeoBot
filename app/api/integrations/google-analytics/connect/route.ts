import { NextResponse } from "next/server";
import { beginGoogleAnalyticsConnection } from "@/lib/google-analytics/connections";
export async function GET(){try{return NextResponse.redirect(await beginGoogleAnalyticsConnection())}catch{return NextResponse.redirect(new URL("/app/integrations/google-analytics?error=connection_start_failed",process.env.APP_URL||"http://localhost:3000"))}}
