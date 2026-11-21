"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Nur öffentliche Seiten zählen (Startseite, Check, Shop) – keine Konten, keine Kinderprofile. */
const PUBLIC = /^\/(check|programme(\/[^/]+)?|wochenfrage)?$/;

export function publicEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (!PUBLIC.test(url.pathname)) return null;
  url.search = ""; // keine Parameter (z. B. Rücksprungadressen) übermitteln
  return { ...event, url: url.toString() };
}

/** Vercel Web Analytics: ohne Cookies, anonymisiert, nur Seitenaufrufe öffentlicher Seiten */
export function PublicAnalytics() {
  return <Analytics beforeSend={publicEvent} />;
}
