import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requirePublishingDatabaseEnv } from "@/lib/config/publishing-env";

export function createPublishingAdminClient() {
  const env = requirePublishingDatabaseEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
