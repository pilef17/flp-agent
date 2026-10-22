import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff, type Role } from "@/lib/routes";

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string;
  roles: Role[];
};

/** Aktueller Benutzer inkl. Rollen aus der Datenbank (pro Request gecacht). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  return {
    id: userId,
    email: profile?.email ?? (data.claims.email as string | undefined) ?? null,
    fullName: profile?.full_name ?? "",
    roles: (roleRows ?? []).map((r) => r.role as Role),
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/**
 * Darstellungsschutz für Admin-Seiten. Die eigentliche Durchsetzung erfolgt
 * zusätzlich über RLS in der Datenbank.
 */
export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!isStaff(viewer.roles)) redirect("/startseite");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("admin")) redirect("/admin");
  return viewer;
}
