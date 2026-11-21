import Link from "next/link";

/** Vorbereitete WhatsApp-Nachricht für eine Probetraining-Anfrage */
export const PROBETRAINING_TEXT = "Hallo Felipe, ich interessiere mich für ein Probetraining für mein Kind.";

type Path = { href: string; eyebrow: string; title: string; text: string; cta: string; external?: boolean; primary?: boolean };

/**
 * Die drei Einstiege für neue Familien: Spieler-Check, digitale Programme, Probetraining.
 * Wird auf der Startseite und im leeren Elternbereich gezeigt.
 */
export function StartPaths({ coachPhone, headingLevel = 2 }: { coachPhone: string | null; headingLevel?: 2 | 3 }) {
  const paths: Path[] = [
    {
      href: "/check",
      eyebrow: "Kostenlos · 3 Minuten",
      title: "Spieler-Check",
      text: "12 Fragen zu Technik und Spielverständnis. Sie sehen sofort, ob Ihr Kind Einsteiger, Mittel oder Fortgeschritten ist.",
      cta: "Check starten",
      primary: true,
    },
    {
      href: "/programme",
      eyebrow: "Für zuhause",
      title: "Programme nach Position",
      text: "Fertige Trainingspläne für jede Position – Schritt für Schritt erklärt, ohne Trainer vor Ort.",
      cta: "Programme ansehen",
    },
  ];
  if (coachPhone) {
    paths.push({
      href: `https://wa.me/${coachPhone}?text=${encodeURIComponent(PROBETRAINING_TEXT)}`,
      eyebrow: "Einzel- oder Gruppentraining",
      title: "Probetraining mit Felipe",
      text: "Positionsspezifisches Training in der Schweiz. Schreiben Sie per WhatsApp für einen Termin.",
      cta: "Per WhatsApp anfragen",
      external: true,
    });
  }
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className={`grid gap-4 ${paths.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {paths.map((p) => (
        <li key={p.title} className={`flex flex-col rounded-card border bg-graphite p-5 text-left ${p.primary ? "border-gold" : "border-line"}`}>
          <p className="eyebrow">{p.eyebrow}</p>
          <H className="mt-2 text-2xl font-bold">{p.title}</H>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">{p.text}</p>
          <Link
            href={p.href}
            {...(p.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`mt-5 flex min-h-12 items-center justify-center rounded-card px-5 font-semibold ${
              p.primary ? "bg-gold text-ink hover:bg-gold-soft" : "border border-line hover:border-gold"
            }`}
          >
            {p.cta}
          </Link>
        </li>
      ))}
    </ul>
  );
}
