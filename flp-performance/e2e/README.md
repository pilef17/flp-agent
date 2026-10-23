# End-to-End-Tests

Playwright-Suiten gegen einen lokalen, Supabase-kompatiblen Stack **ohne Docker**:
PostgreSQL + GoTrue (Supabase Auth) + PostgREST + SMTP-Sink + stripe-mock.
Die Binärdateien werden in festen Versionen geladen und per SHA-256 geprüft.

| Suite | Inhalt |
|---|---|
| `phase1-auth-eltern` | Registrierung mit E-Mail-Bestätigung, Login, Passwort-Reset, Einladung, Einwilligung, Datenschutz-Antrag, Zugriffsschutz |
| `phase2-coaching` | Übungen, Plan-Builder, Trainingskalender, Bibliothek, Spielerprofil |
| `phase3-entwicklung` | Beurteilungen, Entwicklung, Feedback, Coach-Rechte |
| `phase4-shop` | Katalog, Stripe Checkout (stripe-mock), signierte Webhooks, Rückerstattung, manuelle Zugänge |
| `a11y-mobile` | Alle Seiten je Rolle auf 390 px und 1366 px: keine Überbreite, keine schweren WCAG-2.1-AA-Verstösse (axe-core) |

Jede Suite prüft zusätzlich, dass keine Content-Security-Policy-Verletzung auftritt.

## Lokal ausführen

Voraussetzungen: PostgreSQL ≥ 14 mit Superuser-Zugang, `psql`, `curl`, Node 22,
Python 3 mit `pip install aiosmtpd`, Playwright-Chromium (`npx playwright install chromium`).

```bash
export E2E_PG_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres
npm run e2e:stack                         # Stack starten, schreibt e2e/.run/e2e.env
set -a; source e2e/.run/e2e.env; set +a
npm run build && npx next start -p 3100 & # App mit Test-Konfiguration
npm run test:e2e                          # alle Suiten (je Suite frische DB)
node e2e/run.mjs phase4-shop              # einzelne Suite
bash e2e/stack/down.sh                    # Stack stoppen
```

Die Testdatenbank `flp_e2e` wird bei jedem Lauf gelöscht und neu angelegt – niemals
gegen eine echte Datenbank richten. Alle Daten sind fiktiv (`*.test`-Adressen).
Nicht abgedeckt: Supabase Storage (Upload/Signed URLs), echte Stripe-Seite.
