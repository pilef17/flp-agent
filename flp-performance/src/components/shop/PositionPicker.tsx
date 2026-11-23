"use client";

import { useState } from "react";
import Link from "next/link";
import { formatChf } from "@/lib/format";
import { LEVELS, POSITIONS, positionProductSlug, type Level } from "@/lib/positions";

export type PositionOffer = { priceCents: number; owned: boolean };

/**
 * Positionswahl wie in der FLP-App: Stufe wählen, Position auf dem Spielfeld oder in der Liste antippen.
 * Das Spielfeld ist eine visuelle Abkürzung; die Liste darunter trägt die zugänglichen Links.
 */
export function PositionPicker({ offers }: { offers: Record<string, PositionOffer> }) {
  const hasLevel = (l: Level) => POSITIONS.some((p) => offers[positionProductSlug(l, p.slug)]);
  const [level, setLevel] = useState<Level>(hasLevel("jugend") ? "jugend" : "pro");

  return (
    <section aria-labelledby="pos-title" className="mb-14">
      <h2 id="pos-title" className="text-3xl font-extrabold uppercase">
        Was ist deine Position?
      </h2>
      <p className="mt-2 max-w-2xl text-mute">Jeder Spieler ist anders. Wähle Stufe und Position: Du bekommst das Training für genau deine Rolle.</p>

      <div className="mt-6 grid grid-cols-2 border border-line p-1" role="group" aria-label="Stufe">
        {(Object.keys(LEVELS) as Level[]).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={level === l}
            disabled={!hasLevel(l)}
            onClick={() => setLevel(l)}
            className={`min-h-11 text-sm font-semibold uppercase tracking-wider disabled:opacity-40 ${level === l ? "bg-gold text-ink" : "text-mute hover:text-paper"}`}
          >
            {LEVELS[l].label}
          </button>
        ))}
      </div>

      <div aria-hidden className="relative mt-4 aspect-[3/2.1] w-full overflow-hidden rounded-card border border-pitch-line bg-pitch">
        <span className="absolute inset-y-0 left-1/2 border-l border-pitch-line" />
        <span className="absolute left-1/2 top-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-line" />
        <span className="absolute inset-y-[25%] left-0 w-[14%] border border-l-0 border-pitch-line" />
        <span className="absolute inset-y-[25%] right-0 w-[14%] border border-r-0 border-pitch-line" />
        {POSITIONS.map((p) => {
          const offer = offers[positionProductSlug(level, p.slug)];
          const cls = "absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-display text-lg font-bold sm:size-12 sm:text-xl";
          const style = { left: `${p.x}%`, top: `${p.y}%` };
          return offer ? (
            <Link key={p.slug} href={`/programme/${positionProductSlug(level, p.slug)}`} tabIndex={-1} style={style} className={`${cls} border-gold bg-ink text-gold hover:bg-gold hover:text-ink`}>
              {p.num}
            </Link>
          ) : (
            <span key={p.slug} style={style} className={`${cls} border-line bg-ink text-mute`}>
              {p.num}
            </span>
          );
        })}
      </div>

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {POSITIONS.map((p) => {
          const offer = offers[positionProductSlug(level, p.slug)];
          const body = (
            <>
              <span aria-hidden className={`w-12 shrink-0 font-display text-4xl font-light ${offer ? "text-gold" : "text-mute"}`}>
                {p.num}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block hyphens-auto break-words font-display text-xl font-bold uppercase leading-tight sm:text-2xl" style={{ fontStretch: "80%" }}>
                  {p.name}
                </span>
                <span className="block text-sm text-mute">{p.motto}</span>
              </span>
              <span className="w-20 shrink-0 text-right text-sm leading-tight sm:w-auto">
                {!offer ? (
                  <span className="text-mute">Bald verfügbar</span>
                ) : offer.owned ? (
                  <span className="text-ok">Freigeschaltet</span>
                ) : (
                  <span className="font-semibold tabular-nums">{formatChf(offer.priceCents)}</span>
                )}
              </span>
            </>
          );
          return (
            <li key={p.slug}>
              {offer ? (
                <Link href={`/programme/${positionProductSlug(level, p.slug)}`} className="flex min-h-11 items-center gap-4 py-4 hover:text-gold">
                  <span className="sr-only">{`${p.num} · ${LEVELS[level].short}: `}</span>
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-4 py-4 text-mute">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
