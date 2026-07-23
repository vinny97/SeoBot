import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("Next.js integration", () => {
  it("normalises only public HTTPS website endpoints", () => {
    const client = readFileSync(new URL("../lib/publishing/nextjs/nextjs-client.ts", import.meta.url), "utf8");
    expect(client).toContain("url.protocol !== \"https:\"");
    expect(client).toContain("url.username || url.password");
    expect(client).toContain("url.port !== \"443\"");
    expect(client).toContain('url.search = ""');
    expect(client).toContain('url.hash = ""');
  });

  it("keeps the token server-only and encrypts it before storage", () => {
    const connection = readFileSync(new URL("../lib/publishing/nextjs/nextjs-connections.ts", import.meta.url), "utf8");
    const migration = readFileSync(new URL("../supabase/migrations/202607230002_nextjs_publishing.sql", import.meta.url), "utf8");
    expect(connection).toContain('provider:"nextjs"');
    expect(connection).toContain("encryptCredentialJson");
    expect(connection).toContain("decryptCredentialJson");
    expect(connection).not.toContain("NEXT_PUBLIC_");
    expect(migration).toContain("connection_method = 'api_token'");
    expect(migration).toContain("revoke all");
  });

  it("requires authenticated health responses and public DNS resolution", () => {
    const client = readFileSync(new URL("../lib/publishing/nextjs/nextjs-client.ts", import.meta.url), "utf8");
    expect(client).toContain('authorization: `Bearer ${apiToken}`');
    expect(client).toContain("resolvePublicAddresses(url.hostname)");
    expect(client).toContain("createPublicLookup()");
    expect(client).toContain("capabilities?.drafts !== true");
  });
});
