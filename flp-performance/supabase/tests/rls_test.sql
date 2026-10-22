-- FLP Performance – Tests der Row Level Security und Datenintegrität
-- Ausführung: npm run test:db (lokal) – siehe run-local.sh
\set ON_ERROR_STOP on
set client_min_messages = warning;

create schema tests;
create table tests.results (id serial, name text, passed boolean, detail text);
grant usage on schema tests to anon, authenticated, service_role;
grant all on tests.results to anon, authenticated, service_role;
grant usage on sequence tests.results_id_seq to anon, authenticated, service_role;

create function tests.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  perform set_config('role', 'authenticated', false);
end $$;
create function tests.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  perform set_config('role', 'anon', false);
end $$;
create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claims', '', false);
end $$;
create function tests.ok(cond boolean, name text) returns void language plpgsql as $$
begin
  insert into tests.results (name, passed) values (name, coalesce(cond, false));
end $$;
create function tests.eq(actual bigint, expected bigint, name text) returns void language plpgsql as $$
begin
  insert into tests.results (name, passed, detail)
  values (name, actual is not distinct from expected, format('erwartet %s, erhalten %s', expected, actual));
end $$;
-- Erwartet, dass das SQL fehlschlägt ODER keine Zeile betrifft
create function tests.denied(q text, name text) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute q;
    get diagnostics n = row_count;
    insert into tests.results (name, passed, detail) values (name, n = 0, format('%s Zeilen betroffen', n));
  exception when others then
    insert into tests.results (name, passed, detail) values (name, true, sqlerrm);
  end;
end $$;
create function tests.allowed(q text, name text) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute q;
    get diagnostics n = row_count;
    insert into tests.results (name, passed, detail) values (name, n > 0, format('%s Zeilen betroffen', n));
  exception when others then
    insert into tests.results (name, passed, detail) values (name, false, sqlerrm);
  end;
end $$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Testdaten (fiktiv, nur in dieser Testdatenbank)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.invalid', '{"full_name":"Test Admin"}', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'coach@test.invalid', '{"full_name":"Test Coach"}', '{}'),
  ('00000000-0000-0000-0000-0000000000a1', 'eltern-a@test.invalid', '{"full_name":"Eltern A"}', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'eltern-b@test.invalid', '{"full_name":"Eltern B"}', '{}'),
  ('00000000-0000-0000-0000-0000000000d1', 'spieler@test.invalid', '{}', '{"flp_role":"player"}'),
  -- versucht, sich über user_metadata Adminrechte zu geben
  ('00000000-0000-0000-0000-0000000000e1', 'boese@test.invalid', '{"flp_role":"admin"}', '{}');

update public.user_roles set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000a';
update public.user_roles set role = 'coach' where user_id = '00000000-0000-0000-0000-00000000000c';

