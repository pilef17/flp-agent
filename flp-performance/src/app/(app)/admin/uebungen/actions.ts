"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES, isMediaPathFor, nextExerciseCode } from "@/lib/exercises";
import { exerciseSchema, fieldErrors, keepValues, type FormState } from "@/lib/validation";

const FIELDS = [
  "title", "category", "description", "ageMin", "ageMax", "difficulty",
  "sets", "repetitions", "durationSeconds", "restSeconds", "coachingInstructions", "safetyNotes",
];

function toRow(d: z.infer<typeof exerciseSchema>) {
  return {
    title: d.title,
    category: d.category,
    description: d.description,
    age_min: d.ageMin,
    age_max: d.ageMax,
    difficulty: d.difficulty,
    sets: d.sets,
    repetitions: d.repetitions,
    duration_seconds: d.durationSeconds,
    rest_seconds: d.restSeconds,
    coaching_instructions: d.coachingInstructions,
    safety_notes: d.safetyNotes,
  };
}

export async function createExercise(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepValues(formData, FIELDS);
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const prefix = CATEGORIES[parsed.data.category].prefix;

  // Zweiter Versuch, falls gleichzeitig dieselbe ID vergeben wurde
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: codes } = await supabase.from("exercises").select("code").like("code", `${prefix}-%`);
    const code = nextExerciseCode(parsed.data.category, (codes ?? []).map((c) => c.code));
    const { data, error } = await supabase
      .from("exercises")
      .insert({ ...toRow(parsed.data), code })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/admin/uebungen");
      redirect(`/admin/uebungen/${data.id}?erstellt=1`);
    }
    if (error?.code !== "23505") break;
  }
  return { message: "Die Übung konnte nicht gespeichert werden.", values };
}

export async function updateExercise(id: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepValues(formData, FIELDS);
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !z.guid().safeParse(id).success) {
    return { errors: parsed.success ? {} : fieldErrors(parsed.error), values };
  }
  const supabase = await createClient();
  // Kategorie bestimmt die ID – bei Änderung bleibt die bestehende ID erhalten
  const { error } = await supabase.from("exercises").update(toRow(parsed.data)).eq("id", id);
  if (error) return { message: "Die Übung konnte nicht gespeichert werden.", values };
  revalidatePath(`/admin/uebungen/${id}`);
  revalidatePath("/admin/uebungen");
  return { ok: true, message: "Übung gespeichert." };
}

const statusSchema = z.object({ id: z.guid(), status: z.enum(["draft", "published"]) });

export async function setExerciseStatus(formData: FormData) {
  await requireStaff();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("exercises").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  revalidatePath(`/admin/uebungen/${parsed.data.id}`);
  revalidatePath("/admin/uebungen");
}

/** Nach dem direkten Upload in den privaten Bucket: Datei der Übung zuordnen. */
export async function registerExerciseVideo(exerciseId: string, path: string): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  if (!z.guid().safeParse(exerciseId).success || !isMediaPathFor(exerciseId, path)) {
    return { ok: false, message: "Ungültiger Dateipfad." };
  }
  const supabase = await createClient();
  const { count } = await supabase.from("exercise_media").select("id", { count: "exact", head: true }).eq("exercise_id", exerciseId);
  const { error } = await supabase
    .from("exercise_media")
    .insert({ exercise_id: exerciseId, storage_path: path, kind: "video", position: count ?? 0 });
  if (error) {
    await supabase.storage.from("exercise-media").remove([path]);
    return { ok: false, message: "Das Video konnte nicht gespeichert werden." };
  }
  revalidatePath(`/admin/uebungen/${exerciseId}`);
  return { ok: true };
}

const mediaSchema = z.object({ mediaId: z.guid(), exerciseId: z.guid() });

export async function deleteExerciseVideo(formData: FormData) {
  await requireStaff();
  const parsed = mediaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("exercise_media")
    .select("storage_path")
    .eq("id", parsed.data.mediaId)
    .eq("exercise_id", parsed.data.exerciseId)
    .maybeSingle();
  if (!media) return;
  await supabase.storage.from("exercise-media").remove([media.storage_path]);
  await supabase.from("exercise_media").delete().eq("id", parsed.data.mediaId);
  revalidatePath(`/admin/uebungen/${parsed.data.exerciseId}`);
}
