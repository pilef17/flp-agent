// Wochenfrage: eine kurze Selbsteinschätzung pro Woche, die Familien per WhatsApp erhalten.
// Zyklus von 12 Wochen, aufgebaut auf dem FLP-Beurteilungsbogen. Die Frage wechselt jeden
// Donnerstag (Schweizer Zeit). In Woche 13 folgt die neue Beurteilung. Reine Logik, ohne Datenbank.
import { addDays, shortDate, todayInSwitzerland } from "@/lib/dates";

export type ThemeKey = "mentalitaet" | "koerper" | "individuell" | "kollektiv";

export const THEME_LABEL: Record<ThemeKey, string> = {
  mentalitaet: "Mentalität",
  koerper: "Körperliche Fähigkeiten",
  individuell: "Individuelle Aktionen",
  kollektiv: "Kollektive Aktionen",
};

/** Kurzname für die vier Säulen-Etiketten auf dem Handy. */
export const THEME_SHORT: Record<ThemeKey, string> = {
  mentalitaet: "Mentalität",
  koerper: "Körper",
  individuell: "Individuell",
  kollektiv: "Kollektiv",
};

/** Ein Satz, der die Säule für Kinder und Eltern erklärt (vor der Frage). */
export const THEME_INTRO: Record<ThemeKey, string> = {
  mentalitaet: "Wie du denkst und reagierst – besonders nach Fehlern und unter Druck.",
  koerper: "Wie du dich bewegst: starten, bremsen, springen und stabil bleiben.",
  individuell: "Was du allein mit dem Ball und gegen deinen Gegner machst.",
  kollektiv: "Wie du mit deinen Mitspielern zusammen angreifst und verteidigst.",
};

export const THEME_ORDER: ThemeKey[] = ["mentalitaet", "koerper", "individuell", "kollektiv"];

/** Spalte im Beurteilungsbogen (für das Trainer-Panel). */
export const THEME_SHEET: Record<ThemeKey, string> = {
  mentalitaet: "Psychologische Variablen",
  koerper: "Körperliche Fähigkeiten",
  individuell: "Individuelle Aktionen",
  kollektiv: "Kollektive Aktionen und Prinzipien",
};

export type PlanWeek = {
  /** Donnerstag, an dem die Frage beginnt (YYYY-MM-DD) */
  date: string;
  theme: ThemeKey;
  /** Kurzer Titel für Familien, z. B. «Umgang mit Fehlern» */
  focus: string;
  /** Item im Beurteilungsbogen */
  item: string;
  question: string;
  /** Satz für die Eltern unter der Frage */
  parentNote: string;
  /** Auftrag fürs nächste Training (nach dem Senden) */
  task: string;
};

