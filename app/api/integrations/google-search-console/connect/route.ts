import { NextResponse } from "next/server";
import { beginGscConnection, GscConnectionError } from "@/lib/gsc/connections";

export async function GET(){try{return NextResponse.redirect(await beginGscConnection())}catch(error){const safe=error instanceof GscConnectionError?error:new GscConnectionError("connection_start_failed","The secure Search Console connection could not be started.",500);return NextResponse.json({error:safe.message,code:safe.code},{status:safe.status})}}
