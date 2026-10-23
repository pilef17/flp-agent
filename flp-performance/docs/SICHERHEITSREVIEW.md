# Sicherheitsreview (Phase 5)

Stand: Oktober 2026 · Umfang: gesamter Code in `flp-performance/` (App, Server-Actions,
Webhook, Migrationen, RLS, Storage-Policies). Methode: manuelles Review, gezielte
Angriffstests in `supabase/tests/rls_test.sql` (109 Prüfungen) und den E2E-Suiten.

## Behobene Befunde

| # | Schwere | Befund | Behebung |
|---|---|---|---|
| 1 | Mittel | Jeder Coach konnte **alle** Profile lesen (Name, E-Mail, Telefon aller Eltern und Kunden). | Migration `20261026000001_profile_visibility.sql`: Coaches sehen nur Eltern/Spieler-Logins ihrer Spieler und Mit-Coaches; Admin alle. Test ergänzt. |
| 2 | Niedrig–Mittel | Keine Content-Security-Policy. | CSP in `next.config.ts` (u. a. `frame-ancestors 'none'`, `object-src 'none'`, Datenquellen nur eigene Domain + Supabase, Formularziele nur eigene Domain + Stripe Checkout). Alle E2E-Suiten schlagen bei CSP-Verletzungen fehl. Zusätzlich `Cross-Origin-Opener-Policy`. |
| 3 | Mittel (Phase 3) | Coach ohne Admin-Rolle konnte keine Spieler/Beurteilungen anlegen (`INSERT … RETURNING` an Leserichtlinie gescheitert). | Bereits in Phase 3 behoben, Regressionstests vorhanden. |

## Geprüft – in Ordnung

- **Autorisierung:** Jede Server-Action prüft die Rolle (`requireViewer/Staff/Admin`) *und* jede Abfrage läuft mit dem Benutzer-Token durch RLS. Der Service-Schlüssel wird nur an drei Stellen verwendet (Einladung: Kontosuche/Einladung · Checkout: Bestellung anlegen · Webhook), jeweils nach eigener Prüfung.
- **RLS** ist auf allen 24 Tabellen aktiv und erzwungen; anonyme Rolle hat nur Lesezugriff auf aktive Produkte und deren Titelübersicht.
- **Rollen** können nicht selbst vergeben werden; `user_metadata` wird nie für Rollen verwendet.
- **Zahlungen:** Preis nur aus der DB; Zugang nur nach signiertem Webhook mit `payment_status = paid`; Betrag, Währung und Session werden geprüft; idempotent; Bestellungen/Zahlungsstatus für Clients nicht schreibbar.
- **Uploads:** Pfade werden serverseitig geprüft (Ordner der Übung bzw. des Produkts, UUID-Dateiname); Storage-Policies erlauben Schreiben nur Coaches/Admin; Spielervideos nur mit Einwilligung.
- **Open Redirect:** `next`-Parameter nur für interne Pfade (`safeNextPath`, Unit-Tests).
- **XSS:** Kein `dangerouslySetInnerHTML`; React escaped alle Ausgaben; Texte mit Zeilenumbrüchen über CSS.
- **Konto-Enumeration:** Registrierung und Passwort-Reset antworten immer gleich; Login-Fehler unspezifisch.
- **Veröffentlichte Beurteilungen** sind per Trigger unveränderlich; Einwilligungen nur anhängbar.
- **Audit-Log** für alle sensiblen Tabellen, ohne Inhalte (nur geänderte Spaltennamen).
- **Sicherheits-Header:** HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, CSP, COOP.

## Akzeptierte Restrisiken / Hinweise

| Thema | Einschätzung |
|---|---|
| Auth-Cookies von `@supabase/ssr` sind nicht `HttpOnly` (Design der Bibliothek, Browser-Client braucht Zugriff). | Bei XSS wäre das Token lesbar. Gemindert durch React-Escaping, kein HTML aus Daten, CSP. |
| CSP mit `'unsafe-inline'` für Skripte (Next.js-Hydration ohne Nonce). | Nonce-basierte CSP wäre strenger, erfordert dynamisches Rendering aller Seiten. Später möglich. |
| Rate-Limits nur über Supabase Auth (Login, Registrierung, E-Mails). Server-Actions (z. B. Datenschutz-Anträge) ohne eigenes Limit. | Nur für angemeldete Benutzer erreichbar; bei Missbrauch Vercel Firewall/Rate-Limiting aktivieren. |
| Wiederholtes Klicken auf «Kaufen» erzeugt mehrere offene Bestellungen/Checkout-Sessions. | Harmlos (Sessions verfallen nach 24 h, Status «Abgebrochen»). |
| Exercises sind für alle Coaches bearbeitbar (gemeinsame Bibliothek). | Gewollt. Änderungen sind über `updated_at` nachvollziehbar; bei mehreren Coaches ggf. Audit ergänzen. |
| Widerruf der Video-Einwilligung löscht bestehende Spielervideos nicht automatisch. | Prozess: Admin löscht Videos manuell (Checkliste). Automatisierung möglich. |
| Konto-Löschung erfolgt manuell durch den Admin; Bestellungen bleiben aus Buchhaltungsgründen erhalten (`on delete restrict`). | Vorgehen in der Go-Live-Checkliste beschrieben (Anonymisieren statt Löschen bei Bestellungen). |
