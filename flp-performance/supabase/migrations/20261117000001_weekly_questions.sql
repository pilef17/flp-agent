-- FLP Performance – Wochenfrage
-- Familien erhalten jeden Donnerstag denselben Link (ohne Login). Die Antworten schreibt nur
-- der Server (Service-Rolle, nach Validierung). Lesen und Löschen dürfen nur Admin/Coach.

create table public.weekly_answers (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,                          -- Donnerstag, an dem die Frage beginnt
  theme text not null check (theme in ('mentalitaet', 'koerper', 'individuell', 'kollektiv')),
  question_key text not null check (question_key ~ '^[a-z]+-[0-9]+$'),
  question text not null check (char_length(question) between 1 and 200),
  athlete_name text not null check (char_length(athlete_name) between 2 and 40),
  athlete_key text not null check (athlete_key = lower(athlete_key) and char_length(athlete_key) between 2 and 40),
  rating smallint check (rating between 1 and 5),     -- null = «Nicht geübt»
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- eine Antwort pro Athlet und Woche; erneutes Senden korrigiert die Antwort
  unique (week_start, athlete_key)
);

create index weekly_answers_week_idx on public.weekly_answers (week_start desc);
create index weekly_answers_athlete_idx on public.weekly_answers (athlete_key);

create trigger weekly_answers_touch before update on public.weekly_answers
  for each row execute function public.touch_updated_at();

alter table public.weekly_answers enable row level security;

create policy weekly_answers_select on public.weekly_answers for select to authenticated
  using (public.is_staff());
create policy weekly_answers_delete on public.weekly_answers for delete to authenticated
  using (public.is_staff());
-- Kein insert/update für anon/authenticated: Schreiben nur über die Service-Rolle.

revoke all on public.weekly_answers from anon;
revoke insert, update on public.weekly_answers from authenticated;
