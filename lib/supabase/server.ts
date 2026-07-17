import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>cookieStore.getAll(),setAll(items){try{items.forEach(({name,value,options})=>cookieStore.set(name,value,options));}catch{/* Server Components cannot write cookies; proxy handles refresh. */}}}});
}