select tests.eq((select count(*) from public.profiles), 6, 'Profil wird bei Registrierung angelegt');
select tests.ok(
  (select array_agg(role::text) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000e1') = array['parent'],
  'user_metadata kann keine Rolle setzen');
select tests.ok(
  (select role from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000d1') = 'player',
  'app_metadata flp_role=player ergibt Spielerrolle');

-- Coach erfasst Spieler 1 (wird automatisch zugewiesen); Admin erfasst Spieler 2
select tests.login('00000000-0000-0000-0000-00000000000c');
select tests.allowed($$insert into public.players (id, first_name, last_name, birth_year, user_id, is_test_data)
  values ('10000000-0000-0000-0000-000000000001', 'Lio', 'Test', 2015, '00000000-0000-0000-0000-0000000000d1', true)$$,
  'Coach kann Spieler erfassen');
select tests.eq((select count(*) from public.players where id = '10000000-0000-0000-0000-000000000001'), 1,
  'Ersteller-Coach sieht den Spieler sofort');
select tests.allowed($$insert into public.players (id, first_name, last_name, birth_year, is_test_data)
  values ('10000000-0000-0000-0000-000000000009', 'Ohne', 'Returning', 2014, true)$$,
  'Coach: Spieler erfassen wie in der App (ID vorab, ohne RETURNING)');
select tests.allowed($$insert into public.assessments (player_id, coach_id, assessed_on)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '2026-08-01') returning id$$,
  'Coach: Beurteilung anlegen mit RETURNING (Regression)');
delete from public.assessments where assessed_on = '2026-08-01';
select tests.allowed($$insert into public.guardian_player_links (guardian_id, player_id)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001')$$,
  'Coach kann Eltern verknüpfen');
select tests.logout();

select tests.login('00000000-0000-0000-0000-00000000000a');
insert into public.players (id, first_name, last_name, birth_year, is_test_data)
  values ('10000000-0000-0000-0000-000000000002', 'Mia', 'Test', 2016, true);
insert into public.guardian_player_links (guardian_id, player_id)
  values ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000002');
-- Admin-Link des Erstellers für Spieler 2 entfernen: kein Coaching-Kunde
delete from public.coach_player_links where player_id = '10000000-0000-0000-0000-000000000002';
insert into public.exercises (id, code, title, category, status) values
  ('20000000-0000-0000-0000-000000000001', 'TEC-001', 'Ballführung Slalom', 'technik', 'published'),
  ('20000000-0000-0000-0000-000000000002', 'TEC-002', 'Entwurfsübung', 'technik', 'draft'),
  ('20000000-0000-0000-0000-000000000003', 'KOO-001', 'Koordinationsleiter', 'koordination', 'published');
insert into public.exercise_media (exercise_id, storage_path) values
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001/video.mp4'),
  ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002/video.mp4');
select tests.logout();
insert into storage.objects (bucket_id, name) values
  ('exercise-media', '20000000-0000-0000-0000-000000000001/video.mp4'), ('exercise-media', '20000000-0000-0000-0000-000000000002/video.mp4');

-- Coach: Pläne, Beurteilungen, Feedback für Spieler 1
select tests.login('00000000-0000-0000-0000-00000000000c');
insert into public.training_plans (id, player_id, title, week_start, status) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Woche 1', '2026-10-19', 'published'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Woche 2 (Entwurf)', '2026-10-26', 'draft');
insert into public.training_sessions (id, plan_id, scheduled_on, title) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-10-20', 'Einheit Dienstag'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '2026-10-27', 'Einheit Entwurf');
insert into public.session_exercises (id, session_id, exercise_id) values
  ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003');
insert into public.assessments (id, player_id, coach_id, kind, assessed_on, status) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'initial', '2026-09-01', 'draft'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'regular', '2026-10-01', 'draft');
insert into public.assessment_scores (assessment_id, category_id, score)
  select '40000000-0000-0000-0000-000000000001', id, 2 from public.assessment_categories;
insert into public.assessment_scores (assessment_id, category_id, score)
  select '40000000-0000-0000-0000-000000000002', id, case when position = 8 then null else 3 end from public.assessment_categories;
update public.assessments set status = 'published' where id = '40000000-0000-0000-0000-000000000001';
insert into public.coach_feedback (player_id, author_id, title, body, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'Freigegeben', 'Gute Woche.', 'published'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'Entwurf', 'Noch intern.', 'draft');

select tests.ok((select published_at is not null from public.assessments where id = '40000000-0000-0000-0000-000000000001'),
  'published_at wird bei Veröffentlichung gesetzt');
select tests.denied($$update public.assessments set coach_notes = 'geändert' where id = '40000000-0000-0000-0000-000000000001'$$,
  'Veröffentlichte Beurteilung ist unveränderlich');
select tests.denied($$delete from public.assessments where id = '40000000-0000-0000-0000-000000000001'$$,
  'Veröffentlichte Beurteilung kann nicht gelöscht werden');
select tests.denied($$update public.assessment_scores set score = 5 where assessment_id = '40000000-0000-0000-0000-000000000001'$$,
  'Werte einer veröffentlichten Beurteilung sind unveränderlich');
select tests.denied($$insert into public.assessments (player_id, coach_id, kind) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'initial')$$,
  'Nur eine Erstbeurteilung pro Spieler');
select tests.denied($$insert into public.assessment_scores (assessment_id, category_id, score)
  select '40000000-0000-0000-0000-000000000002', id, 6 from public.assessment_categories where position = 1 limit 1$$,
  'Wert ausserhalb 1–5 wird abgelehnt');
select tests.allowed($$update public.assessment_scores set score = 4 where assessment_id = '40000000-0000-0000-0000-000000000002'
  and category_id = (select id from public.assessment_categories where position = 1)$$,
  'Entwurf kann bearbeitet werden');

select tests.denied($$insert into public.training_sessions (plan_id, scheduled_on, title)
  values ('30000000-0000-0000-0000-000000000001', '2026-10-26', 'Ausserhalb')$$,
  'Einheit ausserhalb der Planwoche abgelehnt');
