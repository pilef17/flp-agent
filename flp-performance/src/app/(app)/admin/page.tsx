import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardTitle, Stat } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Admin" };

const ENTITY_LABEL: Record<string, string> = {
  players: "Spieler",
  guardian_player_links: "Eltern-Verknüpfung",
  coach_player_links: "Coaching-Zugang",
  guardian_consents: "Einwilligung",
  assessments: "Beurteilung",
  coach_feedback: "Feedback",
  products: "Produkt",
  entitlements: "Programmzugang",
  orders: "Bestellung",
  privacy_requests: "Datenschutz-Antrag",
  user_roles: "Rolle",
};
const ACTION_LABEL: Record<string, string> = { insert: "erstellt", update: "geändert", delete: "gelöscht" };

export default async function AdminDashboard() {
  const viewer = await requireStaff();
  const isAdmin = viewer.roles.includes("admin");
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };

  const [players, coached, privacyOpen, products, audit] = await Promise.all([
    supabase.from("players").select("id", count).eq("is_archived", false),
    supabase.from("coach_player_links").select("id", count).eq("status", "active"),
    isAdmin ? supabase.from("privacy_requests").select("id", count).in("status", ["open", "in_progress"]) : null,
    supabase.from("products").select("id", count).eq("is_active", true),
    isAdmin
      ? supabase.from("audit_logs").select("id, action, entity_type, created_at").order("created_at", { ascending: false }).limit(8)
      : null,
  ]);

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "Administrator" : "Trainer"}
        title="Übersicht"
        action={<ButtonLink href="/admin/spieler">Spieler verwalten</ButtonLink>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Spieler" value={players.count ?? 0} hint="Aktive Profile" />
        <Stat label="Coaching-Kunden" value={coached.count ?? 0} hint="Aktiver Coaching-Zugang" />
        <Stat label="Aktive Programme" value={products.count ?? 0} hint="Im Shop sichtbar" />
        {isAdmin && <Stat label="Datenschutz" value={privacyOpen?.count ?? 0} hint="Offene Anträge" />}
      </div>

      {isAdmin && (
        <Card className="mt-6">
          <CardTitle
            eyebrow="Audit-Log"
            title="Letzte sensible Änderungen"
            action={
              <Link href="/admin/datenschutz" className="text-sm text-gold hover:underline">
                Datenschutz-Anträge →
              </Link>
            }
          />
          {(audit?.data ?? []).length === 0 ? (
            <EmptyState title="Noch keine Einträge" text="Änderungen an Spielern, Zugängen und Beurteilungen werden hier protokolliert." />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {audit!.data!.map((a) => (
                <li key={a.id} className="flex justify-between gap-4 py-2.5">
                  <span>
                    {ENTITY_LABEL[a.entity_type] ?? a.entity_type} {ACTION_LABEL[a.action] ?? a.action}
                  </span>
                  <span className="text-mute">{formatDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
