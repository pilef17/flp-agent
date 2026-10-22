"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "../actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";

export function RegisterForm() {
  const [state, action] = useActionState(signUp, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Vor- und Nachname" name="fullName" defaultValue={state.values?.fullName} autoComplete="name" required error={state.errors?.fullName} />
      <Field label="E-Mail" name="email" defaultValue={state.values?.email} type="email" autoComplete="email" required error={state.errors?.email} />
      <Field
        label="Passwort"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mindestens 10 Zeichen."
        error={state.errors?.password}
      />
      <Field
        label="Passwort bestätigen"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.passwordConfirm}
      />
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm text-mute">
          <input type="checkbox" name="privacy" className="mt-1 size-4 accent-gold" />
          <span>
            Ich habe die{" "}
            <Link href="/datenschutz" className="text-paper underline underline-offset-4" target="_blank">
              Datenschutzerklärung
            </Link>{" "}
            gelesen und akzeptiere sie.
          </span>
        </label>
        {state.errors?.privacy && <p className="text-xs text-danger">{state.errors.privacy}</p>}
      </div>
      <SubmitButton className="w-full" pendingLabel="Konto wird erstellt …">
        Konto erstellen
      </SubmitButton>
    </form>
  );
}
