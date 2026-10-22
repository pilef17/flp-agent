import type { ScoreSeries } from "@/lib/assessments";
import { formatDate } from "@/lib/format";

/**
 * Vergleich Erstbeurteilung (rot) und aktuelle Beurteilung (gold) je Kompetenz.
 * Nicht beurteilte Kompetenzen werden als «n. b.» angezeigt, nie als 0.
 */
export function CompetencyChart({
  categories,
  initial,
  current,
}: {
  categories: string[];
  initial: ScoreSeries | null;
  current: ScoreSeries | null;
}) {
  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
        {initial && (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-5 rounded-sm bg-initial" aria-hidden /> Erstbeurteilung · {formatDate(initial.date)}
          </span>
        )}
        {current && (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-5 rounded-sm bg-gold" aria-hidden /> Aktuell · {formatDate(current.date)}
          </span>
        )}
        <span>Skala 1–5</span>
      </figcaption>
      <dl className="space-y-3.5">
        {categories.map((name, i) => {
          const a = initial?.values[i] ?? null;
          const b = current?.values[i] ?? null;
          return (
            <div key={name} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 sm:grid-cols-[13rem_1fr_auto]">
              <dt className="truncate text-sm">{name}</dt>
              <dd className="space-y-1" aria-label={`${name}: Erstbeurteilung ${a ?? "nicht beurteilt"}, aktuell ${b ?? "nicht beurteilt"}`}>
                {initial && <Bar value={a} className="bg-initial" />}
                {current && <Bar value={b} className="bg-gold" />}
              </dd>
              <dd className="w-14 text-right text-xs tabular-nums text-mute">
                {initial && <span className="text-initial">{a ?? "n. b."}</span>}
                {initial && current && " → "}
                {current && <span className="text-gold">{b ?? "n. b."}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </figure>
  );
}

function Bar({ value, className }: { value: number | null; className: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-ink">
      {value !== null && <div className={`h-full rounded-full ${className}`} style={{ width: `${(value / 5) * 100}%` }} />}
    </div>
  );
}
