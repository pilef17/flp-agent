import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, isIsoDate, mondayOf, shortDate, todayInSwitzerland, weekLabel } from "@/lib/dates";
import { REQUEST_STATUS, requestLine, weekdayLong, type RequestStatus } from "@/lib/training-requests";
import { PageHeader, Badge } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { decideRequest } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

type Row = {
  id: string;
  day: string;
  wish_times: string;
  location: string;
  note: string;
  status: RequestStatus;
  confirmed_time: string;
  coach_note: string;
  players: { id: string; first_name: string; last_name: string } | null;
};

/** Erste Uhrzeit in einem Text wie «9:00 / 9:30» für die Sortierung. */
function sortKey(r: Row): string {
  const t = (r.confirmed_time || r.wish_times).match(/(\d{1,2})[:.](\d{2})/);
  return t ? `${t[1].padStart(2, "0")}:${t[2]}` : "99:99";
}

/** Trainer: Wochenagenda wie die Notizen-Liste – Anfragen der Eltern bestätigen, absagen, als erledigt markieren. */
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  await requireStaff();
  const { w } = await searchParams;
  const monday = mondayOf(isIsoDate(w) ? w : todayInSwitzerland());
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_requests")
    .select("id, day, wish_times, location, note, status, confirmed_time, coach_note, players(id, first_name, last_name)")
    .gte("day", monday)
    .lte("day", days[6])
    .order("day");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const { count: openCount } = await supabase
    .from("training_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "angefragt")
    .gte("day", todayInSwitzerland());

  return (
    <>
      <PageHeader
        eyebrow="Trainer · privat"
        title="Agenda"
        text="Eltern schlagen Tag, Wunschzeit und Ort vor. Sie bestätigen mit der definitiven Zeit – die Familie erhält eine E-Mail."
      />
      {(openCount ?? 0) > 0 && (
        <p className="mb-4 text-sm">
          <Badge tone="gold">{openCount} offene Anfragen</Badge>
        </p>
      )}
      <nav aria-label="Woche wählen" className="mb-6 flex items-center justify-between gap-3">
        <Link href={`/admin/agenda?w=${addDays(monday, -7)}`} className="min-h-11 rounded-card border border-line px-4 py-2.5 text-sm hover:border-gold">
          ← Woche
        </Link>
        <h2 className="text-center text-lg font-bold">{weekLabel(monday)}</h2>
        <Link href={`/admin/agenda?w=${addDays(monday, 7)}`} className="min-h-11 rounded-card border border-line px-4 py-2.5 text-sm hover:border-gold">
          Woche →
        </Link>
      </nav>

      <div className="space-y-4">
        {days.map((d) => {
          const list = rows.filter((r) => r.day === d).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
          return (
            <Card key={d}>
              <h3 className="mb-3 font-bold">
                📅 {weekdayLong(d)} · {shortDate(d)}
              </h3>
              {list.length === 0 ? (
                <p className="text-sm text-mute">Keine Termine.</p>
              ) : (
                <ul className="divide-y divide-line" data-testid={`agenda-${d}`}>
                  {list.map((r) => {
                    const s = REQUEST_STATUS[r.status];
                    const name = r.players ? `${r.players.first_name} ${r.players.last_name}` : "Spieler";
                    return (
                      <li key={r.id} className="py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold">
                            {s.icon} {requestLine(name, r)}
                          </p>
                          <Badge tone={s.tone}>{s.label}</Badge>
                        </div>
                        {r.status !== "angefragt" && r.wish_times !== r.confirmed_time && r.confirmed_time && (
                          <p className="text-xs text-mute">Wunsch: {r.wish_times}</p>
                        )}
                        {r.note && <p className="text-xs text-mute">«{r.note}»</p>}
                        <form action={decideRequest} className="mt-2 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="requestId" value={r.id} />
                          <label className="text-xs">
                            <span className="text-mute">Zeit</span>
                            <input
                              name="confirmedTime"
                              maxLength={20}
                              defaultValue={r.confirmed_time || (r.wish_times.match(/\d{1,2}[:.]\d{2}/)?.[0] ?? "")}
                              aria-label={`Definitive Zeit für ${name}`}
                              className="mt-1 block min-h-11 w-24 rounded-card border border-line bg-ink px-2 text-sm text-paper"
                            />
                          </label>
                          <label className="min-w-40 flex-1 text-xs">
                            <span className="text-mute">Nachricht an Eltern (optional)</span>
                            <input
                              name="coachNote"
                              maxLength={200}
                              defaultValue={r.coach_note}
                              aria-label={`Nachricht an die Eltern von ${name}`}
                              className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-2 text-sm text-paper"
                            />
                          </label>
                          <div className="flex gap-1">
                            <button type="submit" name="status" value="bestaetigt" aria-label={`${name} bestätigen`} className="min-h-11 rounded-card border border-line px-3 text-sm hover:border-ok">
                              ✅
                            </button>
                            <button type="submit" name="status" value="abgelehnt" aria-label={`${name} absagen`} className="min-h-11 rounded-card border border-line px-3 text-sm hover:border-danger">
                              ❌
                            </button>
                            <button type="submit" name="status" value="erledigt" aria-label={`${name} erledigt`} className="min-h-11 rounded-card border border-line px-3 text-sm hover:border-gold">
                              🟡
                            </button>
                          </div>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
