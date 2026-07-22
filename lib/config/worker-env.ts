import { z } from "zod";
const schema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(20).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    CRAWLER_USER_AGENT: z.string().min(10).max(300),
    CRAWLER_CONTACT_URL: z.string().url(),
    CRAWLER_MAX_PAGES: z.coerce.number().int().min(1).max(50).default(50),
    CRAWLER_MAX_DEPTH: z.coerce.number().int().min(0).max(4).default(4),
    CRAWLER_FULL_SITE_MAX_PAGES: z.coerce.number().int().min(50).max(50000).default(50000),
    CRAWLER_FULL_SITE_MAX_DEPTH: z.coerce.number().int().min(4).max(20).default(20),
    CRAWLER_CONCURRENCY: z.coerce.number().int().min(1).max(2).default(2),
    CRAWLER_REQUEST_DELAY_MS: z.coerce
      .number()
      .int()
      .min(250)
      .max(10000)
      .default(750),
    CRAWLER_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(60000)
      .default(15000),
    CRAWLER_MAX_HTML_BYTES: z.coerce
      .number()
      .int()
      .min(10000)
      .max(5000000)
      .default(5000000),
    CRAWLER_MAX_SITEMAP_BYTES: z.coerce
      .number()
      .int()
      .min(10000)
      .max(10000000)
      .default(10000000),
    CRAWLER_MAX_REDIRECTS: z.coerce.number().int().min(0).max(5).default(5),
    CRAWLER_WORKER_POLL_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(60000)
      .default(3000),
    CRAWLER_JOB_LOCK_MINUTES: z.coerce.number().int().min(1).max(15).default(5),
    CRAWLER_MAX_DURATION_MS: z.coerce
      .number()
      .int()
      .min(30000)
      .max(3600000)
      .default(900000),
    CRAWLER_FULL_SITE_MAX_DURATION_MS: z.coerce
      .number()
      .int()
      .min(900000)
      .max(21600000)
      .default(21600000),
    CRAWLER_MANUAL_COOLDOWN_MINUTES: z.coerce.number().int().min(10).max(1440).default(10),
    CRAWLER_DAILY_LIMIT: z.coerce.number().int().min(1).max(3).default(3),
  })
  .refine(
    (value) =>
      Boolean(value.SUPABASE_SECRET_KEY || value.SUPABASE_SERVICE_ROLE_KEY),
    { message: "SUPABASE_SECRET_KEY is required." },
  );
export type WorkerConfig = z.infer<typeof schema> & {
  secretKey: string;
  userAgent: string;
};
export function loadWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): WorkerConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Crawler worker configuration is invalid: ${parsed.error.issues.map((issue) => `${issue.path.join(".")||"environment"}: ${issue.message}`).join("; ")}`,
    );
  return {
    ...parsed.data,
    secretKey:
      parsed.data.SUPABASE_SECRET_KEY ||
      parsed.data.SUPABASE_SERVICE_ROLE_KEY ||
      "",
    userAgent: `${parsed.data.CRAWLER_USER_AGENT} (+${parsed.data.CRAWLER_CONTACT_URL})`,
  };
}
