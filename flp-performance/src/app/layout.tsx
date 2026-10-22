import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FLP Performance", template: "%s · FLP Performance" },
  description: "Individuelles Fussballtraining für junge Spielerinnen und Spieler in der Schweiz.",
  applicationName: "FLP Performance",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "FLP", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#101113",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
