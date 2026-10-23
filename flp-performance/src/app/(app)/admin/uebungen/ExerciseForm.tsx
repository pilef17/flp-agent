"use client";

import { useActionState } from "react";
import { Field, SelectField, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import { CATEGORIES, DIFFICULTY_LABELS, type Category } from "@/lib/exercises";
import type { FormState } from "@/lib/validation";

export type ExerciseDefaults = Partial<Record<string, string>>;

export function ExerciseForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: ExerciseDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = (k: string) => state.values?.[k] ?? defaults[k] ?? "";
  const e = state.errors ?? {};
  return (
    <form key={state.values?._n} action={formAction} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <Field label="Titel" name="title" defaultValue={v("title")} required error={e.title} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Kategorie"
          name="category"
          defaultValue={v("category") || "technik"}
          options={(Object.keys(CATEGORIES) as Category[]).map((c) => ({ value: c, label: CATEGORIES[c].label }))}
          error={e.category}
        />
        <SelectField
          label="Niveau"
          name="difficulty"
          defaultValue={v("difficulty") || "1"}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} – ${DIFFICULTY_LABELS[n]}` }))}
        />
        <Field label="Alter von" name="ageMin" type="number" inputMode="numeric" min={4} max={18} defaultValue={v("ageMin") || "6"} error={e.ageMin} />
        <Field label="Alter bis" name="ageMax" type="number" inputMode="numeric" min={4} max={18} defaultValue={v("ageMax") || "14"} error={e.ageMax} />
      </div>
      <TextArea label="Beschreibung" name="description" defaultValue={v("description")} maxLength={4000} error={e.description} />
      <fieldset className="space-y-3">
        <legend className="eyebrow mb-1">Standard-Dosierung (optional)</legend>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Field label="Serien" name="sets" type="number" inputMode="numeric" min={1} defaultValue={v("sets")} error={e.sets} />
          <Field label="Wiederh." name="repetitions" type="number" inputMode="numeric" min={1} defaultValue={v("repetitions")} error={e.repetitions} />
          <Field label="Dauer (Sek.)" name="durationSeconds" type="number" inputMode="numeric" min={1} defaultValue={v("durationSeconds")} error={e.durationSeconds} />
          <Field label="Pause (Sek.)" name="restSeconds" type="number" inputMode="numeric" min={0} defaultValue={v("restSeconds")} error={e.restSeconds} />
        </div>
      </fieldset>
      <TextArea label="Coaching-Hinweise" name="coachingInstructions" defaultValue={v("coachingInstructions")} maxLength={4000} error={e.coachingInstructions} />
      <TextArea label="Sicherheitshinweise" name="safetyNotes" defaultValue={v("safetyNotes")} maxLength={2000} rows={3} error={e.safetyNotes} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
