import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/config/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  return ["", "/how-it-works", "/capabilities", "/integrations", "/pricing", "/security", "/resources"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.7 : 1,
  }));
}
