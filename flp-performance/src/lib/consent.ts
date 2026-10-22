/** Version der Datenschutz-/Einwilligungstexte. Bei Textänderungen erhöhen. */
export const POLICY_VERSION = "2026-10";

export const CONSENT_LABELS = {
  data_processing: {
    title: "Bearbeitung der Trainingsdaten",
    text: "Ich willige ein, dass FLP Performance die Trainings- und Entwicklungsdaten meines Kindes (Beurteilungen, Trainingspläne, Feedback) zum Zweck des individuellen Trainings bearbeitet.",
  },
  video_recording: {
    title: "Trainingsvideos",
    text: "Ich willige ein, dass im Training Videos meines Kindes aufgenommen und ausschliesslich privat in der App für mich und den Trainer bereitgestellt werden. Keine Veröffentlichung.",
  },
  player_account: {
    title: "Eigenes Login für mein Kind",
    text: "Ich wünsche ein eigenes Login für mein Kind, damit es Übungen und Trainingspläne selbst ansehen kann.",
  },
} as const;

export type ConsentType = keyof typeof CONSENT_LABELS;

/** Aktueller Stand je Einwilligungsart aus der unveränderlichen Historie. */
export function latestConsents(
  rows: { consent_type: string; granted: boolean; created_at: string }[],
): Partial<Record<ConsentType, boolean>> {
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const out: Partial<Record<ConsentType, boolean>> = {};
  for (const row of sorted) {
    const key = row.consent_type as ConsentType;
    if (!(key in out)) out[key] = row.granted;
  }
  return out;
}
