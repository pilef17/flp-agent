import { describe, expect, it } from "vitest";
import {
  coachMessage,
  whatsappNumber,
  answerLabel,
  athleteKey,
  cleanName,
  currentState,
  PLAN,
  stateForDate,
  thursdayOf,
  weekLabel,
  WOCHENFRAGE_START,
} from "./wochenfrage";

describe("Wochenfrage", () => {
  it("wechselt am Donnerstag", () => {
    expect(thursdayOf("2026-11-19")).toBe("2026-11-19"); // Donnerstag
    expect(thursdayOf("2026-11-25")).toBe("2026-11-19"); // Mittwoch danach
    expect(thursdayOf("2026-11-26")).toBe("2026-11-26");
    expect(thursdayOf("2026-11-22")).toBe("2026-11-19"); // Sonntag
  });

  it("hat 12 Wochen, nur Donnerstage, Themen im festen Wechsel", () => {
    expect(PLAN).toHaveLength(12);
    const order = ["mentalitaet", "koerper", "individuell", "kollektiv"];
    PLAN.forEach((w, i) => {
      expect(new Date(`${w.date}T00:00:00Z`).getUTCDay()).toBe(4);
      expect(w.theme).toBe(order[i % 4]);
      // kurz genug für Kinder
      expect(w.question.length).toBeLessThanOrEqual(65);
      expect(w.question.endsWith("?")).toBe(true);
    });
    expect(new Set(PLAN.map((w) => w.question)).size).toBe(12);
  });

  it("zeigt Woche 1 mit Titel, Elternsatz und Auftrag", () => {
    const s = stateForDate("2026-11-20");
    expect(s.status).toBe("active");
    if (s.status !== "active") return;
    expect(s.weekNumber).toBe(1);
    expect(`${s.themeLabel} · ${s.focus}`).toBe("Mentalität · Umgang mit Fehlern");
    expect(s.parentNote).toMatch(/Mut/);
    expect(s.task).toBeTruthy();
    expect(s.nextDate).toBe("2026-11-26");
  });

  it("pausiert über die Feiertage und macht im Januar weiter", () => {
    const xmas = stateForDate("2026-12-25");
    expect(xmas).toEqual({ status: "pause", weekStart: "2026-12-24", nextDate: "2027-01-07" });
    expect(stateForDate("2026-12-31").status).toBe("pause");
    const w5 = stateForDate("2026-12-17");
    expect(w5.status === "active" && w5.nextDate).toBe("2027-01-07");
    const w6 = stateForDate("2027-01-08");
    expect(w6.status === "active" && w6.weekNumber).toBe(6);
  });

  it("vor dem Start gilt Woche 1, nach Woche 12 ist der Zyklus zu Ende", () => {
    const pre = stateForDate("2026-11-17");
    expect(pre.status === "active" && pre.weekStart).toBe(WOCHENFRAGE_START);
    const last = stateForDate("2027-02-24");
    expect(last.status === "active" && last.weekNumber).toBe(12);
    expect(last.status === "active" && last.nextDate).toBeNull();
    expect(stateForDate("2027-02-25").status).toBe("ended");
  });

  it("verwendet Schweizer Zeit (Donnerstag 00:30 in Zürich)", () => {
    // 25.11.2026 23:30 UTC = 26.11.2026 00:30 in Zürich → Woche 2
    const s = currentState(new Date("2026-11-25T23:30:00Z"));
    expect(s.status === "active" && s.weekNumber).toBe(2);
  });

  it("beschriftet Wochen und Antworten", () => {
    expect(weekLabel("2026-11-26")).toBe("Woche 2 · 26.11. · Körperliche Fähigkeiten");
    expect(weekLabel("2026-11-12")).toBe("Vor dem Start · 12.11.");
    expect(answerLabel(4)).toBe("4 · Oft");
    expect(answerLabel(null)).toBe("Nicht geübt");
  });

  it("erkennt dieselbe Person trotz Schreibweise", () => {
    expect(cleanName("  Lio   Muster ")).toBe("Lio Muster");
    expect(athleteKey("LIO  muster")).toBe(athleteKey("lio Muster"));
  });

  it("erklärt jede der vier Säulen", async () => {
    const { THEME_INTRO, THEME_ORDER } = await import("./wochenfrage");
    for (const t of THEME_ORDER) expect(THEME_INTRO[t].length).toBeLessThanOrEqual(80);
  });

  it("normalisiert die WhatsApp-Nummer des Trainers", () => {
    expect(whatsappNumber("+41 79 123 45 67")).toBe("41791234567");
    expect(whatsappNumber("0041 79 123 45 67")).toBe("41791234567");
    expect(whatsappNumber("079 123 45 67")).toBe("41791234567");
    expect(whatsappNumber("")).toBeNull();
    expect(whatsappNumber("123")).toBeNull();
    expect(whatsappNumber(undefined)).toBeNull();
  });

  it("baut die Nachricht an den Trainer", () => {
    expect(
      coachMessage({ weekNumber: 1, title: "Mentalität · Umgang mit Fehlern", question: "Frage?", name: "Lio", age: "11", team: "FC Muster", answer: "4 · Oft" }),
    ).toBe("FLP Wochenfrage · Woche 1\nMentalität · Umgang mit Fehlern\nFrage?\n\nAthlet: Lio\nAlter: 11\nTeam: FC Muster\nAntwort: 4 · Oft");
  });
});
