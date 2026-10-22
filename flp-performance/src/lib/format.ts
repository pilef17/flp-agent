const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
const chfFmt = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });

export function formatDate(value: string | Date): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function formatChf(cents: number): string {
  return chfFmt.format(cents / 100);
}

/** Montag der Woche (ISO) als YYYY-MM-DD, in Lokalzeit. */
export function weekStart(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}
