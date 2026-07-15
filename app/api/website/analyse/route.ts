import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { normaliseWebsiteUrl } from "@/lib/utils";

export const runtime="nodejs";
const MAX_BYTES=1_000_000;
function privateIp(ip:string){if(ip.includes(":"))return ip==="::1"||ip.startsWith("fc")||ip.startsWith("fd")||ip.startsWith("fe80:");const p=ip.split(".").map(Number);return p[0]===10||p[0]===127||p[0]===0||p[0]===169&&p[1]===254||p[0]===192&&p[1]===168||p[0]===172&&p[1]>=16&&p[1]<=31;}
async function validate(target:string){const parsed=new URL(target);if(parsed.protocol!=="https:"&&parsed.protocol!=="http:")throw new Error("Only public HTTP websites can be analysed.");if(isIP(parsed.hostname)&&privateIp(parsed.hostname))throw new Error("Private network addresses are not allowed.");const addresses=await lookup(parsed.hostname,{all:true});if(!addresses.length||addresses.some(a=>privateIp(a.address)))throw new Error("This address cannot be analysed safely.");}
async function safeFetch(initial:string,method:"GET"|"HEAD"="GET"){
  let target=initial;
  for(let redirects=0;redirects<=3;redirects++){
    await validate(target);
    const response=await fetch(target,{method,redirect:"manual",signal:AbortSignal.timeout(7000),headers:{"User-Agent":"NorthstarMetadataBot/1.0 (+lightweight onboarding analysis)",Accept:"text/html,application/xhtml+xml"}});
    if([301,302,303,307,308].includes(response.status)){const location=response.headers.get("location");if(!location)throw new Error("Website returned an invalid redirect.");target=new URL(location,target).toString();continue;}
    return response;
  }
  throw new Error("Website redirected too many times.");
}
function text(html:string,regex:RegExp){return html.match(regex)?.[1]?.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,300)||undefined;}
async function exists(url:string){try{const r=await safeFetch(url,"HEAD");return r.ok?"detected":"not_detected" as const}catch{return "unknown" as const}}
export async function POST(request:Request){
  try{
    const body=await request.json(); const input=normaliseWebsiteUrl(String(body.url||""));
    const response=await safeFetch(input.url);
    if(!response.ok)throw new Error(`The website returned status ${response.status}.`);
    const type=response.headers.get("content-type")||"";if(!type.includes("text/html")&&!type.includes("application/xhtml"))throw new Error("The website homepage is not an HTML page.");
    const length=Number(response.headers.get("content-length")||0);if(length>MAX_BYTES)throw new Error("The homepage is too large for the lightweight check.");
    const buffer=await response.arrayBuffer();if(buffer.byteLength>MAX_BYTES)throw new Error("The homepage is too large for the lightweight check.");
    const html=new TextDecoder().decode(buffer);
    const title=text(html,/<title[^>]*>([\s\S]*?)<\/title>/i);
    const description=html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]||html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1];
    const ogTitle=html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1];
    const ogDescription=html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1];
    const icon=html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1];
    const headings=Array.from(html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)).slice(0,6).map(m=>m[1].replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim()).filter(Boolean);
    const [sitemap,robots]=await Promise.all([exists(new URL("/sitemap.xml",input.url).toString()),exists(new URL("/robots.txt",input.url).toString())]);
    return NextResponse.json({title:title||ogTitle,description:(description||ogDescription)?.slice(0,500),favicon:icon?new URL(icon,input.url).toString():new URL("/favicon.ico",input.url).toString(),headings,sitemap,robots,analysedAt:new Date().toISOString(),status:"complete",source:"website"});
  }catch(error){const message=error instanceof Error?error.message:"Website details could not be read.";return NextResponse.json({error:message},{status:422});}
}
