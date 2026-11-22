/**
 * Spieler-Check für Eltern: 12 Fragen (6 Technik, 6 Taktik), je 0–2 Punkte.
 * Ergebnis: Einsteiger (0–9), Mittel (10–17), Fortgeschritten (18–24).
 */

export type Area = "technik" | "taktik";

export type CheckQuestion = {
  key: string;
  area: Area;
  /** Kurzer Name des Bereichs für Stärken und Trainingsfelder */
  topic: string;
  question: string;
  /** Antworten mit 0, 1 und 2 Punkten */
  options: [string, string, string];
};

export const QUESTIONS: CheckQuestion[] = [
  {
    key: "jonglieren",
    area: "technik",
    topic: "Ballgefühl",
    question: "Wie oft kann Ihr Kind den Ball hintereinander jonglieren?",
    options: ["Weniger als 10 Mal", "10 bis 50 Mal", "Mehr als 50 Mal"],
  },
  {
    key: "schwacher-fuss",
    area: "technik",
    topic: "Schwacher Fuss",
    question: "Nutzt Ihr Kind im Spiel auch den schwächeren Fuss?",
    options: ["Fast nie", "Manchmal", "Regelmässig, für Pass und Schuss"],
  },
  {
    key: "ballannahme",
    area: "technik",
    topic: "Ballannahme",
    question: "Bleibt der Ball nach der Annahme nah am Fuss?",
    options: ["Er springt oft weg", "Meistens, im Stand", "Fast immer, auch in Bewegung"],
  },
  {
    key: "dribbling",
    area: "technik",
    topic: "Dribbling im 1 gegen 1",
    question: "Traut sich Ihr Kind ins Dribbling gegen einen Gegenspieler?",
    options: ["Selten, es gibt lieber ab", "Manchmal, mit einer Finte", "Oft, mit verschiedenen Finten"],
  },
  {
    key: "tempo",
    area: "technik",
    topic: "Tempo mit Ball",
    question: "Behält Ihr Kind den Ball, wenn es schnell dribbelt?",
    options: ["Es verliert ihn oft", "Manchmal", "Fast immer"],
  },
  {
    key: "passen",
    area: "technik",
    topic: "Passen",
    question: "Kommen die Pässe Ihres Kindes genau beim Mitspieler an?",
    options: ["Eher selten", "Kurze Pässe ja", "Auch lange und flache Pässe"],
  },
  {
    key: "schulterblick",
    area: "taktik",
    topic: "Schulterblick",
    question: "Schaut Ihr Kind über die Schulter, bevor der Ball zu ihm kommt?",
    options: ["Nie", "Manchmal", "Fast immer"],
  },
  {
    key: "freilaufen",
    area: "taktik",
    topic: "Freilaufen",
    question: "Bietet sich Ihr Kind an, wenn ein Mitspieler den Ball hat?",
    options: ["Es wartet eher ab", "Manchmal", "Es sucht aktiv den freien Raum"],
  },
  {
    key: "entscheidung",
    area: "taktik",
    topic: "Entscheidungen",
    question: "Weiss Ihr Kind, wann es dribbeln und wann es passen soll?",
    options: ["Oft nicht", "Teilweise", "Meistens ja"],
  },
  {
    key: "ballverlust",
    area: "taktik",
    topic: "Verhalten nach Ballverlust",
    question: "Wie reagiert Ihr Kind, wenn es den Ball verliert?",
    options: ["Es bleibt stehen oder ärgert sich", "Es läuft manchmal zurück", "Es setzt sofort nach"],
  },
  {
    key: "position",
    area: "taktik",
    topic: "Aufgaben auf der Position",
    question: "Kennt Ihr Kind seine Aufgaben auf seiner Position?",
    options: ["Kaum", "Die Grundlagen", "Gut, auch ohne Ball"],
  },
  {
    key: "kommunikation",
    area: "taktik",
    topic: "Kommunikation",
    question: "Spricht Ihr Kind auf dem Platz mit seinen Mitspielern?",
    options: ["Fast nie", "Manchmal", "Oft, es ruft und coacht"],
  },
];

