# Status

## Phase 4 – Shop (umgesetzt)

| Bereich | Wie getestet |
|---|---|
| Migration `20261025000001_commerce.sql`: `create_pending_order`, `fulfill_checkout` (atomar, idempotent über `stripe_events`, prüft Session, Betrag und Währung), `update_order_from_stripe` (abgelaufen, fehlgeschlagen, Rückerstattung → Zugang entzogen). Nur Service-Rolle darf sie aufrufen. Mindestpreis CHF 0.50, Dateipfade pro Produkt. | RLS-Tests (jetzt 107/107) |
| Öffentlicher Katalog «Programme» und «Programm-Details» (Preis, Zugangsdauer, Inhaltsübersicht nur mit Titeln) | E2E Phase 4 |
| Kauf: Stripe Checkout (gehostet), Preis nur aus der Datenbank, Idempotency-Key pro Bestellung, Bestellungen aus dem Testmodus als `is_test_data` markiert | E2E gegen stripe-mock |
| Webhook `/api/stripe/webhook`: Signaturprüfung, Zugang erst nach `payment_status = paid`, 500 bei DB-Fehler (Stripe wiederholt), Teil-Rückerstattungen entziehen keinen Zugang | 8 Unit-Tests + E2E mit signierten Events |
| «Meine Käufe» (Programme mit Ablaufdatum, Bestellverlauf), Programminhalt (Lektionen, Übungen, Videos via Signed URL) | E2E |
| Admin Shop: Produkte erstellen/bearbeiten (Preis CHF frei konfigurierbar, Zugangsdauer, Slug, Reihenfolge), aktivieren/deaktivieren, Titelbild, Inhalte (Lektion, Übung, Video) sortieren/entfernen | E2E (ohne Bild-/Video-Upload) |
| Admin Bestellungen & Zugänge: Umsatz, Statusfilter, Testbestellungen ausgeblendet, manuelle Zugänge vergeben/entziehen (Audit-Log) | E2E |

E2E Phase 4: 47/47. Unit-Tests: 46/46.

**Nicht getestet in Phase 4:** echter Stripe-Testmodus (bisher nur stripe-mock + selbst signierte Webhooks), TWINT/Karten auf der Stripe-Seite, Upload von Titelbild und Programmvideos (kein Storage-Server in der Testumgebung). Siehe DEPLOYMENT.md → «Stripe einrichten».

## Phase 3 – Entwicklung (umgesetzt)

| Bereich | Wie getestet |
|---|---|
| Admin «Beurteilungen»: offene Entwürfe, Spieler ohne Erstbeurteilung, zuletzt veröffentlicht, Feedback-Entwürfe | E2E Phase 3 |
| Beurteilung erfassen: Erst-/Folgebeurteilung, Datum (nicht in der Zukunft), 8 Kompetenzen mit 1–5 oder «n. b.», Notiz je Kompetenz, Gesamtnotiz, Entwurf speichern, Veröffentlichen nur mit Bestätigung und mindestens einem Wert, Entwurf verwerfen. Danach nur noch lesbar (Datenbank-Trigger). | E2E + RLS |
| Trainer-Feedback: erstellen (veröffentlicht oder Entwurf), bearbeiten, zurückziehen, Entwurf löschen | E2E |
| «Meine Entwicklung»: Vergleich Erstbeurteilung (rot) ↔ aktuell (gold), Verlauf je Kompetenz als Kleindiagramme (Lücke bei «n. b.», keine Interpolation), Tabelle aller Beurteilungen, Kommentare | E2E |
| «Trainer-Feedback»-Seite für Eltern/Spieler, Kinderwahl bei mehreren Kindern | E2E |
| Navigation: Eltern/Spieler mit «Entwicklung»; Admin mit «Beurteilungen»; mobile Leiste mit Kurzlabels | E2E |

**In Phase 3 gefundene und behobene Fehler:**
- *Coach ohne Admin-Rolle konnte keine Spieler erfassen* (seit Phase 1, nur mit Admin getestet): Die neue Zeile war für die Leserichtlinie noch nicht sichtbar (`INSERT … RETURNING`). Die ID wird jetzt serverseitig vergeben, ohne Lockerung der Rechte.
- *Beurteilung anlegen schlug fehl* aus demselben Grund: Leserichtlinie in Migration `20261024000001` auf Zeilenwerte umgestellt (inhaltlich identisch).
- Doppelte Feld-IDs auf der Spielerseite und im Plan-Builder (Beschriftungen zeigten auf das falsche Feld).

Diagrammfarben: Rot/Gold sind Markenvorgaben. Der Palette-Check bestätigt Kontrast und Farbsehschwäche-Trennung; Gold liegt ausserhalb des empfohlenen Helligkeitsbands. Deshalb zusätzliche Kodierung: Erstbeurteilung = Ring, aktuell = gefüllter Punkt, Werte als Zahl, Tabelle als Alternative.

## Phase 2 – Coaching (umgesetzt)

