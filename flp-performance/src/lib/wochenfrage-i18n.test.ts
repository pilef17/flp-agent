import { describe, expect, it } from "vitest";
import { PLAN, SCALE_LABEL, THEME_LABEL } from "./wochenfrage";
import { errorText, longThursdayIn, parseLang, translatedWeeks, weekTexts, LANGS, SCALE_TEXT, TEXT, THEME_TEXT } from "./wochenfrage-i18n";

describe("Wochenfrage – Sprachen", () => {
  it("erkennt nur bekannte Sprachen, sonst Deutsch", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("es")).toBe("es");
    expect(parseLang("fr")).toBe("de");
    expect(parseLang(undefined)).toBe("de");
    expect(parseLang(["en"])).toBe("de");
  });

  it("Deutsch bleibt genau wie bisher", () => {
    expect(weekTexts(1, "de")).toEqual({
      focus: PLAN[0].focus,
      question: PLAN[0].question,
      parentNote: PLAN[0].parentNote,
      task: PLAN[0].task,
    });
    expect(TEXT.de.send).toBe("Antwort senden");
    expect(TEXT.de.forParents).toBe("Für Eltern");
    expect(THEME_TEXT.de.mentalitaet.label).toBe(THEME_LABEL.mentalitaet);
    expect(SCALE_TEXT.de).toEqual(SCALE_LABEL);
    expect(longThursdayIn("2026-11-26", "de")).toBe("Donnerstag, 26.11.2026");
  });

  it("hat alle 12 Wochen auf Englisch und Spanisch, kurz genug für Kinder", () => {
    for (const lang of ["en", "es"] as const) {
      expect(translatedWeeks(lang)).toBe(PLAN.length);
      const questions = new Set<string>();
      for (let week = 1; week <= PLAN.length; week++) {
        const w = weekTexts(week, lang);
        expect(w.question.endsWith("?")).toBe(true);
        expect(w.question.length).toBeLessThanOrEqual(65);
        expect(w.focus && w.parentNote && w.task).toBeTruthy();
        expect(w.question).not.toBe(PLAN[week - 1].question);
        questions.add(w.question);
      }
      expect(questions.size).toBe(PLAN.length);
    }
  });

  it("übersetzt Fehler, Themen und Skala in jeder Sprache", () => {
    for (const lang of LANGS) {
      expect(errorText(lang, "name_required")).not.toBe("name_required");
      expect(errorText(lang, "stale")).toBeTruthy();
      expect(Object.keys(THEME_TEXT[lang])).toHaveLength(4);
      expect(Object.keys(SCALE_TEXT[lang])).toHaveLength(6);
    }
    expect(errorText("de", "age_required")).toBe("Bitte gib dein Alter ein.");
    expect(errorText("en", "age_required")).toBe("Please enter your age.");
    expect(errorText("es", "unbekannt")).toBe("unbekannt");
    expect(longThursdayIn("2027-01-07", "es")).toBe("Jueves, 07.01.2027");
  });
});
