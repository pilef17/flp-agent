import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isFocus, shortTime } from "@/lib/focus";
import { Alert, PageHeader } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { TemplateForm, type TemplateFormDay } from "../TemplateForm";
import { deleteTemplate, updateTemplate } from "../actions";

export const metadata: Metadata = { title: "Wochenvorlage bearbeiten" };

type DayRow = { weekday: number; title: string; focus: string; starts_at: string | null; ends_at: string | null };

export default async function TemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ neu?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const { neu } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("week_templates")
    .select("id, title, audience, notes, week_template_days(weekday, title, focus, starts_at, ends_at)")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const days: TemplateFormDay[] = ((t.week_template_days ?? []) as DayRow[])
    .filter((d) => isFocus(d.focus))
    .map((d) => ({
      weekday: d.weekday,
      title: d.title,
      focus: d.focus as TemplateFormDay["focus"],
      startsAt: shortTime(d.starts_at) ?? "",
      endsAt: shortTime(d.ends_at) ?? "",
    }));

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/vorlagen" className="text-mute hover:text-paper">
          ← Alle Vorlagen
        </Link>
      </p>
      <PageHeader eyebrow={t.audience ? `Wochenvorlage · ${t.audience}` : "Wochenvorlage"} title={t.title} />
      {neu && (
        <div className="mb-6">
          <Alert tone="success">Vorlage erstellt. Du kannst sie jetzt beim Erstellen eines Wochenplans auswählen.</Alert>
        </div>
      )}
      <Card>
        <TemplateForm
          action={updateTemplate}
          templateId={t.id}
          initial={{ title: t.title, audience: t.audience, notes: t.notes, days }}
          submitLabel="Vorlage speichern"
        />
      </Card>
      <form action={deleteTemplate} className="mt-10 border-t border-line pt-6">
        <input type="hidden" name="templateId" value={t.id} />
        <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
          Vorlage löschen
        </button>
        <p className="mt-1 text-xs text-mute">Bereits erstellte Wochenpläne bleiben erhalten.</p>
      </form>
    </>
  );
}
