import { describe, expect, it } from "vitest";
import { weekLabel, athleteKey, cleanName, currentQuestion, questionForDate, thursdayOf, THEMES, WOCHENFRAGE_START } from "./wochenfrage";

describe("Wochenfrage", () => {
  it("wechselt am Donnerstag", () => {
    expect(thursdayOf("2026-11-19")).toBe("2026-11-19"); // Donnerstag
    expect(thursdayOf("2026-11-25")).toBe("2026-11-19"); // Mittwoch danach
    expect(thursdayOf("2026-11-26")).toBe("2026-11-26");
    expect(thursdayOf("2026-11-22")).toBe("2026-11-19"); // Sonntag
  });

  it("startet mit den vier Themen in der verlangten Reihenfolge", () => {
    const weeks = [0, 7, 14, 21].map((d) => questionForDate(new Date(Date.parse(`${WOCHENFRAGE_START}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10)));
    expect(weeks.map((w) => `${w.themeLabel} · ${w.question}`)).toEqual([
      "Mentalität · Hast du nach dem Fehler wieder den Ball gefordert?",
      "Körperliche Fähigkeiten · Bist du beim Bremsen stabil geblieben?",
      "Individuelle Aktionen · Hast du den Ball mit dem Körper geschützt?",
      "Kollektive Aktionen · Hast du dich nach dem Pass freigelaufen?",
    ]);
    expect(weeks.map((w) => w.weekNumber)).toEqual([1, 2, 3, 4]);
  });

  it("wiederholt die Themen ab Woche 5 mit neuen Punkten", () => {
    const w5 = questionForDate("2026-12-17");
    expect(w5.weekNumber).toBe(5);
    expect(w5.theme).toBe("mentalitaet");
    expect(w5.questionKey).toBe("mentalitaet-2");
    expect(w5.question).not.toBe(THEMES[0].questions[0]);
    // Alle Fragen sind kurz genug für Kinder
    for (const t of THEMES) for (const q of t.questions) expect(q.length).toBeLessThanOrEqual(65);
  });

  it("vor dem Start gilt Woche 1, die Serie läuft danach endlos weiter", () => {
    expect(questionForDate("2026-11-17").weekStart).toBe(WOCHENFRAGE_START);
    expect(questionForDate("2026-11-17").weekNumber).toBe(1);
    const late = questionForDate("2028-06-01");
    expect(late.question).toBeTruthy();
  });

  it("verwendet Schweizer Zeit (Donnerstag 00:30 in Zürich)", () => {
    // 25.11.2026 23:30 UTC = 26.11.2026 00:30 in Zürich → Woche 2
    expect(currentQuestion(new Date("2026-11-25T23:30:00Z")).weekNumber).toBe(2);
  });

  it("erkennt dieselbe Person trotz Schreibweise", () => {
    expect(cleanName("  Lio   Muster ")).toBe("Lio Muster");
    expect(athleteKey("LIO  muster")).toBe(athleteKey("lio Muster"));
  });

  it("beschriftet Wochen für den Filter", () => {
    expect(weekLabel("2026-11-26")).toBe("Woche 2 · ab 26.11. · Körperliche Fähigkeiten");
    expect(weekLabel("2026-11-12")).toBe("Vor dem Start · ab 12.11.");
  });
});
