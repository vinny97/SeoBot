# Northstar foundation

Northstar is a calm application shell for a future autonomous SEO employee. This milestone contains a complete visual onboarding journey, reusable product routes and components, deterministic demonstration data, local persistence, and a deploy-ready Next.js foundation.

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
- `/onboarding` — persisted eight-step visual onboarding journey
- `/app` — onboarding-driven demonstration employee dashboard
- `/app/activity` — filterable demonstration timeline
- `/app/opportunities` — qualitative opportunities with local status actions
- `/app/keywords` — example topic hypotheses
- `/app/content` — example content hypotheses with local status actions
- `/app/competitors` — locally editable confirmed competitors
- `/app/website` — demonstration website profile
- `/app/integrations` — honest coming-soon integrations
- `/app/settings` — locally saved context and accessible demo reset
- `/api/health` — minimal Render health response

## Onboarding and demo persistence

Onboarding has eight steps: website, deterministic discovery preview, business understanding, an original illustrative search experience, goals, competitors, initial plan, and employee ready. The current step and answers are stored under one versioned localStorage boundary through `hooks/use-onboarding.ts`. The same answers drive the dashboard and product-route mock generators.

Demo opportunity and content status changes use a separate versioned localStorage record. Settings provides an accessible confirmation dialog that clears both records and returns to onboarding.

## Deliberate limitations

- Discovery and search visuals are illustrative and make no network requests.
- No exact rankings, search volume, traffic or authority metrics are shown.
- Authentication, accounts, database persistence, AI, crawling and integrations remain unimplemented.
- Clearing browser storage or using another device starts a fresh demonstration.

The recommended next milestone is authentication and durable project persistence, after this visual experience has been reviewed and approved.
