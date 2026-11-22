import { describe, expect, it } from "vitest";
import { QUESTIONS, checkMessage, evaluate, isCompleteAnswers, leadNotification, levelFor, programSlug } from "./check";

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

describe("Benachrichtigung an den Trainer", () => {
  it("enthält Kontakt, Niveau und Trainingsfelder", () => {
    const r = evaluate([...QUESTIONS.slice(0, 6).map(() => 2), ...QUESTIONS.slice(6).map(() => 0)]);
    const m = leadNotification({ parentName: "Anna Muster", email: "anna@example.ch", childAge: 11, position: "Flügel", team: "FC Baden D" }, r, "https://flp.example");
    expect(m.subject).toBe("Neue Anfrage Spieler-Check: Anna Muster – Mittel");
    expect(m.text).toContain("E-Mail: anna@example.ch");
    expect(m.text).toContain("Kind: 11 Jahre, Flügel");
    expect(m.text).toContain("Verein / Team: FC Baden D");
    expect(m.text).toContain("Mittel (12/24");
    expect(m.text).toContain("Schulterblick");
    expect(m.text).toContain("https://flp.example/admin/check");
  });
  it("kommt ohne Alter und Position aus und lässt keine Zeilenumbrüche in den Betreff", () => {
    const m = leadNotification({ parentName: "A\nB", email: "a@b.ch", childAge: null, position: "" }, evaluate(QUESTIONS.map(() => 2)), "x");
    expect(m.subject).not.toMatch(/\n/);
    expect(m.text).toContain("Kind: keine Angabe");
    expect(m.text).toContain("überall volle Punktzahl");
  });
});
