"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/Feedback";
import { formatChf } from "@/lib/format";
import { LEVELS, QUESTIONS, checkMessage, evaluate, type CheckResult, type Level } from "@/lib/check";
import { submitLead, type LeadState } from "./actions";

export type Offer = { slug: string; priceCents: number };

type Props = {
  /** Aktive Winterpause-Programme je Niveau (fehlt = noch nicht im Shop) */
  offers: Partial<Record<Level, Offer>>;
  /** WhatsApp-Nummer des Trainers für wa.me, sonst null */
  coachPhone: string | null;
};

const AREA_LABEL = { technik: "Technik", taktik: "Taktik" } as const;

export function CheckForm({ offers, coachPhone }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [result, setResult] = useState<CheckResult | null>(null);
  const [missing, setMissing] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const answered = answers.filter((a) => a !== null).length;

  function showResult(e: React.FormEvent) {
    e.preventDefault();
    if (answers.some((a) => a === null)) {
      setMissing(true);
      const first = answers.findIndex((a) => a === null);
      document.getElementById(`q-${QUESTIONS[first].key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setMissing(false);
    setResult(evaluate(answers as number[]));
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  return (
    <>
      <form onSubmit={showResult} noValidate className="mt-10 space-y-6">
        {(["technik", "taktik"] as const).map((area) => (
          <section key={area} aria-labelledby={`area-${area}`}>
            <h2 id={`area-${area}`} className="eyebrow mb-4">
              {AREA_LABEL[area]}
            </h2>
            <div className="space-y-4">
              {QUESTIONS.map((q, i) =>
                q.area !== area ? null : (
                  <fieldset
                    key={q.key}
                    id={`q-${q.key}`}
                    className={`rounded-card border bg-graphite p-4 ${missing && answers[i] === null ? "border-danger" : "border-line"}`}
                  >
                    <legend className="sr-only">{`Frage ${i + 1} von ${QUESTIONS.length}`}</legend>
                    <p className="text-xs text-mute" aria-hidden>
                      {i + 1} / {QUESTIONS.length}
                    </p>
                    <p className="mt-1 font-semibold">{q.question}</p>
                    <div className="mt-3 grid gap-2">
                      {q.options.map((label, points) => (
                        <label
                          key={label}
                          className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-card border px-3 py-2 text-sm ${
                            answers[i] === points ? "border-gold text-paper" : "border-line text-mute hover:text-paper"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.key}
                            value={points}
                            checked={answers[i] === points}
                            onChange={() => {
                              setAnswers((a) => a.map((v, j) => (j === i ? points : v)));
                              setResult(null);
                            }}
                            className="size-4 accent-gold"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ),
              )}
            </div>
          </section>
        ))}
        {missing && (
          <p role="alert" className="text-sm text-danger">
            Bitte beantworten Sie alle {QUESTIONS.length} Fragen ({answered} von {QUESTIONS.length} beantwortet).
          </p>
        )}
        <button
          type="submit"
          className="min-h-14 w-full rounded-card bg-gold px-5 text-base font-semibold tracking-wide text-ink transition-colors hover:bg-gold-soft"
        >
          Ergebnis anzeigen
        </button>
      </form>

      {result && (
        <Result
          ref={resultRef}
          result={result}
          answers={answers as number[]}
          offer={offers[result.level]}
          coachPhone={coachPhone}
        />
      )}
    </>
  );
}

function Result({
  ref,
  result,
  answers,
  offer,
  coachPhone,
}: {
  ref: React.Ref<HTMLElement>;
  result: CheckResult;
  answers: number[];
  offer?: Offer;
  coachPhone: string | null;
}) {
  const level = LEVELS[result.level];
  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="result-title" className="mt-12 scroll-mt-6 outline-none">
      <p className="eyebrow">Ihr Ergebnis</p>
      <h2 id="result-title" className="mt-3 text-4xl font-extrabold">
        Niveau: <span className="text-gold">{level.label}</span>
      </h2>
      <p className="mt-2 text-sm tabular-nums text-mute">
        {result.score} von 24 Punkten · Technik {result.technik}/12 · Taktik {result.taktik}/12
      </p>
      <p className="mt-4 leading-relaxed text-mute">{level.text}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-graphite p-4">
          <h3 className="eyebrow mb-2">Stärken</h3>
          {result.strengths.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">Noch keine Bereiche mit voller Punktzahl – genau hier hilft gezieltes Training.</p>
          )}
        </div>
        <div className="rounded-card border border-line bg-graphite p-4">
          <h3 className="eyebrow mb-2">Jetzt trainieren</h3>
          {result.focus.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.focus.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">Überall volle Punktzahl. Jetzt zählen Tempo, Kombinationen und Spielintelligenz.</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-card border border-gold p-5">
        <p className="eyebrow">Fit durch die Winterpause</p>
        <h3 className="mt-2 text-2xl font-bold">Winterpause-Programm · {level.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          6 Wochen, 3 Einheiten pro Woche, je ca. 30 Minuten zuhause: Dribbling-Karten für das Niveau Ihres Kindes und Fitness mit dem
          eigenen Körpergewicht. Platz im Wohnzimmer oder vor dem Haus genügt.
        </p>
        {offer ? (
          <Link
            href={`/programme/${offer.slug}`}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-card bg-gold px-5 font-semibold text-ink hover:bg-gold-soft"
          >
            Programm ansehen – {formatChf(offer.priceCents)}
          </Link>
        ) : (
          <p className="mt-4 text-sm text-mute">Das Programm ist in Kürze verfügbar.</p>
        )}
      </div>

      {coachPhone && (
        <a
          href={`https://wa.me/${coachPhone}?text=${encodeURIComponent(checkMessage(result))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-card border border-line px-5 font-semibold hover:border-gold"
        >
          Probetraining per WhatsApp anfragen
        </a>
      )}

      <LeadForm answers={answers} />
    </section>
  );
}

