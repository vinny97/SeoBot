import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin, safeRelativePath } from "@/lib/auth/redirects";
const allowed=new Set<EmailOtpType>(["email","signup","invite","magiclink","recovery","email_change"]);
export async function GET(request:Request){const url=new URL(request.url);const token_hash=url.searchParams.get("token_hash");const rawType=url.searchParams.get("type");const next=safeRelativePath(url.searchParams.get("next"),"/onboarding");const origin=requestOrigin(request);if(token_hash&&rawType&&allowed.has(rawType as EmailOtpType)){const supabase=await createClient();if(supabase){const {error}=await supabase.auth.verifyOtp({type:rawType as EmailOtpType,token_hash});if(!error)return NextResponse.redirect(`${origin}${next}`)}}const target=new URL("/auth/auth-code-error",origin);target.searchParams.set("reason","confirmation_failed");return NextResponse.redirect(target)}
