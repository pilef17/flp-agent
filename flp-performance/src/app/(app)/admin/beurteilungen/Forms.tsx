"use client";

import { useActionState } from "react";
import { Field, SelectField, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import type { FormState } from "@/lib/validation";
import { createAssessment } from "./actions";

export function NewAssessmentForm({ playerId, allowInitial, today }: { playerId: string; allowInitial: boolean; today: string }) {
  const [state, action] = useActionState(createAssessment, {});
  const options = allowInitial
    ? [
        { value: "initial", label: "Erstbeurteilung" },
        { value: "regular", label: "Folgebeurteilung" },
      ]
    : [{ value: "regular", label: "Folgebeurteilung" }];
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="playerId" value={playerId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Art" name="kind" options={options} defaultValue={state.values?.kind} error={state.errors?.kind} />
        <Field label="Datum" name="assessedOn" type="date" max={today} defaultValue={state.values?.assessedOn ?? today} error={state.errors?.assessedOn} />
      </div>
      <SubmitButton pendingLabel="Wird angelegt …">Beurteilung beginnen</SubmitButton>
    </form>
  );
}

export type ScoreCategory = { id: string; name: string; score: number | null; note: string };

const CHOICES = [
  { value: "nb", label: "n. b.", title: "Nicht beurteilt" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

export function ScoreEditor({
  action,
  categories,
  assessedOn,
  coachNotes,
  today,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: ScoreCategory[];
  assessedOn: string;
  coachNotes: string;
  today: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  const e = state.errors ?? {};
  return (
    <form key={v?._n} action={formAction} className="space-y-8" noValidate>
      <FormMessage state={state} />
      <fieldset className="space-y-1">
        <legend className="eyebrow mb-3">Kompetenzen · Skala 1 (Anfang) bis 5 (sehr stark)</legend>
        <ul className="divide-y divide-line">
          {categories.map((c) => {
            const current = v ? v[`score_${c.id}`] || "nb" : c.score === null ? "nb" : String(c.score);
            return (
              <li key={c.id} className="grid gap-3 py-4 md:grid-cols-[13rem_auto_1fr] md:items-center">
                <span id={`lbl-${c.id}`} className="font-medium">
                  {c.name}
                </span>
                <div role="radiogroup" aria-labelledby={`lbl-${c.id}`} className="flex overflow-hidden rounded-card border border-line">
                  {CHOICES.map((ch) => (
                    <label key={ch.value} title={ch.title} className="relative flex-1 md:flex-none">
                      <input type="radio" name={`score_${c.id}`} value={ch.value} defaultChecked={current === ch.value} className="peer sr-only" />
                      <span className="flex h-11 min-w-11 cursor-pointer items-center justify-center border-r border-line px-2 text-sm text-mute last:border-r-0 peer-checked:bg-gold peer-checked:font-semibold peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                        {ch.label}
                      </span>
                    </label>
                  ))}
                </div>
                <input
                  name={`note_${c.id}`}
                  aria-label={`Notiz zu ${c.name}`}
                  placeholder="Notiz (optional)"
                  maxLength={1000}
                  defaultValue={v ? v[`note_${c.id}`] : c.note}
                  className="field py-2.5 text-sm"
                />
                {e[`score_${c.id}`] && <p className="text-xs text-danger md:col-span-3">{e[`score_${c.id}`]}</p>}
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <Field label="Datum" name="assessedOn" type="date" max={today} defaultValue={v?.assessedOn ?? assessedOn} error={e.assessedOn} />
        <TextArea label="Gesamtnotiz für die Familie" name="coachNotes" maxLength={4000} defaultValue={v?.coachNotes ?? coachNotes} error={e.coachNotes} />
      </div>
      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton name="intent" value="save" variant="secondary" pendingLabel="Wird gespeichert …">
          Entwurf speichern
        </SubmitButton>
        <div className="space-y-2 sm:text-right">
          <label className="flex items-start gap-2 text-sm text-mute sm:justify-end">
            <input type="checkbox" name="confirmPublish" className="mt-0.5 size-4 accent-gold" />
            <span>Werte geprüft – nach Veröffentlichung nicht mehr änderbar.</span>
          </label>
          {e.confirmPublish && <p className="text-xs text-danger">{e.confirmPublish}</p>}
          <SubmitButton name="intent" value="publish" pendingLabel="Wird veröffentlicht …">
            Veröffentlichen
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
