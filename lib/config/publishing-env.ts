import { z } from "zod";

const publishingDatabaseEnvSchema = z.object({
  APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

const composioBaseEnvSchema = publishingDatabaseEnvSchema.extend({
  COMPOSIO_API_KEY: z.string().min(20),
});

const publishingEnvSchema = composioBaseEnvSchema.extend({
  COMPOSIO_SHOPIFY_AUTH_CONFIG_ID: z.string().startsWith("ac_"),
});

const wixPublishingEnvSchema = composioBaseEnvSchema.extend({
  COMPOSIO_WIX_AUTH_CONFIG_ID: z.string().startsWith("ac_"),
});

const wordpressPublishingEnvSchema = publishingDatabaseEnvSchema.extend({
  INTEGRATION_ENCRYPTION_KEY: z.string().min(43),
  INTEGRATION_ENCRYPTION_KEY_PREVIOUS: z.string().min(43).optional(),
});

export type PublishingServerEnv = z.infer<typeof publishingEnvSchema>;
export type WixPublishingServerEnv = z.infer<typeof wixPublishingEnvSchema>;
export type PublishingDatabaseEnv = z.infer<typeof publishingDatabaseEnvSchema>;
export type WordPressPublishingServerEnv = z.infer<typeof wordpressPublishingEnvSchema>;

function publishingDatabaseValues() {
  return {
    APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function composioBaseValues() {
  return { ...publishingDatabaseValues(), COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY };
}

export function getPublishingServerEnv(): PublishingServerEnv | null {
  const result = publishingEnvSchema.safeParse({
    ...composioBaseValues(),
    COMPOSIO_SHOPIFY_AUTH_CONFIG_ID: process.env.COMPOSIO_SHOPIFY_AUTH_CONFIG_ID,
  });
  return result.success ? result.data : null;
}

export function getWixPublishingServerEnv(): WixPublishingServerEnv | null {
  const result = wixPublishingEnvSchema.safeParse({
    ...composioBaseValues(),
    COMPOSIO_WIX_AUTH_CONFIG_ID: process.env.COMPOSIO_WIX_AUTH_CONFIG_ID,
  });
  return result.success ? result.data : null;
}

export function getWordPressPublishingServerEnv(): WordPressPublishingServerEnv | null {
  const result = wordpressPublishingEnvSchema.safeParse({
    ...publishingDatabaseValues(),
    INTEGRATION_ENCRYPTION_KEY: process.env.INTEGRATION_ENCRYPTION_KEY,
    INTEGRATION_ENCRYPTION_KEY_PREVIOUS: process.env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS || undefined,
  });
  return result.success ? result.data : null;
}

export function requirePublishingDatabaseEnv(): PublishingDatabaseEnv {
  const result = publishingDatabaseEnvSchema.safeParse(publishingDatabaseValues());
  if (!result.success) throw new Error("Publishing storage is not configured. Add APP_URL and the Supabase server credentials.");
  return result.data;
}

export function requireWordPressPublishingServerEnv(): WordPressPublishingServerEnv {
  const env = getWordPressPublishingServerEnv();
  if (!env) throw new Error("WordPress publishing is not configured. Add APP_URL, INTEGRATION_ENCRYPTION_KEY and the Supabase server credentials.");
  return env;
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

export function requireWixPublishingServerEnv(): WixPublishingServerEnv {
  const env = getWixPublishingServerEnv();
  if (!env) {
    throw new Error(
      "Wix publishing is not configured. Add APP_URL, COMPOSIO_API_KEY, COMPOSIO_WIX_AUTH_CONFIG_ID and the Supabase server secret.",
    );
  }
  return env;
}
