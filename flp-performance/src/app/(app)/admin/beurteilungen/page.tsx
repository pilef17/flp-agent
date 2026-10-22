import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Beurteilungen" };

type Row = {
  id: string;
  kind: string;
  assessed_on: string;
  status: string;
  players: { id: string; first_name: string; last_name: string } | null;
};

export default async function AssessmentsOverview() {
  await requireStaff();
  const supabase = await createClient();
  const select = "id, kind, assessed_on, status, players(id, first_name, last_name)";
  const [drafts, recent, players, feedbackDrafts] = await Promise.all([
    supabase.from("assessments").select(select).eq("status", "draft").order("assessed_on", { ascending: false }),
    supabase.from("assessments").select(select).eq("status", "published").order("published_at", { ascending: false }).limit(10),
    supabase.from("players").select("id, first_name, last_name, assessments(kind, status)").eq("is_archived", false).order("last_name"),
    supabase.from("coach_feedback").select("id, title, created_at, players(first_name, last_name)").eq("status", "draft").order("created_at", { ascending: false }),
  ]);
  const err = drafts.error ?? recent.error ?? players.error ?? feedbackDrafts.error;
  if (err) throw new Error(err.message);

  // Spieler ohne veröffentlichte Erstbeurteilung
  const withoutInitial = (players.data ?? []).filter(
    (p) => !(p.assessments as { kind: string; status: string }[]).some((a) => a.kind === "initial" && a.status === "published"),
  );

  const list = (rows: Row[]) => (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/admin/beurteilungen/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
            <span>
              <span className="font-medium">
                {r.players?.first_name} {r.players?.last_name}
              </span>
              <span className="block text-xs text-mute">
                {r.kind === "initial" ? "Erstbeurteilung" : "Folgebeurteilung"} · {formatDate(r.assessed_on)}
              </span>
            </span>
            {r.status === "draft" ? <Badge tone="danger">Entwurf</Badge> : <Badge tone="ok">Veröffentlicht</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader
        eyebrow="Entwicklung"
        title="Beurteilungen"
        text="Beurteilungen werden pro Spieler erfasst. Veröffentlichte Beurteilungen sind unveränderlich und bilden den Verlauf."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Offen" title="Entwürfe" />
          {(drafts.data ?? []).length === 0 ? (
            <EmptyState title="Keine Entwürfe" text="Neue Beurteilungen startest du auf der Seite des Spielers." />
          ) : (
            list(drafts.data as unknown as Row[])
          )}
        </Card>
        <Card>
          <CardTitle eyebrow="Zu erledigen" title="Ohne Erstbeurteilung" />
          {withoutInitial.length === 0 ? (
            <EmptyState title="Alles erfasst" text="Jeder aktive Spieler hat eine veröffentlichte Erstbeurteilung." />
          ) : (
            <ul className="divide-y divide-line">
              {withoutInitial.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/spieler/${p.id}#beurteilungen`} className="flex justify-between gap-3 py-3 hover:text-gold">
                    <span className="font-medium">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="text-sm text-gold">Beurteilen →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle eyebrow="Verlauf" title="Zuletzt veröffentlicht" />
          {(recent.data ?? []).length === 0 ? (
            <EmptyState title="Noch nichts veröffentlicht" text="Veröffentlichte Beurteilungen erscheinen hier." />
          ) : (
            list(recent.data as unknown as Row[])
          )}
        </Card>
        <Card>
          <CardTitle eyebrow="Trainer-Feedback" title="Feedback-Entwürfe" />
          {(feedbackDrafts.data ?? []).length === 0 ? (
            <EmptyState title="Keine Entwürfe" text="Feedback schreibst du auf der Seite des Spielers." />
          ) : (
            <ul className="divide-y divide-line">
              {feedbackDrafts.data!.map((f) => {
                const p = f.players as unknown as { first_name: string; last_name: string } | null;
                return (
                  <li key={f.id}>
                    <Link href={`/admin/feedback/${f.id}`} className="flex justify-between gap-3 py-3 hover:text-gold">
                      <span>
                        <span className="font-medium">{f.title}</span>
                        <span className="block text-xs text-mute">
                          {p?.first_name} {p?.last_name} · {formatDate(f.created_at)}
                        </span>
                      </span>
                      <Badge tone="danger">Entwurf</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
