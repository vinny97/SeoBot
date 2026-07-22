# Direct WordPress publishing

Searchhand connects directly to WordPress with a dedicated WordPress **Application Password**. It does not use Composio, a WordPress plugin, or a Searchhand-wide WordPress OAuth app.

## Customer setup

1. Sign in to the WordPress dashboard.
2. Open **Users → Profile**.
3. Scroll to **Application Passwords**.
4. Enter `Searchhand` and choose **Add New Application Password**.
5. Copy the generated password.
6. In Searchhand, open **Integrations → WordPress**.
7. Enter the HTTPS website URL, WordPress username, and generated Application Password.
8. Choose **Test connection**. This reads site and account details but creates nothing.
9. Choose **Connect WordPress**.
10. Confirm **Create WordPress test draft** when ready.

Do not enter the normal WordPress login password. An Editor account is sufficient when it has permission to create and edit posts.

## What Searchhand stores

Searchhand stores the site URL, REST API URL, safe site/account display labels, connection health timestamps, and publication IDs/URLs. The username and Application Password are stored together only in an AES-256-GCM encrypted envelope. The encryption key stays in the server environment, never in a `NEXT_PUBLIC_` variable. Authorization headers are generated only in server memory and are never stored or returned to the browser.

The browser roles have no direct privileges on `publishing_connections` or `article_publications`. Server routes authenticate the current Searchhand user and verify project ownership before using the service-role client.

## Connection and security behaviour

- HTTPS is required. URLs with embedded credentials, IP-literal hosts, localhost, private/reserved networks, metadata hosts, unsafe ports, and unsafe redirects are rejected.
- DNS is resolved and checked before requests, and the network client pins requests through a checked lookup to reduce DNS-rebinding risk.
- Searchhand discovers the REST API from the WordPress API link and then tests the expected `/wp-json/` location. WordPress installations in subdirectories are preserved.
- Connection testing calls the authenticated current-user endpoint and verifies `edit_posts`. It does not create or alter posts.
- Security plugins, disabled REST APIs, stripped Authorization headers, and insufficient roles return customer-readable errors.

## Draft-only publishing

This milestone supports title, safe HTML content, excerpt, slug, and `status: draft`. The server supplies the status; browser input cannot request live publishing. Unsafe scripts, iframes, embedded objects, forms, event handlers, and JavaScript URLs are removed before submission.

Each content/destination pair uses a stable idempotency key in `article_publications`. A unique database constraint claims the operation before WordPress is called. A repeated request returns the existing remote post instead of creating another. An uncertain in-flight operation stops for review rather than retrying blindly.

Updating first fetches the remote post and proceeds only while it remains a draft. If someone publishes it manually in WordPress, Searchhand will not overwrite it.

## Test draft

The explicit test creates one draft titled **Searchhand connection test** with text explaining that it is not intended for publication. The WordPress post ID and safe edit/preview URLs are stored. Repeating create reuses that publication record; **Update test draft** changes the same WordPress post.

## Disconnect and reconnect

Disconnect irreversibly removes the encrypted credential envelope from Searchhand and marks the connection disconnected. It preserves publication history and does not delete or change anything in WordPress.

For complete revocation, also delete the Searchhand Application Password under **Users → Profile** in WordPress. Reconnect verifies replacement credentials before replacing saved credentials and retains the same Searchhand connection ID and publication history.

## Environment

Required server-only variables:

```env
APP_URL=https://your-searchhand-host.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=...
INTEGRATION_ENCRYPTION_KEY=...
# Optional during a planned rotation:
INTEGRATION_ENCRYPTION_KEY_PREVIOUS=...
```

Generate a 32-byte base64 key once and keep it stable across deployments, for example with `openssl rand -base64 32`. For a planned rotation, move the old key to `INTEGRATION_ENCRYPTION_KEY_PREVIOUS`, put the new key in `INTEGRATION_ENCRYPTION_KEY`, then reconnect each site so its credential envelope is rewritten with the new key. Remove the previous key only after all connections have rotated.

## Current limitations

This version does not publish live, schedule, create Gutenberg blocks, upload featured images, manage categories/tags, or set SEO-plugin fields. WordPress multisite and unusual REST rewrites may require additional testing. Some hosts or security plugins block Application Password authentication or strip the Authorization header.
