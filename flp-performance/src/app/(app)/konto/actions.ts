"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { fieldErrors, keepValues, privacyRequestSchema, profileSchema, type FormState } from "@/lib/validation";

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keepValues(formData, ["fullName", "phone"]) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq("id", viewer.id);
  if (error) return { message: "Das Profil konnte nicht gespeichert werden." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil gespeichert." };
}

export async function createPrivacyRequest(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = privacyRequestSchema.safeParse(Object.fromEntries(formData));
  const values = keepValues(formData, ["requestType", "playerId", "details"]);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.from("privacy_requests").insert({
    requester_id: viewer.id,
    player_id: parsed.data.playerId || null,
    request_type: parsed.data.requestType,
    details: parsed.data.details,
  });
  if (error) return { message: "Der Antrag konnte nicht übermittelt werden.", values };
  revalidatePath("/konto");
  return {
    ok: true,
    message: "Dein Antrag ist eingegangen. Wir bearbeiten ihn in der Regel innert 30 Tagen und informieren dich per E-Mail.",
  };
}
