import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { PROVIDER } from "@/lib/legal";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

/**
 * Vor dem Livegang durch eine Fachperson (Datenschutzrecht CH, ggf. EU) prüfen lassen.
 * Bei Änderungen an Einwilligungstexten POLICY_VERSION in src/lib/consent.ts erhöhen.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <p>
          Diese Datenschutzerklärung erklärt, welche Personendaten wir in der App {PROVIDER.tradeName} bearbeiten, wozu und
          welche Rechte du hast. Sie richtet sich nach dem Schweizer Datenschutzgesetz (DSG) und, soweit anwendbar, nach der
          Datenschutz-Grundverordnung der EU (DSGVO).
        </p>
      </section>

      <section>
        <h2>Verantwortlich</h2>
        <p>
          {PROVIDER.name}, {PROVIDER.tradeName}
          <br />
          {PROVIDER.street}, {PROVIDER.city}, {PROVIDER.country}
          <br />
          E-Mail: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
        </p>
      </section>

      <section>
        <h2>Welche Daten wir bearbeiten</h2>
        <ul>
          <li>
            <strong>Konto der Eltern:</strong> Name, E-Mail-Adresse, optional Telefonnummer, Passwort (nur verschlüsselt
            gespeichert).
          </li>
          <li>
            <strong>Daten des Kindes:</strong> Vor- und Nachname, Geburtsjahr, optional Position, starker Fuss und Verein.
          </li>
          <li>
            <strong>Training:</strong> Trainingspläne, erledigte Einheiten, Beurteilungen, Feedback des Trainers und – nur mit
            Einwilligung – Trainingsvideos.
          </li>
          <li>
            <strong>Einwilligungen:</strong> welche Einwilligung wann erteilt oder widerrufen wurde.
          </li>
          <li>
            <strong>Käufe:</strong> gekaufte Programme, Betrag, Datum und Zahlungsstatus. Karten- und TWINT-Daten erhalten wir
            nicht; sie werden ausschliesslich von Stripe bearbeitet.
          </li>
          <li>
            <strong>Technische Daten:</strong> Server-Protokolle (z. B. IP-Adresse, Zeitpunkt), die für Betrieb und Sicherheit
            nötig sind.
          </li>
        </ul>
      </section>

      <section>
        <h2>Wozu wir die Daten bearbeiten</h2>
        <ul>
          <li>Individuelles Training planen, durchführen und die Entwicklung dokumentieren.</li>
          <li>Eltern über Trainingspläne, Fortschritt und Feedback informieren.</li>
          <li>Gekaufte digitale Programme bereitstellen und Zahlungen abwickeln.</li>
          <li>Konto-E-Mails senden (Bestätigung, Einladung, Passwort zurücksetzen).</li>
          <li>Sicherheit der App gewährleisten und gesetzliche Pflichten erfüllen.</li>
        </ul>
        <p>
          Grundlage ist der Vertrag mit dir (Coaching oder Kauf eines Programms) und für die Daten deines Kindes sowie für
          Videos deine Einwilligung. Wir verwenden die Daten nicht für Werbung und verkaufen sie nicht.
        </p>
      </section>

      <section>
        <h2>Kinder</h2>
        <p>
          Profile von Kindern sehen nur der Trainer und die verknüpften Erziehungsberechtigten. Es gibt keine öffentlichen
          Profile. Videos werden nur mit Einwilligung der Eltern aufgenommen und ausschliesslich privat in der App bereitgestellt.
          Einwilligungen kannst du jederzeit unter{" "}
          <Link href="/elternbereich">Elternbereich</Link> widerrufen.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Wir verwenden nur technisch notwendige Cookies, damit du angemeldet bleibst. Es gibt keine Analyse-, Tracking- oder
          Werbe-Cookies.
        </p>
      </section>

      <section>
        <h2>Dienstleister und Speicherort</h2>
        <p>Wir setzen folgende Dienstleister ein, die Daten in unserem Auftrag bearbeiten:</p>
        <ul>
          <li>
            <strong>Supabase</strong> (Supabase Inc., USA): Datenbank, Anmeldung und Speicher für Videos und Bilder.
            Speicherort: Rechenzentrum in Stockholm (Schweden, EU).
          </li>
          <li>
            <strong>Vercel</strong> (Vercel Inc., USA): Betrieb der Website.
          </li>
          <li>
            <strong>Stripe</strong> (Stripe Payments Europe Ltd., Irland): Zahlungsabwicklung mit Karte, TWINT, Apple Pay
            und Google Pay.
          </li>
          <li>
            <strong>Infomaniak</strong> (Infomaniak Network SA, Genf, Schweiz): Versand und Empfang von E-Mails.
          </li>
        </ul>
        <p>
          Supabase und Vercel sind Unternehmen mit Sitz in den USA. Ein Zugriff aus den USA ist daher nicht ausgeschlossen. Wir
          stützen solche Übermittlungen auf die Standardvertragsklauseln der EU-Kommission, die vom EDÖB anerkannt sind, oder
          auf andere geeignete Garantien.
        </p>
      </section>

      <section>
        <h2>Wie lange wir Daten aufbewahren</h2>
        <ul>
          <li>Konto- und Trainingsdaten: solange das Konto bzw. das Coaching besteht, danach löschen wir sie auf Anfrage.</li>
          <li>Trainingsvideos: bis zum Widerruf der Einwilligung oder bis zur Löschung des Spielerprofils.</li>
          <li>Kauf- und Zahlungsdaten: 10 Jahre, weil wir sie für die Buchhaltung aufbewahren müssen.</li>
        </ul>
      </section>

      <section>
        <h2>Deine Rechte</h2>
        <p>
          Du kannst Auskunft über deine Daten verlangen, falsche Daten berichtigen und Daten löschen lassen. Stelle die
          Anfrage direkt unter <Link href="/konto">Konto &amp; Datenschutz</Link> oder per E-Mail an{" "}
          <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>. Wir antworten innerhalb von 30 Tagen. Wenn du mit unserer
          Antwort nicht einverstanden bist, kannst du dich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten
          (EDÖB) beschweren.
        </p>
      </section>

      <section>
        <h2>Sicherheit</h2>
        <p>
          Die Verbindung zur App ist verschlüsselt. Der Zugriff auf Daten ist in der Datenbank auf die berechtigten Personen
          beschränkt, und Passwörter werden nur verschlüsselt gespeichert.
        </p>
      </section>

      <section>
        <h2>Änderungen</h2>
        <p>Wir passen diese Datenschutzerklärung an, wenn sich die App oder die Rechtslage ändert. Es gilt die aktuelle Fassung auf dieser Seite.</p>
      </section>
    </LegalPage>
  );
}
