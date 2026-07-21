# Crawler Lab (internal only)

Crawler Lab is a validation tool for authorised internal users. It is unavailable to ordinary customer accounts and remains disabled until `CRAWLER_LAB_ENABLED=true` is configured on the web service.

## Access setup

An operator must add the authenticated user to `public.crawler_lab_admins` using a trusted service-role/admin session. Internal access also requires normal workspace membership. Do not add the Lab to public navigation.

## Running crawls

Open `/app/website/crawler-lab` as an authorised user. **Run Native** queues a Render native-crawler job. **Run SiteOne** queues a Pi job only when the project is in `siteone_allowed_projects` and the Pi has a recent SiteOne heartbeat. **Run Both** creates an atomic comparison group and queues one job for each worker.

The Lab shows only safe worker availability data: availability, last heartbeat, and SiteOne version. It never exposes a worker token, hostname, IP address, command, output path, or report.

## Reading and reviewing comparisons

The detail view compares normalised page URLs and stable issue fingerprints. More pages or issues does not by itself mean a crawler is more accurate. Record one of: Native more accurate, SiteOne more accurate, Both similar, or Needs investigation, with concrete notes.

`page_limit_reached`, `time_limit_reached`, and `provider_stopped` are partial results. They can show observed pages and issues, but their absence must not be interpreted as removal.

## Promotion

Promotion is a separate, explicit action. It makes a completed run the official website result, updates observed latest-page values, and consolidates observed issues. A full result may resolve issues not observed in that crawl. A partial result never resolves absent issues or marks absent pages as removed. Promotion is idempotent and records an activity entry.

## Operations

The Lab needs both worker heartbeats to run a comparison. The default stale threshold is 60 seconds and can be adjusted with `CRAWLER_WORKER_OFFLINE_AFTER_SECONDS`. SiteOne stays internal-only until network egress isolation on the Pi is complete.
