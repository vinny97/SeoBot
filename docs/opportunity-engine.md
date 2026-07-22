# Opportunity engine

The opportunity engine creates measured `seo_recommendations`; it does not reuse the lightweight onboarding `opportunities` hypotheses. Inputs are current page intelligence, the latest 28 days of GSC data, the preceding 28-day comparison, open technical issues, internal links, and confirmed offerings.

## Rules

Version `rules-v1` implements:

- improve an indexable page with meaningful impressions and average position 4–20;
- improve search title/description when visibility is meaningful and click rate is below an explicit position-band benchmark;
- investigate a page when appearances fall at least 30% from a previous period with at least 100 appearances;
- clarify/merge overlapping pages when the same query has meaningful visibility on topically overlapping pages;
- prioritise technical issues on pages with existing search visibility;
- add links from relevant unlinked source pages to a measured target;
- create a commercial page only when an offering, related GSC evidence and a confirmed page gap agree;
- store low-volume noise as dismissed `ignore` evidence.

Customer copy avoids promises and avoids the term “cannibalisation.” A suitable existing page prevents a create-page recommendation.

## Scoring

Each component is 0–1 and stored with the recommendation:

```text
positive =
  0.25 × business relevance +
  0.20 × search demand signal +
  0.20 × ranking opportunity +
  0.15 × expected impact +
  0.10 × confidence +
  0.10 × evidence freshness

priority = 100 × clamp(positive × (1 - 0.20 × effort - 0.15 × risk))
```

Inputs, thresholds and engine version are plain TypeScript constants, not an LLM prompt. Scores are deterministic and bounded 0–100. The highest non-ignore active result becomes the one best next action. Plan horizons are `this_week` (70+), `next` (50–69.99), and `later` (below 50), with at most ten shown in Work.

## Evidence and lifecycle

Every record explains the finding, importance, action, evidence, alternative rejected, confidence, score components and source versions. A SHA-256 fingerprint of rule version, website, type and stable entity/query keys prevents duplicates. A regeneration upserts unchanged fingerprints, supersedes stale suggested work, preserves completed history, and never deletes it.

Users may approve, reject, mark not relevant or review later. Browser routes accept only the decision; browser callers cannot submit evidence, priority or confidence.

## Limitations

The first rules use GSC only: no external volume, SERP, backlinks, GA4, Semrush, Monid, AI visibility or article generation. Position-band click benchmarks are intentionally simple and disclosed. Recommendations still require human review before changes.
