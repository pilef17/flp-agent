import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { todayInSwitzerland } from "@/lib/dates";
import { PageHeader, Badge, Alert } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { ScoreEditor, type ScoreCategory } from "../Forms";
import { deleteAssessmentDraft, saveAssessment } from "../actions";

export const metadata: Metadata = { title: "Beurteilung" };

export default async function AssessmentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const [{ data: a }, { data: categories }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, kind, assessed_on, status, coach_notes, published_at, players(id, first_name, last_name), profiles:coach_id(full_name), assessment_scores(category_id, score, note)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("assessment_categories").select("id, name, position").order("position"),
  ]);
  if (!a) notFound();

  const player = a.players as unknown as { id: string; first_name: string; last_name: string };
  const coach = a.profiles as unknown as { full_name: string } | null;
  const scores = a.assessment_scores as { category_id: string; score: number | null; note: string }[];
  const rows: ScoreCategory[] = (categories ?? []).map((c) => {
    const s = scores.find((x) => x.category_id === c.id);
    return { id: c.id, name: c.name, score: s?.score ?? null, note: s?.note ?? "" };
  });
  const published = a.status === "published";
  const kindLabel = a.kind === "initial" ? "Erstbeurteilung" : "Folgebeurteilung";

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/admin/spieler/${player.id}`} className="text-mute hover:text-paper">
          ← {player.first_name} {player.last_name}
        </Link>
      </p>
      <PageHeader
        eyebrow={`${kindLabel} · ${formatDate(a.assessed_on)}`}
        title={`${player.first_name} ${player.last_name}`}
        text={coach?.full_name ? `Trainer: ${coach.full_name}` : undefined}
        action={published ? <Badge tone="ok">Veröffentlicht</Badge> : <Badge tone="danger">Entwurf</Badge>}
      />

      {published ? (
        <>
          <div className="mb-6">
            <Alert tone="info">
              Veröffentlicht am {formatDate(a.published_at!)}. Veröffentlichte Beurteilungen bleiben als Verlauf unverändert. Für eine Korrektur eine neue
              Folgebeurteilung erfassen.
            </Alert>
          </div>
          <Card>
            <dl className="divide-y divide-line">
              {rows.map((r) => (
                <div key={r.id} className="grid gap-1 py-3 sm:grid-cols-[13rem_4rem_1fr] sm:items-center">
                  <dt className="font-medium">{r.name}</dt>
                  <dd className="text-gold tabular-nums">{r.score ?? "n. b."}</dd>
                  <dd className="text-sm text-mute">{r.note}</dd>
                </div>
              ))}
            </dl>
            {a.coach_notes && <p className="mt-6 whitespace-pre-line border-t border-line pt-6 text-sm text-mute">{a.coach_notes}</p>}
          </Card>
        </>
      ) : (
        <>
          <Card>
            <ScoreEditor
              action={saveAssessment.bind(null, a.id)}
              categories={rows}
              assessedOn={a.assessed_on}
              coachNotes={a.coach_notes}
              today={todayInSwitzerland()}
            />
          </Card>
          <form action={deleteAssessmentDraft} className="mt-8">
            <input type="hidden" name="assessmentId" value={a.id} />
            <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
              Entwurf verwerfen
            </button>
          </form>
        </>
      )}
    </>
  );
}
