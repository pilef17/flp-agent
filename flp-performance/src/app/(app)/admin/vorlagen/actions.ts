"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { fieldErrors, parseTemplateDays, weekTemplateSchema, type FormState } from "@/lib/validation";

const DAY_FIELDS = [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [`active_${d}`, `title_${d}`, `focus_${d}`, `startsAt_${d}`, `endsAt_${d}`]);

function keepTemplateValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(["title", "audience", "notes", ...DAY_FIELDS].map((k) => [k, formData.get(k)?.toString() ?? ""]));
}

function validate(formData: FormData) {
  const meta = weekTemplateSchema.safeParse(Object.fromEntries(formData));
  const { days, errors } = parseTemplateDays(formData);
  const allErrors = { ...(meta.success ? {} : fieldErrors(meta.error)), ...errors };
  if (meta.success && days.length === 0) allErrors._form = "Bitte mindestens einen Trainingstag aktivieren.";
  return { meta: meta.success ? meta.data : null, days, errors: allErrors };
}

const dayRow = (templateId: string) => (d: ReturnType<typeof validate>["days"][number]) => ({
  template_id: templateId,
  weekday: d.weekday,
  title: d.title,
  focus: d.focus,
  starts_at: d.startsAt,
  ends_at: d.endsAt,
});

export async function createTemplate(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepTemplateValues(formData);
  const { meta, days, errors } = validate(formData);
  if (!meta || Object.keys(errors).length) return { errors, message: errors._form, values };

  const supabase = await createClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("week_templates").insert({ id, ...meta });
  if (error) return { message: "Die Vorlage konnte nicht erstellt werden.", values };
  const { error: daysError } = await supabase.from("week_template_days").insert(days.map(dayRow(id)));
  if (daysError) {
    await supabase.from("week_templates").delete().eq("id", id);
    return { message: "Die Trainingstage konnten nicht gespeichert werden.", values };
  }
  revalidatePath("/admin/vorlagen");
  redirect(`/admin/vorlagen/${id}?neu=1`);
}

export async function updateTemplate(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = keepTemplateValues(formData);
  const id = z.guid().safeParse(formData.get("templateId"));
  if (!id.success) return { message: "Unbekannte Vorlage.", values };
  const { meta, days, errors } = validate(formData);
  if (!meta || Object.keys(errors).length) return { errors, message: errors._form, values };

  const supabase = await createClient();
  const { error } = await supabase.from("week_templates").update(meta).eq("id", id.data);
  // Erst aktive Tage speichern, dann Ruhetage entfernen: bei einem Fehler bleibt die alte Woche erhalten
  const { error: upsertError } = error
    ? { error }
    : await supabase.from("week_template_days").upsert(days.map(dayRow(id.data)), { onConflict: "template_id,weekday" });
  if (upsertError) return { message: "Die Vorlage konnte nicht gespeichert werden.", values };
  await supabase
    .from("week_template_days")
    .delete()
    .eq("template_id", id.data)
    .not("weekday", "in", `(${days.map((d) => d.weekday).join(",")})`);
  revalidatePath(`/admin/vorlagen/${id.data}`);
  revalidatePath("/admin/vorlagen");
  return { ok: true, message: "Vorlage gespeichert. Bestehende Pläne bleiben unverändert.", values };
}

export async function deleteTemplate(formData: FormData) {
  await requireStaff();
  const id = z.guid().safeParse(formData.get("templateId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("week_templates").delete().eq("id", id.data);
  revalidatePath("/admin/vorlagen");
  redirect("/admin/vorlagen");
}
