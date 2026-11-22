import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadPlayerOverview } from "@/lib/data/player-overview";
import { latestConsents, CONSENT_LABELS, type ConsentType } from "@/lib/consent";
import { ageFromBirthYear } from "@/lib/format";
import { PageHeader, EmptyState, Badge, Alert } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { PlayerOverview } from "@/components/player/PlayerOverview";
import { recordConsent } from "./actions";
import { MonthStatusForm } from "./MonthStatusForm";
import { TrainingRequests, type ParentRequest } from "./TrainingRequests";
import { addDays, todayInSwitzerland } from "@/lib/dates";
import { currentMonth, shiftMonth } from "@/lib/month-status";
import { whatsappNumber } from "@/lib/wochenfrage";
import { StartPaths } from "@/components/marketing/StartPaths";

export const metadata: Metadata = { title: "Elternbereich" };

type LinkedPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number;
  position: string | null;
  club: string | null;
  coach_player_links: { status: string }[];
  guardian_consents: { consent_type: string; granted: boolean; created_at: string }[];
};

export default async function ParentDashboard() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: links, error } = await supabase
    .from("guardian_player_links")
    .select(
      "relationship, players(id, first_name, last_name, birth_year, position, club, coach_player_links(status), guardian_consents(consent_type, granted, created_at))",
    )
    .eq("guardian_id", viewer.id)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  const players = (links ?? []).map((l) => l.players as unknown as LinkedPlayer).filter(Boolean);
  const overviews = await Promise.all(players.map((p) => loadPlayerOverview(supabase, p.id)));
  const months = [currentMonth(), shiftMonth(currentMonth(), 1)];
  const { data: monthRows } = players.length
    ? await supabase
        .from("player_month_status")
        .select("player_id, month, active, reason, note")
        .in("player_id", players.map((p) => p.id))
        .in("month", months)
    : { data: [] };
  const { data: requestRows } = players.length
    ? await supabase
        .from("training_requests")
        .select("id, player_id, day, wish_times, location, note, status, confirmed_time, coach_note")
        .in("player_id", players.map((p) => p.id))
        .gte("day", addDays(todayInSwitzerland(), -7))
        .order("day")
    : { data: [] };
  const requestsOf = (playerId: string) => ((requestRows ?? []) as (ParentRequest & { player_id: string })[]).filter((r) => r.player_id === playerId);
  const monthStatus = (playerId: string, month: string) => (monthRows ?? []).find((r) => r.player_id === playerId && r.month === month) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Elternbereich"
        title={viewer.fullName ? `Grüezi ${viewer.fullName.split(" ")[0]}` : "Grüezi"}
        text="Hier siehst du ausschliesslich die Daten deiner eigenen Kinder: Trainingspläne, Beurteilungen und Feedback des Trainers."
      />

      {players.length === 0 ? (
        <div className="space-y-8">
          <EmptyState
            title="Noch kein Kind verknüpft"
            text="Sind Sie bereits im Training bei Felipe? Dann verknüpft er Ihr Konto mit dem Spielerprofil Ihres Kindes, und hier erscheinen Trainingspläne und Entwicklung. Noch nicht dabei? Hier können Sie starten:"
          />
          <StartPaths coachPhone={whatsappNumber(process.env.WOCHENFRAGE_WHATSAPP)} />
        </div>
      ) : (
        <div className="space-y-14">
          {players.map((player, i) => {
            const consents = latestConsents(player.guardian_consents ?? []);
            const coachingActive = player.coach_player_links?.some((c) => c.status === "active");
            return (
              <section key={player.id} aria-labelledby={`p-${player.id}`}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow mb-1">Spielerprofil</p>
                    <h2 id={`p-${player.id}`} className="text-3xl font-extrabold">
                      <Link href={`/spieler/${player.id}`} className="hover:text-gold">
                        {player.first_name} {player.last_name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-mute">
                      {ageFromBirthYear(player.birth_year)} Jahre
                      {player.position ? ` · ${player.position}` : ""}
                      {player.club ? ` · ${player.club}` : ""}
                    </p>
                  </div>
                  {coachingActive ? <Badge tone="gold">Coaching aktiv</Badge> : <Badge>Kein aktives Coaching</Badge>}
                </div>

                {consents.data_processing !== true && (
                  <div className="mb-6">
                    <Alert tone="info">
                      Bitte bestätige unten die Einwilligung zur Bearbeitung der Trainingsdaten von {player.first_name}.
                    </Alert>
                  </div>
                )}

                <Card className="mb-6">
                  <CardTitle eyebrow="Monatsplanung" title={`Trainiert ${player.first_name} mit?`} />
                  <p className="mb-4 text-sm text-mute">
                    Melde pro Monat, ob {player.first_name} aktiv trainiert oder pausiert. So kann der Trainer die Trainings planen.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {months.map((m) => (
                      <MonthStatusForm key={m} playerId={player.id} firstName={player.first_name} month={m} status={monthStatus(player.id, m)} />
                    ))}
                  </div>
                </Card>

                <Card className="mb-6">
                  <CardTitle eyebrow="Trainingstermine" title={`Termine für ${player.first_name}`} />
                  <TrainingRequests playerId={player.id} firstName={player.first_name} requests={requestsOf(player.id)} />
                </Card>

                <PlayerOverview data={overviews[i]} playerId={player.id} />

                <Card className="mt-6">
                  <CardTitle eyebrow="Datenschutz" title="Einwilligungen" />
                  <ul className="divide-y divide-line">
                    {(Object.keys(CONSENT_LABELS) as ConsentType[]).map((type) => {
                      const granted = consents[type];
                      return (
                        <li key={type} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="max-w-2xl">
                            <p className="font-semibold">
                              {CONSENT_LABELS[type].title}{" "}
                              {granted === true ? <Badge tone="ok">Erteilt</Badge> : granted === false ? <Badge tone="danger">Widerrufen</Badge> : <Badge>Offen</Badge>}
                            </p>
                            <p className="mt-1 text-sm text-mute">{CONSENT_LABELS[type].text}</p>
                          </div>
                          <form action={recordConsent} className="shrink-0">
                            <input type="hidden" name="playerId" value={player.id} />
                            <input type="hidden" name="consentType" value={type} />
                            <input type="hidden" name="granted" value={granted ? "false" : "true"} />
                            <button
                              type="submit"
                              className={`min-h-11 rounded-card border px-4 text-sm ${granted ? "border-line text-mute hover:text-paper" : "border-gold text-gold hover:bg-gold hover:text-ink"}`}
                            >
                              {granted ? "Widerrufen" : "Einwilligen"}
                            </button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-4 text-xs text-mute">
                    Jede Änderung wird mit Datum gespeichert. Ein Widerruf gilt für die Zukunft.
                  </p>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
