# Search intelligence test plan

## Automated coverage

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:worker
npm run build:siteone-worker
```

Unit tests cover main-container selection, boilerplate removal, stable hashes, H1–H6/images/metadata, four core classifications, evidence, version keys, callback-state validation, Composio account-status mapping, provider-response normalization, property matching, URL mapping, 90/10-day windows, all first recommendation families, missing-page gating, ignore behavior, scores and fingerprints. The pgTAP fixture verifies GSC connection-table denial and cross-project metric/recommendation isolation.

After applying migrations locally, run `supabase test db` (or the equivalent project CI job) so pgTAP executes against PostgreSQL. Regenerate committed types with `npm run supabase:types` after the database is on migration `202607220004`.

## ScreenFizz acceptance

1. Deploy the migration, web app and updated Render worker with GSC variables.
2. Sign in and open ScreenFizz.
3. Confirm a successful official crawl; run a website check if needed.
4. Confirm Page intelligence shows page purpose, topic, type, confidence and evidence.
5. Open Connections → Google Search Console and authorise the ScreenFizz Google account.
6. Select the matching verified domain or URL-prefix property; verify unrelated properties cannot be selected.
7. Watch `gsc_initial_sync` reach completed and confirm 90 days in all four metric tables, including unmatched URLs.
8. Confirm mapped page IDs agree with crawled/canonical URLs.
9. Confirm `generate_seo_recommendations` completes and Home shows exactly one measured best action.
10. Open Work, inspect evidence/score/source versions, then approve or reject it and confirm activity/radar state changes.
11. Open Results and confirm figures reconcile to GSC for the same dates (allowing API final-data timing).
12. Run a second sync and confirm idempotent row counts/no duplicate recommendations.
13. Re-run native crawl, SiteOne worker, Crawler Lab promotion and WordPress/Shopify/Wix connection smoke tests.

Repeat with Influocial only after ScreenFizz passes.

## Security acceptance

- Inspect browser network responses: no Composio API key, connected-account internals, Google token or full provider payload may appear.
- Use two workspace users to prove isolation for intelligence, metrics and recommendations.
- Fabricate state, property, project, recommendation evidence, confidence and priority requests; all must be rejected or ignored.
- Revoke Google access and confirm the next sync becomes `needs_reauthentication`.
- Disconnect and confirm encrypted token is null.

## Current limitations

Live OAuth/API acceptance requires the enabled Composio GSC auth config, the shared server-side Composio API key and a Google account with verified properties. This repository environment cannot manufacture real ScreenFizz or Influocial GSC evidence, so those production steps remain an operator acceptance gate rather than a unit test.
