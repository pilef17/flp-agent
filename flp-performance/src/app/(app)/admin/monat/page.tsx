import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { currentMonth, monthLabel, parseMonthParam, shiftMonth, statusLabel } from "@/lib/month-status";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle, Stat } from "@/components/ui/Card";
import { ShareLink } from "../wochenfrage/ShareLink";

export const metadata: Metadata = { title: "Monatsplanung" };

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  coach_player_links: { status: string }[];
  player_month_status: { month: string; active: boolean; reason: string; note: string; updated_at: string }[];
};

const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", timeZone: "Europe/Zurich" });

/** Trainer: wer trainiert in welchem Monat aktiv, wer pausiert, wer hat noch nicht geantwortet. */
export default async function MonthPlanningPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireStaff();
  const { m } = await searchParams;
  const month = parseMonthParam(m) ?? currentMonth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, first_name, last_name, coach_player_links(status), player_month_status(month, active, reason, note, updated_at)")
    .eq("is_archived", false)
    .eq("player_month_status.month", month)
    .order("last_name")
    .limit(300);
  if (error) throw new Error(error.message);

  const players = ((data ?? []) as Row[]).filter((p) => p.coach_player_links?.some((c) => c.status === "active"));
  const statusOf = (p: Row) => p.player_month_status?.[0] ?? null;
  const active = players.filter((p) => statusOf(p)?.active === true);
  const paused = players.filter((p) => statusOf(p)?.active === false);
  const open = players.filter((p) => !statusOf(p));
  const ordered = [...open, ...paused, ...active];
  const label = monthLabel(month);
  const url = `${publicEnv.siteUrl()}/elternbereich`;
  const reminder = `Hallo! Kurze Frage von FLP Performance zur Monatsplanung ${label}: Trainiert Ihr Kind diesen Monat mit? Bitte im Elternbereich «Aktiv» oder «Pausiert» wählen – dauert 10 Sekunden: ${url}`;

  return (
    <>
      <PageHeader
        eyebrow="Trainer · privat"
        title="Monatsplanung"
        text="Eltern melden pro Monat, ob ihr Kind aktiv trainiert oder pausiert. Der Coaching-Zugang bleibt davon unberührt."
      />

      <nav aria-label="Monat wählen" className="mb-6 flex items-center justify-between gap-3">
        <Link href={`/admin/monat?m=${shiftMonth(month, -1).slice(0, 7)}`} className="min-h-11 rounded-card border border-line px-4 py-2.5 text-sm hover:border-gold">
          ← {monthLabel(shiftMonth(month, -1))}
        </Link>
        <h2 className="text-center text-2xl font-bold">{label}</h2>
        <Link href={`/admin/monat?m=${shiftMonth(month, 1).slice(0, 7)}`} className="min-h-11 rounded-card border border-line px-4 py-2.5 text-sm hover:border-gold">
          {monthLabel(shiftMonth(month, 1))} →
        </Link>
      </nav>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Aktiv" value={active.length} />
        <Stat label="Pausiert" value={paused.length} />
        <Stat label="Offen" value={open.length} hint="noch keine Antwort" />
      </div>

      {players.length === 0 ? (
        <EmptyState title="Keine Coaching-Spieler" text="Sobald Spieler einen aktiven Coaching-Zugang haben, erscheinen sie hier." />
      ) : (
        <Card className="mb-8">
          <CardTitle eyebrow={label} title={`${players.length} Coaching-Spieler`} />
          <ul className="divide-y divide-line">
            {ordered.map((p) => {
              const s = statusOf(p);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/admin/spieler/${p.id}`} className="font-semibold hover:text-gold">
                      {p.first_name} {p.last_name}
                    </Link>
                    {s?.note && <p className="text-xs text-mute">«{s.note}»</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {s && <span className="text-xs text-mute">{dateFmt.format(new Date(s.updated_at))}</span>}
                    <Badge tone={!s ? "neutral" : s.active ? "ok" : "gold"}>{statusLabel(s)}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle eyebrow="Erinnerung" title="Eltern per WhatsApp fragen" />
        <p className="mb-4 text-sm text-mute">Senden Sie den Link an die Eltern, die noch nicht geantwortet haben. Sie melden den Status direkt im Elternbereich.</p>
        <ShareLink url={url} message={reminder} />
      </Card>
    </>
  );
}
