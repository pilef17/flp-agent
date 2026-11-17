"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitAnswer, type AnswerState } from "./actions";
import { ANSWER_OPTIONS, NOT_PRACTICED, SCALE_LABEL, THEME_INTRO, THEME_LABEL, THEME_ORDER, THEME_SHORT, type ThemeKey } from "@/lib/wochenfrage";

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
      className="mt-6 min-h-14 w-full rounded-card bg-gold px-5 text-base font-semibold tracking-wide text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
    >
      {pending ? "Wird gesendet …" : "Antwort senden"}
    </button>
  );
}

type Props = {
  questionKey: string;
  weekNumber: number;
  totalWeeks: number;
  theme: ThemeKey;
  focus: string;
  question: string;
  parentNote: string;
  task: string;
  /** «Donnerstag, 26.11.2026» oder null am Zyklusende */
  next: string | null;
};

export function WeeklyForm({ questionKey, weekNumber, totalWeeks, theme, focus, question, parentNote, task, next }: Props) {
  const [state, action] = useActionState<AnswerState, FormData>(submitAnswer, {});
  // «Antwort ändern» gilt nur für die zuletzt bestätigte Antwort
  const [editedState, setEditedState] = useState<AnswerState | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Name vom letzten Mal vorausfüllen – so dauert die Antwort nur zwei Tipps
  useEffect(() => {
    const saved = readName();
    if (saved && nameRef.current && !nameRef.current.value) nameRef.current.value = saved;
  }, []);
  useEffect(() => {
    if (state.ok && state.name) saveName(state.name);
  }, [state]);

  const eyebrow = (
    <div className="flex items-center justify-between gap-3">
      <p className="eyebrow">Wochenfrage</p>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-mute">
        Woche {weekNumber} von {totalWeeks}
      </p>
    </div>
  );
  const progress = (
    <div className="mt-3 flex gap-1" aria-hidden>
      {Array.from({ length: totalWeeks }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full ${i < weekNumber ? "bg-gold" : "bg-line"}`} />
      ))}
    </div>
  );

  if (state.ok && editedState !== state) {
    return (
      <section className="mt-10 flex flex-1 flex-col" aria-live="polite">
        {eyebrow}
        {progress}
        <div className="mt-10 grid size-14 place-items-center rounded-full border border-gold text-2xl text-gold" aria-hidden>
          ✓
        </div>
        <h1 className="mt-6 text-4xl font-extrabold">Danke, {state.name}!</h1>
        <p className="mt-3 text-mute">Deine Antwort ist angekommen.</p>

        <div className="mt-8 rounded-card border border-gold/50 bg-graphite p-5">
          <p className="eyebrow">Dein Auftrag fürs nächste Training</p>
          <p className="mt-3 font-display text-2xl font-bold leading-snug">{task}</p>
        </div>
        {next && <p className="mt-6 text-sm text-mute">Nächste Frage: {next}</p>}

        <button type="button" onClick={() => setEditedState(state)} className="mt-6 self-start text-sm text-mute underline underline-offset-4 hover:text-paper">
          Antwort ändern
        </button>
      </section>
    );
  }

  const err = state.errors ?? {};
  return (
    <form action={action} className="mt-10 flex flex-1 flex-col" noValidate>
      {eyebrow}
      {progress}
      {/* Die vier Säulen des FLP-Beurteilungsbogens – die Säule dieser Woche ist hervorgehoben */}
      <ul className="mt-8 grid grid-cols-4 gap-1.5" aria-label="Die vier Säulen">
        {THEME_ORDER.map((t) => (
          <li
            key={t}
            aria-current={t === theme ? "true" : undefined}
            className={`truncate rounded-full border px-1 py-1.5 text-center text-[0.6875rem] font-medium ${
              t === theme ? "border-gold bg-gold text-ink" : "border-line text-mute"
            }`}
          >
            {THEME_SHORT[t]}
          </li>
        ))}
      </ul>
      <section className="mt-4 rounded-card border border-line bg-graphite px-4 py-3" aria-label="Thema der Woche">
        <p className="text-sm font-semibold text-gold-soft">{THEME_LABEL[theme]}</p>
        <p className="mt-1 text-sm text-mute">{THEME_INTRO[theme]}</p>
      </section>
      <p className="mt-6 text-sm font-medium text-gold-soft">Fokus: {focus}</p>
      <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">{question}</h1>
      <p className="mt-4 border-l-2 border-gold/60 pl-3 text-sm text-mute">
        <span className="font-semibold text-paper">Für Eltern: </span>
        {parentNote}
      </p>

      <input type="hidden" name="questionKey" value={questionKey} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label htmlFor="wf-name" className="mt-8 text-sm font-medium">
        Name des Athleten
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

      <fieldset className="mt-8" aria-describedby={err.answer ? "wf-answer-err" : undefined}>
        <legend className="text-sm font-medium">Wie oft hat es geklappt?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ANSWER_OPTIONS.map((o) => (
            <label key={o} className="relative">
              <input type="radio" name="answer" value={o} className="peer sr-only" />
              <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-card border border-line px-4 text-base transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                {o === NOT_PRACTICED ? (
                  <span className="font-medium">{SCALE_LABEL[o]}</span>
                ) : (
                  <>
                    <span className="font-display text-xl font-bold">{o}</span>
                    <span>{SCALE_LABEL[o]}</span>
                  </>
                )}
              </span>
            </label>
          ))}
        </div>
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
      <p className="mt-auto pt-8 text-center text-[0.6875rem] text-mute">FLP Performance · Antworten sieht nur dein Trainer.</p>
    </form>
  );
}
