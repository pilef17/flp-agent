import { z } from "zod";
import { SLUG_PATTERN } from "./commerce";

/** Positionsprogramme: strukturierte Einheiten (Inhaltsart «session») und Import-Format. */

const text = (max: number) => z.string().trim().max(max);
const list = (maxItems: number, maxLen: number) => z.array(text(maxLen)).max(maxItems).default([]);

export const sessionExerciseSchema = z.object({
  section: text(60).optional(),
  code: text(12).optional(),
  name: text(160).min(1),
  description: text(2000).default(""),
  minutes: z.number().int().min(0).max(240).optional(),
  params: list(12, 200),
  tip: text(500).optional(),
  progression: text(500).optional(),
  material: text(120).optional(),
  cues: list(8, 160),
  success: text(300).optional(),
  mistake: text(300).optional(),
});

export const sessionDataSchema = z.object({
  level: z.enum(["jugend", "pro"]),
  label: text(80).optional(),
  phase: text(120).optional(),
  subtitle: text(400).optional(),
  minutes: z.number().int().min(0).max(600).optional(),
  goals: z.array(z.object({ title: text(120).min(1), items: list(12, 300) })).max(6).default([]),
  rule: text(600).optional(),
  exercises: z.array(sessionExerciseSchema).max(30).default([]),
});

export type SessionData = z.infer<typeof sessionDataSchema>;
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;

export const programImportSchema = z.object({
  version: z.literal(1),
  products: z
    .array(
      z.object({
        slug: z.string().regex(SLUG_PATTERN),
        title: text(120).min(2),
        summary: text(300).default(""),
        description: text(5000).default(""),
        price_cents: z.number().int().min(100).max(100_000_000),
        access_days: z.number().int().min(1).max(3650).nullable(),
        position: z.number().int().min(0).max(32767).default(0),
        sessions: z.array(z.object({ title: text(160).min(2), data: sessionDataSchema })).min(1).max(60),
      }),
    )
    .min(1)
    .max(50),
});

export type ProgramImport = z.infer<typeof programImportSchema>;

/** Liest gespeicherte Einheitsdaten tolerant (ältere oder fehlerhafte Datensätze ergeben null). */
export function parseSessionData(value: unknown): SessionData | null {
  const r = sessionDataSchema.safeParse(value);
  return r.success ? r.data : null;
}

/** Dauer einer Einheit: angegebener Wert, sonst Summe der Übungen. */
export function sessionMinutes(d: SessionData): number {
  return d.minutes ?? d.exercises.reduce((sum, e) => sum + (e.minutes ?? 0), 0);
}
