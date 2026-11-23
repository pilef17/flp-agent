"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { notifyFamily } from "@/lib/mail";
import { decisionMail, decisionSchema } from "@/lib/training-requests";

/** Trainer bestätigt, sagt ab oder markiert als erledigt. Eltern erhalten bei Bestätigung/Absage eine E-Mail. */
export async function decideRequest(formData: FormData) {
  await requireStaff();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { requestId, status, confirmedTime, coachNote } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("training_requests").select("status").eq("id", requestId).maybeSingle();
  const { data: row, error } = await supabase
    .from("training_requests")
    .update({ status, confirmed_time: confirmedTime, coach_note: coachNote, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("day, wish_times, location, confirmed_time, requested_by, players(first_name)")
    .maybeSingle();
  if (error || !row) return;

  if ((status === "bestaetigt" || status === "abgelehnt") && before?.status !== status && row.requested_by) {
    // E-Mail-Adresse des Elternteils nur serverseitig lesen
    const { data: parent } = await createAdminClient().from("profiles").select("email").eq("id", row.requested_by).maybeSingle();
    const player = row.players as unknown as { first_name: string } | null;
    const mail = decisionMail(
      {
        playerName: player?.first_name ?? "Ihr Kind",
        status,
        coachNote,
        day: row.day,
        wish_times: row.wish_times,
        location: row.location,
        confirmed_time: row.confirmed_time,
      },
      publicEnv.siteUrl(),
    );
    if (parent?.email) after(() => notifyFamily(parent.email, mail));
  }
  revalidatePath("/admin/agenda");
}
