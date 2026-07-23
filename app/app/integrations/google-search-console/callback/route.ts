import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/server";
import { completeGscCallback } from "@/lib/gsc/connections";

const failure=(request:Request,code:string)=>NextResponse.redirect(new URL(`/app/integrations/google-search-console?error=${encodeURIComponent(code)}`,request.url));
export async function GET(request:Request){const user=await getOptionalUser();if(!user)return failure(request,"authentication_required");const url=new URL(request.url);const sessionId=url.searchParams.get("session");const state=url.searchParams.get("state");if(!sessionId||!state)return failure(request,"invalid_callback");try{const result=await completeGscCallback({sessionId,state,callbackStatus:url.searchParams.get("status")});return NextResponse.redirect(new URL(`/app/integrations/google-search-console?session=${result.sessionId}`,request.url))}catch(error){return failure(request,error instanceof Error&&"code" in error?String((error as {code:unknown}).code):"google_connection_failed")}}
