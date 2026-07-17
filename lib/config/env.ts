import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function getSupabaseEnv(): Pick<PublicEnv,"NEXT_PUBLIC_SUPABASE_URL"|"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"> | null {
  const result = publicEnvSchema.pick({NEXT_PUBLIC_SUPABASE_URL:true,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:true}).safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured. Add the public project URL and publishable key.");
  return env;
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  return value && z.string().url().safeParse(value).success ? value.replace(/\/$/,"") : "http://localhost:3000";
}

export function validateDeploymentEnv() {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  });
}