| Bereich | Wie getestet |
|---|---|
| Migration `20261023000001_training_rules.sql`: Einheiten nur innerhalb der Planwoche, ein Plan pro Spieler und Woche, Woche eines Plans mit Einheiten unveränderlich, Medienpfad im Ordner der Übung | RLS-Tests (jetzt 83/83) |
| Übungsbibliothek mit Kategorie-Filter und Suche, Übungsdetails (Dosierung, Coaching- und Sicherheitshinweise, Video via Signed URL) | E2E Phase 2 |
| Admin: Übungen erstellen/bearbeiten, automatische ID je Kategorie (TEC-001, KOO-001 …), Entwurf/Freigabe, Video-Upload direkt in den privaten Bucket, Video löschen | E2E (ohne Upload, siehe unten) |
| Trainingsplan-Builder: Wochenplan pro Spieler, Einheiten pro Tag, Übungen aus der Bibliothek mit eigener Dosierung (leer = Standard der Übung), Reihenfolge ändern, entfernen, veröffentlichen/zurückziehen, Entwurf löschen | E2E |
| Trainingskalender für Eltern und Spieler: Wochenansicht Mo–So, Woche vor/zurück, Kinderwahl bei mehreren Kindern, «Heute», Fortschritt, Einheit/Übung erledigen | E2E |
| Spielerprofil für Eltern/Spieler | E2E |
| Zugriffsschutz: fremde Eltern sehen weder Profil noch Kalender, Eltern erreichen den Builder nicht, Entwürfe (Übungen/Pläne) bleiben unsichtbar | E2E |

E2E Phase 2: 43/43 Prüfungen, E2E Phase 1 erneut 26/26, Unit-Tests 30/30.

**Nicht getestet in Phase 2:** Der Video-Upload und das Abspielen über Signed URLs, weil in der Testumgebung kein Supabase-Storage-Server lief. Getestet sind die Storage-Policies (RLS) und dass die Seite ohne Video sauber funktioniert. Bitte nach `supabase start` einmal ein kurzes MP4 hochladen und als Elternteil abspielen. Achtung: Im Supabase-Free-Plan liegt das globale Upload-Limit bei 50 MB (Projekt-Einstellungen → Storage).

## Phase 1 – Grundlage (umgesetzt und getestet)

| Bereich | Wie getestet |
|---|---|
| Datenbankschema (24 Tabellen, Migrationen, Indizes, Referenzdaten 8 Kompetenzen, 3 Produktkonzepte inaktiv) | Migrationen gegen PostgreSQL 16 mit echtem GoTrue-Auth-Schema angewendet |
| RLS-Sicherheitsmodell inkl. Storage-Policies | `npm run test:db`: 79 Prüfungen in Phase 1 (Eltern sehen keine fremden Kinder, keine Entwürfe, keine Rollen-Selbstvergabe, Unveränderlichkeit veröffentlichter Beurteilungen, Einwilligungen nur anhängen, Spielervideos nur mit Einwilligung, Entitlement-Entzug, Audit-Log usw.) |
| Design-System (Farben, Typografie, Buttons, Felder, Cards, Badges, Leer-/Lade-/Fehlerzustände), responsive Navigation (Desktop + mobile Bottom-Nav), PWA-Manifest | Browser-Screenshots 390 px und 1366/1440 px, keine horizontale Überbreite |
| Auth: Registrierung mit E-Mail-Bestätigung, Login, Logout, Passwort vergessen/neu, Einladungslinks, Routen-Schutz | End-to-End mit Playwright gegen echtes Supabase Auth (GoTrue) + PostgREST + PostgreSQL (26/26 Prüfungen) |
| Elternbereich: verknüpfte Kinder, Kompetenzprofil (rot = Erst-, gold = aktuelle Beurteilung, «n. b.» statt 0), freigegebenes Feedback, Wochenplan, Einheit/Übung erledigen, Einwilligungen erteilen/widerrufen | E2E |
| Spieler-Startseite (gleiche Übersicht für Spieler-Login) | Typecheck/Build; Daten-Ladefunktion via Elternbereich E2E-getestet, Spieler-Login selbst nicht E2E |
| Admin: Übersicht mit Kennzahlen + Audit-Log, Spieler erfassen/suchen, Eltern einladen bzw. bestehendes Konto verknüpfen, Verknüpfung entfernen, Coaching-Zugang gewähren/entziehen | E2E (ausser Entfernen/Coaching-Umschalten: nur RLS-Test) |
| Konto & Datenschutz: Profil, Datenschutz-Anträge (Auskunft/Berichtigung/Löschung), Admin-Bearbeitung | E2E |
| Unit-Tests: Validierung, Open-Redirect-Schutz, Rollen-Navigation, Beurteilungslogik, Einwilligungsstand | `npm test` 20/20 |

## Implementiert, aber ungetestet

- `supabase start` / `supabase db reset` mit der Supabase-CLI (Docker war in der Entwicklungsumgebung nicht verfügbar). Die Migrationen liefen gegen ein nachgebildetes `storage`-Schema; in Supabase existiert es bereits.
- Storage-Uploads und Signed URLs aus der App (nur Policies sind getestet; UI folgt in Phase 2).
- Deployment auf Vercel und Supabase Cloud.

## Noch offen

- **Phase 2 (Rest):** Spieler-Login durch Eltern anlegen (Einwilligung «player_account» wird bereits erfasst), Plan der Vorwoche kopieren, Upload-Fortschrittsanzeige.
- **Phase 5:** E2E-Suite ins Repo/CI übernehmen (mit `supabase start`), Zugänglichkeitsprüfung, Sicherheitsreview, Datenexport automatisieren (aktuell manuell), Service Worker/Offline.
- Generierte DB-Typen (`supabase gen types typescript`) statt manueller Typ-Casts.
- Rechtliche Punkte: siehe `SICHERHEIT-DATENSCHUTZ.md`.
