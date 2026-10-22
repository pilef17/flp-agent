import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(254);
const password = z
  .string()
  .min(10, "Das Passwort muss mindestens 10 Zeichen lang sein.")
  .max(72, "Das Passwort darf höchstens 72 Zeichen lang sein.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Bitte Passwort eingeben."),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Bitte vollständigen Namen eingeben.").max(120),
    email,
    password,
    passwordConfirm: z.string(),
    privacy: z.literal("on", { error: "Bitte die Datenschutzerklärung akzeptieren." }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Die Passwörter stimmen nicht überein.",
  });

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Die Passwörter stimmen nicht überein.",
  });

const currentYear = new Date().getFullYear();

export const playerSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname fehlt.").max(60),
  lastName: z.string().trim().min(1, "Nachname fehlt.").max(60),
  birthYear: z.coerce
    .number({ error: "Bitte Geburtsjahr angeben." })
    .int()
    .min(currentYear - 18, "Geburtsjahr ist zu früh.")
    .max(currentYear - 4, "Geburtsjahr ist zu spät."),
  position: z.string().trim().max(60).optional().default(""),
  dominantFoot: z.enum(["", "links", "rechts", "beidfuessig"]).optional().default(""),
  club: z.string().trim().max(120).optional().default(""),
});

export const inviteGuardianSchema = z.object({
  playerId: z.guid(),
  email,
  fullName: z.string().trim().min(2, "Bitte Namen angeben.").max(120),
  relationship: z.enum(["Mutter", "Vater", "Erziehungsberechtigte Person"]),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Bitte vollständigen Namen eingeben.").max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+0-9 ()-]*$/, "Bitte eine gültige Telefonnummer eingeben.")
    .optional()
    .default(""),
});

export const privacyRequestSchema = z.object({
  requestType: z.enum(["export", "deletion", "correction"]),
  playerId: z.union([z.literal(""), z.guid()]).optional().default(""),
  details: z.string().trim().max(2000).optional().default(""),
});

export const consentSchema = z.object({
  playerId: z.guid(),
  consentType: z.enum(["data_processing", "video_recording", "player_account"]),
  granted: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const privacyStatusSchema = z.object({
  requestId: z.guid(),
  status: z.enum(["open", "in_progress", "completed", "rejected"]),
  resolutionNote: z.string().trim().max(2000).optional().default(""),
});

/** Erste Fehlermeldung je Feld für die Formularanzeige. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Eingaben zum Wiederbefüllen nach Fehlern (nie Passwörter) */
  values?: Record<string, string>;
};

/** Übernimmt die genannten Felder für die Wiederanzeige im Formular. */
export function keepValues(formData: FormData, keys: string[]): Record<string, string> {
  // _n erzwingt ein Neu-Rendern des Formulars (React setzt Formulare nach Actions zurück)
  return { ...Object.fromEntries(keys.map((k) => [k, formData.get(k)?.toString() ?? ""])), _n: crypto.randomUUID() };
}

// ---------------------------------------------------------------------------
// Phase 2: Übungen und Trainingspläne
// ---------------------------------------------------------------------------
const optionalInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce
      .number({ error: `${label}: bitte eine Zahl eingeben.` })
      .int(`${label}: bitte eine ganze Zahl eingeben.`)
      .min(min, `${label}: mindestens ${min}.`)
      .max(max, `${label}: höchstens ${max}.`)
      .nullable(),
  );

const dosageFields = {
  sets: optionalInt(1, 50, "Serien"),
  repetitions: optionalInt(1, 500, "Wiederholungen"),
  durationSeconds: optionalInt(1, 7200, "Dauer"),
  restSeconds: optionalInt(0, 3600, "Pause"),
};

export const exerciseSchema = z
  .object({
    title: z.string().trim().min(2, "Bitte einen Titel eingeben.").max(120),
    category: z.enum(
      ["technik", "ballkontrolle", "dribbling", "koordination", "schnelligkeit", "kraft", "stabilitaet", "beweglichkeit", "wahrnehmung", "entscheidungsfaehigkeit"],
      { error: "Bitte eine Kategorie wählen." },
    ),
    description: z.string().trim().max(4000).optional().default(""),
    ageMin: z.coerce.number().int().min(4, "Alter: mindestens 4.").max(18),
    ageMax: z.coerce.number().int().min(4).max(18, "Alter: höchstens 18."),
    difficulty: z.coerce.number().int().min(1).max(5),
    ...dosageFields,
    coachingInstructions: z.string().trim().max(4000).optional().default(""),
    safetyNotes: z.string().trim().max(2000).optional().default(""),
  })
  .refine((v) => v.ageMin <= v.ageMax, { path: ["ageMax"], message: "Das Höchstalter muss über dem Mindestalter liegen." });

export const planSchema = z.object({
  playerId: z.guid(),
  title: z.string().trim().min(2, "Bitte einen Titel eingeben.").max(120),
  weekDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Datum wählen."),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const sessionSchema = z.object({
  planId: z.guid(),
  title: z.string().trim().min(2, "Bitte einen Titel eingeben.").max(120),
  scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte einen Tag wählen."),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const sessionExerciseSchema = z.object({
  planId: z.guid(),
  sessionId: z.guid(),
  exerciseId: z.guid({ error: "Bitte eine Übung wählen." }),
  ...dosageFields,
  notes: z.string().trim().max(1000).optional().default(""),
});

// ---------------------------------------------------------------------------
// Phase 3: Beurteilungen und Feedback
// ---------------------------------------------------------------------------
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Datum wählen.");

export const newAssessmentSchema = z.object({
  playerId: z.guid(),
  kind: z.enum(["initial", "regular"]),
  assessedOn: isoDate,
});

export const assessmentMetaSchema = z.object({
  assessedOn: isoDate,
  coachNotes: z.string().trim().max(4000, "Höchstens 4000 Zeichen.").optional().default(""),
  intent: z.enum(["save", "publish"]),
  confirmPublish: z.literal("on").optional(),
});

export const feedbackSchema = z.object({
  title: z.string().trim().min(2, "Bitte einen Titel eingeben.").max(120),
  body: z.string().trim().min(1, "Bitte einen Text eingeben.").max(6000, "Höchstens 6000 Zeichen."),
  intent: z.enum(["draft", "publish"]),
});
