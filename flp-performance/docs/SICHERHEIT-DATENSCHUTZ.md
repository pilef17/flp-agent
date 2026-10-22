# Sicherheit & Datenschutz

## Technisch umgesetzt

- RLS auf allen Tabellen (`force row level security`), anonymer Zugriff entzogen (Ausnahme: aktive Produkte und deren Titelübersicht).
- Hilfsfunktionen `SECURITY DEFINER` mit leerem `search_path`.
- Keine Selbstvergabe von Rollen; Admin kann sich die eigene Admin-Rolle nicht entziehen.
- Profile: nur `full_name` und `phone` vom Benutzer änderbar (Spaltenrechte).
- Veröffentlichte Beurteilungen unveränderlich; Löschung nur kaskadierend bei Löschung des Spielers (Löschantrag).
- Audit-Log (Trigger) für Rollen, Spieler, Verknüpfungen, Einwilligungen, Beurteilungen, Feedback, Produkte, Entitlements, Bestellungen, Datenschutz-Anträge – speichert nur geänderte Spaltennamen, keine Inhalte.
- Open-Redirect-Schutz (`safeNextPath`), keine Konto-Enumeration bei Registrierung/Passwort-Reset.
- JWT-Prüfung über `getClaims()` im Proxy und auf dem Server.
- Sicherheits-Header (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- Kinder: keine öffentlichen Profile, `robots: noindex`, Spielervideos nur mit Einwilligung und nur für Coach/Eltern.
- Testdaten: Flag `is_test_data` bei Spielern und Bestellungen; RLS-Tests laufen in einer separaten Wegwerf-Datenbank.

## Vor dem Livegang zu klären (nicht durch Technik gelöst)

1. **Rechtliche Prüfung** durch eine Fachperson: revDSG (CH) und – bei Kunden in der EU/EWR oder Angebot an diese – DSGVO (Art. 3 Abs. 2). Ergebnis in Datenschutzerklärung übernehmen (`src/app/datenschutz/page.tsx` ist ein **Entwurf**).
2. **Einwilligungstexte** (`src/lib/consent.ts`) rechtlich prüfen; bei Änderung `POLICY_VERSION` erhöhen.
3. **Urteilsfähigkeit/Alter**: Ab wann ein Kind selbst einwilligen kann, ist im Einzelfall zu beurteilen; aktuell entscheiden ausschliesslich die Eltern.
4. **Identitätsprüfung** bei Eltern-Verknüpfung und bei Datenschutz-Anträgen (organisatorischer Prozess).
5. **Auftragsbearbeitungsverträge (DPA)** mit Supabase, Vercel, Stripe, E-Mail-Anbieter; Datenstandorte und Übermittlungen ins Ausland (USA) dokumentieren.
6. **Verzeichnis der Bearbeitungstätigkeiten**, Aufbewahrungs- und Löschfristen festlegen (z. B. Löschung nach Ende des Coachings).
7. **Datenexport**: Anträge werden erfasst und verwaltet; die Erstellung des Exports ist noch manuell (siehe STATUS).
8. **Datenschutzverletzungen**: Meldeprozess an den EDÖB definieren.
9. **AGB / Widerrufs- und Rückerstattungsregeln** für digitale Programme, MWST-Pflicht prüfen.
10. **Auth-Härtung** in Supabase: Leaked-Password-Protection, Rate Limits, ggf. MFA für Admin/Coaches, eigener SMTP mit SPF/DKIM.
11. **Backups/PITR** im Supabase-Plan aktivieren.
