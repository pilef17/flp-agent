import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { isStaff } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { loadMyPlayers } from "@/lib/data/my-players";
import { competencyHistory, initialAndCurrent, type AssessmentRow, type CategoryRow } from "@/lib/assessments";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { CompetencyChart } from "@/components/charts/CompetencyChart";
import { CompetencyHistory } from "@/components/charts/CompetencyHistory";
import { PlayerSwitcher } from "@/components/player/PlayerSwitcher";

export const metadata: Metadata = { title: "Meine Entwicklung" };

type FullAssessment = Omit<AssessmentRow, "assessment_scores"> & {
  coach_notes: string;
  assessment_scores: { category_id: string; score: number | null; note: string }[];
};

export default async function DevelopmentPage({ searchParams }: { searchParams: Promise<{ spieler?: string }> }) {
  const viewer = await requireViewer();
  if (isStaff(viewer.roles)) redirect("/admin/beurteilungen");
  const { spieler } = await searchParams;
  const supabase = await createClient();
  const players = await loadMyPlayers(supabase, viewer);
  if (players.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Meine Entwicklung" title="Entwicklung" />
        <EmptyState title="Noch kein Spielerprofil" text="Sobald der Trainer ein Spielerprofil mit deinem Konto verknüpft, erscheint hier die Entwicklung." />
      </>
    );
  }
  const player = players.find((p) => p.id === spieler) ?? players[0];

  const [{ data: cats }, { data: rows, error }] = await Promise.all([
    supabase.from("assessment_categories").select("id, name, position").order("position"),
    supabase
      .from("assessments")
      .select("id, kind, assessed_on, status, coach_notes, assessment_scores(category_id, score, note)")
      .eq("player_id", player.id)
      .eq("status", "published")
      .order("assessed_on"),
  ]);
  if (error) throw new Error(error.message);
  const categories = (cats ?? []) as CategoryRow[];
  const assessments = (rows ?? []) as FullAssessment[];
  const { initial, current } = initialAndCurrent(categories, assessments);
  const history = competencyHistory(categories, assessments);
  const newestFirst = [...assessments].reverse();

  return (
    <>
      <PageHeader
        eyebrow={`Meine Entwicklung · ${player.first_name}`}
        title="Entwicklung"
        text="Alle Werte stammen aus Beurteilungen des Trainers. Nichts wird geschätzt oder hochgerechnet."
        action={
          <Link href={`/feedback?spieler=${player.id}`} className="text-sm text-gold hover:underline">
            Trainer-Feedback →
          </Link>
        }
      />
      <PlayerSwitcher players={players} activeId={player.id} href={(id) => `/entwicklung?spieler=${id}`} />

      {assessments.length === 0 ? (
        <EmptyState title="Noch keine Beurteilung" text="Sobald der Trainer die erste Beurteilung veröffentlicht, siehst du hier die Entwicklung über die acht Kompetenzen." />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardTitle eyebrow="Vergleich" title="Erstbeurteilung und heute" />
            <CompetencyChart categories={categories.map((c) => c.name)} initial={initial} current={current} />
          </Card>

          {assessments.length > 1 && (
            <Card>
              <CardTitle eyebrow="Verlauf" title="Jede Kompetenz über die Zeit" />
              <CompetencyHistory series={history.map((h) => ({ name: h.category.name, points: h.points }))} />
            </Card>
          )}

          <Card>
            <CardTitle eyebrow="Tabelle" title="Alle Beurteilungen" />
            <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <caption className="sr-only">Werte aller veröffentlichten Beurteilungen, neueste zuerst</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mute">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Kompetenz
                    </th>
                    {newestFirst.map((a) => (
                      <th key={a.id} scope="col" className="px-2 py-2 text-right font-medium">
                        {formatDate(a.assessed_on)}
                        {a.kind === "initial" && <span className="block normal-case tracking-normal text-initial">Erst</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-line/60">
                      <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                        {c.name}
                      </th>
                      {newestFirst.map((a) => {
                        const s = a.assessment_scores.find((x) => x.category_id === c.id)?.score ?? null;
                        return (
                          <td key={a.id} className={`px-2 py-2.5 text-right tabular-nums ${s === null ? "text-mute" : ""}`}>
                            {s ?? "n. b."}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle eyebrow="Notizen" title="Kommentare des Trainers" />
            <ul className="space-y-6">
              {newestFirst.map((a) => {
                const notes = a.assessment_scores
                  .filter((s) => s.note)
                  .map((s) => ({ name: categories.find((c) => c.id === s.category_id)?.name ?? "", note: s.note }));
                if (!a.coach_notes && notes.length === 0) return null;
                return (
                  <li key={a.id} className="border-l-2 border-gold pl-4">
                    <p className="flex items-center gap-2 text-xs text-mute">
                      {formatDate(a.assessed_on)} {a.kind === "initial" && <Badge tone="danger">Erstbeurteilung</Badge>}
                    </p>
                    {a.coach_notes && <p className="mt-2 whitespace-pre-line text-sm">{a.coach_notes}</p>}
                    {notes.length > 0 && (
                      <dl className="mt-2 space-y-1 text-sm">
                        {notes.map((n) => (
                          <div key={n.name}>
                            <dt className="inline font-medium">{n.name}: </dt>
                            <dd className="inline text-mute">{n.note}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
