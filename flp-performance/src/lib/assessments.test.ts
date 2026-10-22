import { describe, expect, it } from "vitest";
import { initialAndCurrent, type AssessmentRow } from "./assessments";

const categories = [
  { id: "c1", name: "Technik", position: 1 },
  { id: "c2", name: "Koordination", position: 2 },
];

const row = (id: string, kind: "initial" | "regular", date: string, status: "draft" | "published", scores: (number | null)[]): AssessmentRow => ({
  id,
  kind,
  assessed_on: date,
  status,
  assessment_scores: scores.map((score, i) => ({ category_id: `c${i + 1}`, score })),
});

describe("initialAndCurrent", () => {
  it("liefert nichts ohne veröffentlichte Daten", () => {
    expect(initialAndCurrent(categories, [row("a", "initial", "2026-01-01", "draft", [2, 2])])).toEqual({ initial: null, current: null });
  });
  it("trennt Erstbeurteilung und neueste Beurteilung", () => {
    const res = initialAndCurrent(categories, [
      row("b", "regular", "2026-06-01", "published", [4, null]),
      row("a", "initial", "2026-01-01", "published", [2, 3]),
      row("c", "regular", "2026-09-01", "draft", [5, 5]),
    ]);
    expect(res.initial?.values).toEqual([2, 3]);
    expect(res.current?.values).toEqual([4, null]); // null bleibt null – nie 0
    expect(res.current?.date).toBe("2026-06-01");
  });
  it("zeigt nur Erstbeurteilung, wenn sie die einzige ist", () => {
    const res = initialAndCurrent(categories, [row("a", "initial", "2026-01-01", "published", [2, 3])]);
    expect(res.initial).not.toBeNull();
    expect(res.current).toBeNull();
  });
});
