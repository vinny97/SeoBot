export type CrawlSource="start_url"|"sitemap"|"internal_link"|"redirect"|"manual";
export type QueueItem={url:string;normalisedUrl:string;depth:number;source:CrawlSource;parentPageId?:string};
export type ExtractedHeading={level:1|2|3|4|5|6;text:string;position:number};
export type ExtractedLink={targetUrl:string;normalisedTargetUrl:string|null;type:"internal"|"external"|"mailto"|"telephone"|"fragment"|"unsupported";anchorText:string|null;relValues:string[];followed:boolean};
export type ExtractedImage={src:string;alt:string|null;title:string|null};
export type HtmlExtraction={title:string|null;metaDescription:string|null;canonicalUrl:string|null;robotsMeta:string[];language:string|null;headings:ExtractedHeading[];h1Count:number;h2Count:number;wordCount:number;structuredDataTypes:string[];structuredDataValid:boolean;links:ExtractedLink[];mainContent:string;contentHash:string;author:string|null;publishedAt:string|null;modifiedAt:string|null;images:ExtractedImage[];possibleJsRendering:boolean};
export type FetchResult={requestedUrl:string;finalUrl:string;status:number;contentType:string;body:Uint8Array;responseTimeMs:number;responseBytes:number;redirectCount:number;xRobotsTag:string[]};
export type CrawlCounters={pages_discovered:number;pages_queued:number;pages_fetched:number;pages_succeeded:number;pages_failed:number;pages_skipped:number;issues_found:number;progress:number};
