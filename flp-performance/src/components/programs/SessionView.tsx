import { sessionMinutes, type SessionData } from "@/lib/programs";

/** Einheit eines Positionsprogramms: Ziele, Ablauf mit Übungen, Dauer und Coaching-Hinweisen. */
export function SessionView({ data }: { data: SessionData }) {
  const minutes = sessionMinutes(data);
  return (
    <div className="mt-4 space-y-6">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mute">
        {data.label && <span>{data.label}</span>}
        {data.phase && <span>{data.phase}</span>}
        {minutes > 0 && <span className="tabular-nums">ca. {minutes} Min.</span>}
        <span>{data.exercises.length} Übungen</span>
      </p>
      {data.subtitle && <p className="leading-relaxed text-mute">{data.subtitle}</p>}

      {data.goals.map((g) => (
        <section key={g.title}>
          <h3 className="eyebrow mb-2">{g.title}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-mute">
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      {data.exercises.length > 0 && (
        <ol className="space-y-3">
          {data.exercises.map((e, i) => (
            <li key={`${i}-${e.name}`} className="rounded-card bg-ink p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0">
                  {e.section && <span className="mb-1 block text-[0.6875rem] uppercase tracking-wider text-mute">{e.section}</span>}
                  <span className="font-semibold">
                    {e.code && <span className="mr-2 text-xs text-gold">{e.code}</span>}
                    {e.name}
                  </span>
                </p>
                {e.minutes ? <span className="shrink-0 text-xs tabular-nums text-mute">{e.minutes} Min.</span> : null}
              </div>
              {e.description && <p className="mt-2 text-sm leading-relaxed text-mute">{e.description}</p>}
              {e.params.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {e.params.map((p) => (
                    <li key={p} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-paper">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {e.material && <p className="mt-3 text-xs text-mute">Material: {e.material}</p>}
              {e.cues.length > 0 && (
                <p className="mt-2 text-xs text-mute">
                  Coaching: {e.cues.map((c) => `«${c}»`).join(" · ")}
                </p>
              )}
              {e.success && <p className="mt-2 text-xs text-ok">✓ {e.success}</p>}
              {e.mistake && <p className="mt-1 text-xs text-danger">✗ {e.mistake}</p>}
              {e.progression && <p className="mt-2 text-xs text-mute">Steigerung: {e.progression}</p>}
              {e.tip && <p className="mt-2 text-sm text-gold">{e.tip}</p>}
            </li>
          ))}
        </ol>
      )}

      {data.rule && <p className="border-l-2 border-gold pl-3 text-sm italic text-mute">{data.rule}</p>}
    </div>
  );
}
