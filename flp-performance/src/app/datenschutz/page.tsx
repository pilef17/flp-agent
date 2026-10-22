import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { Alert } from "@/components/ui/Feedback";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

/**
 * ENTWURF – muss vor dem Livegang durch eine Fachperson (Datenschutzrecht CH/EU)
 * geprüft und mit den tatsächlichen Angaben (Verantwortlicher, Hosting-Regionen,
 * Auftragsbearbeiter) ergänzt werden.
 */
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Logo />
      <h1 className="mt-12 text-4xl font-extrabold">Datenschutzerklärung</h1>
      <div className="mt-6">
        <Alert tone="error">Entwurf – noch nicht rechtlich geprüft. Nicht für den produktiven Einsatz.</Alert>
      </div>
      <div className="mt-10 space-y-8 leading-relaxed text-mute [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-paper">
        <section>
          <h2>Verantwortliche Stelle</h2>
          <p>FLP Performance, [Adresse ergänzen], Schweiz. Kontakt: [E-Mail ergänzen].</p>
        </section>
        <section>
          <h2>Welche Daten wir bearbeiten</h2>
          <p>
            Kontodaten der Eltern (Name, E-Mail, optional Telefon); Daten des Kindes (Vor- und Nachname, Geburtsjahr, optional Position,
            starker Fuss und Verein); Trainingspläne, Beurteilungen, Trainer-Feedback, erledigte Einheiten; Einwilligungen mit Zeitstempel;
            Bestellungen digitaler Programme. Zahlungsdaten (Kreditkarten) werden ausschliesslich von Stripe verarbeitet und nicht bei uns gespeichert.
          </p>
        </section>
        <section>
          <h2>Zweck</h2>
          <p>Individuelles Training, Dokumentation der Entwicklung, Information der Eltern und Bereitstellung gekaufter digitaler Programme.</p>
        </section>
        <section>
          <h2>Kinder</h2>
          <p>
            Profile von Kindern werden nur vom Trainer und den verknüpften Erziehungsberechtigten eingesehen. Es gibt keine öffentlichen Profile.
            Videos von Kindern werden nur mit Einwilligung der Eltern aufgenommen und ausschliesslich privat bereitgestellt.
          </p>
        </section>
        <section>
          <h2>Ihre Rechte</h2>
          <p>
            Sie können jederzeit Auskunft, Berichtigung oder Löschung verlangen sowie Einwilligungen widerrufen – direkt im Bereich
            «Konto & Datenschutz».
          </p>
        </section>
        <section>
          <h2>Auftragsbearbeiter und Datenübermittlung</h2>
          <p>Supabase (Datenbank, Authentifizierung, Speicher; Region: [ergänzen]), Vercel (Hosting; Region: [ergänzen]), Stripe (Zahlungen).</p>
        </section>
      </div>
    </main>
  );
}
