# Architektur

## Grundentscheide

| Entscheid | Wahl | Begründung |
|---|---|---|
| Rendering | Next.js App Router, Server Components + Server Actions | Daten werden serverseitig mit dem Benutzer-Token geladen; kein Datenzugriff aus Client-JS nötig. |
| Berechtigungen | **PostgreSQL Row Level Security** als einzige Quelle der Wahrheit | Auch ein direkter Aufruf der Supabase-REST-API mit gültigem Token kann keine fremden Daten lesen. UI-Prüfungen (`requireStaff` usw.) sind nur Komfort. |
| Service-Key | nur in `lib/supabase/admin.ts` (`server-only`) | verwendet für Einladungen (Konto-Suche/-Erstellung) und künftig Stripe-Webhooks. Fachliche Schreibvorgänge laufen über den Benutzer-Client → RLS + Audit-Actor. |
| Rollen | Tabelle `user_roles` (admin, coach, parent, player) | Rollen nie aus `user_metadata` (vom Benutzer änderbar). Registrierung ergibt immer `parent`; `player` nur via `app_metadata` (serverseitig). |
| Coaching-Zugang | aktiver Datensatz in `coach_player_links` | Präsenz-Kunden; vergibt/entzieht nur der Admin. |
| Programmzugang | `entitlements` (Kauf oder manuell) | Hybrid-Modell: ein Benutzer kann Coaching und gekaufte Programme haben. |
| Beurteilungen | veröffentlicht = unveränderlich (Trigger) | Historie wird nie überschrieben; Korrektur = neue Beurteilung. «Nicht beurteilt» = `score null`, nie 0. |
| Einwilligungen | nur anhängen (`guardian_consents`) | Nachweisbarkeit: jede Erteilung/jeder Widerruf mit Zeitstempel und Textversion. |
| Datenminimierung | nur Geburtsjahr, keine Adressen/Fotos im Profil | |
| Medien | private Buckets + Signed URLs | `exercise-media`, `program-media`, `player-media` privat; nur `product-covers` öffentlich. Spielervideos nur mit Video-Einwilligung. |
| Zahlungen (Phase 4) | Stripe Checkout (hosted) + Webhook mit Signaturprüfung, Idempotenz über `stripe_events` und eindeutigen Index `entitlements(order_id, product_id)` | keine Kartendaten in der DB; Zugang erst nach verifiziertem `checkout.session.completed`. |

## Datenmodell (Kurzfassung)

```
auth.users ─1:1─ profiles ─1:n─ user_roles
profiles ─< guardian_player_links >─ players ─< coach_player_links >─ profiles
players ─< guardian_consents, training_plans ─< training_sessions ─< session_exercises >─ exercises ─< exercise_media
training_sessions ─< session_completions
players ─< assessments ─< assessment_scores >─ assessment_categories (8 Kompetenzen)
players ─< coach_feedback
products ─< product_content ; profiles ─< orders ─< order_items ; profiles ─< entitlements >─ products
privacy_requests, audit_logs, stripe_events
```

Alle Primärschlüssel sind UUIDs; Fremdschlüssel und Indizes siehe `supabase/migrations/20261022000001_core_schema.sql`.

## Sichtbarkeitsregeln (vereinfacht)

| Daten | Admin | Coach | Elternteil | Spieler |
|---|---|---|---|---|
| Spielerprofil | alle | zugewiesene | eigene Kinder | sich selbst |
| Pläne, Beurteilungen, Feedback | alle (inkl. Entwürfe) | zugewiesene (inkl. Entwürfe) | nur veröffentlichte | nur veröffentlichte |
| Übungsbibliothek | alle | alle | veröffentlichte, wenn Coaching aktiv / im Plan / gekauft | dito |
| Programminhalte | alle | – | mit gültigem Entitlement | mit gültigem Entitlement |
| Audit-Log, alle Datenschutz-Anträge | ja | nein | nein | nein |
