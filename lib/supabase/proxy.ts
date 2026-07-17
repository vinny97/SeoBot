import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isDemoMode } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";

const protectedPaths=["/app","/onboarding","/update-password"];
export async function updateSession(request:NextRequest){
  let response=NextResponse.next({request});
  if(isDemoMode())return response;
  const env=getSupabaseEnv();const path=request.nextUrl.pathname;const protectedRoute=protectedPaths.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));
  if(!env){if(protectedRoute){const target=new URL("/login",request.url);target.searchParams.set("configuration","missing");target.searchParams.set("next",path);return NextResponse.redirect(target)}return response;}
  const supabase=createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  const {data,error}=await supabase.auth.getClaims();const authenticated=!error&&Boolean(data?.claims?.sub);
  if(protectedRoute&&!authenticated){const target=new URL("/login",request.url);target.searchParams.set("next",`${path}${request.nextUrl.search}`);return NextResponse.redirect(target)}
  return response;
}
