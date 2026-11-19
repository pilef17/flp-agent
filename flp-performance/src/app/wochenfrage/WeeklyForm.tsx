"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitAnswer, type AnswerState } from "./actions";
import { coachMessage, ANSWER_OPTIONS, NOT_PRACTICED, THEME_ORDER, type ThemeKey } from "@/lib/wochenfrage";
import { SCALE_TEXT, TEXT, THEME_TEXT, type Lang } from "@/lib/wochenfrage-i18n";

const NAME_KEY = "flp-wochenfrage-name";
const PROFILE_KEY = "flp-wochenfrage-athlet";

type Profile = { name: string; age: string; team: string };

/** Angaben vom letzten Mal (Name, Alter, Team) – nur auf diesem Handy gespeichert. */
function readProfile(): Profile {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<Profile> | null;
    return { name: saved?.name ?? localStorage.getItem(NAME_KEY) ?? "", age: saved?.age ?? "", team: saved?.team ?? "" };
  } catch {
    return { name: "", age: "", team: "" };
  }
}
function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // privater Modus: Angaben werden einfach nicht gemerkt
  }
}

function SendButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 min-h-14 w-full rounded-card bg-gold px-5 text-base font-semibold tracking-wide text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

type Props = {
  /** Sprache der Familie – Texte für den Trainer bleiben Deutsch */
  lang: Lang;
  questionKey: string;
  weekNumber: number;
  totalWeeks: number;
  theme: ThemeKey;
  focus: string;
  question: string;
  parentNote: string;
  task: string;
  /** Deutscher Titel und deutsche Frage für die WhatsApp-Nachricht an den Trainer */
  coachTitle: string;
  coachQuestion: string;
  /** «Donnerstag, 26.11.2026» oder null am Zyklusende */
  next: string | null;
  /** WhatsApp-Nummer des Trainers (nur Ziffern) – ohne Nummer kein Knopf */
  coachPhone: string | null;
};

