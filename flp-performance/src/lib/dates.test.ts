import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, mondayOf, todayInSwitzerland, weekDays } from "./dates";

describe("Datumslogik", () => {
  it("findet den Montag der Woche", () => {
    expect(mondayOf("2026-10-22")).toBe("2026-10-19"); // Donnerstag
    expect(mondayOf("2026-10-19")).toBe("2026-10-19"); // Montag
    expect(mondayOf("2026-10-25")).toBe("2026-10-19"); // Sonntag
    expect(mondayOf("2027-01-01")).toBe("2026-12-28"); // Jahreswechsel
  });
  it("addiert Tage über Monats- und Zeitumstellungsgrenzen", () => {
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26"); // Ende Sommerzeit
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(weekDays("2026-10-19")).toHaveLength(7);
    expect(weekDays("2026-10-19").at(-1)).toBe("2026-10-25");
  });
  it("validiert ISO-Daten streng", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("2026-10-22")).toBe(true);
    expect(isIsoDate(null)).toBe(false);
  });
  it("verwendet Schweizer Zeit für «heute»", () => {
    // 23:30 UTC am 22.10. ist in Zürich bereits der 23.10.
    expect(todayInSwitzerland(new Date("2026-10-22T23:30:00Z"))).toBe("2026-10-23");
  });
});
