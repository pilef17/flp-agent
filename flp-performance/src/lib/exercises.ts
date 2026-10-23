export const CATEGORIES = {
  technik: { label: "Technik", prefix: "TEC" },
  ballkontrolle: { label: "Ballkontrolle", prefix: "BAL" },
  dribbling: { label: "Dribbling", prefix: "DRI" },
  koordination: { label: "Koordination", prefix: "KOO" },
  schnelligkeit: { label: "Schnelligkeit", prefix: "SCH" },
  kraft: { label: "Kraft", prefix: "KRA" },
  stabilitaet: { label: "Stabilität", prefix: "STA" },
  beweglichkeit: { label: "Beweglichkeit", prefix: "BEW" },
  wahrnehmung: { label: "Wahrnehmung", prefix: "WAH" },
  entscheidungsfaehigkeit: { label: "Entscheidungsfähigkeit", prefix: "ENT" },
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export const DIFFICULTY_LABELS = ["", "Einsteiger", "Leicht", "Mittel", "Fortgeschritten", "Anspruchsvoll"] as const;

/** Nächste freie Übungs-ID je Kategorie, z.B. TEC-007. */
export function nextExerciseCode(category: Category, existingCodes: string[]): string {
  const prefix = CATEGORIES[category].prefix;
  const max = existingCodes
    .filter((c) => c.startsWith(`${prefix}-`))
    .map((c) => Number.parseInt(c.slice(prefix.length + 1), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  if (max >= 999) throw new Error(`Keine freie Übungs-ID für ${prefix}`);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function formatSeconds(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} Sek.`;
  return s === 0 ? `${m} Min.` : `${m} Min. ${s} Sek.`;
}

/** Kompakte Dosierung, z.B. «3 × 10 · 45 Sek. · Pause 30 Sek.» */
export function dosage(d: {
  sets?: number | null;
  repetitions?: number | null;
  duration_seconds?: number | null;
  rest_seconds?: number | null;
}): string {
  const parts: string[] = [];
  if (d.sets && d.repetitions) parts.push(`${d.sets} × ${d.repetitions}`);
  else if (d.sets) parts.push(`${d.sets} Serien`);
  else if (d.repetitions) parts.push(`${d.repetitions} Wdh.`);
  const dur = formatSeconds(d.duration_seconds);
  if (dur) parts.push(dur);
  const rest = formatSeconds(d.rest_seconds);
  if (rest) parts.push(`Pause ${rest}`);
  return parts.join(" · ");
}

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

/** Sicherer Speicherpfad im Ordner der Übung (keine Pfad-Tricks, keine Umlaute). */
export function mediaPath(exerciseId: string, fileName: string, nonce: string): string {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
  return `${exerciseId}/${nonce}.${ext}`;
}

/** Prüft, dass ein vom Client gemeldeter Pfad zur Übung gehört. */
export function isMediaPathFor(exerciseId: string, path: string): boolean {
  return new RegExp(`^${exerciseId}/[0-9a-f-]{36}\\.[a-z0-9]{1,5}$`).test(path);
}
