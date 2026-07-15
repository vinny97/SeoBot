import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request:NextRequest){
  let response=NextResponse.next({request});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demoMode=process.env.NEXT_PUBLIC_DEMO_MODE!=="false";
  let authenticated=demoMode && request.cookies.get("northstar-demo-session")?.value==="1";
  if(url&&key){
    const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
    const {data}=await supabase.auth.getUser(); authenticated=!!data.user;
  }
  const path=request.nextUrl.pathname;
  if((path.startsWith("/app")||path.startsWith("/onboarding"))&&!authenticated){ const target=request.nextUrl.clone();target.pathname="/login";target.searchParams.set("next",path);return NextResponse.redirect(target); }
  if((path==="/login"||path==="/signup")&&authenticated){const target=request.nextUrl.clone();target.pathname="/app";return NextResponse.redirect(target);}
  return response;
}
export const config={matcher:["/app/:path*","/onboarding/:path*","/login","/signup"]};
