"use client";

import { useActionState } from "react";
import { createPrivacyRequest, updateProfile } from "./actions";
import { Field, SelectField, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Name" name="fullName" defaultValue={state.values?.fullName ?? fullName} autoComplete="name" error={state.errors?.fullName} />
      <Field label="Telefon (optional)" name="phone" type="tel" defaultValue={state.values?.phone ?? phone} autoComplete="tel" error={state.errors?.phone} />
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

export function PrivacyRequestForm({ players }: { players: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createPrivacyRequest, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <SelectField
        label="Art des Antrags"
        name="requestType" defaultValue={state.values?.requestType}
        options={[
          { value: "export", label: "Auskunft / Datenkopie" },
          { value: "correction", label: "Berichtigung von Daten" },
          { value: "deletion", label: "Löschung von Daten / Konto" },
        ]}
        error={state.errors?.requestType}
      />
      <SelectField
        label="Betrifft"
        name="playerId" defaultValue={state.values?.playerId}
        options={[{ value: "", label: "Mein eigenes Konto" }, ...players.map((p) => ({ value: p.id, label: `Daten von ${p.name}` }))]}
        error={state.errors?.playerId}
      />
      <TextArea label="Details (optional)" name="details" defaultValue={state.values?.details} maxLength={2000} error={state.errors?.details} />
      <SubmitButton pendingLabel="Wird übermittelt …">Antrag senden</SubmitButton>
    </form>
  );
}
