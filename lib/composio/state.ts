import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createCallbackState() {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: hashCallbackState(value) };
}

export function hashCallbackState(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyCallbackState(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashCallbackState(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function buildShopifyCallbackUrl(appUrl: string, connectionId: string, state: string) {
  const url = new URL("/app/integrations/shopify/callback", appUrl);
  url.searchParams.set("connection", connectionId);
  url.searchParams.set("state", state);
  return url.toString();
}
