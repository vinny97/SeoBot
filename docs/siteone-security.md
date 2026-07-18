# SiteOne security boundary

SiteOne is disabled for ordinary customer workflows. A service-only operator action can queue it only for a project present in `siteone_allowed_projects`, and the Pi repeats the allowlist check locally.

The Pi does not hold the Supabase service-role key. Its random token is stored as a SHA-256 hash and authorises only bounded SiteOne worker RPCs. Revoke a worker by setting its credential to disabled or recording `revoked_at`.

The runner uses `spawn` with `shell: false`, fixed arguments, a UUID work directory, a restricted environment, bounded logs and reports, process timeouts, and graceful cancellation. Users cannot add SiteOne flags, extra domains, browser rendering, uploads, authentication, proxy credentials, AI features or stress-test options.

Before launch, the worker rejects credentials in URLs, localhost, private/reserved IPv4 and IPv6, link-local addresses, and any hostname with a blocked DNS result. This preflight does not control SiteOne's later redirects. SiteOne must remain internal-only until the Pi has an OS-level egress policy that blocks private and metadata networks while preserving its configured DNS resolver. Do not describe the current setup as safe for arbitrary customer URLs.

Quality scores are retained only as unsupported provider metadata and are never displayed as SEO or ranking scores. A non-2xx start page, invalid report, timeout or exact page-limit completion cannot resolve absent customer issues.
