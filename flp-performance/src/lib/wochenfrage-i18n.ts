// Wochenfrage in mehreren Sprachen: Deutsch (Standard), Englisch, Spanisch.
// Die Familie wählt die Sprache oben auf der Seite (?lang=en / ?lang=es). Für den Trainer bleibt
// alles Deutsch: Datenbank, Trainer-Panel und WhatsApp-Nachricht nutzen weiterhin den deutschen Plan.
import { PLAN, NOT_PRACTICED, THEME_INTRO, THEME_LABEL, THEME_SHORT, SCALE_LABEL, type ThemeKey, type ANSWER_OPTIONS } from "@/lib/wochenfrage";

export const LANGS = ["de", "en", "es"] as const;
export type Lang = (typeof LANGS)[number];

/** Beschriftung der Sprachknöpfe. */
export const LANG_LABEL: Record<Lang, string> = { de: "DE", en: "EN", es: "ES" };

/** Unbekannte oder fehlende Sprache = Deutsch. */
export function parseLang(value: unknown): Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value) ? (value as Lang) : "de";
}

export type ErrorCode =
  | "name_required"
  | "name_long"
  | "age_required"
  | "age_number"
  | "age_check"
  | "team_required"
  | "team_long"
  | "answer_required"
  | "stale"
  | "failed";

type Texts = {
  eyebrow: string;
  weekOf: (week: number, total: number) => string;
  language: string;
  pillars: string;
  themeOfWeek: string;
  focus: string;
  forParents: string;
  nameLabel: string;
  namePlaceholder: string;
  ageLabel: string;
  agePlaceholder: string;
  teamLabel: string;
  teamPlaceholder: string;
  scaleQuestion: string;
  send: string;
  sending: string;
  footer: string;
  thanks: (name: string) => string;
  received: string;
  taskTitle: string;
  sendToCoach: string;
  nextQuestion: string;
  changeAnswer: string;
  reload: string;
  thursday: string;
  pauseTitle: string;
  pauseText: (next: string) => string;
  endedTitle: string;
  endedText: string;
  errors: Record<ErrorCode, string>;
};

