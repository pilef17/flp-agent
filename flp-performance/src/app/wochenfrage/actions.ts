"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { athleteKey, answerLabel, cleanName, currentState, ANSWER_OPTIONS, NOT_PRACTICED } from "@/lib/wochenfrage";

export type AnswerState = {
  ok?: boolean;
  message?: string;
  errors?: { name?: string; age?: string; team?: string; answer?: string };
  name?: string;
  age?: string;
  team?: string;
  /** Gesendete Antwort als Text, z. B. «4 · Oft» (für die Nachricht an den Trainer) */
  answer?: string;
  /** Neue Frage seit dem Öffnen der Seite – Seite neu laden */
  stale?: boolean;
};

const schema = z.object({
  name: z
    .string()
    .transform(cleanName)
    .pipe(z.string().min(2, "Bitte gib deinen Namen ein.").max(40, "Der Name ist zu lang.")),
  age: z.coerce
    .number({ error: "Bitte gib dein Alter ein." })
    .int("Bitte gib dein Alter als Zahl ein.")
    .min(4, "Bitte gib dein Alter ein.")
    .max(30, "Bitte prüfe dein Alter."),
  team: z
    .string()
    .transform(cleanName)
    .pipe(z.string().min(2, "Bitte gib dein Team ein.").max(60, "Der Teamname ist zu lang.")),
  answer: z.enum(ANSWER_OPTIONS, { error: "Bitte wähle eine Antwort." }),
  questionKey: z.string(),
  website: z.string().optional(), // Honeypot für Bots – Menschen sehen das Feld nicht
});

export async function submitAnswer(_: AnswerState, formData: FormData): Promise<AnswerState> {
  const raw = Object.fromEntries(formData);
  const text = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const parsed = schema.safeParse({ ...raw, age: text("age").trim() || undefined, team: text("team"), answer: raw.answer ?? "" });
  const name = text("name");
  const keep = { name, age: text("age"), team: text("team") };
  if (!parsed.success) {
    const errors: AnswerState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<AnswerState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors, ...keep };
  }
  const q = currentState();
  // Bots füllen das versteckte Feld aus: so tun, als wäre alles gut
  if (parsed.data.website) return { ok: true, name: parsed.data.name };
  const done = { name: parsed.data.name, age: String(parsed.data.age), team: parsed.data.team };
  if (q.status !== "active" || parsed.data.questionKey !== q.questionKey) {
    return { stale: true, ...keep, message: "Inzwischen gibt es eine neue Frage. Bitte lade die Seite neu." };
  }

  const rating = parsed.data.answer === NOT_PRACTICED ? null : Number(parsed.data.answer);
  const { error } = await createAdminClient()
    .from("weekly_answers")
    .upsert(
      {
        week_start: q.weekStart,
        theme: q.theme,
        question_key: q.questionKey,
        question: q.question,
        athlete_name: parsed.data.name,
        athlete_key: athleteKey(parsed.data.name),
        athlete_age: parsed.data.age,
        team: parsed.data.team,
        rating,
      },
      { onConflict: "week_start,athlete_key" },
    );
  if (error) return { ...keep, message: "Das hat leider nicht geklappt. Bitte versuche es nochmals." };
  return { ok: true, ...done, answer: answerLabel(rating) };
}
