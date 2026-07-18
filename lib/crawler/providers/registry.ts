import type { CrawlerProvider, CrawlerProviderId } from "./types.js";

export class CrawlerProviderRegistry {
  private readonly providers = new Map<CrawlerProviderId, CrawlerProvider>();

  register(provider: CrawlerProvider) {
    if (this.providers.has(provider.id))
      throw new Error(`Crawler provider ${provider.id} is already registered.`);
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): CrawlerProvider {
    if (id !== "native" && id !== "siteone")
      throw new Error("Unknown crawler provider.");
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Crawler provider ${id} is unavailable.`);
    return provider;
  }

  list() {
    return [...this.providers.values()];
  }
}
