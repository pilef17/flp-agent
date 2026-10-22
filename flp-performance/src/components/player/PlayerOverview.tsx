import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState, Badge } from "@/components/ui/Feedback";
import { CompetencyChart } from "@/components/charts/CompetencyChart";
import { formatDate } from "@/lib/format";
import type { loadPlayerOverview } from "@/lib/data/player-overview";
import { toggleCompletion } from "./completion-actions";

type Overview = Awaited<ReturnType<typeof loadPlayerOverview>>;

const weekday = new Intl.DateTimeFormat("de-CH", { weekday: "long", day: "2-digit", month: "2-digit" });

export function PlayerOverview({ data }: { data: Overview }) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardTitle eyebrow="Meine Entwicklung" title="Kompetenzprofil" />
        {data.initial || data.current ? (
          <CompetencyChart categories={data.categories} initial={data.initial} current={data.current} />
        ) : (
          <EmptyState
            title="Noch keine Beurteilung"
            text="Sobald der Trainer eine Beurteilung veröffentlicht, erscheint hier das Kompetenzprofil."
          />
        )}
      </Card>

      <Card className="lg:col-span-2">
        <CardTitle eyebrow="Trainer-Feedback" title="Neueste Rückmeldungen" />
        {data.feedback.length === 0 ? (
          <EmptyState title="Noch kein Feedback" text="Freigegebenes Feedback des Trainers wird hier angezeigt." />
        ) : (
          <ul className="space-y-5">
            {data.feedback.map((f) => (
              <li key={f.id} className="border-l-2 border-gold pl-4">
                <p className="text-xs text-mute">{f.published_at ? formatDate(f.published_at) : ""}</p>
                <p className="mt-1 font-semibold">{f.title}</p>
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-mute">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="lg:col-span-5">
        <CardTitle eyebrow="Trainingsplan" title={data.plan?.title ?? "Diese Woche"} />
        {data.sessions.length === 0 ? (
          <EmptyState title="Kein Plan für diese Woche" text="Der Trainer hat für diese Woche noch keinen Trainingsplan veröffentlicht." />
        ) : (
          <ul className="divide-y divide-line">
            {data.sessions.map((s) => (
              <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-mute">{weekday.format(new Date(s.scheduledOn))}</p>
                    <p className="font-semibold">{s.title}</p>
                  </div>
                  <CompletionButton sessionId={s.id} done={s.completed} label="Einheit" />
                </div>
                {s.exercises.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {s.exercises.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 rounded-card bg-ink px-3 py-2 text-sm">
                        <span>
                          <span className="mr-2 text-xs text-gold">{e.code}</span>
                          {e.title}
                        </span>
                        <CompletionButton sessionId={s.id} sessionExerciseId={e.id} done={e.completed} label="Übung" />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CompletionButton({
  sessionId,
  sessionExerciseId = "",
  done,
  label,
}: {
  sessionId: string;
  sessionExerciseId?: string;
  done: boolean;
  label: string;
}) {
  return (
    <form action={toggleCompletion}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionExerciseId" value={sessionExerciseId} />
      <input type="hidden" name="done" value={done ? "false" : "true"} />
      <button type="submit" className="min-h-11 px-1" aria-label={done ? `${label} als offen markieren` : `${label} als erledigt markieren`}>
        {done ? <Badge tone="ok">Erledigt ✓</Badge> : <Badge>Offen</Badge>}
      </button>
    </form>
  );
}
