# Page intelligence

Page intelligence is Searchhand's versioned understanding of what each crawled page is for. It is separate from raw crawl evidence: `crawl_page_snapshots` records what was observed, while `page_intelligence` records the interpretation produced from a content hash and analysis version.

## Extraction

The native crawler extracts and persists each successful page immediately. It prefers `main`, `article`, `[role=main]` and `articleBody`, scores candidate containers by text density, and removes navigation, headers, footers, forms, sidebars, cookie/consent UI, scripts and hidden content. It stores normalised main text (up to 1 MB), SHA-256 content hash, word count, H1–H6, title, description, canonical, indexability, author/dates when discoverable, images and alt text, schema types, link counts and internal anchor text.

Hash input is Unicode NFKC text with whitespace and punctuation spacing normalised. Whitespace-only changes therefore do not trigger new analysis. SiteOne reports do not contain full HTML; their stable fallback hash is based on the page metadata available in the report, and their main text remains empty rather than being invented.

## Classification

`DeterministicPageIntelligenceAnalyzer` uses URL paths, title, H1, schema types, commercial/pricing language, confirmed business offerings, locations and links. It produces page type, topic, intent, funnel stage, matched offerings/locations, purpose, completeness/quality scores, target query, confidence and evidence. Every result includes the method and concrete signals. `analysis_version + content_hash + website_page_id` is unique, so unchanged work is skipped and a version bump safely re-runs it.

No AI provider is required. The `PageIntelligenceAnalyzer` interface is the extension point for a future feature-flagged analyser.

## Job flow

A successful non-Lab crawl queues `page_intelligence_analysis`. The Render worker claims it with existing locks, heartbeats and retries. Completion records an activity and queues recommendation generation. Crawler Lab promotions remain unchanged; a promoted crawl can be analysed by queueing the same job with its selected run ID.

## Limitations

- JavaScript-rendered copy unavailable in returned HTML cannot be extracted.
- Boilerplate removal is deterministic and may need site-specific refinements.
- SiteOne cannot provide main-body text unless its report format adds it.
- Classification is lexical, not a substitute for editorial review.
