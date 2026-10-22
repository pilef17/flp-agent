"use client";

import { useActionState } from "react";
import { signIn } from "../actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert, FormMessage } from "@/components/ui/Feedback";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      {linkError && <Alert tone="error">Der Link ist ungültig oder abgelaufen. Bitte erneut versuchen.</Alert>}
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="E-Mail" name="email" defaultValue={state.values?.email} type="email" autoComplete="email" required error={state.errors?.email} />
      <Field label="Passwort" name="password" type="password" autoComplete="current-password" required error={state.errors?.password} />
      <SubmitButton className="w-full" pendingLabel="Anmeldung läuft …">
        Anmelden
      </SubmitButton>
    </form>
  );
}
