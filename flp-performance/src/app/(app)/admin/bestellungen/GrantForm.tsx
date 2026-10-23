"use client";

import { useActionState } from "react";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import { grantAccess } from "./actions";

export function GrantForm({ products }: { products: { id: string; title: string }[] }) {
  const [state, action] = useActionState(grantAccess, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field id="grant-email" label="E-Mail des Kontos" name="email" type="email" defaultValue={state.values?.email} error={state.errors?.email} />
      <SelectField
        id="grant-product"
        label="Programm"
        name="productId"
        defaultValue={state.values?.productId}
        options={[{ value: "", label: "Programm wählen …" }, ...products.map((p) => ({ value: p.id, label: p.title }))]}
        error={state.errors?.productId}
      />
      <Field id="grant-days" label="Dauer in Tagen (leer = unbefristet)" name="accessDays" type="number" inputMode="numeric" defaultValue={state.values?.accessDays} error={state.errors?.accessDays} />
      <SubmitButton variant="secondary">Zugang vergeben</SubmitButton>
    </form>
  );
}
