-- FLP Performance – Wochenstruktur: Fokus und Uhrzeit pro Einheit, Wochenvorlagen

create type public.training_focus as enum (
  'kraft', 'power', 'ausdauer', 'schnelligkeit', 'technik', 'spiel', 'regeneration'
);

alter table public.training_sessions
  add column focus public.training_focus,
  add column starts_at time,
  add column ends_at time,
  add constraint training_sessions_time_check check (starts_at is null or ends_at is null or ends_at > starts_at);

create table public.week_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  audience text not null default '' check (char_length(audience) <= 60),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger week_templates_touch before update on public.week_templates
  for each row execute function public.touch_updated_at();
create trigger week_templates_created_by before insert on public.week_templates
  for each row execute function public.set_created_by();

-- Ein Eintrag pro Trainingstag; fehlende Wochentage sind Ruhetage.
create table public.week_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.week_templates (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- 1 = Montag
  title text not null check (char_length(title) between 2 and 120),
  focus public.training_focus not null,
  starts_at time,
  ends_at time,
  notes text not null default '' check (char_length(notes) <= 2000),
  unique (template_id, weekday),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

-- Startvorlagen (frei anpassbar) – vor dem Aktivieren von RLS eingefügt
with kids as (
  insert into public.week_templates (title, audience, notes)
  values ('Wochenstruktur Kids', '6–14 Jahre',
          'Spielerisch und mit dem eigenen Körpergewicht. Technik vor Intensität.')
  returning id
)
insert into public.week_template_days (template_id, weekday, title, focus)
select kids.id, d.weekday, d.title, d.focus::public.training_focus
from kids, (values
  (1, 'Athletik & Sprungkraft', 'kraft'),
  (2, 'Ausdauer im Spiel', 'ausdauer'),
  (3, 'Rumpf & Körperhaltung', 'kraft'),
  (4, 'Schnelligkeit & Koordination', 'schnelligkeit'),
  (5, 'Ballgefühl & Technik', 'technik'),
  (6, 'Fussball & Spielform', 'spiel')
) as d (weekday, title, focus);

with pro as (
  insert into public.week_templates (title, audience, notes)
  values ('Wochenstruktur Leistung', 'ab 15 Jahren',
          'Progressiver Block: Belastung alle 3 Wochen um ca. 2 % steigern.')
  returning id
)
insert into public.week_template_days (template_id, weekday, title, focus, starts_at, ends_at)
select pro.id, d.weekday, d.title, d.focus::public.training_focus, '11:00', '12:30'
from pro, (values
  (1, 'Kraft Unterkörper + Power', 'kraft'),
  (2, 'Zone 2 + Mobilität', 'ausdauer'),
  (3, 'Kraft Oberkörper + Core', 'kraft'),
  (4, 'Schnelligkeit + Agilität', 'schnelligkeit'),
  (5, 'Ganzkörperkraft + Power', 'power'),
  (6, 'Fussball + Technik/Taktik', 'technik')
) as d (weekday, title, focus);

alter table public.week_templates enable row level security;
alter table public.week_templates force row level security;
alter table public.week_template_days enable row level security;
alter table public.week_template_days force row level security;
revoke all on public.week_templates, public.week_template_days from anon;

-- Vorlagen sind Arbeitsmittel der Trainer; Familien sehen nur die daraus erstellten Pläne.
create policy week_templates_staff on public.week_templates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy week_template_days_staff on public.week_template_days for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Erstellt aus einer Vorlage einen Plan (Entwurf) mit allen Trainingstagen.
-- SECURITY INVOKER: RLS und Trigger für Pläne und Einheiten gelten unverändert.
create or replace function public.apply_week_template(p_template uuid, p_player uuid, p_week_start date, p_title text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_plan uuid := gen_random_uuid();
  tpl_notes text;
begin
  select notes into tpl_notes from public.week_templates where id = p_template;
  if not found then
    raise exception 'Vorlage nicht gefunden' using errcode = 'no_data_found';
  end if;

  insert into public.training_plans (id, player_id, title, week_start, notes)
  values (v_plan, p_player, p_title, p_week_start, tpl_notes);

  insert into public.training_sessions (plan_id, scheduled_on, title, notes, focus, starts_at, ends_at)
  select v_plan, p_week_start + (d.weekday - 1), d.title, d.notes, d.focus, d.starts_at, d.ends_at
  from public.week_template_days d
  where d.template_id = p_template;

  return v_plan;
end $$;
revoke execute on function public.apply_week_template(uuid, uuid, date, text) from anon, public;
grant execute on function public.apply_week_template(uuid, uuid, date, text) to authenticated;
