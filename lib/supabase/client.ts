"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
