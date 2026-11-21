import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

/** Suchmaschinen: nur die öffentlichen Seiten (Startseite, Check, Shop); Konten und Admin bleiben ausgeschlossen. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/elternbereich", "/spieler", "/konto", "/meine-kaeufe", "/programme/*/inhalt", "/auth", "/wochenfrage"],
    },
    sitemap: `${publicEnv.siteUrl()}/sitemap.xml`,
  };
}