select tests.denied($$insert into public.training_plans (player_id, title, week_start)
  values ('10000000-0000-0000-0000-000000000001', 'Doppelt', '2026-10-19')$$,
  'Nur ein Plan pro Spieler und Woche');
select tests.denied($$update public.training_plans set week_start = '2026-11-02' where id = '30000000-0000-0000-0000-000000000001'$$,
  'Woche eines Plans mit Einheiten unveränderlich');
select tests.denied($$insert into public.exercise_media (exercise_id, storage_path)
  values ('20000000-0000-0000-0000-000000000001', 'fremder-ordner/x.mp4')$$,
  'Medienpfad muss im Ordner der Übung liegen');
select tests.eq((select count(*) from public.players), 2, 'Coach sieht nur zugewiesene Spieler');
select tests.denied($$update public.players set club = 'X' where id = '10000000-0000-0000-0000-000000000002'$$,
  'Coach kann fremde Spieler nicht ändern');
select tests.denied($$insert into public.coach_player_links (coach_id, player_id)
  values ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000002')$$,
  'Coach kann sich nicht selbst Coaching-Zugang geben');
select tests.denied($$insert into public.assessments (player_id, coach_id) values
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c')$$,
  'Coach kann fremde Spieler nicht beurteilen');
select tests.eq((select count(*) from public.audit_logs), 0, 'Coach sieht keine Audit-Logs');
select tests.logout();

-- Eltern A (Spieler 1)
select tests.login('00000000-0000-0000-0000-0000000000a1');
select tests.eq((select count(*) from public.players), 1, 'Eltern A sieht genau ein Kind');
select tests.eq((select count(*) from public.players where id = '10000000-0000-0000-0000-000000000002'), 0,
  'Eltern A sieht fremdes Kind nicht');
select tests.eq((select count(*) from public.assessments), 1, 'Eltern sehen nur veröffentlichte Beurteilungen');
select tests.eq((select count(*) from public.assessment_scores), 8, 'Eltern sehen Werte der veröffentlichten Beurteilung');
select tests.eq((select count(*) from public.coach_feedback), 1, 'Eltern sehen nur freigegebenes Feedback');
select tests.eq((select count(*) from public.training_plans), 1, 'Eltern sehen nur veröffentlichte Pläne');
select tests.eq((select count(*) from public.training_sessions), 1, 'Eltern sehen nur Einheiten veröffentlichter Pläne');
select tests.eq((select count(*) from public.exercises), 2, 'Coaching-Kunde sieht veröffentlichte Übungen, keine Entwürfe');
select tests.eq((select count(*) from storage.objects), 1, 'Eltern sehen nur Videos veröffentlichter Übungen');
select tests.eq((select count(*) from public.profiles), 1, 'Eltern sehen nur das eigene Profil');
select tests.denied($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin')$$,
  'Eltern können sich keine Rolle geben');
select tests.denied($$update public.user_roles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  'Eltern können eigene Rolle nicht ändern');
select tests.denied($$update public.profiles set email = 'x@test.invalid' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'E-Mail im Profil ist nicht direkt änderbar');
select tests.allowed($$update public.profiles set full_name = 'Eltern A neu' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'Eltern können eigenen Namen ändern');
select tests.denied($$insert into public.assessments (player_id, coach_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')$$,
  'Eltern können keine Beurteilungen erfassen');
select tests.denied($$update public.players set first_name = 'X' where id = '10000000-0000-0000-0000-000000000001'$$,
  'Eltern können Spielerdaten nicht direkt ändern');
select tests.denied($$insert into public.guardian_player_links (guardian_id, player_id)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000002')$$,
  'Eltern können sich nicht mit fremdem Kind verknüpfen');
select tests.allowed($$insert into public.guardian_consents (guardian_id, player_id, consent_type, granted, policy_version)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'data_processing', true, '2026-10')$$,
  'Eltern können Einwilligung für eigenes Kind erteilen');
select tests.denied($$insert into public.guardian_consents (guardian_id, player_id, consent_type, granted, policy_version)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000002', 'data_processing', true, '2026-10')$$,
  'Einwilligung für fremdes Kind wird abgelehnt');
select tests.denied($$update public.guardian_consents set granted = false$$,
  'Einwilligungen sind unveränderlich');
