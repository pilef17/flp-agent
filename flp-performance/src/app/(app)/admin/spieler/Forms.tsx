"use client";

import { useActionState } from "react";
import { createPlayer, inviteGuardian } from "./actions";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";

export function CreatePlayerForm() {
  const [state, action] = useActionState(createPlayer, {});
  const year = new Date().getFullYear();
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vorname" name="firstName" defaultValue={state.values?.firstName} required error={state.errors?.firstName} />
        <Field label="Nachname" name="lastName" defaultValue={state.values?.lastName} required error={state.errors?.lastName} />
        <Field
          label="Geburtsjahr"
          name="birthYear" defaultValue={state.values?.birthYear}
          type="number"
          inputMode="numeric"
          min={year - 18}
          max={year - 4}
          required
          hint="Nur das Jahr – Datenminimierung."
          error={state.errors?.birthYear}
        />
        <Field label="Position (optional)" name="position" defaultValue={state.values?.position} error={state.errors?.position} />
        <SelectField
          label="Starker Fuss"
          name="dominantFoot" defaultValue={state.values?.dominantFoot}
          options={[
            { value: "", label: "Keine Angabe" },
            { value: "rechts", label: "Rechts" },
            { value: "links", label: "Links" },
            { value: "beidfuessig", label: "Beidfüssig" },
          ]}
        />
        <Field label="Verein (optional)" name="club" defaultValue={state.values?.club} error={state.errors?.club} />
      </div>
      <SubmitButton pendingLabel="Wird erfasst …">Spieler erfassen</SubmitButton>
    </form>
  );
}

export function InviteGuardianForm({ playerId }: { playerId: string }) {
  const [state, action] = useActionState(inviteGuardian, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="playerId" value={playerId} />
      <Field label="Name" name="fullName" defaultValue={state.values?.fullName} required error={state.errors?.fullName} />
      <Field label="E-Mail" name="email" defaultValue={state.values?.email} type="email" required error={state.errors?.email} />
      <SelectField
        label="Beziehung"
        name="relationship" defaultValue={state.values?.relationship}
        options={[
          { value: "Mutter", label: "Mutter" },
          { value: "Vater", label: "Vater" },
          { value: "Erziehungsberechtigte Person", label: "Erziehungsberechtigte Person" },
        ]}
      />
      <SubmitButton pendingLabel="Wird gesendet …">Einladen & verknüpfen</SubmitButton>
    </form>
  );
}
