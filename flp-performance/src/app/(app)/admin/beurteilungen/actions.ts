"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { parseScoreForm } from "@/lib/assessments";
import { isIsoDate, todayInSwitzerland } from "@/lib/dates";
import { assessmentMetaSchema, fieldErrors, keepValues, newAssessmentSchema, type FormState } from "@/lib/validation";

function dateError(date: string): string | null {
  if (!isIsoDate(date)) return "Ungültiges Datum.";
  if (date > todayInSwitzerland()) return "Das Datum darf nicht in der Zukunft liegen.";
  if (date < "2015-01-01") return "Das Datum ist zu weit in der Vergangenheit.";
  return null;
}

export async function createAssessment(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const values = keepValues(formData, ["kind", "assessedOn"]);
  const parsed = newAssessmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const dErr = dateError(parsed.data.assessedOn);
  if (dErr) return { errors: { assessedOn: dErr }, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      player_id: parsed.data.playerId,
      coach_id: viewer.id,
      kind: parsed.data.kind,
      assessed_on: parsed.data.assessedOn,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { errors: { kind: "Für diesen Spieler gibt es bereits eine Erstbeurteilung." }, values };
  if (error || !data) return { message: "Die Beurteilung konnte nicht angelegt werden.", values };
  revalidatePath(`/admin/spieler/${parsed.data.playerId}`);
  redirect(`/admin/beurteilungen/${data.id}`);
}

/**
 * Speichert Werte eines Entwurfs und veröffentlicht ihn optional.
 * Veröffentlichte Beurteilungen sind in der Datenbank gesperrt (Trigger + RLS).
 */
export async function saveAssessment(assessmentId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  if (!z.guid().safeParse(assessmentId).success) return { message: "Ungültige Beurteilung." };
  const supabase = await createClient();
  const { data: categories } = await supabase.from("assessment_categories").select("id");
  const ids = (categories ?? []).map((c) => c.id as string);
  const values = keepValues(formData, ["assessedOn", "coachNotes", ...ids.flatMap((id) => [`score_${id}`, `note_${id}`])]);

  const meta = assessmentMetaSchema.safeParse(Object.fromEntries(formData));
  if (!meta.success) return { errors: fieldErrors(meta.error), values };
  const dErr = dateError(meta.data.assessedOn);
  if (dErr) return { errors: { assessedOn: dErr }, values };
  const scores = parseScoreForm((k) => formData.get(k)?.toString() ?? null, ids);
  if (!scores.ok) return { errors: scores.errors, values, message: "Bitte die markierten Werte prüfen." };

  const publish = meta.data.intent === "publish";
  if (publish) {
    if (!scores.scores.some((s) => s.score !== null)) {
      return { values, message: "Zum Veröffentlichen mindestens eine Kompetenz bewerten." };
    }
    if (!meta.data.confirmPublish) {
      return { values, errors: { confirmPublish: "Bitte bestätigen – veröffentlichte Beurteilungen sind nicht mehr änderbar." } };
    }
  }

  const { error: metaError } = await supabase
    .from("assessments")
    .update({ assessed_on: meta.data.assessedOn, coach_notes: meta.data.coachNotes })
    .eq("id", assessmentId)
    .eq("status", "draft");
  const { error: scoreError } = await supabase.from("assessment_scores").upsert(
    scores.scores.map((s) => ({ assessment_id: assessmentId, category_id: s.categoryId, score: s.score, note: s.note })),
    { onConflict: "assessment_id,category_id" },
  );
  if (metaError || scoreError) {
    return { values, message: "Speichern fehlgeschlagen. Ist die Beurteilung bereits veröffentlicht?" };
  }

  if (publish) {
    const { error } = await supabase.from("assessments").update({ status: "published" }).eq("id", assessmentId).eq("status", "draft");
    if (error) return { values, message: "Veröffentlichen fehlgeschlagen." };
  }
  revalidatePath(`/admin/beurteilungen/${assessmentId}`);
  revalidatePath("/admin/beurteilungen");
  return { ok: true, message: publish ? "Beurteilung veröffentlicht. Die Familie sieht sie jetzt." : "Entwurf gespeichert." };
}

const idSchema = z.object({ assessmentId: z.guid() });

export async function deleteAssessmentDraft(formData: FormData) {
  await requireStaff();
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .delete()
    .eq("id", parsed.data.assessmentId)
    .eq("status", "draft")
    .select("player_id")
    .maybeSingle();
  if (data) redirect(`/admin/spieler/${data.player_id}`);
}