select tests.allowed($$insert into public.session_completions (session_id, completed_by)
  values ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')$$,
  'Eltern können Einheit als erledigt markieren');
select tests.denied($$insert into public.session_completions (session_id, completed_by)
  values ('31000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1')$$,
  'Einheit eines Entwurfs kann nicht abgeschlossen werden');
select tests.allowed($$insert into public.privacy_requests (requester_id, player_id, request_type)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'export')$$,
  'Eltern können Datenauskunft beantragen');
select tests.denied($$insert into public.privacy_requests (requester_id, player_id, request_type)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000002', 'deletion')$$,
  'Antrag für fremdes Kind wird abgelehnt');
select tests.denied($$insert into public.privacy_requests (requester_id, request_type, status)
  values ('00000000-0000-0000-0000-0000000000a1', 'deletion', 'completed')$$,
  'Antrag kann nicht als erledigt erfasst werden');
select tests.denied($$insert into public.entitlements (user_id, product_id, source, granted_by)
  select '00000000-0000-0000-0000-0000000000a1', id, 'manual', '00000000-0000-0000-0000-0000000000a1' from public.products limit 1$$,
  'Eltern können sich keinen Programmzugang geben');
select tests.denied($$insert into public.orders (user_id, status, total_cents) values ('00000000-0000-0000-0000-0000000000a1', 'paid', 0)$$,
  'Eltern können keine bezahlte Bestellung anlegen');
select tests.denied($$select * from public.stripe_events$$, 'Stripe-Events sind nicht lesbar');
select tests.eq((select count(*) from public.audit_logs), 0, 'Eltern sehen keine Audit-Logs');
select tests.logout();

-- Eltern B (Spieler 2, kein Coaching-Kunde)
select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.eq((select count(*) from public.players where id = '10000000-0000-0000-0000-000000000001'), 0,
  'Eltern B sieht Kind von Eltern A nicht');
select tests.eq((select count(*) from public.assessments), 0, 'Eltern B sieht keine fremden Beurteilungen');
select tests.eq((select count(*) from public.coach_feedback), 0, 'Eltern B sieht kein fremdes Feedback');
select tests.eq((select count(*) from public.exercises), 0, 'Ohne Coaching/Kauf keine Übungsbibliothek');
select tests.eq((select count(*) from public.guardian_consents), 0, 'Eltern B sieht fremde Einwilligungen nicht');
select tests.denied($$insert into public.session_completions (session_id, completed_by)
  values ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')$$,
  'Eltern B kann fremde Einheit nicht abschliessen');
select tests.eq((select count(*) from public.product_content), 0, 'Programminhalte ohne Kauf nicht sichtbar');
select tests.logout();

-- Spieler mit eigenem Login
select tests.login('00000000-0000-0000-0000-0000000000d1');
select tests.eq((select count(*) from public.players), 1, 'Spieler sieht nur sich selbst');
select tests.eq((select count(*) from public.coach_feedback), 1, 'Spieler sieht freigegebenes Feedback');
select tests.allowed($$insert into public.session_completions (session_id, session_exercise_id, completed_by)
  values ('31000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1')$$,
  'Spieler kann Übung als erledigt markieren');
select tests.denied($$insert into public.session_completions (session_id, completed_by)
  values ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')$$,
  'Abschluss im Namen anderer wird abgelehnt');
select tests.logout();

-- Anonym
select tests.anon();
select tests.denied($$select * from public.players$$, 'Anonym: keine Spielerdaten');
select tests.denied($$select * from public.assessments$$, 'Anonym: keine Beurteilungen');
select tests.eq((select count(*) from public.products), 0, 'Anonym: inaktive Produkte unsichtbar');
select tests.logout();

-- Admin: Produkte, Inhalte, manuelle Freigabe, Audit
select tests.login('00000000-0000-0000-0000-00000000000a');
update public.products set is_active = true where slug = 'flp-training';
insert into public.product_content (product_id, kind, title, exercise_id)
  select id, 'exercise', 'Koordinationsleiter', '20000000-0000-0000-0000-000000000003' from public.products where slug = 'flp-training';
select tests.allowed($$insert into public.entitlements (user_id, product_id, source, granted_by)
  select '00000000-0000-0000-0000-0000000000b1', id, 'manual', '00000000-0000-0000-0000-00000000000a' from public.products where slug = 'flp-training'$$,
  'Admin kann Programmzugang manuell gewähren');
