import { z } from "zod";

const publishingEnvSchema = z.object({
  APP_URL: z.string().url(),
  COMPOSIO_API_KEY: z.string().min(20),
  COMPOSIO_SHOPIFY_AUTH_CONFIG_ID: z.string().min(3),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

export type PublishingServerEnv = z.infer<typeof publishingEnvSchema>;

export function getPublishingServerEnv(): PublishingServerEnv | null {
  const result = publishingEnvSchema.safeParse({
    APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY,
    COMPOSIO_SHOPIFY_AUTH_CONFIG_ID: process.env.COMPOSIO_SHOPIFY_AUTH_CONFIG_ID,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return result.success ? result.data : null;
}

export function requirePublishingServerEnv(): PublishingServerEnv {
  const env = getPublishingServerEnv();
  if (!env) {
    throw new Error(
      "Publishing integrations are not configured. Add APP_URL, COMPOSIO_API_KEY, COMPOSIO_SHOPIFY_AUTH_CONFIG_ID and the Supabase server secret.",
    );
  }
  return env;
}
