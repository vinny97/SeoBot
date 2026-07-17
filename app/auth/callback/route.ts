import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin, safeRelativePath } from "@/lib/auth/redirects";
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get("code");const next=safeRelativePath(url.searchParams.get("next"),"/app");const origin=requestOrigin(request);if(code){const supabase=await createClient();if(supabase){const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(`${origin}${next}`)}}const errorUrl=new URL("/auth/auth-code-error",origin);errorUrl.searchParams.set("reason","callback_failed");return NextResponse.redirect(errorUrl)}
