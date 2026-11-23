import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/check`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/programme`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