export const LEVELS = {
  einsteiger: {
    label: "Einsteiger",
    text: "Ihr Kind baut gerade die Grundlagen auf. Mit regelmässigem Training zuhause macht es jetzt die grössten Fortschritte: Ballgefühl, beide Füsse und erste Finten.",
  },
  mittel: {
    label: "Mittel",
    text: "Ihr Kind hat eine solide Basis. Jetzt geht es um Tempo mit Ball, mehr Finten und bessere Entscheidungen im 1 gegen 1.",
  },
  fortgeschritten: {
    label: "Fortgeschritten",
    text: "Ihr Kind spielt auf einem hohen Niveau. Der nächste Schritt sind Kombinationen aus Finten, Tempo unter Druck und Spielintelligenz.",
  },
} as const;

export type Level = keyof typeof LEVELS;
export const LEVEL_KEYS = Object.keys(LEVELS) as Level[];

/** Antworten in der Reihenfolge von QUESTIONS, je 0, 1 oder 2. */
export type Answers = number[];

export function isCompleteAnswers(value: unknown): value is Answers {
  return Array.isArray(value) && value.length === QUESTIONS.length && value.every((v) => v === 0 || v === 1 || v === 2);
}

export function levelFor(score: number): Level {
  if (score >= 18) return "fortgeschritten";
  if (score >= 10) return "mittel";
  return "einsteiger";
}

export type CheckResult = {
  score: number;
  technik: number;
  taktik: number;
  level: Level;
  /** Bereiche mit voller Punktzahl */
  strengths: string[];
  /** Bereiche mit den wenigsten Punkten, höchstens drei */
  focus: string[];
};

export function evaluate(answers: Answers): CheckResult {
  const sum = (area: Area) => QUESTIONS.reduce((n, q, i) => n + (q.area === area ? answers[i] : 0), 0);
  const technik = sum("technik");
  const taktik = sum("taktik");
  const score = technik + taktik;
  const strengths = QUESTIONS.filter((_, i) => answers[i] === 2).map((q) => q.topic);
  const weakest = Math.min(...answers);
  const focus = weakest === 2 ? [] : QUESTIONS.filter((_, i) => answers[i] === weakest).map((q) => q.topic).slice(0, 3);
  return { score, technik, taktik, level: levelFor(score), strengths, focus };
}

/** Shop-Adresse des Winterpause-Programms für ein Niveau. */
export function programSlug(level: Level): string {
  return `winterpause-${level}`;
}

/** Vorbereitete WhatsApp-Nachricht der Eltern an den Trainer. */
export function checkMessage(r: CheckResult): string {
  return [
    "Hallo Felipe, wir haben den FLP Spieler-Check gemacht.",
    `Ergebnis: ${LEVELS[r.level].label} (${r.score}/24 · Technik ${r.technik}/12 · Taktik ${r.taktik}/12)`,
    r.focus.length ? `Trainingsfelder: ${r.focus.join(", ")}` : "",
    "Wir interessieren uns für ein Probetraining.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type LeadInfo = { parentName: string; email: string; childAge: number | null; position: string };

/** E-Mail an den Trainer bei einer neuen Kontaktanfrage aus dem Check (reiner Text, ohne Antwortdetails). */
export function leadNotification(lead: LeadInfo, r: CheckResult, siteUrl: string): { subject: string; text: string } {
  const child = [lead.childAge ? `${lead.childAge} Jahre` : null, lead.position || null].filter(Boolean).join(", ");
  const subject = `Neue Anfrage Spieler-Check: ${lead.parentName} – ${LEVELS[r.level].label}`.replace(/[\r\n]+/g, " ");
  const text = [
    `Neue Kontaktanfrage aus dem Spieler-Check.`,
    ``,
    `Name: ${lead.parentName}`,
    `E-Mail: ${lead.email}`,
    `Kind: ${child || "keine Angabe"}`,
    ``,
    `Niveau: ${LEVELS[r.level].label} (${r.score}/24 · Technik ${r.technik}/12 · Taktik ${r.taktik}/12)`,
    `Jetzt trainieren: ${r.focus.length ? r.focus.join(", ") : "überall volle Punktzahl"}`,
    ``,
    `Antworten Sie direkt auf diese E-Mail, um die Familie zu kontaktieren.`,
    `Alle Anfragen: ${siteUrl}/admin/check`,
  ].join("\n");
  return { subject, text };
}
