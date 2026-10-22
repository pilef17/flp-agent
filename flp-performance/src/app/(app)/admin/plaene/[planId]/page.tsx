import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { weekDays, weekdayName, shortDate, weekLabel } from "@/lib/dates";
import { dosage } from "@/lib/exercises";
import { PageHeader, Badge, EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { AddExerciseForm, AddSessionForm, type ExerciseOption } from "../Forms";
import { deletePlan, deleteSession, moveSessionExercise, removeSessionExercise, setPlanStatus } from "../actions";

export const metadata: Metadata = { title: "Trainingsplan bearbeiten" };

type Item = {
  id: string;
  position: number;
  sets: number | null;
  repetitions: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string;
  exercises: { code: string; title: string; status: string } | null;
};
type Session = { id: string; title: string; scheduled_on: string; notes: string; session_exercises: Item[] };

export default async function PlanBuilderPage({ params }: { params: Promise<{ planId: string }> }) {
  await requireStaff();
  const { planId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(planId)) notFound();
  const supabase = await createClient();

  const [{ data: plan }, { data: exerciseRows }] = await Promise.all([
    supabase
      .from("training_plans")
      .select(
        "id, title, notes, week_start, status, players(id, first_name, last_name), training_sessions(id, title, scheduled_on, notes, session_exercises(id, position, sets, repetitions, duration_seconds, rest_seconds, notes, exercises(code, title, status)))",
      )
      .eq("id", planId)
      .maybeSingle(),
    supabase.from("exercises").select("id, code, title, category").eq("status", "published").order("code"),
  ]);
  if (!plan) notFound();

  const player = plan.players as unknown as { id: string; first_name: string; last_name: string };
  const sessions = ((plan.training_sessions ?? []) as unknown as Session[]).sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on));
  const days = weekDays(plan.week_start);
  const exercises = (exerciseRows ?? []) as ExerciseOption[];
  const published = plan.status === "published";
  const exerciseCount = sessions.reduce((n, s) => n + s.session_exercises.length, 0);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/admin/spieler/${player.id}`} className="text-mute hover:text-paper">
          ← {player.first_name} {player.last_name}
        </Link>
      </p>
      <PageHeader
        eyebrow={`Trainingsplan · ${weekLabel(plan.week_start)}`}
        title={plan.title}
        text={plan.notes || undefined}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {published ? <Badge tone="ok">Veröffentlicht</Badge> : <Badge tone="danger">Entwurf</Badge>}
            <form action={setPlanStatus}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="status" value={published ? "draft" : "published"} />
              <button
                type="submit"
                disabled={!published && exerciseCount === 0}
                className={`min-h-11 rounded-card border px-4 text-sm disabled:opacity-40 ${published ? "border-line text-mute hover:text-paper" : "border-gold bg-gold font-semibold text-ink hover:bg-gold-soft"}`}
              >
                {published ? "Zurückziehen" : "Für Familie veröffentlichen"}
              </button>
            </form>
          </div>
        }
      />

      <Card className="mb-6">
        <p className="eyebrow mb-4">Neue Einheit</p>
        <AddSessionForm planId={plan.id} days={days.map((d) => ({ value: d, label: `${weekdayName(d)}, ${shortDate(d)}` }))} />
      </Card>

      {sessions.length === 0 ? (
        <EmptyState title="Noch keine Einheiten" text="Füge oben die erste Trainingseinheit dieser Woche hinzu." />
      ) : (
        <div className="space-y-6">
          {sessions.map((s) => {
            const items = [...s.session_exercises].sort((a, b) => a.position - b.position);
            return (
              <Card key={s.id}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">
                      {weekdayName(s.scheduled_on)}, {shortDate(s.scheduled_on)}
                    </p>
                    <h2 className="mt-1 text-xl font-bold">{s.title}</h2>
                  </div>
                  <form action={deleteSession}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="sessionId" value={s.id} />
                    <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
                      Einheit entfernen
                    </button>
                  </form>
                </div>
                {items.length > 0 && (
                  <ol className="mb-4 space-y-2">
                    {items.map((it, idx) => (
                      <li key={it.id} className="flex items-center gap-3 rounded-card bg-ink px-3 py-2 text-sm">
                        <span className="w-5 text-center text-xs text-mute">{idx + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            <span className="mr-2 text-xs text-gold">{it.exercises?.code}</span>
                            {it.exercises?.title}
                            {it.exercises?.status === "draft" && (
                              <span className="ml-2">
                                <Badge tone="danger">Entwurf – für Familie unsichtbar</Badge>
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-mute">{[dosage(it), it.notes].filter(Boolean).join(" · ")}</span>
                        </span>
                        <ItemButton planId={plan.id} itemId={it.id} action={moveSessionExercise} direction="up" label="Nach oben" disabled={idx === 0}>
                          ↑
                        </ItemButton>
                        <ItemButton planId={plan.id} itemId={it.id} action={moveSessionExercise} direction="down" label="Nach unten" disabled={idx === items.length - 1}>
                          ↓
                        </ItemButton>
                        <ItemButton planId={plan.id} itemId={it.id} action={removeSessionExercise} label="Entfernen">
                          ✕
                        </ItemButton>
                      </li>
                    ))}
                  </ol>
                )}
                {exercises.length === 0 ? (
                  <p className="text-sm text-mute">
                    Keine freigegebenen Übungen. <Link href="/admin/uebungen" className="text-gold underline">Übungen verwalten</Link>
                  </p>
                ) : (
                  <AddExerciseForm planId={plan.id} sessionId={s.id} exercises={exercises} />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!published && (
        <form action={deletePlan} className="mt-10 border-t border-line pt-6">
          <input type="hidden" name="planId" value={plan.id} />
          <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
            Entwurf löschen
          </button>
        </form>
      )}
    </>
  );
}

function ItemButton({
  planId,
  itemId,
  action,
  direction,
  label,
  disabled,
  children,
}: {
  planId: string;
  itemId: string;
  action: (fd: FormData) => Promise<void>;
  direction?: "up" | "down";
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="itemId" value={itemId} />
      {direction && <input type="hidden" name="direction" value={direction} />}
      <button type="submit" disabled={disabled} aria-label={label} title={label} className="flex size-11 items-center justify-center rounded-card text-mute hover:text-gold disabled:opacity-25">
        {children}
      </button>
    </form>
  );
}

