import { NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/data/project-snapshot";
import { getOptionalUser } from "@/lib/auth/server";
export const dynamic="force-dynamic";
export async function GET(){const user=await getOptionalUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});const snapshot=await getProjectSnapshot();if(!snapshot)return NextResponse.json({error:"No project found."},{status:404});return NextResponse.json(snapshot,{headers:{"Cache-Control":"private, no-store"}})}
