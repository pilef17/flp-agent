import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { isStaff } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { loadMyPlayers } from "@/lib/data/my-players";
import { loadWeekPlan } from "@/lib/data/week-plan";
import { addDays, isIsoDate, mondayOf, shortDate, todayInSwitzerland, weekDays, weekdayName, weekLabel } from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { SessionBlock } from "@/components/player/SessionList";
import { PlayerSwitcher } from "@/components/player/PlayerSwitcher";

export const metadata: Metadata = { title: "Trainingsplan" };

export default async function TrainingCalendar({ searchParams }: { searchParams: Promise<{ spieler?: string; woche?: string }> }) {
  const viewer = await requireViewer();
  if (isStaff(viewer.roles)) redirect("/admin/spieler");
  const { spieler, woche } = await searchParams;
  const supabase = await createClient();
  const players = await loadMyPlayers(supabase, viewer);

  if (players.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Trainingskalender" title="Trainingsplan" />
        <EmptyState title="Noch kein Spielerprofil" text="Sobald der Trainer ein Spielerprofil mit deinem Konto verknüpft, erscheint hier der Wochenplan." />
      </>
    );
  }

  const player = players.find((p) => p.id === spieler) ?? players[0];
  const today = todayInSwitzerland();
  const monday = isIsoDate(woche) ? mondayOf(woche) : mondayOf(today);
  const { plan, sessions } = await loadWeekPlan(supabase, player.id, monday);
  const href = (w: string, p = player.id) => `/trainingsplan?spieler=${p}&woche=${w}`;
  const done = sessions.filter((s) => s.completed).length;

  return (
    <>
      <PageHeader
        eyebrow={`Trainingskalender · ${player.first_name}`}
        title={plan?.title ?? "Trainingsplan"}
        text={plan?.notes || undefined}
      />

      <PlayerSwitcher players={players} activeId={player.id} href={(id) => href(monday, id)} />

      <div className="-mt-4 mb-6 flex items-center justify-between gap-3 border-b border-line pb-3">
        <Link href={href(addDays(monday, -7))} className="min-h-11 content-center px-2 text-sm text-mute hover:text-paper">
          <span aria-hidden>←</span> <span className="sr-only sm:not-sr-only">Vorherige Woche</span>
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel(monday)}</p>
          {monday !== mondayOf(today) ? (
            <Link href={href(mondayOf(today))} className="text-xs text-gold hover:underline">
              Zur aktuellen Woche
            </Link>
          ) : (
            sessions.length > 0 && <p className="text-xs text-mute">{done} von {sessions.length} Einheiten erledigt</p>
          )}
        </div>
        <Link href={href(addDays(monday, 7))} className="min-h-11 content-center px-2 text-sm text-mute hover:text-paper">
          <span className="sr-only sm:not-sr-only">Nächste Woche</span> <span aria-hidden>→</span>
        </Link>
      </div>

      {!plan ? (
        <EmptyState title="Kein Plan für diese Woche" text="Der Trainer hat für diese Woche keinen Trainingsplan veröffentlicht." />
      ) : (
        <ol className="space-y-3">
          {weekDays(monday).map((day) => {
            const daySessions = sessions.filter((s) => s.scheduledOn === day);
            const isToday = day === today;
            return (
              <li
                key={day}
                aria-current={isToday ? "date" : undefined}
                className={`rounded-card border p-4 sm:p-5 ${isToday ? "border-gold" : "border-line"} ${daySessions.length ? "bg-graphite" : ""}`}
              >
                <p className={`mb-3 text-xs font-semibold uppercase tracking-wider ${isToday ? "text-gold" : "text-mute"}`}>
                  {weekdayName(day)}, {shortDate(day)} {isToday && "· Heute"}
                </p>
                {daySessions.length === 0 ? (
                  <p className="text-sm text-mute">Kein Training</p>
                ) : (
                  <div className="space-y-5">
                    {daySessions.map((s) => (
                      <SessionBlock key={s.id} session={s} showDate={false} />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
