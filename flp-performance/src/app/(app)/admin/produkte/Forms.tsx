"use client";

import { useActionState } from "react";
import { Field, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import type { FormState } from "@/lib/validation";
import { addArticle, addExerciseItem } from "./actions";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ProductForm({ action, defaults = {}, submitLabel }: { action: Action; defaults?: Record<string, string>; submitLabel: string }) {
  const [state, formAction] = useActionState(action, {});
  const v = (k: string) => state.values?.[k] ?? defaults[k] ?? "";
  const e = state.errors ?? {};
  return (
    <form key={state.values?._n} action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Titel" name="title" defaultValue={v("title")} error={e.title} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Preis (CHF)" name="price" inputMode="decimal" placeholder="39.00" defaultValue={v("price")} error={e.price} />
        <Field label="Zugang (Tage)" name="accessDays" type="number" inputMode="numeric" placeholder="leer = unbefristet" defaultValue={v("accessDays")} error={e.accessDays} />
        <Field label="Reihenfolge" name="position" type="number" inputMode="numeric" defaultValue={v("position") || "0"} error={e.position} />
      </div>
      <Field label="Adresse (Slug)" name="slug" placeholder="wird aus dem Titel erzeugt" defaultValue={v("slug")} hint="Teil der Adresse: /programme/…" error={e.slug} />
      <TextArea label="Kurzbeschreibung" name="summary" rows={2} maxLength={300} defaultValue={v("summary")} error={e.summary} />
      <TextArea label="Beschreibung" name="description" rows={6} maxLength={10000} defaultValue={v("description")} error={e.description} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

export function ArticleForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(addArticle, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-4" noValidate>
      <FormMessage state={state.ok ? {} : state} />
      <input type="hidden" name="productId" value={productId} />
      <Field id="article-title" label="Titel der Lektion" name="title" defaultValue={state.values?.title} error={state.errors?.title} />
      <TextArea id="article-body" label="Text" name="body" rows={6} maxLength={20000} defaultValue={state.values?.body} error={state.errors?.body} />
      <SubmitButton variant="secondary">Lektion hinzufügen</SubmitButton>
    </form>
  );
}

export function ExerciseItemForm({ productId, exercises }: { productId: string; exercises: { id: string; code: string; title: string }[] }) {
  const [state, action] = useActionState(addExerciseItem, {});
  return (
    <form key={state.values?._n} action={action} className="space-y-4" noValidate>
      <FormMessage state={state.ok ? {} : state} />
      <input type="hidden" name="productId" value={productId} />
      <div className="space-y-1.5">
        <label htmlFor="content-exercise" className="block text-xs font-medium uppercase tracking-[0.12em] text-mute">
          Übung aus der Bibliothek
        </label>
        <select id="content-exercise" name="exerciseId" className="field" defaultValue="">
          <option value="">Übung wählen …</option>
          {exercises.map((x) => (
            <option key={x.id} value={x.id}>
              {x.code} · {x.title}
            </option>
          ))}
        </select>
        {state.errors?.exerciseId && <p className="text-xs text-danger">{state.errors.exerciseId}</p>}
      </div>
      <SubmitButton variant="secondary">Übung hinzufügen</SubmitButton>
    </form>
  );
}
