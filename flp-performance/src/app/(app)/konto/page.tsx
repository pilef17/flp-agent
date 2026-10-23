import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, Badge, EmptyState } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProfileForm, PrivacyRequestForm } from "./Forms";

export const metadata: Metadata = { title: "Konto & Datenschutz" };

const TYPE_LABEL = { export: "Auskunft", correction: "Berichtigung", deletion: "Löschung" } as const;
const STATUS_LABEL = { open: "Offen", in_progress: "In Bearbeitung", completed: "Erledigt", rejected: "Abgelehnt" } as const;

export default async function AccountPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: profile }, { data: links }, { data: requests }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", viewer.id).single(),
    supabase.from("guardian_player_links").select("players(id, first_name, last_name)").eq("guardian_id", viewer.id).eq("status", "active"),
    supabase.from("privacy_requests").select("id, request_type, status, created_at, resolution_note").eq("requester_id", viewer.id).order("created_at", { ascending: false }),
  ]);

  const players = (links ?? [])
    .map((l) => l.players as unknown as { id: string; first_name: string; last_name: string } | null)
    .filter((p): p is { id: string; first_name: string; last_name: string } => Boolean(p))
    .map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }));

  return (
    <>
      <PageHeader eyebrow="Einstellungen" title="Konto & Datenschutz" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Profil" title="Persönliche Angaben" />
          <p className="mb-5 text-sm text-mute">E-Mail: {viewer.email}</p>
          <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/passwort-neu" className="text-gold underline underline-offset-4 hover:text-paper">
              Passwort ändern
            </Link>
            <Link href="/meine-kaeufe" className="text-gold underline underline-offset-4 hover:text-paper">
              Meine Käufe
            </Link>
          </p>
        </Card>

        <Card>
          <CardTitle eyebrow="Deine Rechte" title="Datenschutz-Antrag" />
          <p className="mb-5 text-sm text-mute">
            Du kannst Auskunft über die gespeicherten Daten, deren Berichtigung oder Löschung verlangen – für dich und deine Kinder.{" "}
            <Link href="/datenschutz" className="text-paper underline underline-offset-4">
              Datenschutzerklärung
            </Link>
          </p>
          <PrivacyRequestForm players={players} />
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle eyebrow="Verlauf" title="Meine Anträge" />
          {(requests ?? []).length === 0 ? (
            <EmptyState title="Keine Anträge" text="Du hast bisher keinen Datenschutz-Antrag gestellt." />
          ) : (
            <ul className="divide-y divide-line">
              {requests!.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{TYPE_LABEL[r.request_type as keyof typeof TYPE_LABEL]}</p>
                    <p className="text-xs text-mute">{formatDate(r.created_at)}</p>
                    {r.resolution_note && <p className="mt-1 text-sm text-mute">{r.resolution_note}</p>}
                  </div>
                  <Badge tone={r.status === "completed" ? "ok" : r.status === "rejected" ? "danger" : "gold"}>
                    {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
