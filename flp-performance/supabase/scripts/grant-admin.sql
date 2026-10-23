-- Ersten Administrator festlegen (einmalig im Supabase SQL-Editor ausführen).
-- Vorher in der App mit dieser E-Mail registrieren und die E-Mail bestätigen.
update public.user_roles
set role = 'admin'
where user_id = (select id from auth.users where email = 'DEINE-EMAIL@example.ch');

-- Weitere Trainer: Rolle 'coach' zusätzlich vergeben
-- insert into public.user_roles (user_id, role)
-- select id, 'coach' from auth.users where email = 'trainer@example.ch';
