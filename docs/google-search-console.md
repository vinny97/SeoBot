# Google Search Console

Searchhand uses direct Google OAuth and the official Search Console API. Composio is not involved.

## Google Cloud setup

1. Create or choose a Google Cloud project.
2. Enable the Google Search Console API.
3. Configure the OAuth consent screen.
4. Create a Web application OAuth client.
5. Add the exact callback URI, for example `https://app.searchhand.com/app/integrations/google-search-console/callback`.
6. Configure only `https://www.googleapis.com/auth/webmasters.readonly`.

Server variables:

```text
GOOGLE_GSC_CLIENT_ID=
GOOGLE_GSC_CLIENT_SECRET=
GOOGLE_GSC_REDIRECT_URI=
GSC_TOKEN_ENCRYPTION_KEY=
```

The encryption key is 32 random bytes encoded as 64 hex characters or base64url. Never prefix these variables with `NEXT_PUBLIC_`. Add the same four variables to the web service and Render worker.

## Supabase and Render deployment

1. Apply `supabase/migrations/202607220004_search_intelligence_foundation.sql` with the normal Supabase migration pipeline.
2. Run `npm run supabase:types` against the migrated database and commit the regenerated file.
3. Add the four GSC variables to the Next.js web service and Render crawler worker. Keep the existing Supabase secret and crawler variables.
4. Deploy the Render worker from the same revision; `npm run build:worker` now includes search-intelligence handlers.
5. Deploy the web service and verify the OAuth redirect URI exactly matches Google Cloud.
6. Confirm the Render heartbeat lists `native_crawler` and `search_intelligence`, then connect ScreenFizz.

The migration backfills a page-intelligence job for each website with an existing successful crawl. Future normal crawls and Crawler Lab promotions enqueue it automatically.

## Connection flow

The connect route requires an authenticated project member, creates a random state and PKCE verifier, stores only the state hash, and requests offline access. The callback validates user, expiry and state with a timing-safe comparison, exchanges the code, lists verified properties, and encrypts the refresh token with AES-256-GCM and connection-bound authenticated data. Tokens and OAuth sessions are service-role-only and never returned by browser routes.

The user chooses a property. `sc-domain:example.com` covers the domain and subdomains; a URL-prefix property covers its exact protocol/host/path prefix. Searchhand rejects properties unrelated to the project website. Account email remains null because the deliberately narrow Search Console scope does not grant identity-profile access.

## Imports

The callback does not import data. Selection queues `gsc_initial_sync`, covering the previous 90 days through yesterday. Four paginated Search Analytics reads import daily totals, query, page, and query-page rows. Unique constraints make upserts idempotent. Raw provider payloads are not retained.

The worker queues a daily sync when a connected property has not succeeded within 20 hours. Daily runs overlap the latest 10 days to absorb Google's adjustments. A sync run records window, cursor, progress, row count and failure. Permanent `invalid_grant` failures set `needs_reauthentication`; rate limits and server failures use worker retries.

## URL matching

Raw GSC URLs are preserved. Matching normalises fragments, default ports, repeated/trailing slashes and known tracking parameters; it checks crawled, final and canonical URLs. A same-path `www`/apex fallback is allowed. Unknown query strings are retained and not merged. Unmatched rows remain product evidence for old, parameterised, redirected or uncrawled pages.

## Disconnect

Disconnecting sets the status to `disconnected` and removes encrypted token access. Historical normalised metrics remain available until normal data-retention/deletion policy removes them.
