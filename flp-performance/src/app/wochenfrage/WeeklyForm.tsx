"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitAnswer, type AnswerState } from "./actions";
import { ANSWER_OPTIONS, NOT_PRACTICED } from "@/lib/wochenfrage";

const NAME_KEY = "flp-wochenfrage-name";

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // privater Modus: Name wird einfach nicht gemerkt
  }
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-8 min-h-14 w-full rounded-card bg-gold px-5 text-base font-semibold tracking-wide text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
    >
      {pending ? "Wird gesendet …" : "Antwort senden"}
    </button>
  );
}

export function WeeklyForm({ questionKey, themeLabel, question }: { questionKey: string; themeLabel: string; question: string }) {
  const [state, action] = useActionState<AnswerState, FormData>(submitAnswer, {});
  // «Antwort ändern» gilt nur für die zuletzt bestätigte Antwort
  const [editedState, setEditedState] = useState<AnswerState | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Name vom letzten Mal vorausfüllen – so dauert die Antwort nur Sekunden
  useEffect(() => {
    const saved = readName();
    if (saved && nameRef.current && !nameRef.current.value) nameRef.current.value = saved;
  }, []);
  useEffect(() => {
    if (state.ok && state.name) saveName(state.name);
  }, [state]);

  if (state.ok && editedState !== state) {
    return (
      <section className="mt-16 flex flex-1 flex-col" aria-live="polite">
        <p className="eyebrow">Wochenfrage</p>
        <div className="mt-6 grid size-14 place-items-center rounded-full border border-gold text-2xl text-gold" aria-hidden>
          ✓
        </div>
        <h1 className="mt-6 text-4xl font-extrabold">Danke, {state.name}!</h1>
        <p className="mt-3 text-mute">Deine Antwort ist angekommen. Am Donnerstag gibt es eine neue Frage.</p>
        <button type="button" onClick={() => setEditedState(state)} className="mt-8 self-start text-sm text-mute underline underline-offset-4 hover:text-paper">
          Antwort ändern
        </button>
      </section>
    );
  }

  const err = state.errors ?? {};
  return (
    <form action={action} className="mt-12 flex flex-1 flex-col" noValidate>
      <p className="eyebrow">Wochenfrage</p>
      <p className="mt-6 text-sm font-medium text-gold-soft">{themeLabel}</p>
      <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">{question}</h1>

      <input type="hidden" name="questionKey" value={questionKey} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label htmlFor="wf-name" className="mt-8 text-sm font-medium">
        Dein Name
      </label>
      <input
        ref={nameRef}
        id="wf-name"
        name="name"
        type="text"
        maxLength={40}
        autoComplete="given-name"
        autoCapitalize="words"
        defaultValue={state.name ?? ""}
        placeholder="Vorname und Nachname"
        aria-invalid={err.name ? true : undefined}
        aria-describedby={err.name ? "wf-name-err" : undefined}
        className="field mt-2"
      />
      {err.name && (
        <p id="wf-name-err" className="mt-2 text-sm text-danger">
          {err.name}
        </p>
      )}

      <fieldset className="mt-8" aria-describedby={err.answer ? "wf-answer-err" : "wf-scale"}>
        <legend className="text-sm font-medium">Wie gut hat es geklappt?</legend>
        <p id="wf-scale" className="mt-1 text-xs text-mute">
          1 = gar nicht · 5 = sehr gut
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {ANSWER_OPTIONS.filter((o) => o !== NOT_PRACTICED).map((o) => (
            <label key={o} className="relative">
              <input type="radio" name="answer" value={o} className="peer sr-only" />
              <span className="flex h-14 cursor-pointer items-center justify-center rounded-card border border-line text-xl font-semibold transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                {o}
              </span>
            </label>
          ))}
        </div>
        <label className="relative mt-2 block">
          <input type="radio" name="answer" value={NOT_PRACTICED} className="peer sr-only" />
          <span className="flex h-12 cursor-pointer items-center justify-center rounded-card border border-line text-sm font-medium text-mute transition-colors peer-checked:border-gold peer-checked:text-gold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
            Nicht geübt
          </span>
        </label>
        {err.answer && (
          <p id="wf-answer-err" className="mt-2 text-sm text-danger">
            {err.answer}
          </p>
        )}
      </fieldset>

      {state.message && (
        <p role="alert" className="mt-6 rounded-card border border-danger/50 px-4 py-3 text-sm text-danger">
          {state.message}{" "}
          {state.stale && (
            <a href="" className="underline">
              Neu laden
            </a>
          )}
        </p>
      )}

      <SendButton />
      <p className="mt-auto pt-10 text-center text-[0.6875rem] text-mute">
        FLP Performance · Antworten sieht nur dein Trainer.
      </p>
    </form>
  );
}