/** Zyklus 1 – Start Donnerstag 19.11.2026, Pause über die Feiertage. */
export const PLAN: PlanWeek[] = [
  {
    date: "2026-11-19",
    theme: "mentalitaet",
    focus: "Umgang mit Fehlern",
    item: "Emotionale Stabilität",
    question: "Hast du nach einem Fehler wieder den Ball gefordert?",
    parentNote: "Wer nach einem Fehler den Ball will, zeigt Mut – und lernt schneller.",
    task: "Fordere nach jedem Fehler sofort wieder den Ball.",
  },
  {
    date: "2026-11-26",
    theme: "koerper",
    focus: "Stabil bremsen",
    item: "Gleichgewicht",
    question: "Bist du beim Bremsen stabil geblieben?",
    parentNote: "Stabiles Bremsen schützt vor Verletzungen und macht schneller.",
    task: "Bremse mit kleinen Schritten und tiefem Körper.",
  },
  {
    date: "2026-12-03",
    theme: "individuell",
    focus: "Ball abschirmen",
    item: "Abschirmen, Finte und Täuschung",
    question: "Hast du den Ball mit dem Körper geschützt?",
    parentNote: "Wer den Ball abschirmt, verliert ihn auch unter Druck seltener.",
    task: "Stell deinen Körper zwischen Gegner und Ball.",
  },
  {
    date: "2026-12-10",
    theme: "kollektiv",
    focus: "Freilaufen",
    item: "Freilaufen",
    question: "Hast du dich nach dem Pass freigelaufen?",
    parentNote: "Nach dem Pass weiterlaufen heisst: sofort wieder anspielbar sein.",
    task: "Nach jedem Pass sofort loslaufen und anspielbar sein.",
  },
  {
    date: "2026-12-17",
    theme: "mentalitaet",
    focus: "Teamgeist",
    item: "Teamgeist / Kameradschaft",
    question: "Hast du einen Mitspieler nach einem Fehler aufgemuntert?",
    parentNote: "Gute Teamkollegen machen die ganze Mannschaft stärker.",
    task: "Muntere nach einem Fehler einen Mitspieler auf.",
  },
  {
    date: "2027-01-07",
    theme: "koerper",
    focus: "Schwacher Fuss",
    item: "Beidfüssigkeit mit Ball",
    question: "Hast du den Ball auch mit dem schwächeren Fuss gespielt?",
    parentNote: "Mit beiden Füssen ist man für den Gegner schwerer auszurechnen.",
    task: "Spiele jeden zweiten Pass mit dem schwächeren Fuss.",
  },
  {
    date: "2027-01-14",
    theme: "individuell",
    focus: "Schulterblick",
    item: "Spielübersicht (Blickfeld)",
    question: "Hast du vor der Ballannahme über die Schulter geschaut?",
    parentNote: "Wer vorher schaut, weiss schon, was er mit dem Ball macht.",
    task: "Schau vor jeder Ballannahme einmal über die Schulter.",
  },
  {
    date: "2027-01-21",
    theme: "kollektiv",
    focus: "Gemeinsam verteidigen",
    item: "Doppeln / Unterstützen",
    question: "Hast du deinem Mitspieler in der Abwehr geholfen?",
    parentNote: "Zu zweit gewinnt man den Ball öfter zurück.",
    task: "Wenn dein Mitspieler verteidigt: geh hin und hilf.",
  },
  {
    date: "2027-01-28",
    theme: "mentalitaet",
    focus: "Dranbleiben",
    item: "Selbstüberwindung",
    question: "Hast du bei einer schweren Übung bis zum Schluss weitergemacht?",
    parentNote: "Dranbleiben, wenn es schwer wird, ist eine Stärke fürs Leben.",
    task: "Gib bei der schwersten Übung bis zum Schluss alles.",
  },
  {
    date: "2027-02-04",
    theme: "koerper",
    focus: "Schnell reagieren",
    item: "Reaktionsschnelligkeit",
    question: "Warst du bei abgeprallten Bällen als Erster da?",
    parentNote: "Schnelle Reaktion entscheidet viele Zweikämpfe.",
    task: "Sei bei jedem Abpraller als Erster am Ball.",
  },
  {
    date: "2027-02-11",
    theme: "individuell",
    focus: "Torabschluss",
    item: "Torabschluss",
    question: "Hast du vor dem Schuss geschaut, wo der Torhüter steht?",
    parentNote: "Ein Blick vor dem Schuss macht aus Glück eine Entscheidung.",
    task: "Schau vor jedem Schuss kurz zum Torhüter.",
  },
  {
    date: "2027-02-18",
    theme: "kollektiv",
    focus: "Gegner lenken",
    item: "Eindämmen (Gegner stellen)",
    question: "Hast du den Gegner an die Seitenlinie gedrängt?",
    parentNote: "Wer den Gegner lenkt, bestimmt das Spiel – auch ohne Ball.",
    task: "Dränge deinen Gegner an die Seitenlinie.",
  },
];

/** Donnerstage ohne Frage (Feiertage). */
export const PAUSES = ["2026-12-24", "2026-12-31"];

export const WOCHENFRAGE_START = PLAN[0].date;
export const TOTAL_WEEKS = PLAN.length;

export type WeeklyQuestion = PlanWeek & {
  status: "active";
  /** Donnerstag, an dem die Frage beginnt */
  weekStart: string;
  weekNumber: number;
  themeLabel: string;
  /** Stabiler Schlüssel, z. B. «mentalitaet-1» */
  questionKey: string;
  /** Nächster Donnerstag mit Frage (null am Zyklusende) */
  nextDate: string | null;
};

export type WeekState =
  | WeeklyQuestion
  | { status: "pause"; weekStart: string; nextDate: string }
  | { status: "ended"; weekStart: string };

