import type { DetectedIssue } from "../issue-detector.js";

export type CrawlerProviderId = "native" | "siteone";
export type WorkerCapability = "native_crawler" | "siteone_crawler";
export type CrawlCompletionReason =
  | "completed"
  | "page_limit_reached"
  | "time_limit_reached"
  | "provider_stopped"
  | "invalid_report";

export type NormalisedProviderPage = {
  requested_url: string;
  normalised_url: string;
  final_url: string | null;
  path: string;
  page_type: string;
  http_status: number | null;
  content_type: string | null;
  response_time_ms: number | null;
  response_bytes: number | null;
  redirect_count: number;
  title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  robots_meta: string[];
  x_robots_tag: string[];
  indexable: boolean | null;
  indexability_reason: string | null;
  h1_count: number | null;
  h2_count: number | null;
  word_count: number | null;
  language: string | null;
  structured_data_types: string[];
  fetch_error_code: string | null;
  fetch_error_message: string | null;
  headings: Array<{ level: 1 | 2; text: string }>;
};

export type NormalisedIssueObservation = DetectedIssue;

export type ProviderCompletion = {
  status: "completed" | "completed_with_warnings";
  reason: CrawlCompletionReason;
  providerVersion: string;
  metadata: Record<string, unknown>;
  pages: number;
  issues: number;
};

export interface ProviderObservationSink {
  pages(items: NormalisedProviderPage[]): Promise<void>;
  issues(items: NormalisedIssueObservation[]): Promise<void>;
  phase(name: string, counters?: Record<string, number>): Promise<void>;
}

export type CrawlerProviderContext = {
  jobId: string;
  crawlRunId: string;
  projectId: string;
  websiteId: string;
  startUrl: string;
  maxPages: number;
  maxDepth: number;
  signal: AbortSignal;
  sink: ProviderObservationSink;
};

export interface CrawlerProvider {
  readonly id: CrawlerProviderId;
  readonly capability: WorkerCapability;
  isAvailable(): Promise<{ available: boolean; version: string | null; reason?: string }>;
  execute(context: CrawlerProviderContext): Promise<ProviderCompletion>;
}
