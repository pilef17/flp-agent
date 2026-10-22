export type CategoryRow = { id: string; name: string; position: number };
export type AssessmentRow = {
  id: string;
  kind: "initial" | "regular";
  assessed_on: string;
  status: "draft" | "published";
  assessment_scores: { category_id: string; score: number | null }[];
};

export type ScoreSeries = {
  label: string;
  date: string;
  /** Wert je Kategorie (Reihenfolge wie categories); null = nicht beurteilt */
  values: (number | null)[];
};

/**
 * Erstbeurteilung und aktuelle Beurteilung aus echten, veröffentlichten Daten.
 * Es werden keine Werte interpoliert oder erfunden.
 */
export function initialAndCurrent(
  categories: CategoryRow[],
  assessments: AssessmentRow[],
): { initial: ScoreSeries | null; current: ScoreSeries | null } {
  const published = assessments
    .filter((a) => a.status === "published")
    .sort((a, b) => a.assessed_on.localeCompare(b.assessed_on));
  const ordered = [...categories].sort((a, b) => a.position - b.position);
  const toSeries = (a: AssessmentRow, label: string): ScoreSeries => ({
    label,
    date: a.assessed_on,
    values: ordered.map((c) => a.assessment_scores.find((s) => s.category_id === c.id)?.score ?? null),
  });

  const initialRow = published.find((a) => a.kind === "initial") ?? null;
  const latest = published.at(-1) ?? null;
  const initial = initialRow ? toSeries(initialRow, "Erstbeurteilung") : null;
  const current = latest && latest.id !== initialRow?.id ? toSeries(latest, "Aktuell") : null;
  return { initial, current };
}
