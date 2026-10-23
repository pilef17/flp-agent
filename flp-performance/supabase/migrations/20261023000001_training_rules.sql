-- FLP Performance – Regeln für Trainingsplanung (Phase 2)

-- Einheiten müssen innerhalb der Planwoche (Montag–Sonntag) liegen.
create or replace function public.guard_session_date()
returns trigger language plpgsql set search_path = '' as $$
declare ws date;
begin
  select week_start into ws from public.training_plans where id = new.plan_id;
  if new.scheduled_on < ws or new.scheduled_on > ws + 6 then
    raise exception 'Die Einheit muss in der Planwoche liegen (% bis %)', ws, ws + 6
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger training_sessions_date_guard
  before insert or update of scheduled_on, plan_id on public.training_sessions
  for each row execute function public.guard_session_date();

-- Wochenstart eines bestehenden Plans darf sich nicht von seinen Einheiten lösen.
create or replace function public.guard_plan_week()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.week_start <> old.week_start and exists (
    select 1 from public.training_sessions where plan_id = new.id
  ) then
    raise exception 'Die Woche eines Plans mit Einheiten kann nicht geändert werden'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger training_plans_week_guard
  before update of week_start on public.training_plans
  for each row execute function public.guard_plan_week();

-- Pro Spieler und Woche höchstens ein Plan (Kalender bleibt eindeutig)
create unique index training_plans_player_week_idx on public.training_plans (player_id, week_start);

-- Mediendatei darf nur zu einer Übung gehören und muss im Ordner der Übung liegen
alter table public.exercise_media
  add constraint exercise_media_path_check check (storage_path like exercise_id::text || '/%');
