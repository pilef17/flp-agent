import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { StartPaths } from "@/components/marketing/StartPaths";
import { getViewer } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";
import { whatsappNumber } from "@/lib/wochenfrage";

export const metadata: Metadata = {
  title: { absolute: "FLP Performance · Positionstraining für junge Fussballer" },
  description:
    "Kostenloser Spieler-Check in 3 Minuten: Wie fit ist Ihr Kind für die Rückrunde? Positionsspezifisches Fussballtraining für 6- bis 16-Jährige in Zürich und im Aargau – mit Felipe und mit Programmen für zuhause.",
  robots: { index: true, follow: true },
};

const STEPS = [
  { title: "Check machen", text: "12 kurze Fragen zu Technik und Spielverständnis – kostenlos, ohne Anmeldung." },
  { title: "Ergebnis sehen", text: "Niveau Ihres Kindes, seine Stärken und die drei wichtigsten Baustellen." },
  { title: "Gezielt trainieren", text: "Mit einem Programm für zuhause oder im Training mit Felipe." },
];

const FAQ = [
  {
    q: "Für welches Alter ist das Angebot?",
    a: "Für Kinder und Jugendliche von 6 bis 16 Jahren. Der Spieler-Check zeigt, welches Niveau zu Ihrem Kind passt.",
  },
  {
    q: "Braucht mein Kind spezielles Material?",
    a: "Nein. Ein Ball und etwas Platz im Wohnzimmer, im Garten oder vor dem Haus genügen. Hütchen können Sie durch Flaschen oder Schuhe ersetzen.",
  },
  {
    q: "Wo findet das Training mit Felipe statt?",
    a: "In der Region Zürich und im Aargau. Den genauen Ort und die Zeit vereinbaren Sie direkt mit Felipe per WhatsApp.",
  },
  {
    q: "Was kostet ein Probetraining?",
    a: "CHF 30 für das Probetraining plus Fahrkosten: CHF 30 in der Region Zürich, CHF 20 im Aargau.",
  },
  {
    q: "Ist ein Programm ein Abo?",
    a: "Nein. Sie bezahlen einmal und haben während der angegebenen Dauer Zugang. Es verlängert sich nichts automatisch.",
  },
  {
    q: "Was passiert mit unseren Daten?",
    a: "Die Antworten im Spieler-Check werden nur auf Ihrem Gerät ausgewertet. Kontaktdaten senden Sie nur, wenn Sie das möchten. Es gibt keine Werbe- oder Tracking-Cookies.",
  },
];

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homePathFor(viewer.roles));
  const coachPhone = whatsappNumber(process.env.WOCHENFRAGE_WHATSAPP);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <ButtonLink href="/login" variant="ghost">
          Anmelden
        </ButtonLink>
      </header>

      <section className="pb-14 pt-10 sm:pb-20 sm:pt-16" aria-labelledby="hero-title">
        <p className="eyebrow mb-4">Positionstraining · Zürich &amp; Aargau</p>
        <h1 id="hero-title" className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl" style={{ fontStretch: "80%" }}>
          Wie fit ist Ihr Kind für die <span className="text-gold">Rückrunde?</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-mute">
          Finden Sie in 3 Minuten heraus, wo Ihr Kind steht – und wie es in der Winterpause gezielt besser wird.
        </p>
        <div className="mt-7 max-w-md">
          <Link
            href="/check"
            className="flex min-h-14 w-full items-center justify-center rounded-card bg-gold px-5 text-lg font-semibold text-ink transition-colors hover:bg-gold-soft"
          >
            Kostenloser Spieler-Check
          </Link>
          <p className="mt-2 text-center text-sm text-mute">Kostenlos · ohne Anmeldung · 3 Minuten</p>
        </div>
      </section>

      <section className="border-t border-line py-12" aria-labelledby="steps-title">
        <h2 id="steps-title" className="eyebrow mb-6">
          So funktioniert&apos;s
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-card border border-line bg-graphite p-5">
              <span aria-hidden className="font-display text-3xl font-bold text-gold">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-mute">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line py-12" aria-labelledby="paths-title">
        <h2 id="paths-title" className="eyebrow mb-6">
          Direkt weiter
        </h2>
        <StartPaths coachPhone={coachPhone} headingLevel={3} showCheck={false} />
      </section>

      <section className="border-t border-line py-12" aria-labelledby="faq-title">
        <h2 id="faq-title" className="eyebrow mb-6">
          Häufige Fragen
        </h2>
        <div className="divide-y divide-line rounded-card border border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden className="text-gold transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-12 text-center" aria-labelledby="cta-title">
        <h2 id="cta-title" className="text-3xl font-extrabold">
          Trainiere nicht einfach mehr. <span className="text-gold">Trainiere besser.</span>
        </h2>
        <div className="mx-auto mt-6 max-w-md">
          <Link
            href="/check"
            className="flex min-h-14 w-full items-center justify-center rounded-card bg-gold px-5 text-lg font-semibold text-ink transition-colors hover:bg-gold-soft"
          >
            Jetzt Spieler-Check starten
          </Link>
        </div>
        <p className="mt-6 text-sm text-mute">
          Bereits Kundin oder Kunde?{" "}
          <Link href="/login" className="text-gold underline underline-offset-4 hover:text-paper">
            Anmelden
          </Link>
        </p>
      </section>

      <LegalLinks className="mt-auto border-t border-line pt-8" />
    </main>
  );
}
