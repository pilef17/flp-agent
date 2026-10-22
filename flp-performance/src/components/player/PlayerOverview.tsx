import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { CompetencyChart } from "@/components/charts/CompetencyChart";
import { formatDate } from "@/lib/format";
import type { loadPlayerOverview } from "@/lib/data/player-overview";
import { SessionBlock } from "./SessionList";

type Overview = Awaited<ReturnType<typeof loadPlayerOverview>>;

export function PlayerOverview({ data, playerId }: { data: Overview; playerId: string }) {
  const q = `?spieler=${playerId}`;
  const trainingsplanHref = `/trainingsplan${q}`;
  const entwicklungHref = `/entwicklung${q}`;
  const feedbackHref = `/feedback${q}`;
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardTitle
          eyebrow="Entwicklung"
          title="Kompetenzprofil"
          action={
            <Link href={entwicklungHref} className="text-sm text-gold hover:underline">
              Verlauf →
            </Link>
          }
        />
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
        <CardTitle
          eyebrow="Trainer-Feedback"
          title="Neueste Rückmeldungen"
          action={
            <Link href={feedbackHref} className="text-sm text-gold hover:underline">
              Alle →
            </Link>
          }
        />
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
        <CardTitle
          eyebrow="Trainingsplan · diese Woche"
          title={data.plan?.title ?? "Diese Woche"}
          action={
            <Link href={trainingsplanHref} className="text-sm text-gold hover:underline">
              Kalender →
            </Link>
          }
        />
        {data.sessions.length === 0 ? (
          <EmptyState title="Kein Plan für diese Woche" text="Der Trainer hat für diese Woche noch keinen Trainingsplan veröffentlicht." />
        ) : (
          <ul className="divide-y divide-line">
            {data.sessions.map((s) => (
              <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                <SessionBlock session={s} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
