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

export type HistoryPoint = { assessmentId: string; date: string; kind: "initial" | "regular"; score: number | null };

/** Verlauf je Kompetenz über alle veröffentlichten Beurteilungen (chronologisch). */
export function competencyHistory(
  categories: CategoryRow[],
  assessments: AssessmentRow[],
): { category: CategoryRow; points: HistoryPoint[] }[] {
  const published = assessments
    .filter((a) => a.status === "published")
    .sort((a, b) => a.assessed_on.localeCompare(b.assessed_on) || (a.kind === "initial" ? -1 : 1));
  return [...categories]
    .sort((a, b) => a.position - b.position)
    .map((category) => ({
      category,
      points: published.map((a) => ({
        assessmentId: a.id,
        date: a.assessed_on,
        kind: a.kind,
        score: a.assessment_scores.find((s) => s.category_id === category.id)?.score ?? null,
      })),
    }));
}

export type ScoreInput = { categoryId: string; score: number | null; note: string };

/**
 * Liest die Bewertungsfelder (score_<id>, note_<id>) aus dem Formular.
 * «nb» oder leer = nicht beurteilt (null); alles ausser 1–5 ist ungültig.
 */
export function parseScoreForm(
  get: (key: string) => string | null,
  categoryIds: string[],
): { ok: true; scores: ScoreInput[] } | { ok: false; errors: Record<string, string> } {
  const scores: ScoreInput[] = [];
  const errors: Record<string, string> = {};
  for (const id of categoryIds) {
    const raw = (get(`score_${id}`) ?? "").trim();
    const note = (get(`note_${id}`) ?? "").trim();
    let score: number | null = null;
    if (raw !== "" && raw !== "nb") {
      if (!/^[1-5]$/.test(raw)) {
        errors[`score_${id}`] = "Wert 1–5 oder «nicht beurteilt».";
        continue;
      }
      score = Number(raw);
    }
    if (note.length > 1000) {
      errors[`note_${id}`] = "Notiz zu lang (max. 1000 Zeichen).";
      continue;
    }
    scores.push({ categoryId: id, score, note });
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, scores };
}
