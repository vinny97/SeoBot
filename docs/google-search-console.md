# Google Search Console

Searchhand uses the official Google Search Console actions exposed by Composio. Composio manages Google OAuth, access tokens, refresh tokens and refresh handling. Searchhand never receives or stores a Google token.

## Composio setup

The enabled auth config is:

```text
Toolkit: google_search_console
Auth config: ac_2d-b3WRSIFhr
OAuth ownership: Composio managed
```

Server variables:

```text
APP_URL=
COMPOSIO_API_KEY=
COMPOSIO_GSC_AUTH_CONFIG_ID=ac_2d-b3WRSIFhr
```

`COMPOSIO_API_KEY` is the same server-only key already used by Searchhand's other Composio integrations. Add the variables to both the web service and the Render worker. Never prefix them with `NEXT_PUBLIC_`.

## Supabase and Render deployment

1. Apply `202607220004_search_intelligence_foundation.sql` and `202607220005_gsc_composio.sql`.
2. Regenerate `lib/supabase/database.types.ts` from the linked database.
3. Add `COMPOSIO_GSC_AUTH_CONFIG_ID` to the web service and worker; retain the existing `COMPOSIO_API_KEY`.
4. Deploy the Render worker from the same revision. Its `search_intelligence` capability executes the GSC import jobs.
5. Deploy the web service and ensure `APP_URL` is the public Searchhand origin used by the Composio callback.
6. Confirm the Render heartbeat lists `native_crawler` and `search_intelligence`, then connect ScreenFizz.

## Connection flow

The connect route requires an authenticated project member and creates a random, one-time callback state. Only its hash is stored. Searchhand asks Composio to create a connection link for the authenticated Searchhand user and the pinned GSC auth config.

After Google authorization, the callback checks the user, expiry and state using a timing-safe comparison. It then verifies all of the following against Composio before any data is accepted:

- the connected-account ID;
- the Searchhand-scoped Composio user ID;
- auth config `ac_2d-b3WRSIFhr`;
- toolkit `google_search_console`;
- active connection status.

Searchhand calls `GOOGLE_SEARCH_CONSOLE_LIST_SITES` and shows only verified properties with a usable permission level. A domain property such as `sc-domain:example.com` covers all protocols and subdomains; a URL-prefix property covers the exact prefix. Unrelated properties cannot be selected.

The database stores opaque Composio references and safe property metadata. The legacy `encrypted_refresh_token` column remains null for Composio connections and is not queried by the application.

## Imports

Property selection queues `gsc_initial_sync`, covering the previous 90 days through yesterday. The worker calls the pinned `GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY` action for:

- daily totals;
- query rows;
- page rows;
- query-page rows.

Requests use final web-search data and paginate in 5,000-row pages. Unique database constraints make upserts idempotent. Raw provider payloads are not retained.

The worker queues a daily sync when a connected property has not succeeded within 20 hours. Daily runs overlap the latest 10 days to absorb Google's adjustments. Composio handles credential refresh. An expired, inactive, revoked or mismatched connected account moves the connection to `needs_reauthentication`; temporary provider failures use normal worker retries.

## URL matching

Raw GSC URLs are preserved. Matching normalises fragments, default ports, repeated/trailing slashes and known tracking parameters; it checks crawled, final and canonical URLs. A same-path `www`/apex fallback is allowed. Unknown query strings are retained and not merged. Unmatched rows remain evidence for old, parameterised, redirected or uncrawled pages.

## Disconnect

Disconnect first verifies the exact connected account, then deletes it through Composio before clearing Searchhand's opaque account reference. Historical normalized metrics remain available until the normal data-retention or project-deletion process removes them.

## Current limitations

- Searchhand imports web-search data only.
- Device and country breakdowns are not shown in the first dashboard.
- Composio must remain available for connection, property discovery and scheduled imports.
- Search Console data normally lags behind the current date.
# Google Search Console

Searchhand connects directly to Google Search Console with the single read-only scope:

`https://www.googleapis.com/auth/webmasters.readonly`

The connection uses OAuth state validation, PKCE, offline access and an AES-256-GCM encrypted refresh token. Tokens are service-role-only and are never returned by browser routes, activity records or logs. Customers choose a verified property after authorization; Searchhand will not silently select an unrelated property.

Existing Composio-backed connection records remain supported only as a migration path. New connections use direct Google OAuth.

Search Console reporting is intentionally described as measured data, not a complete keyword database. Google may omit rows, so results screens and connection status must not imply that every query or page is represented.

Required variables:

```
GOOGLE_GSC_CLIENT_ID=
GOOGLE_GSC_CLIENT_SECRET=
GOOGLE_GSC_REDIRECT_URI=
GSC_TOKEN_ENCRYPTION_KEY=
```

Register the redirect URI exactly as:

`https://YOUR_APP/app/integrations/google-search-console/callback`
