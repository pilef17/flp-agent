"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { fieldErrors, inviteGuardianSchema, keepValues, playerSchema, type FormState } from "@/lib/validation";

export async function createPlayer(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  const values = keepValues(formData, ["firstName", "lastName", "birthYear", "position", "dominantFoot", "club"]);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      first_name: d.firstName,
      last_name: d.lastName,
      birth_year: d.birthYear,
      position: d.position || null,
      dominant_foot: d.dominantFoot || null,
      club: d.club || null,
    })
    .select("id")
    .single();
  if (error || !data) return { message: "Der Spieler konnte nicht erfasst werden.", values };
  revalidatePath("/admin/spieler");
  redirect(`/admin/spieler/${data.id}?erstellt=1`);
}

/**
 * Elternteil einladen und mit dem Spieler verknüpfen.
 * Der Service-Client wird nur für die Konto-Suche/Einladung verwendet; die
 * Verknüpfung selbst läuft über den Benutzer-Client und damit über RLS.
 */
export async function inviteGuardian(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = inviteGuardianSchema.safeParse(Object.fromEntries(formData));
  const values = keepValues(formData, ["fullName", "email", "relationship"]);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { playerId, email, fullName, relationship } = parsed.data;
  const supabase = await createClient();

  // Berechtigung: Spieler muss für diesen Coach sichtbar und bearbeitbar sein
  const { data: player } = await supabase.from("players").select("id").eq("id", playerId).maybeSingle();
  if (!player) return { message: "Spieler nicht gefunden oder kein Zugriff.", values };

  const admin = createAdminClient();
  let guardianId: string | null = null;
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  let invited = false;
  if (existing) {
    guardianId = existing.id;
  } else {
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${publicEnv.siteUrl()}/auth/einladung`,
    });
    if (inviteError || !invite.user) return { message: "Die Einladung konnte nicht gesendet werden.", values };
    guardianId = invite.user.id;
    invited = true;
  }

  const { error } = await supabase
    .from("guardian_player_links")
    .upsert(
      { guardian_id: guardianId, player_id: playerId, relationship, status: "active", revoked_at: null },
      { onConflict: "guardian_id,player_id" },
    );
  if (error) return { message: "Die Verknüpfung konnte nicht gespeichert werden.", values };

  revalidatePath(`/admin/spieler/${playerId}`);
  return {
    ok: true,
    message: invited
      ? `Einladung an ${email} gesendet und mit dem Spieler verknüpft.`
      : `Bestehendes Konto ${email} mit dem Spieler verknüpft.`,
  };
}

const idSchema = z.object({ linkId: z.guid(), playerId: z.guid() });

export async function revokeGuardian(formData: FormData) {
  await requireStaff();
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("guardian_player_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.linkId);
  revalidatePath(`/admin/spieler/${parsed.data.playerId}`);
}

const coachingSchema = z.object({ playerId: z.guid(), active: z.enum(["true", "false"]) });

/** Coaching-Zugang gewähren/entziehen (nur Administrator, zusätzlich per RLS erzwungen). */
export async function setCoachingAccess(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = coachingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = parsed.data.active === "true";
  const supabase = await createClient();
  await supabase.from("coach_player_links").upsert(
    {
      coach_id: viewer.id,
      player_id: parsed.data.playerId,
      status: active ? "active" : "revoked",
      ended_on: active ? null : new Date().toISOString().slice(0, 10),
    },
    { onConflict: "coach_id,player_id" },
  );
  if (!active) {
    // Auch Zuweisungen anderer Coaches beenden
    await supabase
      .from("coach_player_links")
      .update({ status: "revoked", ended_on: new Date().toISOString().slice(0, 10) })
      .eq("player_id", parsed.data.playerId);
  }
  revalidatePath(`/admin/spieler/${parsed.data.playerId}`);
}
