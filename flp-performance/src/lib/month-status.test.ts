import { describe, expect, it } from "vitest";
import { currentMonth, dayLabel, daysOfMonth, monthLabel, monthOf, monthStatusNotification, monthStatusSchema, parseMonthParam, shiftMonth, statusLabel } from "./month-status";

const id = "00000000-0000-4000-8000-000000000001";

describe("Monatsplanung", () => {
  it("rechnet mit Monaten", () => {
    expect(monthOf("2026-12-17")).toBe("2026-12-01");
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonth("2027-01-01", -1)).toBe("2026-12-01");
    expect(monthLabel("2026-03-01")).toBe("März 2026");
    expect(currentMonth(new Date("2026-11-30T23:30:00Z"))).toBe("2026-12-01"); // Schweizer Zeit
  });
  it("prüft den Monatsparameter", () => {
    expect(parseMonthParam("2026-12")).toBe("2026-12-01");
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("x")).toBeNull();
  });
  it("verlangt bei einer Pause einen Grund", () => {
    expect(monthStatusSchema.safeParse({ playerId: id, month: "2026-12-01", active: "false" }).success).toBe(false);
    expect(monthStatusSchema.safeParse({ playerId: id, month: "2026-12-01", active: "false", reason: "ferien" }).success).toBe(true);
  });
  it("verwirft Grund und Bemerkung bei aktiv", () => {
    const r = monthStatusSchema.parse({ playerId: id, month: "2026-12-01", active: "true", reason: "ferien", note: "x" });
    expect(r).toMatchObject({ active: true, reason: "", note: "" });
  });
  it("beschriftet den Status", () => {
    expect(statusLabel(null)).toBe("Offen");
    expect(statusLabel({ active: true, reason: "" })).toBe("Aktiv");
    expect(statusLabel({ active: false, reason: "verletzung" })).toBe("Pausiert · Verletzung");
  });
  it("baut die E-Mail an den Trainer", () => {
    const m = monthStatusNotification(
      { playerName: "Luca Test", parentName: "Anna", month: "2026-12-01", active: false, reason: "verletzung", note: "Knie" },
      "https://flp.example",
    );
    expect(m.subject).toBe("Monatsstatus Dezember 2026: Luca Test – Pausiert · Verletzung");
    expect(m.text).toContain("Bemerkung: Knie");
    expect(m.text).toContain("https://flp.example/admin/monat?m=2026-12");
  });
});

describe("Wunschtermine", () => {
  it("listet die Tage eines Monats", () => {
    expect(daysOfMonth("2026-12-01")).toHaveLength(31);
    expect(daysOfMonth("2027-02-01")).toHaveLength(28);
    expect(dayLabel("2026-12-03")).toBe("Do 03.12.");
  });
  it("übernimmt nur Tage aus dem Monat, sortiert und ohne Doppel", () => {
    const r = monthStatusSchema.parse({ playerId: id, month: "2026-12-01", active: "true", dates: "2026-12-10,2026-12-03,2026-12-10" });
    expect(r.dates).toEqual(["2026-12-03", "2026-12-10"]);
    expect(monthStatusSchema.safeParse({ playerId: id, month: "2026-12-01", active: "true", dates: "2027-01-05" }).success).toBe(false);
    expect(monthStatusSchema.safeParse({ playerId: id, month: "2026-12-01", active: "true", dates: "2026-12-32" }).success).toBe(false);
  });
  it("verwirft Termine bei einer Pause", () => {
    const r = monthStatusSchema.parse({ playerId: id, month: "2026-12-01", active: "false", reason: "ferien", dates: "2026-12-03" });
    expect(r.dates).toEqual([]);
  });
  it("nennt die Termine in der E-Mail", () => {
    const m = monthStatusNotification(
      { playerName: "Luca", parentName: "Anna", month: "2026-12-01", active: true, reason: "", note: "", dates: ["2026-12-03"] },
      "x",
    );
    expect(m.text).toContain("Wunschtermine: Do 03.12.");
  });
});
