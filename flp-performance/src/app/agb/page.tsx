import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { PROVIDER } from "@/lib/legal";

export const metadata: Metadata = { title: "Allgemeine Geschäftsbedingungen" };

/** Vor dem Livegang durch eine Fachperson prüfen lassen. */
export default function TermsPage() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese AGB gelten für den Kauf digitaler Programme im Shop von {PROVIDER.tradeName} ({PROVIDER.name},{" "}
          {PROVIDER.street}, {PROVIDER.city}). Für Einzel- und Gruppentrainings (Coaching) gelten die Vereinbarungen, die wir
          direkt mit dir treffen.
        </p>
      </section>

      <section>
        <h2>2. Angebot und Vertragsschluss</h2>
        <p>
          Die Programme sind auf der jeweiligen Programmseite beschrieben. Für einen Kauf brauchst du ein Konto. Der Vertrag
          kommt zustande, wenn du auf «Jetzt kaufen» tippst und die Zahlung bestätigt ist. Du erhältst eine Zahlungsbestätigung
          per E-Mail.
        </p>
      </section>

      <section>
        <h2>3. Preise und Zahlung</h2>
        <p>
          Alle Preise sind in Schweizer Franken (CHF) angegeben. {PROVIDER.tradeName} ist nicht mehrwertsteuerpflichtig; es wird
          keine Mehrwertsteuer ausgewiesen. Du bezahlst über Stripe mit Karte, TWINT, Apple Pay oder Google Pay. Wir erhalten
          keine Karten- oder TWINT-Daten.
        </p>
      </section>

      <section>
        <h2>4. Zugang zum Programm</h2>
        <p>
          Das Programm wird sofort nach bestätigter Zahlung in deinem Konto unter «Meine Käufe» freigeschaltet. Die Dauer des
          Zugangs steht auf der Programmseite (unbefristet oder eine bestimmte Anzahl Tage). Der Zugang ist persönlich und darf
          nicht weitergegeben werden.
        </p>
      </section>

      <section>
        <h2>5. Kein Widerrufsrecht, Rückerstattung</h2>
        <p>
          Das Schweizer Recht sieht für Online-Käufe kein allgemeines Widerrufsrecht vor. Da digitale Inhalte sofort nach der
          Zahlung freigeschaltet werden, ist eine Rückerstattung danach ausgeschlossen. Funktioniert ein Programm aus technischen
          Gründen nicht und können wir den Fehler nicht innert angemessener Frist beheben, erstatten wir den Kaufpreis zurück.
          Melde dich dazu unter <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>.
        </p>
      </section>

      <section>
        <h2>6. Nutzungsrechte</h2>
        <p>
          Du erhältst das Recht, die Inhalte für dich bzw. dein Kind privat zu nutzen. Kopieren, Weitergeben, Veröffentlichen
          oder kommerzielles Verwenden der Texte, Videos und Pläne ist nicht erlaubt.
        </p>
      </section>

      <section>
        <h2>7. Gesundheit und Sicherheit</h2>
        <p>
          Die Übungen sind für gesunde Kinder und Jugendliche gedacht. Kinder sollen sie unter Aufsicht einer erwachsenen Person
          ausführen. Bei Schmerzen oder gesundheitlichen Einschränkungen das Training abbrechen und ärztlichen Rat einholen.
          Inhalte zur Ernährung sind allgemeine Bildungsinhalte und ersetzen keine medizinische oder ernährungsberaterische
          Beratung.
        </p>
      </section>

      <section>
        <h2>8. Haftung</h2>
        <p>
          Wir haften für Schäden, die wir absichtlich oder grobfahrlässig verursachen. Im Übrigen ist die Haftung ausgeschlossen,
          soweit das Gesetz dies zulässt. Wir bemühen uns um eine stets erreichbare App, können aber keine ununterbrochene
          Verfügbarkeit garantieren.
        </p>
      </section>

      <section>
        <h2>9. Datenschutz</h2>
        <p>
          Wie wir deine Daten bearbeiten, steht in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
        </p>
      </section>

      <section>
        <h2>10. Änderungen, anwendbares Recht und Gerichtsstand</h2>
        <p>
          Wir können diese AGB anpassen. Für einen Kauf gilt die Fassung, die zum Zeitpunkt des Kaufs veröffentlicht war. Es gilt
          Schweizer Recht. Gerichtsstand ist der Wohnsitz des Anbieters (Kanton Aargau); zwingende Gerichtsstände für Konsumentinnen und Konsumenten
          bleiben vorbehalten.
        </p>
      </section>
    </LegalPage>
  );
}
