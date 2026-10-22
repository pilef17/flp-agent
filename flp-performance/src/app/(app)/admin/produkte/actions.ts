"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { parseChf, slugify } from "@/lib/commerce";
import { isMediaPathFor } from "@/lib/exercises";
import { articleSchema, fieldErrors, keepValues, productSchema, type FormState } from "@/lib/validation";

const FIELDS = ["title", "slug", "summary", "description", "price", "accessDays", "position"];

function toRow(d: z.infer<typeof productSchema>, price: number) {
  return {
    title: d.title,
    slug: d.slug || slugify(d.title),
    summary: d.summary,
    description: d.description,
    price_cents: price,
    access_days: d.accessDays,
    position: d.position,
  };
}

function priceOrError(raw: string): { price: number } | { error: string } {
  const price = parseChf(raw);
  if (price === null) return { error: "Bitte einen gültigen Betrag eingeben, z.B. 39.00." };
  if (price < 100) return { error: "Mindestpreis CHF 1.00." };
  return { price };
}

export async function createProduct(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = keepValues(formData, FIELDS);
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const p = priceOrError(parsed.data.price);
  if ("error" in p) return { errors: { price: p.error }, values };
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").insert(toRow(parsed.data, p.price)).select("id").single();
  if (error?.code === "23505") return { errors: { slug: "Diese Adresse (Slug) ist bereits vergeben." }, values };
  if (error || !data) return { message: "Das Programm konnte nicht erstellt werden.", values };
  revalidatePath("/admin/produkte");
  redirect(`/admin/produkte/${data.id}?erstellt=1`);
}

export async function updateProduct(id: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = keepValues(formData, FIELDS);
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const p = priceOrError(parsed.data.price);
  if ("error" in p) return { errors: { price: p.error }, values };
  const supabase = await createClient();
  const { error } = await supabase.from("products").update(toRow(parsed.data, p.price)).eq("id", id);
  if (error?.code === "23505") return { errors: { slug: "Diese Adresse (Slug) ist bereits vergeben." }, values };
  if (error) return { message: "Speichern fehlgeschlagen.", values };
  revalidatePath(`/admin/produkte/${id}`);
  revalidatePath("/programme", "layout");
  return { ok: true, message: "Gespeichert. Bereits bezahlte Bestellungen behalten ihren Preis." };
}

const activeSchema = z.object({ id: z.guid(), active: z.enum(["true", "false"]) });

export async function setProductActive(formData: FormData) {
  await requireAdmin();
  const parsed = activeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  revalidatePath(`/admin/produkte/${parsed.data.id}`);
  revalidatePath("/programme", "layout");
}

export async function registerCover(productId: string, path: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!isMediaPathFor(productId, path)) return { ok: false, message: "Ungültiger Pfad." };
  const supabase = await createClient();
  const { data: old } = await supabase.from("products").select("cover_image_path").eq("id", productId).maybeSingle();
  const { error } = await supabase.from("products").update({ cover_image_path: path }).eq("id", productId);
  if (error) {
    await supabase.storage.from("product-covers").remove([path]);
    return { ok: false, message: "Titelbild konnte nicht gespeichert werden." };
  }
  if (old?.cover_image_path) await supabase.storage.from("product-covers").remove([old.cover_image_path]);
  revalidatePath(`/admin/produkte/${productId}`);
  return { ok: true };
}

async function nextPosition(supabase: Awaited<ReturnType<typeof createClient>>, productId: string) {
  const { data } = await supabase.from("product_content").select("position").eq("product_id", productId).order("position", { ascending: false }).limit(1).maybeSingle();
  return (data?.position ?? -1) + 1;
}

export async function addArticle(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = keepValues(formData, ["title", "body"]);
  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.from("product_content").insert({
    product_id: parsed.data.productId,
    kind: "article",
    title: parsed.data.title,
    body: parsed.data.body,
    position: await nextPosition(supabase, parsed.data.productId),
  });
  if (error) return { message: "Die Lektion konnte nicht gespeichert werden.", values };
  revalidatePath(`/admin/produkte/${parsed.data.productId}`);
  return { ok: true, values: { _n: crypto.randomUUID() } };
}

const exerciseItemSchema = z.object({ productId: z.guid(), exerciseId: z.guid({ error: "Bitte eine Übung wählen." }) });

export async function addExerciseItem(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = exerciseItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: ex } = await supabase.from("exercises").select("title, status").eq("id", parsed.data.exerciseId).maybeSingle();
  if (!ex) return { errors: { exerciseId: "Übung nicht gefunden." } };
  if (ex.status !== "published") return { errors: { exerciseId: "Bitte die Übung zuerst freigeben." } };
  const { error } = await supabase.from("product_content").insert({
    product_id: parsed.data.productId,
    kind: "exercise",
    title: ex.title,
    exercise_id: parsed.data.exerciseId,
    position: await nextPosition(supabase, parsed.data.productId),
  });
  if (error) return { message: "Die Übung konnte nicht hinzugefügt werden." };
  revalidatePath(`/admin/produkte/${parsed.data.productId}`);
  return { ok: true, values: { _n: crypto.randomUUID() } };
}

export async function registerProgramVideo(productId: string, path: string, title: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!isMediaPathFor(productId, path)) return { ok: false, message: "Ungültiger Pfad." };
  const t = title.trim();
  if (t.length < 2 || t.length > 160) return { ok: false, message: "Bitte einen Titel (2–160 Zeichen) eingeben." };
  const supabase = await createClient();
  const { error } = await supabase.from("product_content").insert({
    product_id: productId,
    kind: "video",
    title: t,
    storage_path: path,
    position: await nextPosition(supabase, productId),
  });
  if (error) {
    await supabase.storage.from("program-media").remove([path]);
    return { ok: false, message: "Das Video konnte nicht gespeichert werden." };
  }
  revalidatePath(`/admin/produkte/${productId}`);
  return { ok: true };
}

const itemSchema = z.object({ productId: z.guid(), itemId: z.guid() });

export async function deleteContentItem(formData: FormData) {
  await requireAdmin();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data } = await supabase.from("product_content").delete().eq("id", parsed.data.itemId).eq("product_id", parsed.data.productId).select("storage_path").maybeSingle();
  if (data?.storage_path) await supabase.storage.from("program-media").remove([data.storage_path]);
  revalidatePath(`/admin/produkte/${parsed.data.productId}`);
}

const moveSchema = itemSchema.extend({ direction: z.enum(["up", "down"]) });

export async function moveContentItem(formData: FormData) {
  await requireAdmin();
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: list } = await supabase.from("product_content").select("id").eq("product_id", parsed.data.productId).order("position").order("created_at");
  const order = (list ?? []).map((r) => r.id as string);
  const i = order.indexOf(parsed.data.itemId);
  const j = parsed.data.direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((id, position) => supabase.from("product_content").update({ position }).eq("id", id)));
  revalidatePath(`/admin/produkte/${parsed.data.productId}`);
}
