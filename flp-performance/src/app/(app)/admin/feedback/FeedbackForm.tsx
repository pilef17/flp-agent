"use client";

import { useActionState } from "react";
import { Field, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import type { FormState } from "@/lib/validation";

export function FeedbackForm({
  action,
  defaults,
  publishLabel = "Veröffentlichen",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: { title: string; body: string };
  publishLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  return (
    <form key={v?._n} action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field id="fb-title" label="Titel" name="title" defaultValue={v?.title ?? defaults?.title} error={state.errors?.title} />
      <TextArea id="fb-body" label="Rückmeldung" name="body" rows={6} maxLength={6000} defaultValue={v?.body ?? defaults?.body} error={state.errors?.body} />
      <p className="text-xs text-mute">Sachlich und ermutigend formulieren. Eltern und – falls vorhanden – das Spieler-Login sehen veröffentlichtes Feedback.</p>
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="intent" value="publish" pendingLabel="Wird gespeichert …">
          {publishLabel}
        </SubmitButton>
        <SubmitButton name="intent" value="draft" variant="secondary" pendingLabel="Wird gespeichert …">
          Als Entwurf speichern
        </SubmitButton>
      </div>
    </form>
  );
}
