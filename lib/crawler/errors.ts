export type CrawlErrorKind="transient"|"permanent"|"cancelled"|"security_blocked"|"robots_blocked"|"rate_limited"|"invalid_response"|"size_exceeded";
export class CrawlError extends Error { constructor(public readonly code:string,message:string,public readonly kind:CrawlErrorKind,public readonly retryable=false){super(message);this.name="CrawlError"} }
export function safeErrorMessage(error:unknown){return error instanceof CrawlError?error.message:"The crawler could not complete this website analysis."}
