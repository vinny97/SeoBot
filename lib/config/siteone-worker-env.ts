import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SITEONE_WORKER_TOKEN: z.string().min(32),
  WORKER_ID: z.string().min(3).max(200).default("seobot-pi-worker-1"),
  SITEONE_BINARY_PATH: z.string().min(1).default("/usr/bin/siteone-crawler"),
  SITEONE_WORK_DIR: z.string().min(1).default("/DATA/seobot/crawls"),
  SITEONE_MAX_PAGES: z.coerce.number().int().min(1).max(50).default(50),
  SITEONE_MAX_DEPTH: z.coerce.number().int().min(0).max(4).default(4),
  SITEONE_PROCESS_TIMEOUT_MINUTES: z.coerce.number().int().min(1).max(15).default(15),
  CRAWLER_WORKER_POLL_MS: z.coerce.number().int().min(1000).max(60000).default(3000),
  CRAWLER_JOB_LOCK_MINUTES: z.coerce.number().int().min(1).max(15).default(10),
  SITEONE_ALLOWED_PROJECT_IDS: z.string().min(36),
});

export type SiteOneWorkerConfig = z.infer<typeof schema> & { allowedProjects: Set<string> };

export function loadSiteOneWorkerConfig(env: NodeJS.ProcessEnv = process.env): SiteOneWorkerConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success)
    throw new Error(`SiteOne worker configuration is invalid: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const allowedProjects = new Set(parsed.data.SITEONE_ALLOWED_PROJECT_IDS.split(",").map((value) => value.trim()).filter(Boolean));
  if (!allowedProjects.size) throw new Error("At least one SiteOne project must be allowlisted.");
  return { ...parsed.data, allowedProjects };
}
