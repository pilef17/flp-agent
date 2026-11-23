import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { PROVIDER } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Anbieter</h2>
        <p>
          <strong>{PROVIDER.tradeName}</strong>
          <br />
          {PROVIDER.name} ({PROVIDER.legalForm})
          <br />
          {PROVIDER.street}
          <br />
          {PROVIDER.city}
          <br />
          {PROVIDER.country}
        </p>
        <p>
          E-Mail: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>{PROVIDER.name}</p>
      </section>
      <section>
        <h2>Handelsregister und Mehrwertsteuer</h2>
        <p>Nicht im Handelsregister eingetragen. Nicht mehrwertsteuerpflichtig.</p>
      </section>
      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Die Inhalte dieser App werden mit grösster Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
          übernehmen wir keine Gewähr. Trainings- und Ernährungsinhalte sind allgemeine Informationen und ersetzen keine
          ärztliche oder ernährungsberaterische Beratung.
        </p>
      </section>
      <section>
        <h2>Haftung für Links</h2>
        <p>Für Inhalte externer Websites, auf die wir verlinken, sind ausschliesslich deren Betreiber verantwortlich.</p>
      </section>
      <section>
        <h2>Urheberrechte</h2>
        <p>
          Texte, Videos, Trainingspläne und Grafiken in dieser App gehören {PROVIDER.tradeName}. Eine Weitergabe oder
          Veröffentlichung ohne schriftliche Zustimmung ist nicht erlaubt.
        </p>
      </section>
    </LegalPage>
  );
}
