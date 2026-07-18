#!/usr/bin/env sh
set -eu
: "${SITEONE_BINARY_PATH:=/usr/bin/siteone-crawler}"
: "${SITEONE_WORK_DIR:=/DATA/seobot/crawls}"
test "$(uname -m)" = "aarch64" || echo "Warning: expected Raspberry Pi ARM64 (aarch64)."
test -x "$SITEONE_BINARY_PATH"
"$SITEONE_BINARY_PATH" --version
test -d "$SITEONE_WORK_DIR"
test -w "$SITEONE_WORK_DIR"
node --version
test -n "${SUPABASE_URL:-}"
test -n "${SUPABASE_PUBLISHABLE_KEY:-}"
test -n "${SITEONE_WORKER_TOKEN:-}"
df -h "$SITEONE_WORK_DIR"
echo "SiteOne worker prerequisites are present."
