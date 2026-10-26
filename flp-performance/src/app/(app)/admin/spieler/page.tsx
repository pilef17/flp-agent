import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirthYear } from "@/lib/format";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { CreatePlayerForm } from "./Forms";

export const metadata: Metadata = { title: "Spieler" };

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 60).replace(/[%_,()]/g, "");
  const supabase = await createClient();

  let query = supabase
    .from("players")
    .select("id, first_name, last_name, birth_year, position, is_test_data, coach_player_links(status), guardian_player_links(status)")
    .eq("is_archived", false)
    .order("last_name")
    .limit(200);
  if (term) query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
  const { data: players, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader eyebrow="Verwaltung" title="Spieler" text="Profile sind standardmässig privat und nur für zuständige Trainer und verknüpfte Eltern sichtbar." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle eyebrow="Übersicht" title={`${players?.length ?? 0} Spieler`} />
          <form className="mb-5" role="search">
            <label htmlFor="q" className="sr-only">
              Spieler suchen
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Name suchen …" className="field" />
          </form>
          {(players ?? []).length === 0 ? (
            <EmptyState
              title={term ? "Keine Treffer" : "Noch keine Spieler"}
              text={term ? `Kein Spieler entspricht «${term}».` : "Erfasse den ersten Spieler im Formular «Spieler erfassen»."}
            />
          ) : (
            <ul className="divide-y divide-line">
              {players!.map((p) => {
                const coaching = p.coach_player_links?.some((c: { status: string }) => c.status === "active");
                const guardians = p.guardian_player_links?.filter((g: { status: string }) => g.status === "active").length ?? 0;
                return (
                  <li key={p.id}>
                    <Link href={`/admin/spieler/${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
                      <span>
                        <span className="font-medium">
                          {p.last_name} {p.first_name}
                        </span>
                        <span className="block text-xs text-mute">
                          {ageFromBirthYear(p.birth_year)} J.{p.position ? ` · ${p.position}` : ""} · {guardians} Eltern
                        </span>
                      </span>
                      <span className="flex gap-2">
                        {p.is_test_data && <Badge tone="danger">Test</Badge>}
                        {coaching && <Badge tone="gold">Coaching</Badge>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle eyebrow="Neu" title="Spieler erfassen" />
          <CreatePlayerForm />
        </Card>
      </div>
    </>
  );
}
