import { Agent, request } from "undici";
import type { LookupFunction } from "node:net";
import { CrawlError } from "./errors.js";
import { normaliseCrawlUrl } from "./url-normalisation.js";
import { isWithinCrawlScope } from "./url-scope.js";
import { resolvePublicAddresses } from "./dns-security.js";
import type { FetchResult } from "./crawl-result.js";

export type SafeHttpOptions = {
  userAgent: string;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  startUrl: string;
  accept: string;
};
function dispatcher() {
  const safeLookup: LookupFunction = (hostname, _options, callback) => {
    void resolvePublicAddresses(hostname)
      .then((records) => callback(null, records[0].address, records[0].family))
      .catch((error) => callback(error as Error, "", 4));
  };
  return new Agent({ connect: { lookup: safeLookup, timeout: 10_000 } });
}
export async function safeFetch(
  input: string,
  options: SafeHttpOptions,
): Promise<FetchResult> {
  let current = normaliseCrawlUrl(input);
  let redirects = 0;
  let transientAttempts = 0;
  const agent = dispatcher();
  const started = Date.now();
  try {
    while (true) {
      const url = new URL(current);
      await resolvePublicAddresses(url.hostname);
      const response = await request(current, {
        dispatcher: agent,
        method: "GET",
        headers: {
          "user-agent": options.userAgent,
          accept: options.accept,
          "accept-encoding": "identity",
        },
        headersTimeout: options.timeoutMs,
        bodyTimeout: options.timeoutMs,
      });
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        if (redirects >= options.maxRedirects)
          throw new CrawlError(
            "too_many_redirects",
            "The website redirected too many times.",
            "invalid_response",
          );
        const next = normaliseCrawlUrl(
          String(response.headers.location),
          current,
        );
        if (!isWithinCrawlScope(next, options.startUrl))
          throw new CrawlError(
            "redirect_out_of_scope",
            "The website redirected outside the allowed site scope.",
            "security_blocked",
          );
        current = next;
        redirects++;
        continue;
      }
      if (
        [429, 502, 503, 504].includes(response.statusCode) &&
        transientAttempts < 2
      ) {
        await response.body.dump();
        const retryAfter = Number(response.headers["retry-after"] || 0);
        const wait =
          retryAfter > 0 && retryAfter < 30
            ? retryAfter * 1000
            : Math.min(
                5000,
                500 * 2 ** transientAttempts + Math.floor(Math.random() * 250),
              );
        transientAttempts++;
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      if (response.statusCode === 429)
        throw new CrawlError(
          "rate_limited",
          "The website repeatedly asked the crawler to slow down.",
          "rate_limited",
          true,
        );
      const declared = Number(response.headers["content-length"] || 0);
      if (declared > options.maxBytes)
        throw new CrawlError(
          "response_too_large",
          "A website response exceeded the crawler size limit.",
          "size_exceeded",
        );
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        const bytes =
          chunk instanceof Uint8Array
            ? chunk
            : new Uint8Array(chunk as ArrayBuffer);
        size += bytes.byteLength;
        if (size > options.maxBytes)
          throw new CrawlError(
            "response_too_large",
            "A website response exceeded the crawler size limit.",
            "size_exceeded",
          );
        chunks.push(bytes);
      }
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const rawType = String(
        response.headers["content-type"] || "",
      ).toLowerCase();
      return {
        requestedUrl: input,
        finalUrl: current,
        status: response.statusCode,
        contentType: rawType.split(";")[0].trim(),
        body,
        responseTimeMs: Date.now() - started,
        responseBytes: size,
        redirectCount: redirects,
        xRobotsTag: String(response.headers["x-robots-tag"] || "")
          .toLowerCase()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
    }
  } finally {
    await agent.close();
  }
}
