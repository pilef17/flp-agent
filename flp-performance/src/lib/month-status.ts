// Monatsplanung: Eltern melden pro Monat, ob ihr Kind aktiv trainiert oder pausiert.
import { z } from "zod";
import { addDays, isIsoDate, shortDate, todayInSwitzerland } from "@/lib/dates";

export const PAUSE_REASONS = {
  ferien: "Ferien",
  verletzung: "Verletzung",
  schule: "Schule",
  anderes: "Anderes",
} as const;
export type PauseReason = keyof typeof PAUSE_REASONS;

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Erster Tag des Monats (YYYY-MM-01) für ein Datum YYYY-MM-DD. */
export function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function currentMonth(now = new Date()): string {
  return monthOf(todayInSwitzerland(now));
}

/** Monat verschieben, z. B. shiftMonth("2026-12-01", 1) = "2027-01-01". */
export function shiftMonth(month: string, delta: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(month: string): string {
  return `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** Gültiger Monatsparameter (YYYY-MM) oder null. */
export function parseMonthParam(v: string | undefined | null): string | null {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? `${v}-01` : null;
}

/** Alle Tage eines Monats (YYYY-MM-DD). */
export function daysOfMonth(month: string): string[] {
  const out: string[] = [];
  for (let d = month; d.slice(0, 7) === month.slice(0, 7); d = addDays(d, 1)) out.push(d);
  return out;
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function weekdayShort(date: string): string {
  return WEEKDAY_SHORT[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/** «Mi 03.12.» */
export function dayLabel(date: string): string {
  return `${weekdayShort(date)} ${shortDate(date)}`;
}

export const monthStatusSchema = z
  .object({
    playerId: z.guid(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/),
    active: z.enum(["true", "false"]).transform((v) => v === "true"),
    reason: z.enum(["", "ferien", "verletzung", "schule", "anderes"]).optional().default(""),
    note: z.string().trim().max(200).optional().default(""),
    /** Kommagetrennte Wunschtermine, z. B. «2026-12-03,2026-12-10» */
    dates: z.string().max(400).optional().default(""),
  })
  .transform((v) => ({ ...v, dates: [...new Set(v.dates.split(",").map((d) => d.trim()).filter(Boolean))].sort() }))
  .refine((v) => v.active || v.reason !== "", { message: "Bitte einen Grund wählen.", path: ["reason"] })
  .refine((v) => v.dates.every((d) => isIsoDate(d) && d.slice(0, 7) === v.month.slice(0, 7)), {
    message: "Bitte nur Tage aus diesem Monat wählen.",
    path: ["dates"],
  })
  .transform((v) => (v.active ? { ...v, reason: "" as const, note: "" } : { ...v, dates: [] as string[] }));

export function statusLabel(s: { active: boolean; reason: string } | null | undefined): string {
  if (!s) return "Offen";
  return s.active ? "Aktiv" : `Pausiert · ${PAUSE_REASONS[s.reason as PauseReason] ?? "Anderes"}`;
}

/** E-Mail an den Trainer, wenn Eltern einen Status melden. */
export function monthStatusNotification(
  m: { playerName: string; parentName: string; month: string; active: boolean; reason: string; note: string; dates?: string[] },
  siteUrl: string,
): { subject: string; text: string } {
  const label = statusLabel(m);
  const subject = `Monatsstatus ${monthLabel(m.month)}: ${m.playerName} – ${label}`.replace(/[\r\n]+/g, " ");
  const text = [
    `${m.parentName || "Ein Elternteil"} hat den Status für ${monthLabel(m.month)} gemeldet.`,
    ``,
    `Spieler: ${m.playerName}`,
    `Status: ${label}`,
    ...(m.note ? [`Bemerkung: ${m.note}`] : []),
    ...(m.active ? [`Wunschtermine: ${m.dates?.length ? m.dates.map(dayLabel).join(", ") : "noch keine"}`] : []),
    ``,
    `Monatsplanung: ${siteUrl}/admin/monat?m=${m.month.slice(0, 7)}`,
  ].join("\n");
  return { subject, text };
}
