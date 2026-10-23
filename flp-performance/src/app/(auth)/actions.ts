"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/routes";
import {
  emailOnlySchema,
  fieldErrors,
  loginSchema,
  newPasswordSchema,
  registerSchema,
  keepValues,
  type FormState,
} from "@/lib/validation";

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = keepValues(formData, ["email"]);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Bewusst unspezifisch, um keine Konten preiszugeben
    return { message: "E-Mail oder Passwort ist nicht korrekt, oder die E-Mail ist noch nicht bestätigt.", values };
  }
  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const values = keepValues(formData, ["fullName", "email"]);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl()}/auth/confirm?next=/elternbereich`,
      data: { full_name: parsed.data.fullName, privacy_policy_accepted: new Date().toISOString() },
    },
  });
  if (error && error.code !== "user_already_exists") {
    if (error.code === "weak_password") return { errors: { password: "Dieses Passwort ist zu schwach." }, values };
    return { values, message: "Die Registrierung ist fehlgeschlagen. Bitte später erneut versuchen." };
  }
  // Gleiche Meldung auch bei bestehendem Konto (keine Konto-Enumeration)
  return {
    ok: true,
    message: "Fast geschafft: Wir haben dir eine E-Mail gesendet. Bitte bestätige deine Adresse über den Link.",
  };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl()}/auth/confirm?next=/passwort-neu`,
  });
  return {
    ok: true,
    message: "Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen gesendet.",
  };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { errors: { password: "Bitte ein neues Passwort wählen." } };
    if (error.code === "weak_password") return { errors: { password: "Dieses Passwort ist zu schwach." } };
    return { message: "Das Passwort konnte nicht geändert werden. Bitte fordere einen neuen Link an." };
  }
  redirect("/startseite");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
