import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isFocus } from "@/lib/focus";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { focusBarClass } from "@/components/training/Focus";
import { TemplateForm } from "./TemplateForm";
import { createTemplate } from "./actions";

export const metadata: Metadata = { title: "Wochenvorlagen" };

const SHORT_DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Row = { id: string; title: string; audience: string; week_template_days: { weekday: number; focus: string }[] };

export default async function TemplatesPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("week_templates").select("id, title, audience, week_template_days(weekday, focus)").order("title");
  const templates = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        eyebrow="Training"
        title="Wochenvorlagen"
        text="Lege eine Wochenstruktur einmal an und erstelle daraus mit einem Klick den Plan eines Spielers."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardTitle eyebrow="Bibliothek" title={`${templates.length} Vorlagen`} />
          {templates.length === 0 ? (
            <p className="text-sm text-mute">Noch keine Vorlagen.</p>
          ) : (
            <ul className="divide-y divide-line">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/vorlagen/${t.id}`} className="block py-4 hover:text-gold">
                    <span className="font-medium">{t.title}</span>
                    {t.audience && <span className="block text-xs text-mute">{t.audience}</span>}
                    <span className="mt-3 grid grid-cols-7 gap-1" aria-label="Wochenübersicht">
                      {SHORT_DAYS.map((label, i) => {
                        const day = t.week_template_days.find((d) => d.weekday === i + 1);
                        return (
                          <span key={label} className="text-center text-[0.625rem] uppercase tracking-wider text-mute">
                            <span aria-hidden className={`mb-1 block h-1.5 rounded-full ${day && isFocus(day.focus) ? focusBarClass(day.focus) : "bg-line"}`} />
                            {label}
                          </span>
                        );
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle eyebrow="Neu" title="Vorlage erstellen" />
          <TemplateForm action={createTemplate} initial={{ title: "", audience: "", notes: "", days: [] }} submitLabel="Vorlage erstellen" />
        </Card>
      </div>
    </>
  );
}
