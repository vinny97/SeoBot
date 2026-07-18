# SiteOne Raspberry Pi worker

SiteOne is an internal-only second crawler provider. Public customer scans continue to use the native crawler. The Pi receives a publishable Supabase key and a revocable worker token, never the service-role secret.

## Prepare the Pi

1. Confirm the OS is ARM64 with `uname -m` (`aarch64`).
2. Install the approved SiteOne 2.x ARM64 package and confirm `siteone-crawler --version`.
3. Install Node.js 22 or 24.
4. Create a non-root `seobot-worker` user.
5. Deploy this repository to `/opt/seobot-worker` and run `npm ci && npm run build:siteone-worker`.
6. Create `/DATA/seobot/crawls`, owned only by `seobot-worker`, with mode `700`.
7. Run `npm run siteone:provision -- <project-id>` on a trusted development machine. Copy the displayed token once.
8. Create `/etc/seobot-siteone-worker.env` with mode `600`:

```text
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
SITEONE_WORKER_TOKEN=THE-ONE-TIME-WORKER-TOKEN
WORKER_ID=seobot-pi-worker-1
SITEONE_BINARY_PATH=/usr/bin/siteone-crawler
SITEONE_WORK_DIR=/DATA/seobot/crawls
SITEONE_MAX_PAGES=50
SITEONE_MAX_DEPTH=4
SITEONE_PROCESS_TIMEOUT_MINUTES=15
SITEONE_ALLOWED_PROJECT_IDS=YOUR-INTERNAL-PROJECT-UUID
CRAWLER_WORKER_POLL_MS=3000
CRAWLER_JOB_LOCK_MINUTES=10
```

9. Copy `deploy/systemd/seobot-siteone-worker.service` to `/etc/systemd/system/`.
10. Run `sudo systemctl daemon-reload && sudo systemctl enable --now seobot-siteone-worker`.
11. Check `systemctl status seobot-siteone-worker` and `journalctl -u seobot-siteone-worker -f`.

Run `scripts/check-siteone-installation.sh` as the worker user after loading the environment file. Queue a controlled test with `npm run siteone:enqueue -- <website-id>` from a trusted machine.

## Upgrade and rollback

Stop the service, install the candidate SiteOne 2.x binary, run the installation check and a controlled crawl, then restart. Roll back the package if its `--help` no longer contains the required options. Native crawling remains available throughout.

The worker deletes successful report directories after import and retains failed artifacts for diagnosis. Periodically remove expired failed directories only from `/DATA/seobot/crawls` after confirming their UUID paths.
