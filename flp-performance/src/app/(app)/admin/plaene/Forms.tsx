"use client";

import { useActionState, useState } from "react";
import { Field, SelectField, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import { CATEGORIES, type Category } from "@/lib/exercises";
import { FOCUS, FOCUS_KEYS } from "@/lib/focus";
import { addSession, addSessionExercise, createPlan, updateSession } from "./actions";

export type TemplateOption = { id: string; title: string; audience: string };

const FOCUS_OPTIONS = [{ value: "", label: "Kein Fokus" }, ...FOCUS_KEYS.map((k) => ({ value: k, label: FOCUS[k].label }))];

export function CreatePlanForm({ playerId, defaultDate, templates }: { playerId: string; defaultDate: string; templates: TemplateOption[] }) {
  const [state, action] = useActionState(createPlan, {});
  const [templateId, setTemplateId] = useState(state.values?.templateId ?? "");
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="playerId" value={playerId} />
      {templates.length > 0 && (
        <SelectField
          label="Vorlage"
          name="templateId"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          options={[
            { value: "", label: "Leerer Plan" },
            ...templates.map((t) => ({ value: t.id, label: t.audience ? `${t.title} (${t.audience})` : t.title })),
          ]}
          error={state.errors?.templateId}
        />
      )}
      <Field label="Titel" name="title" placeholder="z.B. Woche Ballkontrolle" defaultValue={state.values?.title} error={state.errors?.title} />
      <Field
        label="Woche (beliebiger Tag)"
        name="weekDate"
        type="date"
        defaultValue={state.values?.weekDate ?? defaultDate}
        hint="Der Plan beginnt am Montag dieser Woche."
        error={state.errors?.weekDate}
      />
      {templateId ? (
        <p className="text-sm text-mute">Die Trainingstage, Uhrzeiten und Notizen kommen aus der Vorlage. Danach fügst du die Übungen hinzu.</p>
      ) : (
        <TextArea label="Notizen für Eltern/Spieler (optional)" name="notes" rows={2} defaultValue={state.values?.notes} error={state.errors?.notes} />
      )}
      <SubmitButton pendingLabel="Wird erstellt …">Plan erstellen</SubmitButton>
    </form>
  );
}

/** Aufklappbarer Bereich, der nach Fehlern offen bleibt (Status lebt im Client). */
export function NewPlanSection({
  playerId,
  defaultDate,
  startOpen,
  templates,
}: {
  playerId: string;
  defaultDate: string;
  startOpen: boolean;
  templates: TemplateOption[];
}) {
  const [open, setOpen] = useState(startOpen);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm font-semibold text-gold hover:underline">
        + Neuen Wochenplan erstellen
      </button>
    );
  }
  return <CreatePlanForm playerId={playerId} defaultDate={defaultDate} templates={templates} />;
}

export function AddSessionForm({ planId, days }: { planId: string; days: { value: string; label: string }[] }) {
  const [state, action] = useActionState(addSession, {});
  const e = state.errors ?? {};
  return (
    <form key={state.values?._n} action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_14rem]" noValidate>
      <input type="hidden" name="planId" value={planId} />
      <SelectField label="Tag" name="scheduledOn" options={days} defaultValue={state.values?.scheduledOn} error={e.scheduledOn} />
      <Field label="Titel der Einheit" name="title" placeholder="z.B. Athletik & Sprungkraft" defaultValue={state.values?.title} error={e.title} />
      <SelectField label="Fokus" name="focus" options={FOCUS_OPTIONS} defaultValue={state.values?.focus ?? ""} error={e.focus} />
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
        <Field label="Beginn" name="startsAt" type="time" defaultValue={state.values?.startsAt} error={e.startsAt} />
        <Field label="Ende" name="endsAt" type="time" defaultValue={state.values?.endsAt} error={e.endsAt} />
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-2">
        <SubmitButton pendingLabel="…">Einheit hinzufügen</SubmitButton>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <FormMessage state={state.ok ? {} : state} />
      </div>
    </form>
  );
}

