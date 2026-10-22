import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { isStaff } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { loadPlayerOverview } from "@/lib/data/player-overview";
import { ageFromBirthYear } from "@/lib/format";
import { PageHeader, Badge } from "@/components/ui/Feedback";
import { PlayerOverview } from "@/components/player/PlayerOverview";

export const metadata: Metadata = { title: "Spielerprofil" };

const FOOT = { links: "Links", rechts: "Rechts", beidfuessig: "Beidfüssig" } as const;

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (isStaff(viewer.roles)) redirect(`/admin/spieler/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  // RLS: nur eigene Kinder bzw. das eigene Profil
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name, birth_year, position, dominant_foot, club, coach_player_links(status)")
    .eq("id", id)
    .maybeSingle();
  if (!player) notFound();

  const overview = await loadPlayerOverview(supabase, player.id);
  const coaching = (player.coach_player_links ?? []).some((c: { status: string }) => c.status === "active");
  const facts = [
    ["Alter", `${ageFromBirthYear(player.birth_year)} Jahre`],
    ["Jahrgang", String(player.birth_year)],
    ["Position", player.position || "–"],
    ["Starker Fuss", player.dominant_foot ? FOOT[player.dominant_foot as keyof typeof FOOT] : "–"],
    ["Verein", player.club || "–"],
    ["Beurteilungen", String(overview.assessmentCount)],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Spielerprofil"
        title={`${player.first_name} ${player.last_name}`}
        action={coaching ? <Badge tone="gold">Coaching aktiv</Badge> : <Badge>Kein aktives Coaching</Badge>}
      />
      <dl className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {facts.map(([k, v]) => (
          <div key={k} className="bg-graphite p-4">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-1.5 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <PlayerOverview data={overview} playerId={player.id} />
      <p className="mt-8 text-xs text-mute">
        Angaben falsch?{" "}
        <Link href="/konto" className="text-paper underline underline-offset-4">
          Berichtigung beantragen
        </Link>
      </p>
    </>
  );
}
