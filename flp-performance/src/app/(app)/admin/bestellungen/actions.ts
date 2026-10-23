"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { fieldErrors, grantSchema, keepValues, type FormState } from "@/lib/validation";

/** Manueller Programmzugang (z.B. Coaching-Kunden, Kulanz). Wird im Audit-Log protokolliert. */
export async function grantAccess(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const values = keepValues(formData, ["email", "productId", "accessDays"]);
  const parsed = grantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (!profile) return { errors: { email: "Kein Konto mit dieser E-Mail. Die Person muss sich zuerst registrieren." }, values };
  const ends = parsed.data.accessDays ? new Date(Date.now() + parsed.data.accessDays * 86400000).toISOString() : null;
  const { error } = await supabase.from("entitlements").insert({
    user_id: profile.id,
    product_id: parsed.data.productId,
    source: "manual",
    granted_by: viewer.id,
    ends_at: ends,
  });
  if (error) return { message: "Der Zugang konnte nicht vergeben werden.", values };
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: `Zugang für ${parsed.data.email} vergeben.`, values: { _n: crypto.randomUUID() } };
}

const revokeSchema = z.object({ entitlementId: z.guid() });

export async function revokeAccess(formData: FormData) {
  await requireAdmin();
  const parsed = revokeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("entitlements").update({ revoked_at: new Date().toISOString() }).eq("id", parsed.data.entitlementId).is("revoked_at", null);
  revalidatePath("/admin/bestellungen");
}
