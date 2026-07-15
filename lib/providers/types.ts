import type { SeoJob, WebsiteMetadata } from "@/lib/types";

export interface WebsiteAnalysisInput { url: string; domain: string; }
export interface WebsiteAnalysisProvider { analyse(input: WebsiteAnalysisInput): Promise<WebsiteMetadata>; }
export interface CompetitorSuggestion { name: string; url: string; reason: string; source: "demo_suggestion" | "provider"; }
export interface CompetitorDiscoveryInput { industry: string; location?: string; services?: string; }
export interface CompetitorDiscoveryProvider { discover(input: CompetitorDiscoveryInput): Promise<CompetitorSuggestion[]>; }
export interface JobResult { success: boolean; output: Record<string, unknown>; error?: string; }
export interface JobRunner { run(job: SeoJob): Promise<JobResult>; }
export interface KeywordResearchProvider { research(input: { projectId: string }): Promise<unknown[]>; }
export interface RankTrackingProvider { getRankings(projectId: string): Promise<unknown[]>; }
export interface SearchConsoleProvider { getPerformance(projectId: string): Promise<unknown>; }
export interface AnalyticsProvider { getTraffic(projectId: string): Promise<unknown>; }
export interface CompetitorMonitoringProvider { monitor(projectId: string): Promise<unknown>; }
export interface ContentGenerationProvider { generateBrief(input: unknown): Promise<unknown>; }
export interface ContentPublishingProvider { publish(input: unknown): Promise<unknown>; }
export interface IndexingProvider { submit(url: string): Promise<unknown>; }
export interface BacklinkProvider { getLinks(projectId: string): Promise<unknown[]>; }
