"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.object({ answerId: z.guid() });

/** Antwort löschen (z. B. Spam oder Testeintrag). RLS erlaubt das nur Admin/Coach. */
export async function deleteAnswer(formData: FormData) {
  await requireStaff();
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("weekly_answers").delete().eq("id", parsed.data.answerId);
  revalidatePath("/admin/wochenfrage");
}
