# Northstar foundation

Northstar is a calm application shell for a future autonomous SEO employee. This milestone contains only routes, reusable presentation components, deterministic demonstration data, and a deploy-ready Next.js foundation.

It intentionally does **not** include authentication, Supabase, crawling, AI generation, keyword providers, analytics, billing, publishing, or fake SEO metrics.

## Local development

```sh
npm ci
npm run dev
```

No environment variables are required.

## Quality checks

```sh
npm run lint
npm run typecheck
npm run build
```

## Render

- Runtime: Node
- Root directory: leave blank
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check path: `/api/health`

The standard Next.js production server reads Render's `PORT` automatically.

## Routes

- `/` — small product landing page
- `/login`, `/signup`, `/forgot-password` — visual auth placeholders only
- `/onboarding` — reusable two-step local setup foundation
- `/app` — demonstration employee dashboard
- `/app/activity` — filterable demonstration timeline
- `/app/opportunities` — qualitative opportunities
- `/app/keywords` — example topic hypotheses
- `/app/content` — example content hypotheses
- `/app/competitors` — empty competitor foundation
- `/app/website` — demonstration website profile
- `/app/integrations` — honest coming-soon integrations
- `/app/settings` — non-saving settings foundation
- `/api/health` — minimal Render health response

The recommended next milestone is authentication and durable project persistence, after this shell has been reviewed and approved.
