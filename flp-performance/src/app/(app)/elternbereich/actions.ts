"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { POLICY_VERSION } from "@/lib/consent";
import { consentSchema } from "@/lib/validation";
import { monthStatusNotification, monthStatusSchema } from "@/lib/month-status";
import { notifyCoach } from "@/lib/mail";
import { publicEnv } from "@/lib/env";

/** Neue Einwilligungserklärung anhängen (Historie bleibt erhalten). */
export async function recordConsent(formData: FormData) {
  const viewer = await requireViewer();
  const parsed = consentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("guardian_consents").insert({
    guardian_id: viewer.id,
    player_id: parsed.data.playerId,
    consent_type: parsed.data.consentType,
    granted: parsed.data.granted,
    policy_version: POLICY_VERSION,
  });
  revalidatePath("/elternbereich");
}

export type MonthStatusState = { ok?: boolean; error?: string };

/** Eltern melden für einen Monat: aktiv oder pausiert (mit Grund). Der Trainer erhält eine E-Mail. */
export async function setMonthStatus(_: MonthStatusState, formData: FormData): Promise<MonthStatusState> {
  const viewer = await requireViewer();
  const parsed = monthStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Angaben." };
  const { playerId, month, active, reason, note } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("player_month_status")
    .upsert(
      { player_id: playerId, month, active, reason, note, set_by: viewer.id, updated_at: new Date().toISOString() },
      { onConflict: "player_id,month" },
    );
  if (error) return { error: "Das hat leider nicht geklappt. Bitte später erneut versuchen." };

  const { data: player } = await supabase.from("players").select("first_name, last_name").eq("id", playerId).maybeSingle();
  const mail = monthStatusNotification(
    {
      playerName: player ? `${player.first_name} ${player.last_name}` : "Spieler",
      parentName: viewer.fullName,
      month,
      active,
      reason,
      note,
    },
    publicEnv.siteUrl(),
  );
  after(() => notifyCoach({ ...mail, replyTo: viewer.email ?? undefined }));
  revalidatePath("/elternbereich");
  return { ok: true };
}
