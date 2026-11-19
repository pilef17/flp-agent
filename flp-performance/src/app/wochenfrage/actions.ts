"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { athleteKey, answerLabel, cleanName, currentState, ANSWER_OPTIONS, NOT_PRACTICED } from "@/lib/wochenfrage";
import { errorText, parseLang } from "@/lib/wochenfrage-i18n";

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

// Fehlermeldungen sind Codes – übersetzt wird in der Sprache der Familie (errorText).
const schema = z.object({
  name: z
    .string()
    .transform(cleanName)
    .pipe(z.string().min(2, "name_required").max(40, "name_long")),
  age: z.coerce
    .number({ error: "age_required" })
    .int("age_number")
    .min(4, "age_required")
    .max(30, "age_check"),
  team: z
    .string()
    .transform(cleanName)
    .pipe(z.string().min(2, "team_required").max(60, "team_long")),
  answer: z.enum(ANSWER_OPTIONS, { error: "answer_required" }),
  questionKey: z.string(),
  website: z.string().optional(), // Honeypot für Bots – Menschen sehen das Feld nicht
});

export async function submitAnswer(_: AnswerState, formData: FormData): Promise<AnswerState> {
  const raw = Object.fromEntries(formData);
  const text = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const lang = parseLang(raw.lang);
  const parsed = schema.safeParse({ ...raw, age: text("age").trim() || undefined, team: text("team"), answer: raw.answer ?? "" });
  const name = text("name");
  const keep = { name, age: text("age"), team: text("team") };
  if (!parsed.success) {
    const errors: AnswerState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<AnswerState["errors"]>;
      errors[key] ??= errorText(lang, issue.message);
    }
    return { errors, ...keep };
  }
  const q = currentState();
  // Bots füllen das versteckte Feld aus: so tun, als wäre alles gut
  if (parsed.data.website) return { ok: true, name: parsed.data.name };
  const done = { name: parsed.data.name, age: String(parsed.data.age), team: parsed.data.team };
  if (q.status !== "active" || parsed.data.questionKey !== q.questionKey) {
    return { stale: true, ...keep, message: errorText(lang, "stale") };
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
  if (error) return { ...keep, message: errorText(lang, "failed") };
  return { ok: true, ...done, answer: answerLabel(rating) };
}
