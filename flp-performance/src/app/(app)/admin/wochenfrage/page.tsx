import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { addDays, todayInSwitzerland } from "@/lib/dates";
import { answerLabel, currentQuestion, questionForDate, weekLabel, weekName, THEME_LABEL, type ThemeKey } from "@/lib/wochenfrage";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle, Stat } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { ShareLink } from "./ShareLink";
import { deleteAnswer } from "./actions";

export const metadata: Metadata = { title: "Wochenfrage" };

type Answer = {
  id: string;
  week_start: string;
  theme: ThemeKey;
  question: string;
  athlete_name: string;
  athlete_key: string;
  rating: number | null;
  updated_at: string;
};

const timeFmt = new Intl.DateTimeFormat("de-CH", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Zurich",
});

/** Öffentlicher Link: eigene Domain, falls eingerichtet – sonst /wochenfrage. */
function familyLink(): string {
  const host = process.env.WOCHENFRAGE_HOST?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return host ? `https://${host}` : `${publicEnv.siteUrl()}/wochenfrage`;
}

export default async function WochenfrageAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const params = await searchParams;
  const athlete = params.athlet?.trim() || "";
  const week = /^\d{4}-\d{2}-\d{2}$/.test(params.woche ?? "") ? params.woche! : "";

  const supabase = await createClient();
  let query = supabase
    .from("weekly_answers")
    .select("id, week_start, theme, question, athlete_name, athlete_key, rating, updated_at")
    .order("week_start", { ascending: false })
    .order("athlete_name")
    .limit(1000);
  if (athlete) query = query.eq("athlete_key", athlete);
  if (week) query = query.eq("week_start", week);

  const [answers, options] = await Promise.all([
    query,
    supabase.from("weekly_answers").select("week_start, athlete_name, athlete_key").order("updated_at", { ascending: false }).limit(5000),
  ]);
  if (answers.error ?? options.error) throw new Error((answers.error ?? options.error)!.message);
  const rows = (answers.data ?? []) as Answer[];

  // Filteroptionen: alle Athleten (neueste Schreibweise) und alle Wochen mit Antworten
  const athletes = new Map<string, string>();
  const weeks = new Set<string>();
  for (const o of options.data ?? []) {
    if (!athletes.has(o.athlete_key)) athletes.set(o.athlete_key, o.athlete_name);
    weeks.add(o.week_start);
  }
  const now = currentQuestion();
  weeks.add(now.weekStart);
  const athleteList = [...athletes].sort((a, b) => a[1].localeCompare(b[1], "de-CH"));
  const weekList = [...weeks].sort().reverse();

  const rated = rows.filter((r) => r.rating !== null);
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1) : "–";
  const notPracticed = rows.length - rated.length;
  const next = questionForDate(addDays(now.weekStart, 7));
  const filtered = Boolean(athlete || week);
  const today = todayInSwitzerland();

  return (
    <>
      <PageHeader
        eyebrow="Trainer · privat"
        title="Wochenfrage"
        text="Ein Link für alle Familien. Jeden Donnerstag erscheint automatisch die nächste Frage."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardTitle eyebrow="Link für die Familien" title="Jeden Donnerstag per WhatsApp senden" />
          <ShareLink url={familyLink()} />
          <p className="mt-4 text-xs text-mute">
            Kein Login nötig. Der Name wird auf dem Handy gemerkt. Wer in derselben Woche erneut sendet, korrigiert seine Antwort.
          </p>
        </Card>
        <Card>
          <CardTitle eyebrow={`Woche ${now.weekNumber} · ${now.themeLabel}`} title="Aktuelle Frage" />
          <p className="font-display text-xl font-semibold">{now.question}</p>
          <p className="mt-5 border-t border-line pt-4 text-sm text-mute">
            Ab Donnerstag {next.weekStart.split("-").reverse().join(".")}: <span className="text-paper">{next.themeLabel}</span> · {next.question}
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle eyebrow="Antworten" title={filtered ? "Gefilterte Antworten" : "Alle Antworten"} />
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="text-sm">
            <span className="mb-1.5 block text-mute">Athlet</span>
            <select name="athlet" defaultValue={athlete} className="field">
              <option value="">Alle Athleten</option>
              {athleteList.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-mute">Woche</span>
            <select name="woche" defaultValue={week} className="field">
              <option value="">Alle Wochen</option>
              {weekList.map((w) => (
                <option key={w} value={w}>
                  {weekLabel(w)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass("primary")}>
            Filtern
          </button>
          {filtered && (
            <Link href="/admin/wochenfrage" className={buttonClass("ghost")}>
              Zurücksetzen
            </Link>
          )}
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Antworten" value={rows.length} />
          <Stat label="Schnitt" value={avg} hint="Skala 1–5" />
          <Stat label="Nicht geübt" value={notPracticed} />
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Noch keine Antworten"
              text={filtered ? "Für diese Auswahl gibt es keine Antworten." : "Sende den Link am Donnerstag an die Familien – die Antworten erscheinen hier."}
            />
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line" data-testid="answers">
            {rows.map((r) => {
              return (
                <li key={r.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <Link href={`/admin/wochenfrage?athlet=${encodeURIComponent(r.athlete_key)}`} className="hover:text-gold">
                        {r.athlete_name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-sm text-mute">
                      <Link href={`/admin/wochenfrage?woche=${r.week_start}`} className="hover:text-paper">
                        {weekName(r.week_start)} · {THEME_LABEL[r.theme]}
                      </Link>
                    </p>
                    <p className="mt-1 text-sm">{r.question}</p>
                    <p className="mt-1 text-xs text-mute">
                      {timeFmt.format(new Date(r.updated_at))}
                      {r.week_start === now.weekStart && r.week_start <= today ? " · diese Woche" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {r.rating === null ? (
                      <Badge>Nicht geübt</Badge>
                    ) : (
                      <span
                        className="grid size-12 place-items-center rounded-card border border-gold/60 font-display text-2xl font-bold text-gold"
                        aria-label={`Antwort ${answerLabel(r.rating)} von 5`}
                      >
                        {r.rating}
                      </span>
                    )}
                    <form action={deleteAnswer}>
                      <input type="hidden" name="answerId" value={r.id} />
                      <button type="submit" className="text-xs text-mute hover:text-danger" aria-label={`Antwort von ${r.athlete_name} löschen`}>
                        Löschen
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
