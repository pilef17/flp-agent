import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_KEYS, programSlug, type Level } from "@/lib/check";
import { whatsappNumber } from "@/lib/wochenfrage";
import { Logo } from "@/components/ui/Logo";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { CheckForm, type Offer } from "./CheckForm";

export const metadata: Metadata = {
  title: "Spieler-Check",
  description: "Kostenloser Spieler-Check für Eltern: In 3 Minuten erfahren, ob Ihr Kind Einsteiger, Mittel oder Fortgeschritten ist.",
  openGraph: {
    title: "FLP Performance · Spieler-Check",
    description: "Wie bleibt Ihr Kind in der Winterpause fit? Machen Sie den kostenlosen Spieler-Check.",
  },
};

export default async function CheckPage() {
  await connection(); // Angebote hängen davon ab, welche Programme gerade im Shop sind
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug, price_cents")
    .in("slug", LEVEL_KEYS.map(programSlug))
    .eq("is_active", true);
  const offers: Partial<Record<Level, Offer>> = {};
  for (const level of LEVEL_KEYS) {
    const p = (data ?? []).find((d) => d.slug === programSlug(level));
    if (p) offers[level] = { slug: p.slug, priceCents: p.price_cents };
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:px-8">
      <Logo />
      <p className="eyebrow mt-12">Kostenloser Spieler-Check</p>
      <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Wie bleibt Ihr Kind in der Winterpause fit?</h1>
      <p className="mt-4 text-lg leading-relaxed text-mute">
        Beantworten Sie 12 kurze Fragen zu Technik und Spielverständnis Ihres Kindes. Sie erfahren sofort, auf welchem Niveau es steht –{" "}
        <strong className="text-paper">Einsteiger, Mittel oder Fortgeschritten</strong> – und wie es zuhause weiterkommt.
      </p>
      <p className="mt-3 text-sm text-mute">Dauer ca. 3 Minuten · ohne Anmeldung · Antworten bleiben auf Ihrem Gerät, bis Sie selbst Kontaktdaten senden.</p>
      <CheckForm offers={offers} coachPhone={whatsappNumber(process.env.WOCHENFRAGE_WHATSAPP)} />
      <div className="mt-14 border-t border-line pt-6">
        <LegalLinks />
      </div>
    </main>
  );
}