export const TEXT: Record<Lang, Texts> = {
  de: {
    eyebrow: "Wochenfrage",
    weekOf: (w, t) => `Woche ${w} von ${t}`,
    language: "Sprache",
    pillars: "Die vier Säulen",
    themeOfWeek: "Thema der Woche",
    focus: "Fokus",
    forParents: "Für Eltern",
    nameLabel: "Name des Athleten",
    namePlaceholder: "Vorname und Nachname",
    ageLabel: "Alter",
    agePlaceholder: "z. B. 11",
    teamLabel: "Team / Verein",
    teamPlaceholder: "z. B. FC Muster D-Junioren",
    scaleQuestion: "Wie oft hat es geklappt?",
    send: "Antwort senden",
    sending: "Wird gesendet …",
    footer: "FLP Performance · Antworten sieht nur dein Trainer.",
    thanks: (name) => `Danke, ${name}!`,
    received: "Deine Antwort ist angekommen.",
    taskTitle: "Dein Auftrag fürs nächste Training",
    sendToCoach: "Antwort an Trainer senden",
    nextQuestion: "Nächste Frage",
    changeAnswer: "Antwort ändern",
    reload: "Neu laden",
    thursday: "Donnerstag",
    pauseTitle: "Pause über die Feiertage",
    pauseText: (next) => `Diese Woche gibt es keine Frage. Die nächste kommt am ${next}.`,
    endedTitle: "Zyklus abgeschlossen",
    endedText: "Danke fürs Mitmachen! Jetzt folgt die neue Beurteilung – die nächste Wochenfrage kommt mit dem neuen Zyklus.",
    errors: {
      name_required: "Bitte gib deinen Namen ein.",
      name_long: "Der Name ist zu lang.",
      age_required: "Bitte gib dein Alter ein.",
      age_number: "Bitte gib dein Alter als Zahl ein.",
      age_check: "Bitte prüfe dein Alter.",
      team_required: "Bitte gib dein Team ein.",
      team_long: "Der Teamname ist zu lang.",
      answer_required: "Bitte wähle eine Antwort.",
      stale: "Inzwischen gibt es eine neue Frage. Bitte lade die Seite neu.",
      failed: "Das hat leider nicht geklappt. Bitte versuche es nochmals.",
    },
  },
  en: {
    eyebrow: "Weekly question",
    weekOf: (w, t) => `Week ${w} of ${t}`,
    language: "Language",
    pillars: "The four pillars",
    themeOfWeek: "Topic of the week",
    focus: "Focus",
    forParents: "For parents",
    nameLabel: "Player's name",
    namePlaceholder: "First and last name",
    ageLabel: "Age",
    agePlaceholder: "e.g. 11",
    teamLabel: "Team / Club",
    teamPlaceholder: "e.g. FC Example U11",
    scaleQuestion: "How often did you manage it?",
    send: "Send answer",
    sending: "Sending …",
    footer: "FLP Performance · Only your coach sees the answers.",
    thanks: (name) => `Thank you, ${name}!`,
    received: "Your answer has arrived.",
    taskTitle: "Your task for the next training",
    sendToCoach: "Send answer to coach",
    nextQuestion: "Next question",
    changeAnswer: "Change answer",
    reload: "Reload",
    thursday: "Thursday",
    pauseTitle: "Holiday break",
    pauseText: (next) => `There is no question this week. The next one comes on ${next}.`,
    endedTitle: "Cycle completed",
    endedText: "Thanks for taking part! Next comes the new assessment – the next weekly question starts with the new cycle.",
    errors: {
      name_required: "Please enter your name.",
      name_long: "The name is too long.",
      age_required: "Please enter your age.",
      age_number: "Please enter your age as a number.",
      age_check: "Please check your age.",
      team_required: "Please enter your team.",
      team_long: "The team name is too long.",
      answer_required: "Please choose an answer.",
      stale: "There is a new question now. Please reload the page.",
      failed: "Sorry, that didn't work. Please try again.",
    },
  },
  es: {
    eyebrow: "Pregunta semanal",
    weekOf: (w, t) => `Semana ${w} de ${t}`,
    language: "Idioma",
    pillars: "Los cuatro pilares",
    themeOfWeek: "Tema de la semana",
    focus: "Enfoque",
    forParents: "Para los padres",
    nameLabel: "Nombre del jugador",
    namePlaceholder: "Nombre y apellido",
    ageLabel: "Edad",
    agePlaceholder: "p. ej. 11",
    teamLabel: "Equipo / Club",
    teamPlaceholder: "p. ej. FC Ejemplo Sub-11",
    scaleQuestion: "¿Cuántas veces lo lograste?",
    send: "Enviar respuesta",
    sending: "Enviando …",
    footer: "FLP Performance · Solo tu entrenador ve las respuestas.",
    thanks: (name) => `¡Gracias, ${name}!`,
    received: "Tu respuesta ha llegado.",
    taskTitle: "Tu tarea para el próximo entrenamiento",
    sendToCoach: "Enviar respuesta al entrenador",
    nextQuestion: "Próxima pregunta",
    changeAnswer: "Cambiar respuesta",
    reload: "Recargar",
    thursday: "Jueves",
    pauseTitle: "Pausa por las fiestas",
    pauseText: (next) => `Esta semana no hay pregunta. La próxima llega el ${next}.`,
    endedTitle: "Ciclo completado",
    endedText: "¡Gracias por participar! Ahora viene la nueva evaluación: la próxima pregunta semanal llega con el nuevo ciclo.",
    errors: {
      name_required: "Escribe tu nombre, por favor.",
      name_long: "El nombre es demasiado largo.",
      age_required: "Escribe tu edad, por favor.",
      age_number: "Escribe tu edad en números, por favor.",
      age_check: "Revisa tu edad, por favor.",
      team_required: "Escribe tu equipo, por favor.",
      team_long: "El nombre del equipo es demasiado largo.",
      answer_required: "Elige una respuesta, por favor.",
      stale: "Ya hay una pregunta nueva. Recarga la página, por favor.",
      failed: "Lo sentimos, no ha funcionado. Inténtalo de nuevo.",
    },
  },
};

/** Fehlertext in der gewählten Sprache (unbekannte Codes bleiben, wie sie sind). */
export function errorText(lang: Lang, code: string): string {
  return (TEXT[lang].errors as Record<string, string>)[code] ?? code;
}

type ThemeTexts = { label: string; short: string; intro: string };

