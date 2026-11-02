"use client";

import { useActionState, useState } from "react";
import { Field, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import { FOCUS, FOCUS_KEYS, type Focus } from "@/lib/focus";
import type { FormState } from "@/lib/validation";

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export type TemplateFormDay = { weekday: number; title: string; focus: Focus; startsAt: string; endsAt: string };
export type TemplateFormValues = { title: string; audience: string; notes: string; days: TemplateFormDay[] };

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** Vorlage mit sieben Wochentagen; nicht aktivierte Tage sind Ruhetage. */
export function TemplateForm({
  action,
  initial,
  templateId,
  submitLabel,
}: {
  action: Action;
  initial: TemplateFormValues;
  templateId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.errors ?? {};
  const sv = state.values;
  const dayOf = (weekday: number) => initial.days.find((d) => d.weekday === weekday);
  const [active, setActive] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(WEEKDAYS.map((_, i) => [i + 1, sv ? sv[`active_${i + 1}`] === "on" : Boolean(dayOf(i + 1))])),
  );
  const [focusOf, setFocusOf] = useState<Record<number, string>>(() =>
    Object.fromEntries(WEEKDAYS.map((_, i) => [i + 1, sv ? (sv[`focus_${i + 1}`] ?? "") : (dayOf(i + 1)?.focus ?? "")])),
  );
  // Nach einem Fehler die Eingaben, sonst die gespeicherten Werte zeigen
  const val = (key: string, fallback: string) => (sv ? (sv[key] ?? "") : fallback);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {templateId && <input type="hidden" name="templateId" value={templateId} />}
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name der Vorlage" name="title" defaultValue={val("title", initial.title)} error={e.title} />
        <Field label="Für wen (optional)" name="audience" placeholder="z.B. 6–14 Jahre" defaultValue={val("audience", initial.audience)} error={e.audience} />
        <div className="sm:col-span-2">
          <TextArea
            label="Notiz für Eltern/Spieler (optional)"
            name="notes"
            rows={2}
            placeholder="z.B. Progressiver Block: Belastung alle 3 Wochen steigern."
            defaultValue={val("notes", initial.notes)}
            error={e.notes}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="eyebrow mb-3">Wochenstruktur</legend>
        {WEEKDAYS.map((name, i) => {
          const wd = i + 1;
          const d = dayOf(wd);
          const on = active[wd];
          const focus = focusOf[wd] as Focus | "";
          return (
            <div key={wd} className="flex gap-3 rounded-card border border-line bg-graphite p-4">
              <span aria-hidden className={`w-1 shrink-0 rounded-full ${on && focus ? FOCUS[focus].bar : "bg-line"}`} />
              <div className="min-w-0 flex-1 space-y-4">
                {/* React setzt Formulare nach einer Action zurück; versteckte Felder behalten den Zustand */}
                <input type="hidden" name={`active_${wd}`} value={on ? "on" : ""} />
                {on && <input type="hidden" name={`focus_${wd}`} value={focus} />}
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(ev) => setActive((a) => ({ ...a, [wd]: ev.target.checked }))}
                    className="size-5 accent-gold"
                  />
                  <span className="font-semibold">{name}</span>
                  {!on && <span className="text-sm text-mute">Ruhetag</span>}
                </label>
                {on && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_7rem_7rem]">
                    <Field label="Titel" id={`title_${wd}`} name={`title_${wd}`} defaultValue={val(`title_${wd}`, d?.title ?? "")} error={e[`title_${wd}`]} />
                    <div className="space-y-1.5">
                      <label htmlFor={`focus_${wd}`} className="block text-xs font-medium uppercase tracking-[0.12em] text-mute">
                        Fokus
                      </label>
                      <select
                        id={`focus_${wd}`}
                        className="field"
                        value={focus}
                        onChange={(ev) => {
                          const value = ev.target.value;
                          setFocusOf((f) => ({ ...f, [wd]: value }));
                        }}
                        aria-invalid={e[`focus_${wd}`] ? true : undefined}
                      >
                        <option value="">Fokus wählen …</option>
                        {FOCUS_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {FOCUS[k].label}
                          </option>
                        ))}
                      </select>
                      {e[`focus_${wd}`] && <p className="text-xs text-danger">{e[`focus_${wd}`]}</p>}
                    </div>
                    <Field label="Beginn" id={`startsAt_${wd}`} name={`startsAt_${wd}`} type="time" defaultValue={val(`startsAt_${wd}`, d?.startsAt ?? "")} error={e[`startsAt_${wd}`]} />
                    <Field label="Ende" id={`endsAt_${wd}`} name={`endsAt_${wd}`} type="time" defaultValue={val(`endsAt_${wd}`, d?.endsAt ?? "")} error={e[`endsAt_${wd}`]} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </fieldset>

      <SubmitButton pendingLabel="Wird gespeichert …">{submitLabel}</SubmitButton>
    </form>
  );
}
