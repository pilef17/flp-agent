import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { loadPlayerOverview } from "@/lib/data/player-overview";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PlayerOverview } from "@/components/player/PlayerOverview";

export const metadata: Metadata = { title: "Startseite" };

export default async function PlayerHome() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("player")) redirect(homePathFor(viewer.roles));

  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!player) {
    return (
      <>
        <PageHeader eyebrow="Startseite" title="Willkommen" />
        <EmptyState title="Profil noch nicht verbunden" text="Dein Login ist noch mit keinem Spielerprofil verbunden. Bitte melde dich bei deinem Trainer." />
      </>
    );
  }

  const data = await loadPlayerOverview(supabase, player.id);
  return (
    <>
      <PageHeader eyebrow="Startseite" title={`Hoi ${player.first_name}`} text="Trainiere nicht einfach mehr. Trainiere besser." />
      <PlayerOverview data={data} playerId={player.id} />
    </>
  );
}
