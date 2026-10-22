import type { HistoryPoint } from "@/lib/assessments";
import { formatDate } from "@/lib/format";

const W = 260;
const H = 96;
const PAD = { l: 18, r: 26, t: 10, b: 10 };
const yOf = (score: number) => PAD.t + ((5 - score) / 4) * (H - PAD.t - PAD.b);

/**
 * Kleine Verlaufsdiagramme je Kompetenz (Small Multiples, gemeinsame Skala 1–5).
 * Erstbeurteilung = roter Ring, aktuellste = goldener Punkt, dazwischen grau.
 * «Nicht beurteilt» unterbricht die Linie – es wird nie interpoliert.
 */
export function CompetencyHistory({ series }: { series: { name: string; points: HistoryPoint[] }[] }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
        <span className="inline-flex items-center gap-2">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="4" fill="var(--color-graphite)" stroke="var(--color-initial)" strokeWidth="2" />
          </svg>
          Erstbeurteilung
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="5" fill="var(--color-gold)" />
          </svg>
          Aktuell
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="3.5" fill="var(--color-mute)" />
          </svg>
          Dazwischen
        </span>
        <span>Skala 1–5 · Lücke = nicht beurteilt</span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {series.map((s) => (
          <li key={s.name} className="rounded-card border border-line bg-ink/40 p-4">
            <Mini name={s.name} points={s.points} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mini({ name, points }: { name: string; points: HistoryPoint[] }) {
  const times = points.map((p) => new Date(`${p.date}T00:00:00Z`).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const xOf = (i: number) => (t1 === t0 ? (PAD.l + W - PAD.r) / 2 : PAD.l + ((times[i] - t0) / (t1 - t0)) * (W - PAD.l - PAD.r));
  const lastIdx = points.length - 1;
  const first = points[0]?.score ?? null;
  const last = points[lastIdx]?.score ?? null;

  // Liniensegmente nur zwischen direkt aufeinanderfolgenden bewerteten Punkten
  const segments: string[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].score;
    const b = points[i].score;
    if (a !== null && b !== null) segments.push(`M${xOf(i - 1)},${yOf(a)}L${xOf(i)},${yOf(b)}`);
  }
  const summary = points.map((p) => `${formatDate(p.date)}: ${p.score ?? "nicht beurteilt"}`).join(", ");

  return (
    <figure>
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="shrink-0 text-xs tabular-nums text-mute">
          {first ?? "n. b."} → {last ?? "n. b."}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${name}: ${summary}`}>
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yOf(v)} y2={yOf(v)} stroke="var(--color-line)" strokeWidth={v === 1 ? 1 : 0.5} />
            {(v === 1 || v === 3 || v === 5) && (
              <text x={PAD.l - 6} y={yOf(v) + 3} textAnchor="end" fontSize="9" fill="var(--color-mute)">
                {v}
              </text>
            )}
          </g>
        ))}
        {segments.map((d, i) => (
          <path key={i} d={d} stroke="var(--color-mute)" strokeWidth="2" fill="none" strokeLinecap="round" />
        ))}
        {points.map((p, i) => {
          if (p.score === null) return null;
          const isInitial = p.kind === "initial";
          const isLatest = i === lastIdx;
          const cx = xOf(i);
          const cy = yOf(p.score);
          return (
            <g key={p.assessmentId}>
              <title>{`${formatDate(p.date)}${isInitial ? " · Erstbeurteilung" : ""}: ${p.score}`}</title>
              {/* grössere, unsichtbare Trefferfläche für Hover/Touch */}
              <circle cx={cx} cy={cy} r={10} fill="transparent" />
              {isLatest && !isInitial ? (
                <circle cx={cx} cy={cy} r={5} fill="var(--color-gold)" stroke="var(--color-graphite)" strokeWidth="2" />
              ) : isInitial ? (
                <circle cx={cx} cy={cy} r={4.5} fill="var(--color-graphite)" stroke="var(--color-initial)" strokeWidth="2" />
              ) : (
                <circle cx={cx} cy={cy} r={3.5} fill="var(--color-mute)" stroke="var(--color-graphite)" strokeWidth="1.5" />
              )}
              {isLatest && (
                <text x={cx + 9} y={cy + 3} fontSize="10" fill="var(--color-paper)">
                  {p.score}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
