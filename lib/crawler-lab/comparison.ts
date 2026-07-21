export type ComparisonPage = { normalised_url: string; final_url: string | null; http_status: number | null; content_type: string | null; fetch_error_message: string | null; title: string | null; indexable: boolean | null };
export type ComparisonIssue = { fingerprint: string; issue_type: string; severity: string; title: string; description: string; recommendation: string | null; evidence: Record<string, unknown>; website_page_id: string | null };

function pageKey(page: ComparisonPage) {
  try {
    const url = new URL(page.normalised_url);
    url.hostname = url.hostname.toLowerCase(); url.hash = "";
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
    url.pathname = url.pathname.replace(/\/{2,}/g, "/"); if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch { return page.normalised_url; }
}
export function compareNormalisedCrawls(nativePages: ComparisonPage[], siteonePages: ComparisonPage[], nativeIssues: ComparisonIssue[], siteoneIssues: ComparisonIssue[]) {
  const nativePageMap = new Map(nativePages.map((page) => [pageKey(page), page]));
  const siteonePageMap = new Map(siteonePages.map((page) => [pageKey(page), page]));
  const nativeIssueMap = new Map(nativeIssues.map((issue) => [issue.fingerprint, issue]));
  const siteoneIssueMap = new Map(siteoneIssues.map((issue) => [issue.fingerprint, issue]));
  const bothPages = [...nativePageMap.keys()].filter((key) => siteonePageMap.has(key));
  const bothIssues = [...nativeIssueMap.keys()].filter((key) => siteoneIssueMap.has(key));
  return {
    pages: { both: bothPages.map((key) => ({ native: nativePageMap.get(key)!, siteone: siteonePageMap.get(key)! })), nativeOnly: [...nativePageMap].filter(([key]) => !siteonePageMap.has(key)).map(([, page]) => page), siteoneOnly: [...siteonePageMap].filter(([key]) => !nativePageMap.has(key)).map(([, page]) => page) },
    issues: { both: bothIssues.map((key) => ({ native: nativeIssueMap.get(key)!, siteone: siteoneIssueMap.get(key)! })), nativeOnly: [...nativeIssueMap].filter(([key]) => !siteoneIssueMap.has(key)).map(([, issue]) => issue), siteoneOnly: [...siteoneIssueMap].filter(([key]) => !nativeIssueMap.has(key)).map(([, issue]) => issue) },
  };
}
