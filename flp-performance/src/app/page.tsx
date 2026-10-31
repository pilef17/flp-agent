import { LegalLinks } from "@/components/legal/LegalLinks";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";

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

      <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <p className="eyebrow mb-6">Individuelles Fussballtraining · Schweiz</p>
        <h1 className="max-w-4xl text-5xl font-black uppercase sm:text-7xl lg:text-8xl" style={{ fontStretch: "70%" }}>
          Trainiere nicht einfach mehr.
          <span className="block text-gold">Trainiere besser.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-mute">
          Jeder Spieler ist anders. Deshalb trainieren wir individuell – mit persönlichen Trainingsplänen,
          ehrlichen Beurteilungen und voller Transparenz für Eltern.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/registrieren">Konto erstellen</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Ich habe bereits ein Konto
          </ButtonLink>
        </div>
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
