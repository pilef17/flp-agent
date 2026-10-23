const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
const chfFmt = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });

export function formatDate(value: string | Date): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function formatChf(cents: number): string {
  return chfFmt.format(cents / 100);
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}
