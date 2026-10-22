# FLP Performance

Plattform für individuelles Fussballtraining (Schweiz): Spielerprofile, Trainingspläne, Beurteilungen,
Elternbereich und (ab Phase 4) digitale Programme.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Auth, PostgreSQL, Storage, RLS) · Stripe Checkout

## Lokal starten

Voraussetzungen: Node.js 22, Docker (für Supabase lokal) **oder** ein Supabase-Cloud-Projekt.

```bash
cd flp-performance
npm install
cp .env.example .env.local      # Werte eintragen (siehe unten)
```

### Variante A – Supabase lokal (Docker)

```bash
npx supabase init               # einmalig, falls noch keine config.toml existiert
npx supabase start              # zeigt API URL, publishable & secret key
npx supabase db reset           # wendet supabase/migrations/* an
```

Die ausgegebenen Werte in `.env.local` eintragen. E-Mails (Bestätigung, Einladung, Passwort) landen
in Inbucket/Mailpit (URL wird von `supabase start` angezeigt).

### Variante B – Supabase Cloud

1. Projekt in einer EU/CH-nahen Region anlegen (z. B. Frankfurt oder Zürich, falls verfügbar).
2. `npx supabase link --project-ref <ref>` und danach `npx supabase db push`.
3. Unter *Authentication → URL Configuration*: Site URL = `NEXT_PUBLIC_SITE_URL`, Redirect URLs:
   `<SITE_URL>/auth/confirm`, `<SITE_URL>/auth/einladung`.
4. Eigenen SMTP-Versand einrichten (der Supabase-Standardversand ist stark limitiert).

### App starten

```bash
npm run dev                     # http://localhost:3000
```

Ersten Administrator festlegen: in der App registrieren, E-Mail bestätigen und dann
`supabase/scripts/grant-admin.sql` (mit deiner E-Mail) im SQL-Editor ausführen.

## Prüfungen

```bash
npm run typecheck
npm run lint
npm test                        # Unit-Tests (Validierung, Routing, Beurteilungslogik)
npm run test:db                 # RLS-/Policy-Tests gegen lokales PostgreSQL (psql nötig)
```

`npm run test:db` erstellt eine Wegwerf-Datenbank `flp_rls_test`, bildet die Supabase-Objekte `auth`/`storage`
minimal nach (`supabase/tests/supabase_stub.sql`), wendet alle Migrationen an und führt
`supabase/tests/rls_test.sql` aus (aktuell 107 Prüfungen). Es braucht dafür Superuser-Rechte (z. B. `sudo -u postgres npm run test:db`).

## Struktur

```
flp-performance/
├── src/
│   ├── app/
│   │   ├── (auth)/            Login, Registrierung, Passwort vergessen + Server Actions
│   │   ├── (app)/             Geschützter Bereich (AppShell)
│   │   │   ├── startseite/    Spieler-Startseite
│   │   │   ├── elternbereich/ Eltern-Dashboard, Einwilligungen
│   │   │   ├── spieler/[id]   Spielerprofil (Eltern/Spieler)
│   │   │   ├── trainingsplan/ Trainingskalender (Woche)
│   │   │   ├── uebungen/      Übungsbibliothek + Details
│   │   │   ├── entwicklung/   Meine Entwicklung (Vergleich, Verlauf, Tabelle)
│   │   │   ├── feedback/      Trainer-Feedback
│   │   │   ├── meine-kaeufe/  Käufe und Zugänge
│   │   │   └── programme/[slug]/inhalt  Gekaufte Programminhalte
│   │   │   ├── konto/         Profil, Datenschutz-Anträge
│   │   │   ├── passwort-neu/
│   │   │   └── admin/         Übersicht, Spieler, Übungen, Plan-Builder, Beurteilungen, Feedback, Shop, Datenschutz
│   │   ├── (shop)/programme   Öffentlicher Katalog + Programm-Details, Checkout
│   │   ├── api/stripe/webhook Stripe-Webhook (Signatur, idempotent)
│   │   ├── auth/confirm       E-Mail-Links (PKCE / token_hash)
│   │   ├── auth/einladung     Einladungslinks (Session im URL-Fragment)
│   │   └── datenschutz/       Datenschutzerklärung (ENTWURF)
│   ├── components/            UI-Design-System, Navigation, Charts
│   ├── lib/                   Supabase-Clients, Auth, Validierung (zod), Domänenlogik
│   └── proxy.ts               Session-Refresh + Schutz privater Routen
├── supabase/
│   ├── migrations/            Schema, Sicherheitsmodell (RLS), Storage
│   ├── tests/                 RLS-Tests
│   └── scripts/               Admin-Bootstrap
└── docs/                      Architektur, Sicherheit, Datenschutz, Deployment, Status
```

Weitere Dokumentation: [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md), [`docs/SICHERHEIT-DATENSCHUTZ.md`](docs/SICHERHEIT-DATENSCHUTZ.md),
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/STATUS.md`](docs/STATUS.md).
