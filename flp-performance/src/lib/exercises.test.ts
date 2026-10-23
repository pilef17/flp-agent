import { describe, expect, it } from "vitest";
import { dosage, isMediaPathFor, mediaPath, nextExerciseCode } from "./exercises";
import { exerciseSchema, sessionExerciseSchema } from "./validation";

const ID = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("Übungs-IDs", () => {
  it("vergibt die nächste Nummer je Kategorie", () => {
    expect(nextExerciseCode("technik", [])).toBe("TEC-001");
    expect(nextExerciseCode("technik", ["TEC-001", "TEC-009", "KOO-020"])).toBe("TEC-010");
    expect(nextExerciseCode("koordination", ["TEC-001", "KOO-020"])).toBe("KOO-021");
  });
});

describe("Dosierung", () => {
  it("formatiert Serien, Dauer und Pause", () => {
    expect(dosage({ sets: 3, repetitions: 10, rest_seconds: 30 })).toBe("3 × 10 · Pause 30 Sek.");
    expect(dosage({ duration_seconds: 90 })).toBe("1 Min. 30 Sek.");
    expect(dosage({})).toBe("");
  });
});

describe("Medienpfade", () => {
  it("erzeugt Pfade nur im Ordner der Übung", () => {
    const p = mediaPath(ID, "../../etc/passwd.MP4", "0b8f2f86-0d0b-4f7c-8f86-9f0c4d1b2a3c");
    expect(p).toBe(`${ID}/0b8f2f86-0d0b-4f7c-8f86-9f0c4d1b2a3c.mp4`);
    expect(isMediaPathFor(ID, p)).toBe(true);
  });
  it("lehnt fremde oder manipulierte Pfade ab", () => {
    expect(isMediaPathFor(ID, `other/0b8f2f86-0d0b-4f7c-8f86-9f0c4d1b2a3c.mp4`)).toBe(false);
    expect(isMediaPathFor(ID, `${ID}/../x.mp4`)).toBe(false);
  });
});

describe("Formulare Phase 2", () => {
  it("akzeptiert leere optionale Zahlen und prüft Altersbereich", () => {
    const base = { title: "Slalom", category: "dribbling", ageMin: "8", ageMax: "12", difficulty: "2", sets: "", repetitions: "10" };
    const ok = exerciseSchema.safeParse(base);
    expect(ok.success && ok.data.sets).toBe(null);
    expect(ok.success && ok.data.repetitions).toBe(10);
    expect(exerciseSchema.safeParse({ ...base, ageMin: "12", ageMax: "8" }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, category: "golf" }).success).toBe(false);
  });
  it("verlangt eine Übung beim Hinzufügen zur Einheit", () => {
    expect(sessionExerciseSchema.safeParse({ planId: ID, sessionId: ID, exerciseId: "" }).success).toBe(false);
  });
});
