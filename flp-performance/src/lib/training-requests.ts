// Trainingsanfragen: Eltern schlagen Tag, Wunschzeit und Ort vor; der Trainer bestätigt oder sagt ab.
import { z } from "zod";
import { addDays, isIsoDate, shortDate, todayInSwitzerland } from "@/lib/dates";

export const LOCATIONS = ["Hardhof", "Juchhof", "Erlinsbach", "Herznach", "Glattbrugg", "Adliswil"] as const;

export const REQUEST_STATUS = {
  angefragt: { label: "Angefragt", icon: "🕓", tone: "neutral" },
  bestaetigt: { label: "Bestätigt", icon: "✅", tone: "ok" },
  abgelehnt: { label: "Abgesagt", icon: "❌", tone: "danger" },
  erledigt: { label: "Erledigt", icon: "🟡", tone: "gold" },
} as const;
export type RequestStatus = keyof typeof REQUEST_STATUS;

/** Wie weit im Voraus Eltern einen Termin vorschlagen können */
export const MAX_DAYS_AHEAD = 90;

const WEEKDAY = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function weekdayLong(date: string): string {
  return WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/** «Sa 05.12.» */
export function dayLabel(date: string): string {
  return `${WEEKDAY_SHORT[new Date(`${date}T00:00:00Z`).getUTCDay()]} ${shortDate(date)}`;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function requestSchema(today = todayInSwitzerland()) {
  return z.object({
    playerId: z.guid(),
    day: z
      .string()
      .refine(isIsoDate, "Bitte ein Datum wählen.")
      .refine((d) => d >= today, "Bitte ein Datum ab heute wählen.")
      .refine((d) => d <= addDays(today, MAX_DAYS_AHEAD), `Höchstens ${MAX_DAYS_AHEAD} Tage im Voraus.`),
    wishTimes: z.string().transform(clean).pipe(z.string().min(1, "Bitte eine Wunschzeit angeben, z. B. 9:00 / 9:30.").max(60, "Höchstens 60 Zeichen.")),
    location: z.string().transform(clean).pipe(z.string().max(60)),
    note: z.string().transform(clean).pipe(z.string().max(200, "Höchstens 200 Zeichen.")),
  });
}

export const decisionSchema = z.object({
  requestId: z.guid(),
  status: z.enum(["angefragt", "bestaetigt", "abgelehnt", "erledigt"]),
  confirmedTime: z.string().transform(clean).pipe(z.string().max(20)).optional().default(""),
  coachNote: z.string().transform(clean).pipe(z.string().max(200)).optional().default(""),
});

type Req = { day: string; wish_times: string; location: string; note?: string; confirmed_time?: string; status?: string };

/** Kurzzeile wie in der Notizen-Liste: «Liam – 9:00 / 9:30 – Hardhof» */
export function requestLine(name: string, r: Req): string {
  const time = r.status === "bestaetigt" || r.status === "erledigt" ? r.confirmed_time || r.wish_times : r.wish_times;
  return [name, time, r.location].filter(Boolean).join(" – ");
}

/** E-Mail an den Trainer bei einer neuen Anfrage. */
export function newRequestMail(m: { playerName: string; parentName: string } & Req, siteUrl: string) {
  const subject = `Terminanfrage: ${m.playerName} – ${dayLabel(m.day)} ${m.wish_times}`.replace(/[\r\n]+/g, " ");
  const text = [
    `${m.parentName || "Ein Elternteil"} schlägt einen Trainingstermin vor.`,
    ``,
    `Spieler: ${m.playerName}`,
    `Tag: ${weekdayLong(m.day)}, ${shortDate(m.day)}`,
    `Wunschzeit: ${m.wish_times}`,
    `Ort: ${m.location || "keine Angabe"}`,
    ...(m.note ? [`Bemerkung: ${m.note}`] : []),
    ``,
    `Bestätigen oder absagen: ${siteUrl}/admin/agenda?w=${m.day}`,
  ].join("\n");
  return { subject, text };
}

/** E-Mail an die Eltern, wenn der Trainer bestätigt oder absagt. */
export function decisionMail(m: { playerName: string; status: RequestStatus; coachNote?: string } & Req, siteUrl: string) {
  const ok = m.status === "bestaetigt";
  const subject = `${ok ? "Training bestätigt" : "Training abgesagt"}: ${m.playerName} – ${dayLabel(m.day)}`.replace(/[\r\n]+/g, " ");
  const text = [
    ok
      ? `Felipe hat das Training von ${m.playerName} bestätigt.`
      : `Felipe kann das gewünschte Training von ${m.playerName} leider nicht anbieten.`,
    ``,
    `Tag: ${weekdayLong(m.day)}, ${shortDate(m.day)}`,
    `Zeit: ${ok ? m.confirmed_time || m.wish_times : m.wish_times}`,
    ...(m.location ? [`Ort: ${m.location}`] : []),
    ...(m.coachNote ? [`Nachricht: ${m.coachNote}`] : []),
    ``,
    ok ? `Alle Termine: ${siteUrl}/elternbereich` : `Einen anderen Termin vorschlagen: ${siteUrl}/elternbereich`,
  ].join("\n");
  return { subject, text };
}
