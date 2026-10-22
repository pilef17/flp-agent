/** «39», «39.00», «39,50», «CHF 39.-» → Rappen. null bei ungültiger Eingabe. */
export function parseChf(input: string): number | null {
  const cleaned = input.replace(/chf/i, "").replace(/[\s'’]/g, "").replace(/\.-$/, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number.parseFloat(cleaned) * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function accessLabel(days: number | null): string {
  if (!days) return "Unbefristeter Zugang";
  if (days % 365 === 0) return days === 365 ? "12 Monate Zugang" : `${days / 365} Jahre Zugang`;
  if (days % 30 === 0) return days === 30 ? "1 Monat Zugang" : `${days / 30} Monate Zugang`;
  return `${days} Tage Zugang`;
}

export type EntitlementLike = { starts_at: string; ends_at: string | null; revoked_at: string | null };

export function isEntitlementActive(e: EntitlementLike, now = new Date()): boolean {
  if (e.revoked_at) return false;
  if (new Date(e.starts_at) > now) return false;
  return e.ends_at === null || new Date(e.ends_at) > now;
}

export const ORDER_STATUS_LABEL = {
  pending: "Offen",
  paid: "Bezahlt",
  failed: "Fehlgeschlagen",
  canceled: "Abgebrochen",
  refunded: "Rückerstattet",
} as const;

export const SLUG_PATTERN = /^[a-z0-9-]{2,60}$/;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
