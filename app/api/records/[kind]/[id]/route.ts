import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProject } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const opportunity=z.enum(["new","planned","dismissed"]);const content=z.enum(["idea","planned","dismissed"]);
export async function PATCH(request:Request,{params}:{params:Promise<{kind:string;id:string}>}){const project=await getCurrentProject();const supabase=await createClient();if(!project||!supabase)return NextResponse.json({error:"Authentication required."},{status:401});const {kind,id}=await params;const body=await request.json().catch(()=>null);const schema=kind==="opportunities"?opportunity:kind==="content"?content:null;if(!schema)return NextResponse.json({error:"Unsupported record type."},{status:404});const parsed=schema.safeParse(body?.status);if(!parsed.success)return NextResponse.json({error:"Unsupported status."},{status:400});const result=kind==="opportunities"?await supabase.from("opportunities").update({status:parsed.data as "new"|"planned"|"dismissed"}).eq("id",id).eq("project_id",project.id):await supabase.from("content_items").update({status:parsed.data as "idea"|"planned"|"dismissed"}).eq("id",id).eq("project_id",project.id);return result.error?NextResponse.json({error:"The status could not be saved."},{status:400}):NextResponse.json({success:true})}
