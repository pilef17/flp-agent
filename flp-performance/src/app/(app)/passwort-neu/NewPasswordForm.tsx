"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Neues Passwort" name="password" type="password" autoComplete="new-password" required error={state.errors?.password} />
      <Field
        label="Passwort bestätigen"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.passwordConfirm}
      />
      <SubmitButton pendingLabel="Wird gespeichert …">Passwort speichern</SubmitButton>
    </form>
  );
}