function LeadForm({ answers }: { answers: number[] }) {
  const [state, action] = useActionState<LeadState, FormData>(submitLead, {});
  if (state.ok) {
    return (
      <div role="status" className="mt-10 rounded-card border border-ok/50 p-5 text-ok">
        Danke! Felipe meldet sich in den nächsten Tagen bei Ihnen.
      </div>
    );
  }
  const e = state.errors ?? {};
  const v = state.values;
  return (
    <form action={action} className="mt-10 space-y-4 rounded-card border border-line bg-graphite p-5" noValidate>
      <div>
        <h3 className="text-xl font-bold">Persönliches Feedback vom Trainer</h3>
        <p className="mt-1 text-sm text-mute">Hinterlassen Sie Ihre Kontaktdaten, und Felipe meldet sich mit einer Einschätzung zum Ergebnis Ihres Kindes. Freiwillig und kostenlos.</p>
      </div>
      <FormMessage state={state} />
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field id="lead-name" label="Ihr Name" name="parentName" autoComplete="name" defaultValue={v?.parentName} error={e.parentName} />
      <Field id="lead-email" label="E-Mail" name="email" type="email" autoComplete="email" defaultValue={v?.email} error={e.email} />
      <div className="grid grid-cols-2 gap-4">
        <Field id="lead-age" label="Alter des Kindes" name="childAge" type="number" inputMode="numeric" min={4} max={20} defaultValue={v?.childAge} error={e.childAge} />
        <Field id="lead-position" label="Position (optional)" name="position" defaultValue={v?.position} />
      </div>
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm text-mute">
          <input type="checkbox" name="consent" className="mt-1 size-4 shrink-0 accent-gold" aria-invalid={e.consent ? true : undefined} />
          <span>
            Ich bin einverstanden, dass FLP Performance mich zum Ergebnis kontaktiert und meine Angaben dafür speichert. Mehr in der{" "}
            <Link href="/datenschutz" className="text-gold underline underline-offset-4" target="_blank">
              Datenschutzerklärung
            </Link>
            .
          </span>
        </label>
        {e.consent && <p className="text-xs text-danger">{e.consent}</p>}
      </div>
      <SubmitButton pendingLabel="Wird gesendet …">Feedback anfordern</SubmitButton>
    </form>
  );
}
