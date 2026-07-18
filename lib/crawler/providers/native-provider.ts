import type { CrawlerProvider } from "./types.js";

export const nativeProviderDescriptor: Pick<
  CrawlerProvider,
  "id" | "capability" | "isAvailable"
> = {
  id: "native",
  capability: "native_crawler",
  async isAvailable() {
    return { available: true, version: "1" };
  },
};
