import { describe, expect, it } from "vitest";
import { compareNormalisedCrawls } from "../lib/crawler-lab/comparison";

const page = (url: string) => ({ normalised_url: url, final_url: url, http_status: 200, content_type: "text/html", fetch_error_message: null, title: "Title", indexable: true });
const issue = (fingerprint: string) => ({ fingerprint, issue_type: "missing_title", severity: "warning", title: "Missing title", description: "No title", recommendation: null, evidence: {}, website_page_id: null });

describe("normalised crawler comparison", () => {
  it("matches pages despite trailing slashes, fragments and host casing", () => {
    const result = compareNormalisedCrawls([page("https://EXAMPLE.com/pricing/#top"), page("https://example.com/native")], [page("https://example.com/pricing/"), page("https://example.com/siteone")], [issue("shared"), issue("native")], [issue("shared"), issue("siteone")]);
    expect(result.pages.both).toHaveLength(1); expect(result.pages.nativeOnly).toHaveLength(1); expect(result.pages.siteoneOnly).toHaveLength(1);
    expect(result.issues.both).toHaveLength(1); expect(result.issues.nativeOnly).toHaveLength(1); expect(result.issues.siteoneOnly).toHaveLength(1);
  });
});
