# Website crawler development

## Architecture

The Next.js application authenticates the user and calls `enqueue_website_crawl`. That database function derives the project from the website, checks consent, cooldowns, daily limits and active-run deduplication, then creates a crawl run and queued `seo_jobs` record in one transaction. The HTTP request returns immediately.

The standalone worker polls PostgreSQL, claims one job with `FOR UPDATE SKIP LOCKED`, writes observations progressively, heartbeats its expiring lock, and completes, retries or fails the same run. Browser requests never crawl pages.

## Local setup

Use Node 22.19 or newer and a local Supabase stack:

```sh
npm ci
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npx supabase test db
npm run supabase:types
```

Create `.env.local` from `.env.example`. Export the worker variables into the second terminal, then run:

```sh
# Terminal 1
npm run dev

# Terminal 2
npm run dev:worker
```

The deterministic files under `tests/fixtures/crawler-site` exercise extraction and parser behavior without crawling an external site. The production SSRF policy intentionally blocks localhost, so fixture-server integration should inject a test-only transport rather than weakening production address checks.

## Safety and limits

- Only HTTP and HTTPS URLs without credentials are accepted.
- Hostnames and every DNS result are validated. The Undici connection uses a custom lookup function, so it connects only to an address validated by the crawler and rejects DNS rebinding to private ranges.
- Redirect destinations are normalized, scope-checked and resolved again.
- Apex/`www` transitions on the same registrable domain are allowed; unrelated domains and arbitrary subdomains are not.
- The hard limits are 50 pages, depth 4, concurrency 2, at least 250 ms between requests, five redirects and bounded HTML/sitemap bodies.
- Scripts are never executed, cookies are not stored, external links are recorded but not followed, and full HTML is not persisted.

## Discovery and extraction

The worker fetches `robots.txt` before pages and uses `robots-parser` for each permission decision. HTTP 401/403 stops the crawl. Sitemap declarations plus limited `/sitemap.xml` and `/sitemap_index.xml` fallbacks are parsed with bounded nesting and URL counts. A breadth-first queue combines the homepage, valid sitemap URLs and internal links.

Cheerio extracts bounded titles, descriptions, canonicals, robots directives, H1/H2 headings, visible word counts, links and JSON-LD type names. Classification and indexability are deterministic and never claim Google indexing.

## Issues and retries

Issue fingerprints hash the website, issue type, normalized URL and relevant evidence. Existing issues retain `first_seen_at`; ignored issues remain ignored. A sufficiently complete crawl resolves absent open fingerprints, while failed, cancelled, warning/page-limited crawls do not. Locks expire after worker interruption and are reclaimed or permanently failed after the attempt limit.

## Extending the crawler

Add bounded metadata extraction in `lib/crawler/html-extractor.ts`, deterministic page rules in `page-classifier.ts`, and plain-English fingerprinted issues in `issue-detector.ts`. Update fixture tests before adding persistence fields. Do not add remote rendering or execute page JavaScript in this worker.

## Troubleshooting

- Permanently queued: confirm the worker service is running, its secret key is correct, and `worker_heartbeats` updates.
- `worker_only`: the worker is using a public key rather than the server-only Supabase secret.
- Private address blocked: DNS resolved to a reserved range; do not bypass this protection.
- Repeated rate limiting: increase the delay; do not raise concurrency beyond two.
- Missing tables/functions: apply both migrations in timestamp order and regenerate types.
