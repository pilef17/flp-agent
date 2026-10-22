# Status

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
- **Phase 3:** Admin-Beurteilungen erfassen/veröffentlichen, Verlauf aller Beurteilungen, Feedback-Editor, Seite «Meine Entwicklung»/«Trainer-Feedback».
- **Phase 4:** Programme, Programm-Details, Stripe Checkout, Webhook (`checkout.session.completed`, Signaturprüfung, Idempotenz), Meine Käufe, Admin Produkte & Bestellungen.
- **Phase 5:** E2E-Suite ins Repo/CI übernehmen (mit `supabase start`), Zugänglichkeitsprüfung, Sicherheitsreview, Datenexport automatisieren (aktuell manuell), Service Worker/Offline.
- Generierte DB-Typen (`supabase gen types typescript`) statt manueller Typ-Casts.
- Rechtliche Punkte: siehe `SICHERHEIT-DATENSCHUTZ.md`.
