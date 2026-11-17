// Wochenfrage: eine kurze Selbsteinschätzung pro Woche, die Familien per WhatsApp erhalten.
// Die Frage wechselt jeden Donnerstag (Schweizer Zeit). Reine Logik, ohne Datenbank.
import { addDays, shortDate, todayInSwitzerland } from "@/lib/dates";

/** Erster Donnerstag der Serie = Woche 1 (Mentalität, Runde 1). */
export const WOCHENFRAGE_START = "2026-11-19";

export type ThemeKey = "mentalitaet" | "koerper" | "individuell" | "kollektiv";

export const THEMES: { key: ThemeKey; label: string; questions: string[] }[] = [
  {
    key: "mentalitaet",
    label: "Mentalität",
    questions: [
      "Hast du nach dem Fehler wieder den Ball gefordert?",
      "Hast du nach einem Gegentor dein Team angefeuert?",
      "Bist du nach einem Fehler ruhig geblieben?",
      "Hast du nach einem verlorenen Zweikampf den nächsten gesucht?",
      "Hast du bei einer schweren Übung bis zum Schluss weitergemacht?",
      "Hast du dich vor dem Spiel auf deine Aufgabe konzentriert?",
    ],
  },
  {
    key: "koerper",
    label: "Körperliche Fähigkeiten",
    questions: [
      "Bist du beim Bremsen stabil geblieben?",
      "Bist du nach dem Sprung sicher auf beiden Füssen gelandet?",
      "Hast du die ersten Schritte beim Antritt schnell gemacht?",
      "Bist du im Zweikampf tief und stabil geblieben?",
      "Hast du beim Richtungswechsel das Tempo gehalten?",
      "Konntest du bis zum Schluss des Spiels sprinten?",
    ],
  },
  {
    key: "individuell",
    label: "Individuelle Aktionen",
    questions: [
      "Hast du den Ball mit dem Körper geschützt?",
      "Hast du vor der Ballannahme über die Schulter geschaut?",
      "Hast du den Ball mit dem ersten Kontakt nach vorne mitgenommen?",
      "Hast du im Eins-gegen-eins den Gegner angedribbelt?",
      "Hast du mit deinem schwächeren Fuss gepasst?",
      "Hast du vor dem Schuss geschaut, wo der Torhüter steht?",
    ],
  },
  {
    key: "kollektiv",
    label: "Kollektive Aktionen",
    questions: [
      "Hast du dich nach dem Pass freigelaufen?",
      "Hast du deinen Mitspielern laut zugerufen?",
      "Hast du nach dem Ballverlust sofort mitverteidigt?",
      "Hast du den freien Mitspieler gesehen und angespielt?",
      "Hast du in der Abwehr den Abstand zum Mitspieler gehalten?",
      "Hast du dich zwischen zwei Gegnern anspielbar gemacht?",
    ],
  },
];

const ROUNDS = Math.min(...THEMES.map((t) => t.questions.length));

export type WeeklyQuestion = {
  /** Donnerstag, an dem die Frage beginnt (YYYY-MM-DD) */
  weekStart: string;
  /** Laufende Wochennummer ab Start (1, 2, 3 …) */
  weekNumber: number;
  theme: ThemeKey;
  themeLabel: string;
  /** Stabiler Schlüssel, z. B. «mentalitaet-1» */
  questionKey: string;
  question: string;
};

const dayMs = 86_400_000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs);

/** Letzter Donnerstag am oder vor dem Datum. */
export function thursdayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = So … 4 = Do
  return addDays(date, -((day + 3) % 7));
}

/** Frage der Woche, in der `date` liegt. Vor dem Start gilt bereits Woche 1. */
export function questionForDate(date: string): WeeklyQuestion {
  const weekStart = thursdayOf(date) < WOCHENFRAGE_START ? WOCHENFRAGE_START : thursdayOf(date);
  const index = Math.floor(daysBetween(WOCHENFRAGE_START, weekStart) / 7);
  const theme = THEMES[index % THEMES.length];
  const round = Math.floor(index / THEMES.length) % ROUNDS;
  return {
    weekStart,
    weekNumber: index + 1,
    theme: theme.key,
    themeLabel: theme.label,
    questionKey: `${theme.key}-${round + 1}`,
    question: theme.questions[round],
  };
}

export function currentQuestion(now = new Date()): WeeklyQuestion {
  return questionForDate(todayInSwitzerland(now));
}

export const THEME_LABEL = Object.fromEntries(THEMES.map((t) => [t.key, t.label])) as Record<ThemeKey, string>;

/** «Woche 3» – oder «Vor dem Start» für Test-Antworten vor dem ersten Donnerstag. */
export function weekName(weekStart: string): string {
  return weekStart < WOCHENFRAGE_START ? "Vor dem Start" : `Woche ${questionForDate(weekStart).weekNumber}`;
}

/** Beschriftung einer Woche für Filter und Tabellen. */
export function weekLabel(weekStart: string): string {
  const theme = weekStart < WOCHENFRAGE_START ? "" : ` · ${questionForDate(weekStart).themeLabel}`;
  return `${weekName(weekStart)} · ab ${shortDate(weekStart)}${theme}`;
}

/** Name bereinigen: Leerzeichen zusammenfassen, Länge begrenzen. */
export function cleanName(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Schlüssel, damit «Lio», «lio » und «LIO» dieselbe Person sind. */
export function athleteKey(name: string): string {
  return cleanName(name).toLocaleLowerCase("de-CH");
}

export const NOT_PRACTICED = "nicht-geuebt";
export const ANSWER_OPTIONS = ["1", "2", "3", "4", "5", NOT_PRACTICED] as const;

export function answerLabel(rating: number | null): string {
  return rating === null ? "Nicht geübt" : String(rating);
}