export const THEME_TEXT: Record<Lang, Record<ThemeKey, ThemeTexts>> = {
  de: {
    mentalitaet: { label: THEME_LABEL.mentalitaet, short: THEME_SHORT.mentalitaet, intro: THEME_INTRO.mentalitaet },
    koerper: { label: THEME_LABEL.koerper, short: THEME_SHORT.koerper, intro: THEME_INTRO.koerper },
    individuell: { label: THEME_LABEL.individuell, short: THEME_SHORT.individuell, intro: THEME_INTRO.individuell },
    kollektiv: { label: THEME_LABEL.kollektiv, short: THEME_SHORT.kollektiv, intro: THEME_INTRO.kollektiv },
  },
  en: {
    mentalitaet: { label: "Mentality", short: "Mentality", intro: "How you think and react – especially after mistakes and under pressure." },
    koerper: { label: "Physical abilities", short: "Body", intro: "How you move: starting, braking, jumping and staying stable." },
    individuell: { label: "Individual actions", short: "Individual", intro: "What you do on your own with the ball and against your opponent." },
    kollektiv: { label: "Team actions", short: "Team", intro: "How you attack and defend together with your teammates." },
  },
  es: {
    mentalitaet: { label: "Mentalidad", short: "Mentalidad", intro: "Cómo piensas y reaccionas, sobre todo después de un error y bajo presión." },
    koerper: { label: "Capacidades físicas", short: "Cuerpo", intro: "Cómo te mueves: arrancar, frenar, saltar y mantener el equilibrio." },
    individuell: { label: "Acciones individuales", short: "Individual", intro: "Lo que haces tú solo con el balón y contra tu rival." },
    kollektiv: { label: "Acciones colectivas", short: "Colectivo", intro: "Cómo atacas y defiendes junto con tus compañeros." },
  },
};

type ScaleKey = (typeof ANSWER_OPTIONS)[number];

export const SCALE_TEXT: Record<Lang, Record<ScaleKey, string>> = {
  de: SCALE_LABEL,
  en: { "1": "Never", "2": "Rarely", "3": "Sometimes", "4": "Often", "5": "Always", [NOT_PRACTICED]: "Not practised" },
  es: { "1": "Nunca", "2": "Pocas veces", "3": "A veces", "4": "A menudo", "5": "Siempre", [NOT_PRACTICED]: "No practicado" },
};

export type WeekTexts = { focus: string; question: string; parentNote: string; task: string };

