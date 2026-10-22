"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";

export function ResetForm() {
  const [state, action] = useActionState(requestPasswordReset, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="E-Mail" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <SubmitButton className="w-full" pendingLabel="Wird gesendet …">
        Link senden
      </SubmitButton>
    </form>
  );
}
