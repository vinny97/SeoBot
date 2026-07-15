# Northstar V1

Northstar is a focused foundation for an autonomous SEO employee. V1 learns a business, performs a safe public-homepage metadata check, prepares transparent initial hypotheses, and organises work into a calm dashboard. It does not generate articles, publish changes, invent keyword metrics, or connect unavailable providers.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Small product landing page |
| `/login`, `/signup`, `/forgot-password` | Supabase Auth and explicitly labelled demo access |
| `/auth/callback` | OAuth and email callback exchange |
| `/onboarding` | Persistent eight-step project setup |
| `/app` | Current, completed, approval and upcoming work |
| `/app/activity` | Chronological employee activity |
| `/app/opportunities` | Transparent opportunity workflow |
| `/app/keywords` | Topic hypotheses without fake metrics |
| `/app/content` | Content ideas and future workflow statuses |
| `/app/competitors` | User-confirmed competitor management |
| `/app/website` | Detected metadata and safe re-analysis |
| `/app/integrations` | Honest future-connection states |
| `/app/settings` | Business context and approval preferences |

## Onboarding flow

1. Normalize and validate a public website URL.
2. Read limited public homepage metadata through the protected server endpoint, with a manual fallback.
3. Confirm business details rather than trusting inferred information.
4. Explain search visibility through an original illustrative search-results visual.
5. Select up to three business goals and an approval preference.
6. Confirm up to five known competitors or skip.
7. Review qualitative opportunity hypotheses with their source, effort, confidence and impact.
8. Create initial jobs, activities, opportunities, topics, content ideas and settings, then open the workspace.

Progress is backed up in the browser throughout. When Supabase is configured, the data repository also persists the relational project records for cross-device resume.

## Real and demonstration functionality

Real in V1:

- Supabase email/password, Google OAuth callback support, password reset and protected routes
- Relational workspace/project persistence with RLS
- Public homepage title, description, favicon, headings, sitemap and robots checks
- User-managed opportunity statuses, competitors and settings
- Deterministic jobs and activity records

Demonstration or hypothesis only:

- Opportunity-generation logic, topic hypotheses and content ideas
- Non-metadata onboarding jobs
- Competitor suggestions and monitoring
- Search visibility examples

The UI labels hypotheses and unavailable integrations. It never claims exact ranks, traffic, volume, difficulty, authority or backlink metrics.

## Local setup

```sh
cp .env.example .env.local
npm install
npm run dev
```

Leave `NEXT_PUBLIC_DEMO_MODE=true` for browser-only demonstration mode. Demo authentication and project records remain on the current device and are never added to production accounts.

## Environment variables

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_MODE=true
SUPABASE_SERVICE_ROLE_KEY=
```

The service-role variable is documented for future trusted server administration but is not needed by V1. Never prefix it with `NEXT_PUBLIC_` or expose it to browser code.

## Supabase setup

1. Create a Supabase project and install the Supabase CLI.
2. Link the project: `supabase link --project-ref <project-ref>`.
3. Apply migrations: `supabase db push`.
4. For a local/demo database only, run `supabase db reset` to apply `supabase/seed.sql`.
5. Enable email/password authentication.
6. For Google sign-in, configure the Google provider credentials in Supabase Auth.
7. Add `http://localhost:3000/auth/callback` and the production `/auth/callback` URL to the allowed redirect URLs.
8. Put only the project URL and anon key in the public environment variables.

Migrations:

- `202607150001_v1_foundation.sql` creates profiles, workspaces, memberships, projects, websites, discoveries, business profiles, goals, competitors, opportunities, topics, jobs, activities and integrations, plus membership-based RLS.
- `202607150002_complete_v1_foundation.sql` adds content items, approval requests, project settings, integration lifecycle fields, indexes and their RLS policies.

The deterministic local seed creates one completed workspace, one project, one website, three competitors, topics, content ideas, four opportunities, jobs and activities. Approvals intentionally remain empty. Content `draft` fields remain `NULL` in V1.

## Safe website analysis

The metadata endpoint allows only HTTP/S public destinations, resolves and validates every redirect destination, rejects localhost and private/link-local ranges, limits redirects and response size, enforces a short timeout, accepts HTML only, never executes or renders retrieved scripts, and stores only extracted text metadata. Failures return a plain-language message and preserve saved onboarding answers.

## Architecture

- Server Components remain the default; interactive workflows are isolated client components.
- `lib/data` owns Supabase mapping and understandable data errors. UI components do not query project tables directly.
- `lib/validation` contains Zod mutation boundaries.
- `lib/providers` separates deterministic V1 providers from future external services.
- `lib/services` owns website-security and fallback behavior.
- `lib/config/product.ts` centralizes naming, navigation, metadata and feature flags.

## Verification

```sh
npm run lint
npm run test
npm run typecheck
npm run build
npm audit --omit=dev
```

Tests cover URL normalization, invalid and private-address rejection, onboarding validation and progress restore, opportunity status updates, website-analysis fallback, and migration-level project access boundaries.

## Manual production steps

- Apply both migrations in order.
- Configure Supabase Auth URLs and Google credentials if Google sign-in is wanted.
- Set production environment variables in the hosting platform.
- Do not run `seed.sql` against a production project.
- Validate RLS with two real test accounts before inviting customers.

## Known V1 limitations

- No Search Console, Analytics, CMS, local-profile or publishing connections
- No real keyword, rank, backlink or competitor-monitoring provider
- No article generation, drafts or page rewriting
- No autonomous execution, billing, advanced permissions or account deletion
- The metadata service is intentionally not a crawler or technical SEO audit

The recommended next phase is Search Console and Analytics: connect verified first-party performance data before introducing real keyword research or content generation. See [ROADMAP.md](./ROADMAP.md).
