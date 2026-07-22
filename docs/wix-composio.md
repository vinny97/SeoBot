# Wix through Composio

## Architecture

Searchhand uses a custom Wix OAuth app through a Composio auth config. Composio owns OAuth token storage and refresh. Searchhand stores only the stable Composio connected-account ID plus safe Wix app-instance metadata.

Composio does not currently expose Wix Blog draft actions. Searchhand therefore uses Composio's authenticated proxy for the official Wix REST endpoints. The proxy injects the customer's OAuth credential; Searchhand never reads or stores it.

## Wix app configuration

Add this OAuth redirect URI:

```text
https://backend.composio.dev/api/v1/auth-apps/add
```

Required Wix permissions:

- **Read site, business, and email details** for safe connection verification.
- **Manage Blog** to create and manage drafts.
- **Read Blog** and **Read Draft Blog Posts** to discover an existing author for draft ownership.
- **Manage Ricos Document** to convert approved HTML into Wix rich content while preserving headings and links.
- **Manage Media Manager** only when Searchhand begins importing article images into Wix.

After changing permissions, release the Wix app version and reconnect any existing test installation so its access token receives the new grants.

## Composio configuration

Use a custom OAuth2 auth config for the Wix toolkit. Keep the Composio `scopes` field empty because Wix app permissions are configured in Wix Developer Center.

Server-only environment variables:

```dotenv
APP_URL=https://searchhand.example.com
COMPOSIO_API_KEY=
COMPOSIO_WIX_AUTH_CONFIG_ID=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

The production Composio API key needs connected-account, tool execution and proxy-execute access. Never place these values in a `NEXT_PUBLIC_` variable.

## Connection flow

1. An authenticated Searchhand customer starts Wix connection from `/app/integrations/wix`.
2. Searchhand creates a pending provider row with a one-time callback-state hash.
3. Composio returns a hosted OAuth URL for the exact Wix auth config and Searchhand user ID.
4. The callback validates the authenticated customer, project ownership and one-time state.
5. Searchhand verifies the exact connected-account ID, auth-config ID and Wix toolkit.
6. `WIX_GET_APP_INSTANCE` confirms access and returns safe site display details and granted permissions.

## Draft proof

The test action requires explicit confirmation. Searchhand first converts the fixed test HTML through Wix's Ricos Documents API, reserves `wix_connection_test_v1`, and then creates one unpublished draft through:

```text
POST /blog/v3/draft-posts
```

Wix requires an author `memberId` for third-party apps. Searchhand reuses the author from an existing draft or published post. An explicit member ID can be entered for an empty blog.

If the create request has an uncertain network result, Searchhand records `unknown` and does not retry automatically. This prevents duplicate customer content.
