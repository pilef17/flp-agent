"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { POLICY_VERSION } from "@/lib/consent";
import { consentSchema } from "@/lib/validation";

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
