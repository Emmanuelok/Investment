import type { MetadataRoute } from "next";
import { NAV } from "@/lib/nav";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const seen = new Set<string>();
  const routes: MetadataRoute.Sitemap = [];
  for (const group of NAV) {
    for (const it of group.items) {
      if (seen.has(it.href)) continue;
      seen.add(it.href);
      routes.push({
        url: `${base}${it.href}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: it.href === "/" ? 1 : 0.7,
      });
    }
  }
  return routes;
}
