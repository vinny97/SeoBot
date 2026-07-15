# Northstar V1

Northstar is the V1 foundation for an autonomous SEO employee: a calm onboarding experience, transparent initial plan, employee-style dashboard, and scalable Supabase data model. It deliberately does not perform autonomous publishing, generate articles, invent keyword metrics, or connect unavailable integrations.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Leave `NEXT_PUBLIC_DEMO_MODE=true` to use the browser-only demonstration flow, or add a Supabase project URL and anon key and set demo mode to `false`.
3. Run `npm install`, then `npm run dev`.

Demo mode clearly labels its data and keeps the account/project only in the current browser. With Supabase configured, authentication uses Supabase Auth and project state is mapped to the relational tables through `lib/data/project-repository.ts`.

## Supabase setup

Apply `supabase/migrations/202607150001_v1_foundation.sql` through the Supabase CLI or migration workflow. Configure email/password and Google OAuth in Supabase Auth, and add `/auth/callback` to the allowed redirect URLs.

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` belong in the browser environment. Never expose a service-role key.

## Verification

```sh
npm run typecheck
npm run build
```

The metadata endpoint performs a limited public homepage check with URL normalization, DNS/private-address protection, content-type and size validation, timeouts, and restricted redirects. It is not a crawler or technical SEO audit.
