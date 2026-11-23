"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.object({ leadId: z.guid() });

/** Anfrage löschen (erledigt, Spam oder auf Wunsch der Eltern). RLS erlaubt das nur Admin/Coach. */
export async function deleteLead(formData: FormData) {
  await requireStaff();
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("check_leads").delete().eq("id", parsed.data.leadId);
  revalidatePath("/admin/check");
}
