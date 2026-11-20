import { describe, expect, it } from "vitest";
import { QUESTIONS, checkMessage, evaluate, isCompleteAnswers, levelFor, programSlug } from "./check";

const all = (v: number) => QUESTIONS.map(() => v);

describe("Spieler-Check", () => {
  it("hat je 6 Fragen zu Technik und Taktik", () => {
    expect(QUESTIONS).toHaveLength(12);
    expect(QUESTIONS.filter((q) => q.area === "technik")).toHaveLength(6);
    expect(new Set(QUESTIONS.map((q) => q.key)).size).toBe(12);
  });

  it("ordnet die Punkte einem Niveau zu", () => {
    expect(levelFor(0)).toBe("einsteiger");
    expect(levelFor(9)).toBe("einsteiger");
    expect(levelFor(10)).toBe("mittel");
    expect(levelFor(17)).toBe("mittel");
    expect(levelFor(18)).toBe("fortgeschritten");
    expect(levelFor(24)).toBe("fortgeschritten");
  });

  it("wertet Technik und Taktik getrennt aus", () => {
    const answers = [...QUESTIONS.slice(0, 6).map(() => 2), ...QUESTIONS.slice(6).map(() => 0)];
    const r = evaluate(answers);
    expect(r).toMatchObject({ score: 12, technik: 12, taktik: 0, level: "mittel" });
    expect(r.strengths).toHaveLength(6);
    expect(r.focus).toEqual(["Schulterblick", "Freilaufen", "Entscheidungen"]);
  });

  it("nennt ohne Schwächen keine Trainingsfelder", () => {
    expect(evaluate(all(2)).focus).toEqual([]);
    expect(evaluate(all(2)).level).toBe("fortgeschritten");
  });

  it("prüft vollständige Antworten", () => {
    expect(isCompleteAnswers(all(1))).toBe(true);
    expect(isCompleteAnswers(all(1).slice(1))).toBe(false);
    expect(isCompleteAnswers([...all(1).slice(1), 3])).toBe(false);
    expect(isCompleteAnswers("0,1")).toBe(false);
  });

  it("baut Shop-Adresse und WhatsApp-Nachricht", () => {
    expect(programSlug("mittel")).toBe("winterpause-mittel");
    const msg = checkMessage(evaluate(all(0)));
    expect(msg).toContain("Einsteiger (0/24");
    expect(msg).toContain("Probetraining");
  });
});
