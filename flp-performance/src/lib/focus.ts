/** Trainingsfokus einer Einheit (Wochenstruktur). Reihenfolge = Anzeige in Auswahlfeldern. */
export const FOCUS = {
  kraft: { label: "Kraft", bar: "bg-focus-kraft", text: "text-focus-kraft", border: "border-focus-kraft/50" },
  power: { label: "Power / Explosivität", bar: "bg-focus-power", text: "text-focus-power", border: "border-focus-power/50" },
  ausdauer: { label: "Ausdauer / Erholung", bar: "bg-focus-ausdauer", text: "text-focus-ausdauer", border: "border-focus-ausdauer/50" },
  schnelligkeit: { label: "Schnelligkeit / Reaktion", bar: "bg-focus-schnelligkeit", text: "text-focus-schnelligkeit", border: "border-focus-schnelligkeit/50" },
  technik: { label: "Technik / Taktik", bar: "bg-focus-technik", text: "text-focus-technik", border: "border-focus-technik/50" },
  spiel: { label: "Fussball / Spielform", bar: "bg-focus-spiel", text: "text-focus-spiel", border: "border-focus-spiel/50" },
  regeneration: { label: "Regeneration", bar: "bg-focus-regeneration", text: "text-focus-regeneration", border: "border-focus-regeneration/50" },
} as const;

export type Focus = keyof typeof FOCUS;
export const FOCUS_KEYS = Object.keys(FOCUS) as Focus[];

export function isFocus(value: unknown): value is Focus {
  return typeof value === "string" && value in FOCUS;
}

/** "11:00:00" → "11:00"; null bleibt null. */
export function shortTime(t: string | null | undefined): string | null {
  return t ? t.slice(0, 5) : null;
}

/** Zeitfenster für die Anzeige, z.B. "11:00–12:30" oder "ab 11:00". */
export function timeRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = shortTime(start);
  const e = shortTime(end);
  if (s && e) return `${s}–${e}`;
  if (s) return `ab ${s}`;
  return null;
}
