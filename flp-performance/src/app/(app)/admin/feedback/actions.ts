"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { feedbackSchema, fieldErrors, keepValues, type FormState } from "@/lib/validation";

export async function createFeedback(playerId: string, _: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const values = keepValues(formData, ["title", "body"]);
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !z.guid().safeParse(playerId).success) {
    return { errors: parsed.success ? {} : fieldErrors(parsed.error), values };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("coach_feedback").insert({
    player_id: playerId,
    author_id: viewer.id,
    title: parsed.data.title,
    body: parsed.data.body,
    status: parsed.data.intent === "publish" ? "published" : "draft",
  });
  if (error) return { message: "Das Feedback konnte nicht gespeichert werden.", values };
  revalidatePath(`/admin/spieler/${playerId}`);
  revalidatePath("/admin/beurteilungen");
  return {
    ok: true,
    message: parsed.data.intent === "publish" ? "Feedback veröffentlicht." : "Feedback als Entwurf gespeichert.",
    values: { _n: crypto.randomUUID() },
  };
}

export async function updateFeedback(feedbackId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepValues(formData, ["title", "body"]);
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !z.guid().safeParse(feedbackId).success) {
    return { errors: parsed.success ? {} : fieldErrors(parsed.error), values };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_feedback")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      status: parsed.data.intent === "publish" ? "published" : "draft",
    })
    .eq("id", feedbackId)
    .select("player_id")
    .maybeSingle();
  if (error || !data) return { message: "Das Feedback konnte nicht gespeichert werden.", values };
  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath(`/admin/spieler/${data.player_id}`);
  return { ok: true, message: parsed.data.intent === "publish" ? "Gespeichert und veröffentlicht." : "Als Entwurf gespeichert (für die Familie unsichtbar)." };
}

const idSchema = z.object({ feedbackId: z.guid() });

export async function deleteFeedbackDraft(formData: FormData) {
  await requireStaff();
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_feedback")
    .delete()
    .eq("id", parsed.data.feedbackId)
    .eq("status", "draft")
    .select("player_id")
    .maybeSingle();
  if (data) redirect(`/admin/spieler/${data.player_id}`);
}
