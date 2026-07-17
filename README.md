# Northstar SEO

Northstar is a Next.js micro-SaaS foundation with Supabase authentication, private workspaces, persistent onboarding, Row Level Security, and a conservative HTML-first website-intelligence crawler. It does not call AI or SEO providers, execute remote JavaScript, publish content, schedule recurring crawls, or show fabricated SEO metrics.

## Local development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Use Node 22.13 or newer. Configure Supabase using [docs/supabase-setup.md](docs/supabase-setup.md). Set `NEXT_PUBLIC_DEMO_MODE=true` only when reviewing the standalone local visual demo.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build:worker
```

With Docker and the local Supabase stack available, also run:

```sh
npm run supabase:reset
npm run supabase:lint
npx supabase test db
npm run supabase:types
```

## Application behavior

- Email/password signup, confirmation, login, recovery, password update, logout and optional Google OAuth use cookie-based Supabase SSR sessions.
- Next.js `proxy.ts` refreshes sessions and protects `/app` and `/onboarding` without database work on static assets.
- Onboarding drafts save after each completed step and resume from Supabase.
- Completion atomically normalizes business, website, goals, settings and competitors, then creates clearly labeled deterministic starting records.
- Dashboard, activity, opportunities, topics, content, competitors and settings read or mutate the signed-in user's current project through RLS.
- Existing LocalStorage onboarding is offered as an explicit one-time import and is cleared only after a confirmed server save.
- Website crawls are queued transactionally and executed by a separate Render background worker with robots, SSRF, redirect, concurrency, depth and response-size protections.

Crawler development and deployment are documented in [docs/crawler-development.md](docs/crawler-development.md) and [docs/render-crawler-worker.md](docs/render-crawler-worker.md).

See [docs/supabase-setup.md](docs/supabase-setup.md) for Supabase and Render deployment steps.
