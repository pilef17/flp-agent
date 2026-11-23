import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { LEVELS, LEVEL_KEYS, QUESTIONS, type Level } from "@/lib/check";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle, Stat } from "@/components/ui/Card";
import { ShareLink } from "../wochenfrage/ShareLink";
import { deleteLead } from "./actions";

export const metadata: Metadata = { title: "Spieler-Check" };

type Lead = {
  id: string;
  parent_name: string;
  email: string;
  child_age: number | null;
  position: string;
  team: string;
  level: Level;
  score: number;
  technik: number;
  taktik: number;
  answers: number[];
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });

export default async function CheckLeadsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_leads")
    .select("id, parent_name, email, child_age, position, team, level, score, technik, taktik, answers, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const leads = (data ?? []) as Lead[];
  const count = (l: Level) => leads.filter((x) => x.level === l).length;

  return (
    <>
      <PageHeader
        eyebrow="Trainer · privat"
        title="Spieler-Check"
        text="Eltern machen den kostenlosen Check und können Kontaktdaten für ein persönliches Feedback hinterlassen."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Anfragen" value={leads.length} hint="Mit Zustimmung zur Kontaktaufnahme" />
        {LEVEL_KEYS.map((l) => (
          <Stat key={l} label={LEVELS[l].label} value={count(l)} hint="Anfragen auf diesem Niveau" />
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle eyebrow="Für Instagram und WhatsApp" title="Link zum Spieler-Check" />
        <ShareLink url={`${publicEnv.siteUrl()}/check`} />
      </Card>

      <section className="mt-8" aria-labelledby="leads-title">
        <h2 id="leads-title" className="mb-4 text-2xl font-bold">
          Anfragen
        </h2>
        {leads.length === 0 ? (
          <EmptyState title="Noch keine Anfragen" text="Sobald Eltern nach dem Check ihre Kontaktdaten senden, erscheinen sie hier." />
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => {
              const weak = QUESTIONS.filter((_, i) => lead.answers[i] === 0).map((q) => q.topic);
              return (
                <li key={lead.id} className="rounded-card border border-line bg-graphite p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{lead.parent_name}</p>
                      <a href={`mailto:${lead.email}`} className="break-all text-sm text-gold underline underline-offset-4">
                        {lead.email}
                      </a>
                      <p className="mt-1 text-xs text-mute">
                        {dateFmt.format(new Date(lead.created_at))}
                        {lead.child_age ? ` · Kind ${lead.child_age} Jahre` : ""}
                        {lead.position ? ` · ${lead.position}` : ""}
                        {lead.team ? ` · ${lead.team}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone="gold">{LEVELS[lead.level].label}</Badge>
                      <p className="mt-1 text-xs tabular-nums text-mute">
                        {lead.score}/24 · T {lead.technik} · Tk {lead.taktik}
                      </p>
                    </div>
                  </div>
                  {weak.length > 0 && <p className="mt-3 text-sm text-mute">Schwächen: {weak.join(", ")}</p>}
                  <form action={deleteLead} className="mt-2">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
                      Anfrage löschen
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
