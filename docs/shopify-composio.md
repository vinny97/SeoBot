# Shopify through Composio

## Composio dashboard setup

1. Sign in to the Composio dashboard and select the production Searchhand project.
2. Open **Auth Configs** and create or select the Composio-managed Shopify OAuth configuration.
3. Copy its auth-config ID into `COMPOSIO_SHOPIFY_AUTH_CONFIG_ID`.
4. Copy the production project API key into the server-only `COMPOSIO_API_KEY` environment variable.
5. Open **Project Settings → Auth Screen**.
6. Upload the Searchhand logo and set the app title to **Searchhand**.
7. Configure the allowed return URL:

   ```text
   https://<searchhand-domain>/app/integrations/shopify/callback
   ```

8. Set `APP_URL` to the same Searchhand origin, with no path.

Composio-managed Shopify OAuth is acceptable for this MVP. Do not create a custom Shopify OAuth flow in Searchhand. A custom Shopify app can be considered later if Searchhand needs complete consent-screen branding or custom scopes.

## Connect and verify

Open **Flight Deck → Integrations → Shopify** and choose **Connect Shopify**. Composio hosts the Shopify authorization. After Shopify redirects back, Searchhand checks all of the following before marking the connection active:

- the callback’s one-time state;
- the signed-in Supabase user and current project;
- the stored Composio user ID;
- the exact connected-account ID;
- the configured auth-config ID;
- the Shopify toolkit slug;
- active Composio account status;
- a successful allowlisted shop-details query.

The connected view shows only store name, store URL and safe timestamps. It never shows provider credentials or internal Composio references.

## Multiple Shopify stores

Choose **Connect another store** to add an additional destination. Every connection gets a unique local row and Composio alias. Publishing always receives a local connection ID and executes against its exact stored Composio account. There is no “latest account” fallback.

## Test-draft proof

The test action requires:

- a connected and recently verifiable Shopify connection;
- the exact Shopify blog ID;
- an explicit confirmation checkbox.

It calls `SHOPIFY_CREATE_ARTICLE` at toolkit version `20260721_00` with:

```json
{
  "title": "Searchhand connection test",
  "published": false
}
```

The full body is clearly marked as a Searchhand connection test. Searchhand reserves the fixed idempotency key `shopify_connection_test_v1` before calling Shopify. Refreshing or retrying cannot create another test article for the same connection. If the network result is uncertain, Searchhand records `unknown` and instructs the customer to check Shopify instead of retrying.

The resulting Shopify article ID and any safe preview/admin URL are stored in `article_publications`. The customer can delete the draft manually in Shopify. Searchhand does not delete Shopify articles during disconnect.

## Reconnect

Reconnect generates a fresh hosted link and a new pending local record. The existing store connection remains operational until the replacement is active and verified. After success, Searchhand disconnects the old record and revokes its exact Composio account.

## Disconnect

Disconnect requires explicit confirmation. It revokes/deletes the exact connected account through Composio, then marks the Searchhand record disconnected. Publication history remains available.

## Troubleshooting

- **Setup required**: confirm all server variables are present and the migration is applied.
- **Invalid callback**: start a fresh connection; callback state is one-time and expires when consumed.
- **Needs attention**: use **Refresh status**, then reconnect if the Composio account is inactive or expired.
- **Draft result uncertain**: inspect the selected Shopify blog before taking another action. Do not bypass the idempotency reservation.
- **Wrong blog**: disconnect only if needed; a new test draft cannot be created on that connection after an attempt. Connect a separate test store or remove the reservation administratively after verifying Shopify.
