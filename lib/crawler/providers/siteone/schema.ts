import { z } from "zod";

const looseRow = z.record(z.string(), z.unknown());
const table = z
  .object({ rows: z.array(looseRow).default([]) })
  .passthrough()
  .optional();

export const siteOneReportSchema = z
  .object({
    crawler: z
      .object({ version: z.string().min(1), executedAt: z.string().optional() })
      .passthrough(),
    results: z
      .array(
        z
          .object({
            url: z.string().url(),
            status: z.union([z.string(), z.number()]),
            elapsedTime: z.number().nonnegative().optional(),
            size: z.number().nonnegative().optional(),
            type: z.union([z.string(), z.number()]).optional(),
          })
          .passthrough(),
      )
      .max(5000),
    stats: z
      .object({ totalUrls: z.number().nonnegative().optional() })
      .passthrough()
      .optional(),
    tables: z
      .object({
        seo: table,
        "seo-headings": table,
        "404": table,
        redirects: table,
        skipped: table,
      })
      .passthrough(),
  })
  .passthrough();

export type SiteOneReport = z.infer<typeof siteOneReportSchema>;
