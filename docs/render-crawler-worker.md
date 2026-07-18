# Render crawler on one web service

The crawler runs as a second process inside the existing Render web service. This avoids a separate paid background-worker instance while preserving the PostgreSQL queue, job locking, retries and cancellation.

On a free or sleeping web service, queued crawls pause while the service is asleep and resume after it wakes. A restart can interrupt an active crawl; its expiring database lock makes it eligible for retry.

## Web service settings

- Type: **Web Service**
- Root directory: repository root
- Runtime: Node
- Node version: `24.14.1`
- Build command: `npm ci && npm run build && npm run build:worker`
- Start command: `npm run start:production`
- Health-check path: `/api/health`

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR-SERVER-ONLY-SECRET
CRAWLER_USER_AGENT=NorthstarCrawler/0.1
CRAWLER_CONTACT_URL=https://YOUR-DOMAIN/crawler
CRAWLER_MAX_PAGES=50
CRAWLER_MAX_DEPTH=4
CRAWLER_CONCURRENCY=2
CRAWLER_REQUEST_DELAY_MS=750
CRAWLER_REQUEST_TIMEOUT_MS=15000
CRAWLER_MAX_HTML_BYTES=5000000
CRAWLER_MAX_SITEMAP_BYTES=10000000
CRAWLER_MAX_REDIRECTS=5
CRAWLER_WORKER_POLL_MS=3000
CRAWLER_JOB_LOCK_MINUTES=5
CRAWLER_MAX_DURATION_MS=900000
```

Add these alongside the existing web environment variables. Use the current Supabase server secret. Never copy it to a `NEXT_PUBLIC_` variable or browser code.

## Deployment verification

1. Apply `202607170002_website_intelligence.sql` after the foundation migration.
2. Deploy the single web service.
3. Confirm logs contain both the Next.js startup message and `Crawler worker started.` without configuration errors.
4. Confirm `worker_heartbeats.last_heartbeat_at` updates in Supabase.
5. Request a crawl from onboarding or Website Intelligence.
6. Confirm the crawl changes from queued to running, counters increase, then it reaches a final state.
7. Confirm the Website pages, issues, robots and sitemap tabs contain only observed data.

If a crawl remains queued, check worker deployment state, environment variables and heartbeat before retrying. The unique active-run constraint deliberately prevents duplicate runs.
