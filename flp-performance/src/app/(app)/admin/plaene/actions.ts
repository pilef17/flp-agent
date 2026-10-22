"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { isIsoDate, mondayOf } from "@/lib/dates";
import {
  fieldErrors,
  keepValues,
  planSchema,
  sessionExerciseSchema,
  sessionSchema,
  type FormState,
} from "@/lib/validation";

const builderPath = (planId: string) => `/admin/plaene/${planId}`;

export async function createPlan(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepValues(formData, ["title", "weekDate", "notes"]);
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!isIsoDate(parsed.data.weekDate)) return { errors: { weekDate: "Ungültiges Datum." }, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_plans")
    .insert({
      player_id: parsed.data.playerId,
      title: parsed.data.title,
      week_start: mondayOf(parsed.data.weekDate),
      notes: parsed.data.notes,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { errors: { weekDate: "Für diese Woche gibt es bereits einen Plan." }, values };
  if (error || !data) return { message: "Der Plan konnte nicht erstellt werden.", values };
  revalidatePath(`/admin/spieler/${parsed.data.playerId}`);
  redirect(builderPath(data.id));
}

const planStatusSchema = z.object({ planId: z.guid(), status: z.enum(["draft", "published"]) });

export async function setPlanStatus(formData: FormData) {
  await requireStaff();
  const parsed = planStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("training_plans").update({ status: parsed.data.status }).eq("id", parsed.data.planId);
  revalidatePath(builderPath(parsed.data.planId));
}

const planIdSchema = z.object({ planId: z.guid() });

/** Nur Entwürfe dürfen gelöscht werden – veröffentlichte Pläne bleiben als Verlauf erhalten. */
export async function deletePlan(formData: FormData) {
  await requireStaff();
  const parsed = planIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("training_plans")
    .delete()
    .eq("id", parsed.data.planId)
    .eq("status", "draft")
    .select("player_id")
    .maybeSingle();
  if (data) redirect(`/admin/spieler/${data.player_id}`);
}

export async function addSession(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepValues(formData, ["title", "scheduledOn", "notes"]);
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.from("training_sessions").insert({
    plan_id: parsed.data.planId,
    title: parsed.data.title,
    scheduled_on: parsed.data.scheduledOn,
    notes: parsed.data.notes,
  });
  if (error?.code === "23514") return { errors: { scheduledOn: "Der Tag muss in der Planwoche liegen." }, values };
  if (error) return { message: "Die Einheit konnte nicht gespeichert werden.", values };
  revalidatePath(builderPath(parsed.data.planId));
  return { ok: true, values: { _n: crypto.randomUUID() } };
}

const sessionIdSchema = z.object({ planId: z.guid(), sessionId: z.guid() });

export async function deleteSession(formData: FormData) {
  await requireStaff();
  const parsed = sessionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("training_sessions").delete().eq("id", parsed.data.sessionId).eq("plan_id", parsed.data.planId);
  revalidatePath(builderPath(parsed.data.planId));
}

export async function addSessionExercise(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepValues(formData, ["exerciseId", "sets", "repetitions", "durationSeconds", "restSeconds", "notes"]);
  const parsed = sessionExerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const supabase = await createClient();

  const [{ data: exercise }, { data: last }] = await Promise.all([
    supabase
      .from("exercises")
      .select("sets, repetitions, duration_seconds, rest_seconds, status")
      .eq("id", d.exerciseId)
      .maybeSingle(),
    supabase
      .from("session_exercises")
      .select("position")
      .eq("session_id", d.sessionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!exercise) return { errors: { exerciseId: "Übung nicht gefunden." }, values };
  if (exercise.status !== "published") return { errors: { exerciseId: "Bitte die Übung zuerst freigeben." }, values };

  // Leere Felder übernehmen die Standard-Dosierung der Übung (Momentaufnahme)
  const { error } = await supabase.from("session_exercises").insert({
    session_id: d.sessionId,
    exercise_id: d.exerciseId,
    position: (last?.position ?? -1) + 1,
    sets: d.sets ?? exercise.sets,
    repetitions: d.repetitions ?? exercise.repetitions,
    duration_seconds: d.durationSeconds ?? exercise.duration_seconds,
    rest_seconds: d.restSeconds ?? exercise.rest_seconds,
    notes: d.notes,
  });
  if (error) return { message: "Die Übung konnte nicht hinzugefügt werden.", values };
  revalidatePath(builderPath(d.planId));
  return { ok: true, values: { _n: crypto.randomUUID() } };
}

const itemSchema = z.object({ planId: z.guid(), itemId: z.guid() });

export async function removeSessionExercise(formData: FormData) {
  await requireStaff();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("session_exercises").delete().eq("id", parsed.data.itemId);
  revalidatePath(builderPath(parsed.data.planId));
}

const moveSchema = itemSchema.extend({ direction: z.enum(["up", "down"]) });

export async function moveSessionExercise(formData: FormData) {
  await requireStaff();
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: item } = await supabase.from("session_exercises").select("id, session_id, position").eq("id", parsed.data.itemId).maybeSingle();
  if (!item) return;
  const { data: siblings } = await supabase
    .from("session_exercises")
    .select("id, position")
    .eq("session_id", item.session_id)
    .order("position");
  const list = siblings ?? [];
  const i = list.findIndex((s) => s.id === item.id);
  const j = parsed.data.direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  // Positionen neu durchnummerieren, damit Lücken/Duplikate verschwinden
  const order = list.map((s) => s.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((id, position) => supabase.from("session_exercises").update({ position }).eq("id", id)));
  revalidatePath(builderPath(parsed.data.planId));
}