export function WeeklyForm({ lang, questionKey, weekNumber, totalWeeks, theme, focus, question, parentNote, task, coachTitle, coachQuestion, next, coachPhone }: Props) {
  const t = TEXT[lang];
  const themes = THEME_TEXT[lang];
  const scale = SCALE_TEXT[lang];
  const [state, action] = useActionState<AnswerState, FormData>(submitAnswer, {});
  // «Antwort ändern» gilt nur für die zuletzt bestätigte Antwort
  const [editedState, setEditedState] = useState<AnswerState | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const teamRef = useRef<HTMLInputElement>(null);

  // Angaben vom letzten Mal vorausfüllen – so dauert die Antwort nur zwei Tipps
  useEffect(() => {
    const saved = readProfile();
    const fill = (el: HTMLInputElement | null, v: string) => {
      if (el && v && !el.value) el.value = v;
    };
    fill(nameRef.current, saved.name);
    fill(ageRef.current, saved.age);
    fill(teamRef.current, saved.team);
  }, []);
  useEffect(() => {
    if (state.ok && state.name) saveProfile({ name: state.name, age: state.age ?? "", team: state.team ?? "" });
  }, [state]);

  const eyebrow = (
    <div className="flex items-center justify-between gap-3">
      <p className="eyebrow">{t.eyebrow}</p>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-mute">
        {t.weekOf(weekNumber, totalWeeks)}
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
        <h1 className="mt-6 text-4xl font-extrabold">{t.thanks(state.name ?? "")}</h1>
        <p className="mt-3 text-mute">{t.received}</p>

        <div className="mt-8 rounded-card border border-gold/50 bg-graphite p-5">
          <p className="eyebrow">{t.taskTitle}</p>
          <p className="mt-3 font-display text-2xl font-bold leading-snug">{task}</p>
        </div>
        {coachPhone && (
          <a
            href={`https://wa.me/${coachPhone}?text=${encodeURIComponent(
              coachMessage({ weekNumber, title: coachTitle, question: coachQuestion, name: state.name ?? "", age: state.age ?? "", team: state.team ?? "", answer: state.answer ?? "" }),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="send-to-coach"
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-card bg-gold px-5 text-base font-semibold tracking-wide text-ink transition-colors hover:bg-gold-soft"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-current">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" />
            </svg>
            {t.sendToCoach}
          </a>
        )}
        {next && (
          <p className="mt-6 text-sm text-mute">
            {t.nextQuestion}: {next}
          </p>
        )}

        <button type="button" onClick={() => setEditedState(state)} className="mt-6 self-start text-sm text-mute underline underline-offset-4 hover:text-paper">
          {t.changeAnswer}
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
      <ul className="mt-8 grid grid-cols-4 gap-1.5" aria-label={t.pillars}>
        {THEME_ORDER.map((k) => (
          <li
            key={k}
            aria-current={k === theme ? "true" : undefined}
            className={`truncate rounded-full border px-1 py-1.5 text-center text-[0.6875rem] font-medium ${
              k === theme ? "border-gold bg-gold text-ink" : "border-line text-mute"
            }`}
          >
            {themes[k].short}
          </li>
        ))}
      </ul>
      <section className="mt-4 rounded-card border border-line bg-graphite px-4 py-3" aria-label={t.themeOfWeek}>
        <p className="text-sm font-semibold text-gold-soft">{themes[theme].label}</p>
        <p className="mt-1 text-sm text-mute">{themes[theme].intro}</p>
      </section>
      <p className="mt-6 text-sm font-medium text-gold-soft">
        {t.focus}: {focus}
      </p>
      <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">{question}</h1>
      <p className="mt-4 border-l-2 border-gold/60 pl-3 text-sm text-mute">
        <span className="font-semibold text-paper">{t.forParents}: </span>
        {parentNote}
      </p>

      <input type="hidden" name="questionKey" value={questionKey} />
      <input type="hidden" name="lang" value={lang} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label htmlFor="wf-name" className="mt-8 text-sm font-medium">
        {t.nameLabel}
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
        placeholder={t.namePlaceholder}
        aria-invalid={err.name ? true : undefined}
        aria-describedby={err.name ? "wf-name-err" : undefined}
        className="field mt-2"
      />
      {err.name && (
        <p id="wf-name-err" className="mt-2 text-sm text-danger">
          {err.name}
        </p>
      )}

      <div className="mt-5 grid grid-cols-[6.5rem_1fr] gap-3">
        <div className="flex flex-col">
          <label htmlFor="wf-age" className="text-sm font-medium">
            {t.ageLabel}
          </label>
          <input
            ref={ageRef}
            id="wf-age"
            name="age"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            autoComplete="off"
            defaultValue={state.age ?? ""}
            placeholder={t.agePlaceholder}
            aria-invalid={err.age ? true : undefined}
            aria-describedby={err.age ? "wf-age-err" : undefined}
            className="field mt-2"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="wf-team" className="text-sm font-medium">
            {t.teamLabel}
          </label>
          <input
            ref={teamRef}
            id="wf-team"
            name="team"
            type="text"
            maxLength={60}
            autoComplete="off"
            autoCapitalize="words"
            defaultValue={state.team ?? ""}
            placeholder={t.teamPlaceholder}
            aria-invalid={err.team ? true : undefined}
            aria-describedby={err.team ? "wf-team-err" : undefined}
            className="field mt-2"
          />
        </div>
      </div>
      {err.age && (
        <p id="wf-age-err" className="mt-2 text-sm text-danger">
          {err.age}
        </p>
      )}
      {err.team && (
        <p id="wf-team-err" className="mt-2 text-sm text-danger">
          {err.team}
        </p>
      )}

      <fieldset className="mt-8" aria-describedby={err.answer ? "wf-answer-err" : undefined}>
        <legend className="text-sm font-medium">{t.scaleQuestion}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ANSWER_OPTIONS.map((o) => (
            <label key={o} className="relative">
              <input type="radio" name="answer" value={o} className="peer sr-only" />
              <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-card border border-line px-4 text-base transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                {o === NOT_PRACTICED ? (
                  <span className="font-medium">{scale[o]}</span>
                ) : (
                  <>
                    <span className="font-display text-xl font-bold">{o}</span>
                    <span>{scale[o]}</span>
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
              {t.reload}
            </a>
          )}
        </p>
      )}

      <SendButton label={t.send} pendingLabel={t.sending} />
      <p className="mt-auto pt-8 text-center text-[0.6875rem] text-mute">{t.footer}</p>
    </form>
  );
}