function toQuestion(index: number): WeeklyQuestion {
  const w = PLAN[index];
  return {
    ...w,
    status: "active",
    weekStart: w.date,
    weekNumber: index + 1,
    themeLabel: THEME_LABEL[w.theme],
    questionKey: `${w.theme}-${index + 1}`,
    nextDate: PLAN[index + 1]?.date ?? null,
  };
}

/** Letzter Donnerstag am oder vor dem Datum. */
export function thursdayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = So … 4 = Do
  return addDays(date, -((day + 3) % 7));
}

/** Zustand der Woche, in der `date` liegt. Vor dem Start gilt bereits Woche 1. */
export function stateForDate(date: string): WeekState {
  const thursday = thursdayOf(date);
  if (thursday < WOCHENFRAGE_START) return toQuestion(0);
  const index = PLAN.findIndex((w) => w.date === thursday);
  if (index >= 0) return toQuestion(index);
  const next = PLAN.find((w) => w.date > thursday);
  return next ? { status: "pause", weekStart: thursday, nextDate: next.date } : { status: "ended", weekStart: thursday };
}

export function currentState(now = new Date()): WeekState {
  return stateForDate(todayInSwitzerland(now));
}

/** Planwoche zu einem gespeicherten Wochenstart (null = ausserhalb des Plans). */
export function planWeekOf(weekStart: string): WeeklyQuestion | null {
  const index = PLAN.findIndex((w) => w.date === weekStart);
  return index >= 0 ? toQuestion(index) : null;
}

/** «Woche 3» – oder ein Hinweis für Antworten ausserhalb des Plans (z. B. Tests). */
export function weekName(weekStart: string): string {
  const w = planWeekOf(weekStart);
  if (w) return `Woche ${w.weekNumber}`;
  return weekStart < WOCHENFRAGE_START ? "Vor dem Start" : "Ausserhalb des Plans";
}

/** Beschriftung einer Woche für Filter und Tabellen. */
export function weekLabel(weekStart: string): string {
  const w = planWeekOf(weekStart);
  return `${weekName(weekStart)} · ${shortDate(weekStart)}${w ? ` · ${w.themeLabel}` : ""}`;
}

/** «Donnerstag, 26.11.2026» */
export function longThursday(date: string): string {
  return `Donnerstag, ${date.split("-").reverse().join(".")}`;
}

/** Name bereinigen: Leerzeichen zusammenfassen. */
export function cleanName(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Schlüssel, damit «Lio», «lio » und «LIO» dieselbe Person sind. */
export function athleteKey(name: string): string {
  return cleanName(name).toLocaleLowerCase("de-CH");
}

export const NOT_PRACTICED = "nicht-geuebt";
export const ANSWER_OPTIONS = ["1", "2", "3", "4", "5", NOT_PRACTICED] as const;

/** Häufigkeitsskala – für Kinder leichter als «wie gut». */
export const SCALE_LABEL: Record<(typeof ANSWER_OPTIONS)[number], string> = {
  "1": "Nie",
  "2": "Selten",
  "3": "Manchmal",
  "4": "Oft",
  "5": "Immer",
  [NOT_PRACTICED]: "Nicht geübt",
};

export function answerLabel(rating: number | null): string {
  return rating === null ? SCALE_LABEL[NOT_PRACTICED] : `${rating} · ${SCALE_LABEL[String(rating) as "1"]}`;
}

/** Erster Montag nach dem Zyklus = Zeit für die neue Beurteilung. */
export const REASSESSMENT_DATE = addDays(PLAN[PLAN.length - 1].date, 7);

/**
 * WhatsApp-Nummer des Trainers für wa.me (nur Ziffern, international).
 * Akzeptiert «+41 79 123 45 67», «0041791234567» oder «079 123 45 67» (Schweiz).
 */
export function whatsappNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `41${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

/** Vorbereitete WhatsApp-Nachricht der Familie an den Trainer. */
export function coachMessage(m: {
  weekNumber: number;
  title: string;
  question: string;
  name: string;
  age: string;
  team: string;
  answer: string;
}): string {
  return [
    `FLP Wochenfrage · Woche ${m.weekNumber}`,
    m.title,
    m.question,
    "",
    `Athlet: ${m.name}`,
    `Alter: ${m.age}`,
    `Team: ${m.team}`,
    `Antwort: ${m.answer}`,
  ].join("\n");
}
