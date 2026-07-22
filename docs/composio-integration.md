# Composio integration foundation

Searchhand uses Composio as the credential boundary for third-party publishing accounts. The first supported provider is Shopify. No other provider is enabled by this milestone.

## Identity and tenant isolation

Every authenticated Supabase user maps to one stable Composio user ID:

```text
searchhand_<supabase-auth-user-uuid>
```

`getComposioUserId()` accepts only a UUID obtained from the authenticated server session. Email addresses and browser-supplied Composio identities are rejected. Searchhand verifies normal project access separately before it reads or uses a publishing connection.

Composio connections remain private to their owning Composio user. Searchhand also pins every tool call to the exact `composio_connected_account_id` stored for the selected local connection. It never resolves “the most recent” account.

## Credential boundary

Composio stores and refreshes Shopify OAuth credentials. Searchhand stores:

- stable Composio user ID;
- Composio connected-account and auth-config references;
- provider, local status and timestamps;
- safe Shopify store ID, name and URL;
- safe publication IDs, URLs and status.

Searchhand does not store Shopify access tokens, refresh tokens or OAuth payloads. `COMPOSIO_API_KEY` and the Supabase server secret are server-only. The sensitive tables are not granted to the browser’s authenticated role; authenticated Searchhand routes verify the user and project before using a privileged database client.

## Validated versions

- `@composio/core`: `0.14.0`
- Shopify toolkit: `20260721_00`
- Draft action: `SHOPIFY_CREATE_ARTICLE`
- Store test action: `SHOPIFY_QUERY_SHOP`
- Publication status action: `SHOPIFY_GET_ARTICLE`

The SDK client pins the Shopify toolkit version and disables Composio telemetry and automatic file upload/download. See the [Composio TypeScript SDK reference](https://docs.composio.dev/reference/sdk-reference/typescript), [Connected Accounts reference](https://docs.composio.dev/reference/sdk-reference/typescript/connected-accounts), and [Shopify toolkit catalogue](https://docs.composio.dev/toolkits/shopify).

## Required environment variables

```dotenv
APP_URL=https://searchhand.example.com
COMPOSIO_API_KEY=
COMPOSIO_SHOPIFY_AUTH_CONFIG_ID=
COMPOSIO_WIX_AUTH_CONFIG_ID=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

Do not use a `NEXT_PUBLIC_` prefix for Composio values or the Supabase server secret. `NEXT_PUBLIC_APP_URL` remains supported for the public app, but publishing callbacks prefer server-only `APP_URL`.

Apply `supabase/migrations/202607210007_composio_shopify.sql` and `supabase/migrations/202607220001_composio_wix.sql` before enabling the publishing UI.

## Connection flow

1. An authenticated customer opens `/app/integrations/shopify`.
2. `POST /api/integrations/shopify/connect` verifies the Supabase user and current project.
3. Searchhand creates a pending local row with a random one-time callback-state hash.
4. Searchhand calls `connectedAccounts.link()` with the stable user ID, Shopify auth-config ID, unique alias, callback URL and `allowMultiple: true`.
5. Only the hosted redirect URL is returned to the browser.
6. The callback authenticates the customer again, validates the one-time state and local ownership, then filters Composio accounts by the expected user, auth config and Shopify toolkit.
7. The exact connected-account ID must be active before Searchhand saves safe store metadata.

Failed, cancelled, expired and still-initialising connections do not become connected merely because the callback was reached.

## Status, reconnect and disconnect

Manual status checks retrieve the exact Composio account and run the allowlisted Shopify shop query. Composio states map to Searchhand’s `connected`, `needs_reauthentication`, `error`, `pending` or `disconnected` states.

Reconnect creates a fresh pending connection. The old working connection remains untouched until the replacement callback succeeds. Only then is the old local connection marked disconnected and its exact Composio account revoked.

Disconnect revokes the exact Composio connected account and marks the local connection disconnected. Publication history and Shopify articles are preserved.

## Known limitations

- The proof of concept creates unpublished Shopify blog articles only.
- A customer must enter the exact Shopify blog ID for the test draft; Searchhand does not silently select a destination.
- Webflow, Wix, Framer, WordPress, social providers and automatic publishing are not enabled.
- Webhooks are not included. Status is refreshed on explicit user action.
- A later custom Shopify OAuth app may be required for fully Searchhand-branded consent and custom scopes.
