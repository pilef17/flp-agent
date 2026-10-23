import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FLP Performance",
    short_name: "FLP",
    description: "Individuelles Fussballtraining – Trainingspläne, Entwicklung und Programme.",
    lang: "de-CH",
    start_url: "/startseite",
    display: "standalone",
    background_color: "#101113",
    theme_color: "#101113",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
