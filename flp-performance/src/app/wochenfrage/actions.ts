"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { athleteKey, answerLabel, cleanName, currentState, ANSWER_OPTIONS, NOT_PRACTICED } from "@/lib/wochenfrage";

export type AnswerState = {
  ok?: boolean;
  message?: string;
  errors?: { name?: string; answer?: string };
  name?: string;
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
  answer: z.enum(ANSWER_OPTIONS, { error: "Bitte wähle eine Antwort." }),
  questionKey: z.string(),
  website: z.string().optional(), // Honeypot für Bots – Menschen sehen das Feld nicht
});

export async function submitAnswer(_: AnswerState, formData: FormData): Promise<AnswerState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse({ ...raw, answer: raw.answer ?? "" });
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!parsed.success) {
    const errors: AnswerState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "answer";
      errors[key] ??= issue.message;
    }
    return { errors, name };
  }
  const q = currentState();
  // Bots füllen das versteckte Feld aus: so tun, als wäre alles gut
  if (parsed.data.website) return { ok: true, name: parsed.data.name };
  if (q.status !== "active" || parsed.data.questionKey !== q.questionKey) {
    return { stale: true, name, message: "Inzwischen gibt es eine neue Frage. Bitte lade die Seite neu." };
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
        rating,
      },
      { onConflict: "week_start,athlete_key" },
    );
  if (error) return { name, message: "Das hat leider nicht geklappt. Bitte versuche es nochmals." };
  return { ok: true, name: parsed.data.name, answer: answerLabel(rating) };
}
