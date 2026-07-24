# Supabase and Render setup

## 1. Create and configure Supabase

1. Create a Supabase project and keep its region close to the Render service.
2. In Authentication → URL Configuration, set the Site URL to the public Render URL and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-RENDER-DOMAIN/auth/callback`
   - `http://localhost:3000/auth/confirm`
   - `https://YOUR-RENDER-DOMAIN/auth/confirm`
3. Keep email/password enabled. To enable Google, configure the Google provider in Supabase; the application already starts the OAuth PKCE flow.
4. The default Supabase confirmation template works with the application. If you customise it, point confirmation links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` and recovery links to the same route with `type=recovery&next=/update-password`.

## 2. Apply the migration safely

For a new local stack:

```sh
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npx supabase test db
npm run supabase:types
```

The final command replaces the checked-in migration-derived bootstrap type snapshot with types generated from the running schema.

For an existing remote project, link it with the Supabase CLI, inspect `supabase db push --dry-run`, then run `supabase db push` only after confirming the migration is non-destructive. Never use `supabase db reset --linked`.

## 3. Environment variables

Copy `.env.example` to `.env.local` and supply the project URL and publishable key. No service-role key is used.

In Render, set:

- `NEXT_PUBLIC_APP_URL=https://YOUR-RENDER-DOMAIN`
- `NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_DEMO_MODE=false`
- `NODE_VERSION=24.14.1`

Use build command `npm ci && npm run build`, start command `npm run start`, and health check `/api/health`. A matching `render.yaml` is included for Blueprint deployments.

## 4. Demo mode

`NEXT_PUBLIC_DEMO_MODE=true` explicitly restores the browser-only visual demo. Production defaults closed: if the flag is absent or Supabase is incomplete, protected routes do not silently become demo mode.