/** Übersetzungen der 12 Wochen, gleiche Reihenfolge wie PLAN. */
const WEEKS: Record<Exclude<Lang, "de">, WeekTexts[]> = {
  en: [
    {
      focus: "Handling mistakes",
      question: "Did you ask for the ball again after a mistake?",
      parentNote: "Asking for the ball after a mistake shows courage – and helps you learn faster.",
      task: "After every mistake, ask for the ball again right away.",
    },
    {
      focus: "Stable braking",
      question: "Did you stay stable when braking?",
      parentNote: "Stable braking prevents injuries and makes you faster.",
      task: "Brake with small steps and a low body.",
    },
    {
      focus: "Shielding the ball",
      question: "Did you protect the ball with your body?",
      parentNote: "Players who shield the ball lose it less often, even under pressure.",
      task: "Put your body between the opponent and the ball.",
    },
    {
      focus: "Getting open",
      question: "Did you move into space after your pass?",
      parentNote: "Moving on after a pass means being available again straight away.",
      task: "After every pass, move right away and be available.",
    },
    {
      focus: "Team spirit",
      question: "Did you encourage a teammate after a mistake?",
      parentNote: "Good teammates make the whole team stronger.",
      task: "Encourage a teammate after a mistake.",
    },
    {
      focus: "Weaker foot",
      question: "Did you also play the ball with your weaker foot?",
      parentNote: "Players who use both feet are harder for opponents to read.",
      task: "Play every second pass with your weaker foot.",
    },
    {
      focus: "Shoulder check",
      question: "Did you check over your shoulder before receiving?",
      parentNote: "If you look first, you already know what to do with the ball.",
      task: "Check over your shoulder once before every first touch.",
    },
    {
      focus: "Defending together",
      question: "Did you help your teammate when defending?",
      parentNote: "Two players win the ball back more often.",
      task: "When your teammate is defending: go and help.",
    },
    {
      focus: "Keep going",
      question: "Did you keep going to the end of a hard drill?",
      parentNote: "Keeping going when it gets hard is a strength for life.",
      task: "Give everything until the end in the hardest drill.",
    },
    {
      focus: "Quick reactions",
      question: "Were you first to the rebounds?",
      parentNote: "Quick reactions decide many duels.",
      task: "Be first to the ball on every rebound.",
    },
    {
      focus: "Finishing",
      question: "Did you check where the goalkeeper was before shooting?",
      parentNote: "A look before the shot turns luck into a decision.",
      task: "Glance at the goalkeeper before every shot.",
    },
    {
      focus: "Steering the opponent",
      question: "Did you push your opponent towards the sideline?",
      parentNote: "Steering your opponent lets you control the game – even without the ball.",
      task: "Push your opponent towards the sideline.",
    },
  ],
  es: [
    {
      focus: "Gestionar los errores",
      question: "¿Volviste a pedir el balón después de un error?",
      parentNote: "Quien pide el balón después de un error demuestra valentía y aprende más rápido.",
      task: "Después de cada error, vuelve a pedir el balón enseguida.",
    },
    {
      focus: "Frenar con estabilidad",
      question: "¿Te mantuviste estable al frenar?",
      parentNote: "Frenar con estabilidad previene lesiones y te hace más rápido.",
      task: "Frena con pasos cortos y el cuerpo bajo.",
    },
    {
      focus: "Proteger el balón",
      question: "¿Protegiste el balón con el cuerpo?",
      parentNote: "Quien protege el balón lo pierde menos, incluso bajo presión.",
      task: "Pon tu cuerpo entre el rival y el balón.",
    },
    {
      focus: "Desmarcarse",
      question: "¿Te desmarcaste después del pase?",
      parentNote: "Seguir moviéndose después del pase significa estar disponible de nuevo al instante.",
      task: "Después de cada pase, muévete enseguida y ofrécete.",
    },
    {
      focus: "Espíritu de equipo",
      question: "¿Animaste a un compañero después de un error?",
      parentNote: "Los buenos compañeros hacen más fuerte a todo el equipo.",
      task: "Anima a un compañero después de un error.",
    },
    {
      focus: "Pierna menos hábil",
      question: "¿Jugaste el balón también con tu pierna menos hábil?",
      parentNote: "Con las dos piernas eres más difícil de leer para el rival.",
      task: "Haz uno de cada dos pases con tu pierna menos hábil.",
    },
    {
      focus: "Mirar por encima del hombro",
      question: "¿Miraste por encima del hombro antes de recibir?",
      parentNote: "Quien mira antes ya sabe qué hará con el balón.",
      task: "Mira por encima del hombro antes de cada recepción.",
    },
    {
      focus: "Defender juntos",
      question: "¿Ayudaste a tu compañero a defender?",
      parentNote: "Entre dos se recupera el balón más a menudo.",
      task: "Cuando tu compañero defienda: ve y ayúdale.",
    },
    {
      focus: "No rendirse",
      question: "¿Seguiste hasta el final en un ejercicio difícil?",
      parentNote: "No rendirse cuando cuesta es una fortaleza para toda la vida.",
      task: "Dalo todo hasta el final en el ejercicio más difícil.",
    },
    {
      focus: "Reaccionar rápido",
      question: "¿Llegaste primero a los rebotes?",
      parentNote: "Una reacción rápida decide muchos duelos.",
      task: "Sé el primero en llegar a cada rebote.",
    },
    {
      focus: "Definición",
      question: "¿Miraste dónde estaba el portero antes de tirar?",
      parentNote: "Una mirada antes del tiro convierte la suerte en una decisión.",
      task: "Mira al portero un momento antes de cada tiro.",
    },
    {
      focus: "Orientar al rival",
      question: "¿Llevaste a tu rival hacia la línea de banda?",
      parentNote: "Quien orienta al rival controla el juego, incluso sin balón.",
      task: "Lleva a tu rival hacia la línea de banda.",
    },
  ],
};

/** Texte einer Planwoche (1–12) in der gewählten Sprache. */
export function weekTexts(weekNumber: number, lang: Lang): WeekTexts {
  const w = PLAN[weekNumber - 1];
  if (lang === "de" || !w) return { focus: w?.focus ?? "", question: w?.question ?? "", parentNote: w?.parentNote ?? "", task: w?.task ?? "" };
  return WEEKS[lang][weekNumber - 1] ?? { focus: w.focus, question: w.question, parentNote: w.parentNote, task: w.task };
}

/** Anzahl übersetzter Wochen je Sprache (für Tests). */
export function translatedWeeks(lang: Exclude<Lang, "de">): number {
  return WEEKS[lang].length;
}

/** «Donnerstag, 26.11.2026» / «Thursday, 26.11.2026» / «Jueves, 26.11.2026» */
export function longThursdayIn(date: string, lang: Lang): string {
  return `${TEXT[lang].thursday}, ${date.split("-").reverse().join(".")}`;
}