select tests.ok((select count(*) from public.audit_logs where entity_type = 'entitlements') = 1,
  'Freigabe wird im Audit-Log protokolliert');
select tests.ok((select count(*) from public.audit_logs where entity_type = 'players') >= 2,
  'Spielererfassung wird protokolliert');
select tests.denied($$delete from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  'Admin kann sich die eigene Rolle nicht entziehen');
select tests.logout();

select tests.anon();
select tests.eq((select count(*) from public.products), 1, 'Anonym: aktive Produkte sichtbar');
select tests.eq((select count(*) from public.product_outline((select id from public.products where slug = 'flp-training'))), 1,
  'Anonym: Inhaltsübersicht (nur Titel) sichtbar');
select tests.logout();

select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.eq((select count(*) from public.product_content), 1, 'Nach Freigabe: Programminhalte sichtbar');
select tests.eq((select count(*) from public.exercises), 1, 'Nach Freigabe: enthaltene Übung sichtbar');
select tests.ok((select count(*) from public.products where slug = 'flp-training') = 1, 'Aktives Produkt sichtbar');
select tests.denied($$insert into public.entitlements (user_id, product_id, source, granted_by)
  select '00000000-0000-0000-0000-0000000000b1', id, 'manual', '00000000-0000-0000-0000-0000000000b1'
  from public.products where slug = 'flp-training'$$,
  'Eltern können sich keinen Zugang zu aktivem Produkt geben');
select tests.denied($$update public.products set price_cents = 0 where slug = 'flp-training'$$,
  'Eltern können Preise nicht ändern');
select tests.logout();

select tests.login('00000000-0000-0000-0000-00000000000a');
update public.entitlements set revoked_at = now();
select tests.logout();
select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.eq((select count(*) from public.product_content), 0, 'Nach Entzug: keine Programminhalte');
select tests.logout();

-- Spielervideos nur mit Einwilligung
select tests.login('00000000-0000-0000-0000-00000000000c');
select tests.denied($$insert into storage.objects (bucket_id, name)
  values ('player-media', '10000000-0000-0000-0000-000000000001/clip.mp4')$$,
  'Spielervideo ohne Video-Einwilligung abgelehnt');
select tests.logout();
select tests.login('00000000-0000-0000-0000-0000000000a1');
insert into public.guardian_consents (guardian_id, player_id, consent_type, granted, policy_version)
  values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'video_recording', true, '2026-10');
select tests.logout();
select tests.login('00000000-0000-0000-0000-00000000000c');
select tests.allowed($$insert into storage.objects (bucket_id, name)
  values ('player-media', '10000000-0000-0000-0000-000000000001/clip.mp4')$$,
  'Spielervideo mit Einwilligung erlaubt');
select tests.denied($$insert into storage.objects (bucket_id, name)
  values ('player-media', '10000000-0000-0000-0000-000000000002/clip.mp4')$$,
  'Spielervideo für fremden Spieler abgelehnt');
select tests.logout();
select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.eq((select count(*) from storage.objects where bucket_id = 'player-media'), 0,
  'Fremde Eltern sehen Spielervideos nicht');
select tests.logout();

-- Datenlöschung: Admin löscht Spieler inkl. veröffentlichter Beurteilungen
select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.allowed($$delete from public.players where id = '10000000-0000-0000-0000-000000000001'$$,
  'Admin kann Spieler vollständig löschen (Löschantrag)');
select tests.eq((select count(*) from public.assessments), 0, 'Beurteilungen werden mitgelöscht');
select tests.logout();

-- Shop: Bestellungen nur über Service-Rolle, idempotente Verbuchung
select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.denied($$select public.create_pending_order('00000000-0000-0000-0000-0000000000b1', (select id from public.products where slug = 'flp-training'))$$,
  'Eltern können keine Bestellung über die Funktion anlegen');
select tests.denied($$select public.fulfill_checkout('evt_x', 'checkout.session.completed', gen_random_uuid(), 'cs_x', 'pi_x', 3900, 'chf')$$,
  'Eltern können keine Zahlung verbuchen');
select tests.logout();

set role service_role;
select public.create_pending_order('00000000-0000-0000-0000-0000000000b1', (select id from public.products where slug = 'flp-training')) as oid \gset
update public.orders set stripe_checkout_session_id = 'cs_test_1', is_test_data = true where id = :'oid';
select tests.ok(public.fulfill_checkout('evt_1', 'checkout.session.completed', :'oid', 'cs_test_1', 'pi_1', 100, 'chf') = 'mismatch',
  'Abweichender Betrag wird nicht verbucht');
