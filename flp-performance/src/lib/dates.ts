// Reine Datumslogik auf Basis von «YYYY-MM-DD» (zeitzonenunabhängig, UTC intern).

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Montag der ISO-Woche des Datums. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(date, -offset);
}

/** Heutiges Datum in der Schweiz als YYYY-MM-DD. */
export function todayInSwitzerland(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(now);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const weekdayFmt = new Intl.DateTimeFormat("de-CH", { weekday: "long", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function weekdayName(date: string): string {
  return weekdayFmt.format(new Date(`${date}T00:00:00Z`));
}

export function shortDate(date: string): string {
  return shortFmt.format(new Date(`${date}T00:00:00Z`));
}

export function weekLabel(monday: string): string {
  return `${shortDate(monday)} – ${longFmt.format(new Date(`${addDays(monday, 6)}T00:00:00Z`))}`;
}
