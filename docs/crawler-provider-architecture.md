# Crawler provider architecture

The native crawler remains the production default and runs beside Next.js on Render. SiteOne is an internal-only provider processed by the Raspberry Pi.

Each crawl run stores its provider, version, completion reason and limited provider metadata. Jobs store the capability required to claim them. Native claims require `native_crawler`; Pi claims require `siteone_crawler`. PostgreSQL row locks still prevent duplicate claims.

Providers emit normalized factual observations in bounded batches. Native crawling persists progressively. SiteOne validates a real v2 JSON report and imports pages and curated issues. Run-specific `crawl_issue_observations` preserves provenance. Only native/public runs update the consolidated customer issue lifecycle; SiteOne comparison imports cannot resolve or overwrite it.

SiteOne snapshots use `provider_report` with unknown depth. They do not update existing page `latest_*` facts during internal evaluation. Missing provider fields stay null, and unsupported report sections become import metadata rather than invented facts.

Future providers implement the same observation sink, add a server-side capability and receive their own least-privilege worker credential. Provider selection is never accepted directly from browser state.