export type SessionEditValues = {
  id: string;
  title: string;
  notes: string;
  focus: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

/** Titel, Fokus, Uhrzeit und Hinweis einer bestehenden Einheit ändern. */
export function EditSessionForm({ planId, session }: { planId: string; session: SessionEditValues }) {
  const [state, action] = useActionState(updateSession, {});
  const e = state.errors ?? {};
  const v = (k: keyof SessionEditValues & string, fallback: string) => state.values?.[k] ?? fallback;
  const id = (name: string) => `${name}-${session.id}`;
  return (
    <form action={action} className="mt-3 grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="sessionId" value={session.id} />
      <Field label="Titel" id={id("title")} name="title" defaultValue={v("title", session.title)} error={e.title} />
      <SelectField label="Fokus" id={id("focus")} name="focus" options={FOCUS_OPTIONS} defaultValue={v("focus", session.focus ?? "")} error={e.focus} />
      <Field label="Beginn" id={id("startsAt")} name="startsAt" type="time" defaultValue={v("startsAt", session.startsAt ?? "")} error={e.startsAt} />
      <Field label="Ende" id={id("endsAt")} name="endsAt" type="time" defaultValue={v("endsAt", session.endsAt ?? "")} error={e.endsAt} />
      <div className="sm:col-span-2">
        <TextArea label="Hinweis für Familie (optional)" id={id("notes")} name="notes" rows={2} defaultValue={v("notes", session.notes)} error={e.notes} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <SubmitButton variant="secondary" pendingLabel="Wird gespeichert …">
          Einheit speichern
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export type ExerciseOption = { id: string; code: string; title: string; category: Category };

export function AddExerciseForm({ planId, sessionId, exercises }: { planId: string; sessionId: string; exercises: ExerciseOption[] }) {
  const [state, action] = useActionState(addSessionExercise, {});
  const e = state.errors ?? {};
  const grouped = (Object.keys(CATEGORIES) as Category[])
    .map((c) => ({ c, items: exercises.filter((x) => x.category === c) }))
    .filter((g) => g.items.length > 0);
  return (
    <form key={state.values?._n} action={action} className="space-y-3 rounded-card border border-dashed border-line p-4" noValidate>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="space-y-1.5">
        <label htmlFor={`ex-${sessionId}`} className="block text-xs font-medium uppercase tracking-[0.12em] text-mute">
          Übung hinzufügen
        </label>
        <select id={`ex-${sessionId}`} name="exerciseId" className="field" defaultValue={state.values?.exerciseId ?? ""} aria-invalid={e.exerciseId ? true : undefined}>
          <option value="">Übung wählen …</option>
          {grouped.map((g) => (
            <optgroup key={g.c} label={CATEGORIES[g.c].label}>
              {g.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code} · {x.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {e.exerciseId && <p className="text-xs text-danger">{e.exerciseId}</p>}
      </div>
      <details>
        <summary className="cursor-pointer text-xs text-mute">Dosierung anpassen (sonst Standard der Übung)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Serien" id={`sets-${sessionId}`} name="sets" type="number" inputMode="numeric" defaultValue={state.values?.sets} error={e.sets} />
          <Field label="Wiederh." id={`repetitions-${sessionId}`} name="repetitions" type="number" inputMode="numeric" defaultValue={state.values?.repetitions} error={e.repetitions} />
          <Field label="Dauer (Sek.)" id={`durationSeconds-${sessionId}`} name="durationSeconds" type="number" inputMode="numeric" defaultValue={state.values?.durationSeconds} error={e.durationSeconds} />
          <Field label="Pause (Sek.)" id={`restSeconds-${sessionId}`} name="restSeconds" type="number" inputMode="numeric" defaultValue={state.values?.restSeconds} error={e.restSeconds} />
        </div>
        <div className="mt-3">
          <Field label="Hinweis (optional)" id={`notes-${sessionId}`} name="notes" defaultValue={state.values?.notes} error={e.notes} />
        </div>
      </details>
      <FormMessage state={state.ok ? {} : state} />
      <SubmitButton variant="secondary" pendingLabel="…">
        Hinzufügen
      </SubmitButton>
    </form>
  );
}
