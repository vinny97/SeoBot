"use client";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  Globe2,
  LayoutTemplate,
  TriangleAlert,
} from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { OnboardingNavigation } from "@/components/onboarding/onboarding-navigation";
import { StepIntro } from "@/components/onboarding/onboarding-shell";
import { useDemo } from "@/components/demo-provider";
import type { OnboardingData } from "@/lib/onboarding/types";

type PageItem = {
  id: string;
  page_type: string;
  latest_title: string | null;
  normalised_url: string;
};
const finalStates = new Set([
  "completed",
  "completed_with_warnings",
  "failed",
  "cancelled",
]);
export function DiscoveryStep({
  data,
  back,
  next,
}: {
  data: OnboardingData;
  back: () => void;
  next: () => void;
}) {
  const { demoMode, snapshot, refresh, mutateRecord, saving, error } =
    useDemo();
  const run = snapshot?.currentCrawl;
  const [pages, setPages] = useState<PageItem[]>([]);
  const [signals, setSignals] = useState({ robots: false, sitemap: false });
  useEffect(() => {
    if (demoMode || !run?.id || finalStates.has(run.status)) return;
    const tick = () => {
      void refresh();
    };
    const timer = window.setInterval(tick, document.hidden ? 9000 : 3000);
    return () => window.clearInterval(timer);
  }, [demoMode, run?.id, run?.status, refresh]);
  useEffect(() => {
    if (demoMode || !run?.id) return;
    void Promise.all([
      fetch(`/api/crawls/${run.id}/pages?pageSize=25`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/website-intelligence", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([pageData, overview]) => {
      setPages(pageData?.items || []);
      setSignals({
        robots: Boolean(overview?.robots?.http_status),
        sitemap: Boolean(
          overview?.sitemaps?.some(
            (item: { http_status: number }) => item.http_status === 200,
          ),
        ),
      });
    });
  }, [demoMode, run?.id, run?.pagesFetched]);
  if (demoMode)
    return (
      <>
        <StepIntro
          eyebrow="Explicit demo mode"
          title={`Previewing how ${data.businessName} is organised.`}
          description="Demo mode is active, so no external website request is made."
        />
        <Card className="mx-auto max-w-3xl p-6">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Deploy with demo mode disabled to use the real background crawler.
            Mock detection is never shown as production evidence.
          </p>
        </Card>
        <OnboardingNavigation back={back} onNext={next} />
      </>
    );
  const failed = run && ["failed", "cancelled"].includes(run.status);
  const active = run && ["queued", "running"].includes(run.status);
  const detected = [
    ...new Map(pages.map((page) => [page.page_type, page])).values(),
  ].slice(0, 6);
  const timeline = [
    {
      label: "Checking crawl permissions",
      done: Boolean(run),
      detail: run ? "Confirmed" : "Waiting",
    },
    {
      label: "Reading robots.txt",
      done: signals.robots || Boolean(run && run.pagesFetched > 0),
      detail: signals.robots
        ? "Detected"
        : active
          ? "Checking"
          : "Could not verify",
    },
    {
      label: "Looking for a sitemap",
      done: signals.sitemap,
      detail: signals.sitemap ? "Detected" : active ? "Checking" : "Not found",
    },
    {
      label: "Discovering pages",
      done: Boolean(run && run.pagesDiscovered > 0),
      detail: run ? `${run.pagesDiscovered} discovered` : "Waiting",
    },
    {
      label: "Reading page titles",
      done: Boolean(run && run.pagesSucceeded > 0),
      detail: run ? `${run.pagesSucceeded} analysed` : "Waiting",
    },
    {
      label: "Checking basic SEO signals",
      done: Boolean(run && finalStates.has(run.status)),
      detail: run?.status.replaceAll("_", " ") || "Waiting",
    },
  ];
  async function retry() {
    if (snapshot?.website)
      await mutateRecord(`/api/websites/${snapshot.website.id}/crawl`, "POST", {
        acknowledged: true,
        trigger: "retry",
      });
  }
  return (
    <>
      <StepIntro
        eyebrow="Live website analysis"
        title={`Learning how ${data.businessName} is organised.`}
        description="A separate low-rate worker is reading public HTML. You can continue while it runs and return later."
      />
      {error && (
        <p role="alert" className="mb-4 text-sm text-[var(--error)]">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[#f0f1ed] px-4 py-3">
            <Globe2 size={17} className="text-[var(--accent)]" />
            <div className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-1.5 text-xs text-[var(--muted)]">
              {data.websiteUrl}
            </div>
          </div>
          <div className="soft-grid min-h-[360px] p-6">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {run?.status === "queued"
                      ? "Analysis queued"
                      : run?.status === "running"
                        ? "Analysis in progress"
                        : failed
                          ? "Analysis needs attention"
                          : "Website overview ready"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {run
                      ? `${run.pagesFetched} pages analysed · ${run.pagesDiscovered} discovered`
                      : "Preparing the crawl request"}
                  </p>
                </div>
                {active && (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--success)]" />
                )}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {detected.length ? (
                  detected.map((page) => (
                    <div
                      key={page.id}
                      className="rounded-xl border border-[var(--border)] bg-[#f7f7f3] p-3 text-center"
                    >
                      <LayoutTemplate
                        className="mx-auto text-[var(--accent)]"
                        size={18}
                      />
                      <p className="mt-2 truncate text-xs font-semibold">
                        {page.page_type.replaceAll("_", " ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
                    Detected page types will appear here after the worker
                    fetches them.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">
            Discovery timeline
          </p>
          <div className="mt-5 space-y-2" aria-live="polite">
            {timeline.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
              >
                <span
                  className={
                    item.done ? "text-[var(--success)]" : "text-[var(--muted)]"
                  }
                >
                  {item.done ? (
                    <CheckCircle2 size={18} />
                  ) : failed ? (
                    <TriangleAlert size={18} />
                  ) : (
                    <CircleDot size={18} />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {item.label}
                </span>
                <Badge tone={item.done ? "green" : failed ? "red" : "amber"}>
                  {item.detail}
                </Badge>
              </div>
            ))}
          </div>
          {failed && (
            <Button
              className="mt-5"
              variant="secondary"
              disabled={saving}
              onClick={retry}
            >
              Retry analysis
            </Button>
          )}
          {run?.status === "queued" && (
            <p className="mt-4 rounded-xl bg-[#fcf2df] p-3 text-sm text-[#765020]">
              The request is safely queued. If it remains here for several
              minutes, the crawler may be temporarily unavailable.
            </p>
          )}
        </Card>
      </div>
      <OnboardingNavigation back={back} onNext={next} />
    </>
  );
}
