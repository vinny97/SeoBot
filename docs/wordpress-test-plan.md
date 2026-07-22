# WordPress integration test plan

Use a disposable development WordPress site, never a customer's production site, for the first acceptance run.

## Setup

1. Create a current WordPress development site over HTTPS.
2. Create a dedicated Editor test account.
3. Sign in as that account and create an Application Password named `Searchhand` under **Users → Profile**.
4. Confirm the REST API root loads at the site's discovered `wp-json` URL.
5. Configure `APP_URL`, Supabase server values, and a stable 32-byte `INTEGRATION_ENCRYPTION_KEY` in the Searchhand server environment.
6. Apply `202607220002_direct_wordpress.sql`.

## Acceptance workflow

1. Open **Searchhand → Integrations → WordPress**.
2. Enter the test site HTTPS URL, Editor username, and Application Password.
3. Choose **Test connection**. Confirm it shows the site/account and creates no post.
4. Choose **Connect WordPress**. Confirm the saved connection never displays the Application Password.
5. Confirm **Create WordPress test draft**.
6. In WordPress, confirm one post named **Searchhand connection test** exists with status **Draft**.
7. Repeat the create request or refresh Searchhand and try again. Confirm no second post exists.
8. Choose **Update test draft**. Confirm WordPress changes the same post ID.
9. Manually publish the test post, then try update again. Confirm Searchhand refuses to overwrite it.
10. Disconnect. Confirm Searchhand cannot test or create a draft, the stored credential envelope is removed, and the WordPress post remains.
11. Reconnect with a newly generated Application Password. Confirm the connection ID and publication history remain and the connection works.
12. Delete the Application Password in WordPress and run **Test connection**. Confirm Searchhand reports that reauthentication is required.

## Negative tests

- Try localhost, a private IP, an IP-literal public host, HTTP, a URL with embedded credentials, and a redirect to a private address. Each must fail before authentication is sent.
- Use an invalid Application Password. Confirm the error is useful and contains no provider response or secret.
- Use a Subscriber account. Confirm Searchhand reports insufficient permission.
- Disable the REST API or block the Authorization header in a staging security plugin. Confirm the mapped troubleshooting message.
- Corrupt an encrypted credential envelope in a disposable database. Confirm decryption fails closed and no WordPress request is made.
- Verify Shopify and Wix connection, health-check, and test-draft flows still work.
