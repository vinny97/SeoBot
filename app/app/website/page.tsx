"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Globe2,
  History,
  ListTree,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";
import { useDemo } from "@/components/demo-provider";

type Run = {
  id: string;
  status: string;
  trigger_type: string;
  pages_discovered: number;
  pages_fetched: number;
  pages_succeeded: number;
  pages_failed: number;
  pages_skipped: number;
  issues_found: number;
  current_url: string | null;
  heartbeat_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_summary: string | null;
  provider: "native" | "siteone";
  provider_version: string | null;
  completion_reason: string | null;
  created_at: string;
};
type Page = {
  id: string;
  normalised_url: string;
  page_type: string;
  latest_http_status: number | null;
  latest_title: string | null;
  latest_indexable: boolean | null;
  latest_word_count: number | null;
  last_seen_at: string;
  issues: Array<{ severity: string }>;
};
type Issue = {
  id: string;
  issue_type: string;
  severity: "error" | "warning" | "information";
  title: string;
  description: string;
  recommendation: string | null;
  evidence: Record<string, unknown>;
  status: "open" | "resolved" | "ignored";
  first_seen_at: string;
  last_seen_at: string;
};
type Intelligence={id:string;website_page_id:string;page_type:string;primary_topic:string|null;search_intent:string;page_purpose_summary:string|null;content_quality_score:number|null;content_completeness_score:number|null;confidence:string;evidence:Record<string,unknown>;website_pages:{url:string;latest_title:string|null}|null};
type Overview = {
  website: {
    id: string;
    url: string;
    domain: string;
    analysis_status: string;
    analysis_error: string | null;
    last_analysed_at: string | null;
  };
  pageCount: number;
  openErrors: number;
  openWarnings: number;
  currentCrawl: Run | null;
  latestFailure: {
    normalised_url: string;
    http_status: number | null;
    fetch_error_code: string | null;
    fetch_error_message: string | null;
  } | null;
  robots: {
    url: string;
    http_status: number | null;
    content: string | null;
    fetch_error_message: string | null;
    fetched_at: string;
  } | null;
  sitemaps: Array<{
    id: string;
    url: string;
    sitemap_type: string;
    http_status: number | null;
    url_count: number | null;
    last_modified_max: string | null;
    fetch_error_message: string | null;
  }>;
  history: Run[];
};
const tabs = [
  "Overview",
  "Pages",
  "Page intelligence",
  "Issues",
  "Crawl history",
  "Sitemaps and robots",
] as const;
type Tab = (typeof tabs)[number];
const finalStates = new Set([
  "completed",
  "completed_with_warnings",
  "failed",
  "cancelled",
]);
export default function WebsitePage() {
  const { demoMode, snapshot } = useDemo();
  const [tab, setTab] = useState<Tab>("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [intelligence,setIntelligence]=useState<Intelligence[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (demoMode) return;
    const response = await fetch("/api/website-intelligence", {
      cache: "no-store",
    });
    if (response.ok) setOverview(await response.json());
  }, [demoMode]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  useEffect(() => {
    const run = overview?.currentCrawl;
    if (!run || finalStates.has(run.status)) return;
    const timer = window.setInterval(
      () => void load(),
      document.hidden ? 9000 : 3000,
    );
    return () => window.clearInterval(timer);
  }, [overview?.currentCrawl, load]);
  useEffect(() => {
    const run = overview?.currentCrawl;
    if (tab !== "Pages" || !run) return;
    const timer = window.setTimeout(() => {
      void fetch(
        `/api/crawls/${run.id}/pages?page=${page}&pageSize=25&search=${encodeURIComponent(search)}`,
        { cache: "no-store" },
      ).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setPages(data.items);
          setTotal(data.total);
        }
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [tab, overview?.currentCrawl, page, search]);
  useEffect(() => {
    const run = overview?.currentCrawl;
    if (tab !== "Issues" || !run) return;
    void fetch(`/api/crawls/${run.id}/issues`, { cache: "no-store" }).then(
      async (response) => {
        if (response.ok) setIssues((await response.json()).items);
      },
    );
  }, [tab, overview?.currentCrawl]);
  useEffect(()=>{if(tab!=="Page intelligence")return;void fetch("/api/page-intelligence",{cache:"no-store"}).then(async response=>{if(response.ok)setIntelligence((await response.json()).items)})},[tab]);
  async function start() {
    if (!overview) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/websites/${overview.website.id}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledged: true, trigger: "manual" }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Analysis could not be queued.");
    await load();
    setBusy(false);
  }
  async function cancel() {
    if (!overview?.currentCrawl) return;
    setBusy(true);
    await fetch(`/api/crawls/${overview.currentCrawl.id}/cancel`, {
      method: "POST",
    });
    await load();
    setBusy(false);
  }
  async function toggleIssue(issue: Issue) {
    await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ignored: issue.status !== "ignored" }),
    });
    setIssues((current) =>
      current.map((item) =>
        item.id === issue.id
          ? { ...item, status: issue.status === "ignored" ? "open" : "ignored" }
          : item,
      ),
    );
  }
  if (demoMode)
    return (
      <>
        <PageHeader
          eyebrow="Website Intelligence"
          title={snapshot?.onboarding.businessName || "Demo website"}
          description="Real crawling is disabled in explicit demo mode."
        />
        <EmptyState
          icon={<Globe2 size={22} />}
          title="Enable the real backend to analyse a website"
          description="Production never substitutes mock crawl findings."
        />
      </>
    );
  if (!overview)
    return (
      <>
        <PageHeader
          eyebrow="Website Intelligence"
          title="Website"
          description="Loading private crawl data…"
        />
        <Card className="h-40 animate-pulse">
          <span className="sr-only">Loading</span>
        </Card>
      </>
    );
  const active =
    overview.currentCrawl &&
    ["queued", "running"].includes(overview.currentCrawl.status);
  const unreadable = Boolean(
    overview.currentCrawl &&
      finalStates.has(overview.currentCrawl.status) &&
      overview.currentCrawl.pages_succeeded === 0 &&
      overview.currentCrawl.pages_failed > 0,
  );
  const unavailable =
    overview.robots?.http_status === 503 ||
    overview.latestFailure?.http_status === 503 ||
    overview.latestFailure?.fetch_error_code === "rate_limited";
  const metrics = [
    { label: "Pages", value: overview.pageCount, Icon: FileSearch },
    { label: "Open errors", value: overview.openErrors, Icon: XCircle },
    {
      label: "Open warnings",
      value: overview.openWarnings,
      Icon: AlertTriangle,
    },
    {
      label: "Analysis status",
      value: overview.website.analysis_status,
      Icon: CheckCircle2,
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Website Intelligence"
        title={overview.website.domain}
        description="Real public HTML observations. Technical indexability is not proof that Google has indexed a page."
        action={
          <div className="flex gap-2">
            {active && (
              <Button variant="ghost" disabled={busy} onClick={cancel}>
                Cancel analysis
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={busy || Boolean(active)}
              onClick={start}
            >
              <RefreshCw size={16} />
              {busy ? "Requesting…" : "Run website analysis"}
            </Button>
          </div>
        }
      />
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === item ? "bg-[var(--foreground)] text-white" : "border border-[var(--border)] bg-white"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="space-y-5">
          {unreadable && (
            <Card className="border-amber-300/70 bg-amber-50/80 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} />
                <div>
                  <p className="font-semibold">The analysis ran, but the website could not be read</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {unavailable
                      ? "The website returned repeated HTTP 503 responses. Check that the site is live and its hosting service is not suspended, then run the analysis again."
                      : overview.latestFailure?.fetch_error_message || "No public pages could be analysed. Check that the site is live and accessible, then run the analysis again."}
                  </p>
                </div>
              </div>
            </Card>
          )}
          {active && (
            <Card className="border-[#c8d8e6] bg-[#edf4fa] p-5">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
                <div>
                  <p className="font-semibold">
                    Website analysis {overview.currentCrawl?.status}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {overview.currentCrawl?.pages_succeeded} pages analysed ·{" "}
                    {overview.currentCrawl?.pages_discovered} discovered
                    {overview.currentCrawl?.current_url
                      ? ` · ${new URL(overview.currentCrawl.current_url).pathname}`
                      : ""}
                  </p>
                </div>
              </div>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, Icon }) => (
              <Card key={label} className="p-5">
                <Icon className="text-[var(--accent)]" size={20} />
                <p className="mt-4 text-2xl font-semibold">
                  {String(value).replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <h2 className="font-semibold">Crawl signals</h2>
            <dl className="mt-4 divide-y divide-[var(--border)]">
              {[
                [
                  "Last successful crawl",
                  overview.website.last_analysed_at
                    ? new Date(
                        overview.website.last_analysed_at,
                      ).toLocaleString()
                    : "Not completed",
                ],
                [
                  "robots.txt",
                  overview.robots?.http_status
                    ? `HTTP ${overview.robots.http_status}`
                    : "Not verified",
                ],
                [
                  "Sitemaps",
                  overview.sitemaps.some((item) => item.http_status === 200)
                    ? "Detected"
                    : "Not detected",
                ],
                [
                  "Pages successfully analysed",
                  overview.currentCrawl?.pages_succeeded || 0,
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="grid gap-1 py-3 sm:grid-cols-[220px_1fr]"
                >
                  <dt className="text-sm font-semibold">{label}</dt>
                  <dd className="text-sm text-[var(--muted)]">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
      {tab==="Page intelligence"&&(intelligence.length?<div className="grid gap-4 lg:grid-cols-2">{intelligence.map(item=><Card key={item.id} className="p-5"><div className="flex flex-wrap gap-2"><Badge>{item.page_type.replaceAll("_"," ")}</Badge><Badge tone={item.confidence==="high"?"green":"amber"}>{item.confidence} confidence</Badge></div><h2 className="mt-3 font-semibold">{item.website_pages?.latest_title||item.website_pages?.url||"Page"}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.page_purpose_summary}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[var(--muted)]">Main topic</dt><dd className="mt-1 font-medium">{item.primary_topic||"Not clear yet"}</dd></div><div><dt className="text-xs text-[var(--muted)]">Search purpose</dt><dd className="mt-1 font-medium">{item.search_intent}</dd></div><div><dt className="text-xs text-[var(--muted)]">Quality</dt><dd className="mt-1 font-medium">{item.content_quality_score??"—"}/100</dd></div><div><dt className="text-xs text-[var(--muted)]">Completeness</dt><dd className="mt-1 font-medium">{item.content_completeness_score??"—"}/100</dd></div></dl><details className="mt-4 rounded-xl bg-[var(--flight-bg)] p-3"><summary className="cursor-pointer text-sm font-semibold">Technical evidence</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(item.evidence,null,2)}</pre></details></Card>)}</div>:<EmptyState title="No page purposes yet" description="Run a website check. Searchhand will classify each changed page after the crawl finishes."/>)}
      {tab === "Pages" && (
        <div>
          <Input
            label="Search pages"
            placeholder="URL or title"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Card className="mt-4 overflow-hidden">
            <div className="hidden grid-cols-[2fr_.7fr_.6fr_.8fr_.6fr_.5fr] gap-3 border-b border-[var(--border)] bg-[#f7f7f3] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)] md:grid">
              <span>Page</span>
              <span>Type</span>
              <span>HTTP</span>
              <span>Indexability</span>
              <span>Words</span>
              <span>Issues</span>
            </div>
            {pages.map((item) => (
              <Link
                href={`/app/website/pages/${item.id}`}
                key={item.id}
                className="grid gap-2 border-b border-[var(--border)] p-4 last:border-0 md:grid-cols-[2fr_.7fr_.6fr_.8fr_.6fr_.5fr] md:items-center"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {item.latest_title || new URL(item.normalised_url).pathname}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {item.normalised_url}
                  </span>
                </span>
                <Badge>{item.page_type.replaceAll("_", " ")}</Badge>
                <span className="text-sm">
                  {item.latest_http_status || "—"}
                </span>
                <span className="text-sm">
                  {item.latest_indexable === null
                    ? "Unknown"
                    : item.latest_indexable
                      ? "Indexable signal"
                      : "Not indexable"}
                </span>
                <span className="text-sm">{item.latest_word_count ?? "—"}</span>
                <span className="text-sm">{item.issues.length}</span>
              </Link>
            ))}
          </Card>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">{total} pages</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page * 25 >= total}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
      {tab === "Issues" && (
        <div className="space-y-4">
          {issues.length ? (
            issues.map((issue) => (
              <Card key={issue.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      issue.severity === "error"
                        ? "red"
                        : issue.severity === "warning"
                          ? "amber"
                          : "blue"
                    }
                  >
                    {issue.severity}
                  </Badge>
                  <Badge>{issue.status}</Badge>
                  <span className="text-xs text-[var(--muted)]">
                    {String(issue.evidence.certainty || "confirmed")}{" "}
                    observation
                  </span>
                </div>
                <h2 className="mt-3 font-semibold">{issue.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {issue.description}
                </p>
                {issue.recommendation && (
                  <p className="mt-3 text-sm">
                    <strong>Next action:</strong> {issue.recommendation}
                  </p>
                )}
                <p className="mt-3 text-xs text-[var(--muted)]">
                  First seen{" "}
                  {new Date(issue.first_seen_at).toLocaleDateString()} · Last
                  seen {new Date(issue.last_seen_at).toLocaleDateString()}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleIssue(issue)}
                >
                  {issue.status === "ignored"
                    ? "Restore issue"
                    : "Ignore issue"}
                </Button>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No crawl issues to show"
              description="Issues appear only after real pages have been analysed."
            />
          )}
        </div>
      )}
      {tab === "Crawl history" && (
        <Card className="divide-y divide-[var(--border)]">
          {overview.history.map((run) => (
            <div
              key={run.id}
              className="grid gap-3 p-5 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <History size={17} className="text-[var(--accent)]" />
                  <h2 className="font-semibold">
                    {run.trigger_type.replaceAll("_", " ")} crawl
                  </h2>
                  <Badge>{run.status.replaceAll("_", " ")}</Badge>
                  <Badge>{run.provider === "siteone" ? "SiteOne crawler" : "Native crawler"}</Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {new Date(run.created_at).toLocaleString()} ·{" "}
                  {run.pages_succeeded} successful · {run.pages_failed} failed ·{" "}
                  {run.pages_skipped} skipped
                  {run.completion_reason && run.completion_reason !== "completed"
                    ? ` · ${run.completion_reason.replaceAll("_", " ")}`
                    : ""}
                </p>
                {run.error_summary && (
                  <p className="mt-2 text-sm text-[var(--error)]">
                    {run.error_summary}
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold">{run.issues_found} issues</p>
            </div>
          ))}
        </Card>
      )}
      {tab === "Sitemaps and robots" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={19} className="text-[var(--accent)]" />
              <h2 className="font-semibold">robots.txt</h2>
            </div>
            {overview.robots ? (
              <>
                <p className="mt-3 text-sm">
                  {overview.robots.url} · HTTP{" "}
                  {overview.robots.http_status || "unknown"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Checked{" "}
                  {new Date(overview.robots.fetched_at).toLocaleString()}
                </p>
                {overview.robots.content && (
                  <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f7f3] p-4 text-xs">
                    {overview.robots.content}
                  </pre>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                robots.txt has not been checked.
              </p>
            )}
          </Card>
          <Card className="divide-y divide-[var(--border)]">
            <div className="flex items-center gap-2 p-5">
              <ListTree size={19} className="text-[var(--accent)]" />
              <h2 className="font-semibold">Sitemaps</h2>
            </div>
            {overview.sitemaps.length ? (
              overview.sitemaps.map((item) => (
                <div key={item.id} className="p-5">
                  <p className="break-all text-sm font-semibold">{item.url}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {item.sitemap_type} · HTTP {item.http_status || "unknown"} ·{" "}
                    {item.url_count || 0} URLs
                  </p>
                  {item.fetch_error_message && (
                    <p className="mt-2 text-sm text-[var(--error)]">
                      {item.fetch_error_message}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-[var(--muted)]">
                No valid sitemap was detected. Sitemap presence does not prove
                indexing.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
