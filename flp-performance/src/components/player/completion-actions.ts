"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

const schema = z.object({
  sessionId: z.guid(),
  sessionExerciseId: z.union([z.literal(""), z.guid()]),
  done: z.enum(["true", "false"]),
});

/** Einheit oder Übung als erledigt markieren / zurücksetzen. RLS prüft die Berechtigung. */
export async function toggleCompletion(formData: FormData) {
  const viewer = await requireViewer();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { sessionId, sessionExerciseId, done } = parsed.data;
  const supabase = await createClient();

  if (done === "true") {
    await supabase.from("session_completions").insert({
      session_id: sessionId,
      session_exercise_id: sessionExerciseId || null,
      completed_by: viewer.id,
    });
  } else {
    let q = supabase.from("session_completions").delete().eq("session_id", sessionId).eq("completed_by", viewer.id);
    q = sessionExerciseId ? q.eq("session_exercise_id", sessionExerciseId) : q.is("session_exercise_id", null);
    await q;
  }
  revalidatePath("/startseite");
  revalidatePath("/elternbereich");
  revalidatePath("/trainingsplan");
  revalidatePath("/spieler", "layout");
}
