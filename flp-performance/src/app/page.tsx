import { LegalLinks } from "@/components/legal/LegalLinks";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";
import Link from "next/link";
import { whatsappNumber } from "@/lib/wochenfrage";
import { StartPaths } from "@/components/marketing/StartPaths";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homePathFor(viewer.roles));

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <ButtonLink href="/login" variant="ghost">
          Anmelden
        </ButtonLink>
      </header>

      <section className="flex flex-1 flex-col justify-center py-14 sm:py-20">
        <p className="eyebrow mb-6">Positionsspezifisches Fussballtraining · Schweiz</p>
        <h1 className="max-w-4xl text-5xl font-black uppercase sm:text-7xl lg:text-8xl" style={{ fontStretch: "70%" }}>
          Trainiere nicht einfach mehr.
          <span className="block text-gold">Trainiere besser.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-mute">
          Jeder Spieler ist anders. Wir trainieren Ihr Kind gezielt für seine Position – im Einzel- oder Gruppentraining und mit
          Programmen für zuhause. Wo möchten Sie starten?
        </p>
        <div className="mt-10">
          <StartPaths coachPhone={whatsappNumber(process.env.WOCHENFRAGE_WHATSAPP)} />
        </div>
        <p className="mt-6 text-sm text-mute">
          Bereits Kundin oder Kunde?{" "}
          <Link href="/login" className="text-gold underline underline-offset-4 hover:text-paper">
            Anmelden
          </Link>
        </p>
      </section>
      <footer className="grid gap-6 border-t border-line pt-8 text-sm text-mute sm:grid-cols-3">
        <div>
          <p className="eyebrow mb-2">Für Spieler</p>
          <p>Übungen mit Videos, Trainingsplan und die eigene Entwicklung im Blick.</p>
        </div>
        <div>
          <p className="eyebrow mb-2">Für Eltern</p>
          <p>Zugriff nur auf die eigenen Kinder. Daten bleiben privat – standardmässig.</p>
        </div>
        <div>
          <p className="eyebrow mb-2">Für Trainer</p>
          <p>Spieler, Pläne und Beurteilungen an einem Ort verwalten.</p>
        </div>
      </footer>
      <LegalLinks className="mt-8" />
    </main>
  );
}
