"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { privacyStatusSchema } from "@/lib/validation";

export async function updatePrivacyRequest(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = privacyStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const done = parsed.data.status === "completed" || parsed.data.status === "rejected";
  const supabase = await createClient();
  await supabase
    .from("privacy_requests")
    .update({
      status: parsed.data.status,
      resolution_note: parsed.data.resolutionNote,
      resolved_by: done ? viewer.id : null,
      resolved_at: done ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.requestId);
  revalidatePath("/admin/datenschutz");
}
