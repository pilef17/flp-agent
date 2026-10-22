import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { isStaff } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { loadMyPlayers } from "@/lib/data/my-players";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PlayerSwitcher } from "@/components/player/PlayerSwitcher";

export const metadata: Metadata = { title: "Trainer-Feedback" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ spieler?: string }> }) {
  const viewer = await requireViewer();
  if (isStaff(viewer.roles)) redirect("/admin/beurteilungen");
  const { spieler } = await searchParams;
  const supabase = await createClient();
  const players = await loadMyPlayers(supabase, viewer);
  if (players.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Trainer-Feedback" title="Feedback" />
        <EmptyState title="Noch kein Spielerprofil" text="Sobald der Trainer ein Spielerprofil mit deinem Konto verknüpft, erscheint hier sein Feedback." />
      </>
    );
  }
  const player = players.find((p) => p.id === spieler) ?? players[0];
  const { data: feedback, error } = await supabase
    .from("coach_feedback")
    .select("id, title, body, published_at")
    .eq("player_id", player.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader
        eyebrow={`Trainer-Feedback · ${player.first_name}`}
        title="Feedback"
        action={
          <Link href={`/entwicklung?spieler=${player.id}`} className="text-sm text-gold hover:underline">
            Entwicklung →
          </Link>
        }
      />
      <PlayerSwitcher players={players} activeId={player.id} href={(id) => `/feedback?spieler=${id}`} />
      {(feedback ?? []).length === 0 ? (
        <EmptyState title="Noch kein Feedback" text="Freigegebene Rückmeldungen des Trainers erscheinen hier." />
      ) : (
        <ol className="max-w-3xl space-y-8">
          {feedback!.map((f) => (
            <li key={f.id}>
              <article className="border-l-2 border-gold pl-5">
                <p className="text-xs uppercase tracking-wider text-mute">{f.published_at ? formatDate(f.published_at) : ""}</p>
                <h2 className="mt-1 text-2xl font-bold">{f.title}</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-mute">{f.body}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
