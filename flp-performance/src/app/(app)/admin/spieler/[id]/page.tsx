import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirthYear, formatDate } from "@/lib/format";
import { CONSENT_LABELS, latestConsents, type ConsentType } from "@/lib/consent";
import { PageHeader, EmptyState, Badge, Alert } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { InviteGuardianForm } from "../Forms";
import { revokeGuardian, setCoachingAccess } from "../actions";
import { NewPlanSection } from "../../plaene/Forms";
import { NewAssessmentForm } from "../../beurteilungen/Forms";
import { FeedbackForm } from "../../feedback/FeedbackForm";
import { createFeedback } from "../../feedback/actions";
import { addDays, mondayOf, todayInSwitzerland, weekLabel } from "@/lib/dates";

export const metadata: Metadata = { title: "Spielerprofil" };

export default async function PlayerAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erstellt?: string }>;
}) {
  const viewer = await requireStaff();
  const { id } = await params;
  const { erstellt } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, birth_year, position, dominant_foot, club, is_test_data, created_at, coach_player_links(status, started_on), guardian_player_links(id, relationship, status, guardian_id, profiles:guardian_id(full_name, email)), guardian_consents(consent_type, granted, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!player) notFound();

  const { data: plans } = await supabase
    .from("training_plans")
    .select("id, title, week_start, status, training_sessions(id)")
    .eq("player_id", id)
    .order("week_start", { ascending: false })
    .limit(20);
  const nextMonday = addDays(mondayOf(todayInSwitzerland()), 7);

  const [{ data: assessments }, { data: feedback }] = await Promise.all([
    supabase.from("assessments").select("id, kind, assessed_on, status").eq("player_id", id).order("assessed_on", { ascending: false }),
    supabase.from("coach_feedback").select("id, title, status, created_at, published_at").eq("player_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const hasInitial = (assessments ?? []).some((a) => a.kind === "initial");

  type GuardianLink = { id: string; relationship: string; status: string; profiles: { full_name: string; email: string | null } | null };
  const guardians = ((player.guardian_player_links ?? []) as unknown as GuardianLink[]).filter((g) => g.status === "active");
  const consents = latestConsents(player.guardian_consents ?? []);
  const coaching = (player.coach_player_links ?? []).some((c: { status: string }) => c.status === "active");
  const isAdmin = viewer.roles.includes("admin");

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/spieler" className="text-mute hover:text-paper">
          ← Alle Spieler
        </Link>
      </p>
      <PageHeader
        eyebrow="Spielerprofil"
        title={`${player.first_name} ${player.last_name}`}
        text={`${ageFromBirthYear(player.birth_year)} Jahre (Jg. ${player.birth_year})${player.position ? ` · ${player.position}` : ""}${player.club ? ` · ${player.club}` : ""}`}
        action={
          <div className="flex gap-2">
            {player.is_test_data && <Badge tone="danger">Testdaten</Badge>}
            {coaching ? <Badge tone="gold">Coaching aktiv</Badge> : <Badge>Kein Coaching</Badge>}
          </div>
        }
      />
      {erstellt && (
        <div className="mb-6">
          <Alert tone="success">Spieler erfasst. Verknüpfe nun einen Elternteil.</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Eltern" title="Verknüpfte Erziehungsberechtigte" />
          {guardians.length === 0 ? (
            <EmptyState title="Noch niemand verknüpft" text="Lade einen Elternteil ein. Erst danach kann die Familie die Daten sehen." />
          ) : (
            <ul className="divide-y divide-line">
              {guardians.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="font-medium">{g.profiles?.full_name || g.profiles?.email}</span>
                    <span className="block text-xs text-mute">
                      {g.relationship} · {g.profiles?.email}
                    </span>
                  </span>
                  <form action={revokeGuardian}>
                    <input type="hidden" name="linkId" value={g.id} />
                    <input type="hidden" name="playerId" value={player.id} />
                    <button className="min-h-11 text-sm text-danger hover:underline" type="submit">
                      Entfernen
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t border-line pt-6">
            <p className="eyebrow mb-4">Elternteil einladen</p>
            <InviteGuardianForm playerId={player.id} />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle eyebrow="Training" title="Trainingspläne" />
            {(plans ?? []).length === 0 ? (
              <p className="mb-5 text-sm text-mute">Noch keine Pläne erstellt.</p>
            ) : (
              <ul className="mb-6 divide-y divide-line">
                {plans!.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/plaene/${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
                      <span>
                        <span className="font-medium">{p.title}</span>
                        <span className="block text-xs text-mute">
                          {weekLabel(p.week_start)} · {p.training_sessions?.length ?? 0} Einheiten
                        </span>
                      </span>
                      {p.status === "published" ? <Badge tone="ok">Veröffentlicht</Badge> : <Badge>Entwurf</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <NewPlanSection playerId={player.id} defaultDate={nextMonday} startOpen={(plans ?? []).length === 0} />
          </Card>

          <Card>
            <CardTitle eyebrow="Einwilligungen" title="Stand der Eltern-Erklärungen" />
            <ul className="space-y-3 text-sm">
              {(Object.keys(CONSENT_LABELS) as ConsentType[]).map((t) => (
                <li key={t} className="flex items-center justify-between gap-3">
                  <span>{CONSENT_LABELS[t].title}</span>
                  {consents[t] === true ? <Badge tone="ok">Erteilt</Badge> : consents[t] === false ? <Badge tone="danger">Widerrufen</Badge> : <Badge>Offen</Badge>}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-mute">Einwilligungen können nur von verknüpften Eltern erteilt oder widerrufen werden.</p>
          </Card>

          <Card>
            <CardTitle eyebrow="Coaching" title="Coaching-Zugang" />
            <p className="mb-5 text-sm text-mute">
              Mit aktivem Coaching-Zugang erhalten Spieler und Eltern Zugriff auf die Übungsbibliothek. Erfasst am {formatDate(player.created_at)}.
            </p>
            {isAdmin ? (
              <form action={setCoachingAccess}>
                <input type="hidden" name="playerId" value={player.id} />
                <input type="hidden" name="active" value={coaching ? "false" : "true"} />
                <button
                  type="submit"
                  className={`min-h-11 rounded-card border px-4 text-sm ${coaching ? "border-danger/60 text-danger" : "border-gold text-gold hover:bg-gold hover:text-ink"}`}
                >
                  {coaching ? "Coaching-Zugang entziehen" : "Coaching-Zugang gewähren"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-mute">Nur der Administrator kann den Coaching-Zugang ändern.</p>
            )}
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div id="beurteilungen" className="scroll-mt-24" />
          <CardTitle eyebrow="Entwicklung" title="Beurteilungen" />
          {(assessments ?? []).length === 0 ? (
            <p className="mb-5 text-sm text-mute">Noch keine Beurteilung. Beginne mit der Erstbeurteilung.</p>
          ) : (
            <ul className="mb-6 divide-y divide-line">
              {assessments!.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/beurteilungen/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
                    <span>
                      <span className="font-medium">{a.kind === "initial" ? "Erstbeurteilung" : "Folgebeurteilung"}</span>
                      <span className="block text-xs text-mute">{formatDate(a.assessed_on)}</span>
                    </span>
                    {a.status === "published" ? <Badge tone="ok">Veröffentlicht</Badge> : <Badge tone="danger">Entwurf</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="eyebrow mb-4">Neue Beurteilung</p>
          <NewAssessmentForm playerId={player.id} allowInitial={!hasInitial} today={todayInSwitzerland()} />
        </Card>

        <Card>
          <CardTitle eyebrow="Trainer-Feedback" title="Rückmeldungen" />
          {(feedback ?? []).length > 0 && (
            <ul className="mb-6 divide-y divide-line">
              {feedback!.map((f) => (
                <li key={f.id}>
                  <Link href={`/admin/feedback/${f.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
                    <span>
                      <span className="font-medium">{f.title}</span>
                      <span className="block text-xs text-mute">{formatDate(f.published_at ?? f.created_at)}</span>
                    </span>
                    {f.status === "published" ? <Badge tone="ok">Veröffentlicht</Badge> : <Badge tone="danger">Entwurf</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="eyebrow mb-4">Neues Feedback</p>
          <FeedbackForm action={createFeedback.bind(null, player.id)} />
        </Card>
      </div>
    </>
  );
}