select tests.eq((select count(*) from public.entitlements where order_id = :'oid'), 0, 'Kein Zugang bei Betragsabweichung');
select tests.ok(public.fulfill_checkout('evt_2', 'checkout.session.completed', :'oid', 'cs_falsch', 'pi_1', 3900, 'chf') = 'mismatch',
  'Fremde Checkout-Session wird nicht verbucht');
select tests.ok(public.fulfill_checkout('evt_3', 'checkout.session.completed', :'oid', 'cs_test_1', 'pi_1', 3900, 'chf') = 'fulfilled',
  'Korrekte Zahlung wird verbucht');
select tests.ok(public.fulfill_checkout('evt_3', 'checkout.session.completed', :'oid', 'cs_test_1', 'pi_1', 3900, 'chf') = 'duplicate',
  'Gleiches Event wird nur einmal verarbeitet');
select tests.ok(public.fulfill_checkout('evt_4', 'checkout.session.async_payment_succeeded', :'oid', 'cs_test_1', 'pi_1', 3900, 'chf') = 'duplicate',
  'Bereits bezahlte Bestellung wird nicht doppelt verbucht');
select tests.eq((select count(*) from public.entitlements where order_id = :'oid'), 1, 'Genau ein Zugang pro Kauf');
select tests.ok(public.update_order_from_stripe('evt_5', 'checkout.session.expired', 'cs_test_1', null, 'canceled') = 'ignored',
  'Bezahlte Bestellung wird durch spätere Events nicht zurückgestuft');
select tests.ok((select status::text from public.orders where id = :'oid') = 'paid', 'Bestellung bleibt bezahlt');
select tests.ok(exists (select 1 from public.audit_logs where entity_type = 'orders' and entity_id = :'oid'), 'Bestellung wird protokolliert');
reset role;

select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.eq((select count(*) from public.orders), 1, 'Käufer sieht eigene Bestellung');
select tests.eq((select count(*) from public.order_items), 1, 'Käufer sieht Bestellpositionen');
select tests.eq((select count(*) from public.product_content), 1, 'Nach Kauf: Programminhalte sichtbar');
select tests.logout();
select tests.login('00000000-0000-0000-0000-0000000000a1');
select tests.eq((select count(*) from public.orders), 0, 'Andere Eltern sehen fremde Bestellungen nicht');
select tests.logout();

set role service_role;
select tests.ok(public.update_order_from_stripe('evt_6', 'charge.refunded', null, 'pi_1', 'refunded') = 'refunded', 'Rückerstattung verbucht');
select tests.ok((select revoked_at is not null from public.entitlements where order_id = :'oid'), 'Rückerstattung entzieht Zugang');
select public.create_pending_order('00000000-0000-0000-0000-0000000000b1', (select id from public.products where slug = 'flp-training')) as oid2 \gset
update public.orders set stripe_checkout_session_id = 'cs_test_2' where id = :'oid2';
select tests.ok(public.update_order_from_stripe('evt_7', 'checkout.session.expired', 'cs_test_2', null, 'canceled') = 'canceled', 'Abgelaufene Session storniert Bestellung');
reset role;
select tests.login('00000000-0000-0000-0000-0000000000b1');
select tests.eq((select count(*) from public.product_content), 0, 'Nach Rückerstattung: keine Programminhalte');
select tests.logout();

set role service_role;
select tests.denied($$select public.create_pending_order('00000000-0000-0000-0000-0000000000b1', (select id from public.products where slug = 'flp-nutrition'))$$,
  'Inaktives Produkt kann nicht bestellt werden');
reset role;
select tests.denied($$update public.products set price_cents = 10 where slug = 'flp-training'$$, 'Preis unter CHF 0.50 abgelehnt');

-- ---------------------------------------------------------------------------
select format('%s %s%s', case when passed then 'ok  ' else 'FAIL' end, name,
  case when passed then '' else ' – ' || coalesce(detail, '') end)
from tests.results order by id;
select format('%s/%s Tests bestanden', count(*) filter (where passed), count(*)) as summary from tests.results;
do $$ begin
  if exists (select 1 from tests.results where not passed) then
    raise exception 'Mindestens ein Test ist fehlgeschlagen';
  end if;
end $$;
