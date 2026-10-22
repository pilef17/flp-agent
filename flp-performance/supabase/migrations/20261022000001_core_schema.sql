-- FLP Performance – Kernschema
-- Alle Primärschlüssel sind UUIDs. Personenbezogene Daten werden minimal gehalten
-- (z.B. nur Geburtsjahr statt Geburtsdatum).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'coach', 'parent', 'player');
create type public.link_status as enum ('active', 'revoked');
create type public.consent_type as enum (
  'data_processing',      -- Bearbeitung der Personendaten des Kindes
  'video_recording',      -- Aufnahme von Trainingsvideos des Kindes
  'player_account'        -- eigenes Login für das Kind
);
create type public.publish_status as enum ('draft', 'published');
create type public.assessment_kind as enum ('initial', 'regular');
create type public.exercise_category as enum (
  'technik', 'ballkontrolle', 'dribbling', 'koordination', 'schnelligkeit',
  'kraft', 'stabilitaet', 'beweglichkeit', 'wahrnehmung', 'entscheidungsfaehigkeit'
);
create type public.media_kind as enum ('video', 'image');
create type public.order_status as enum ('pending', 'paid', 'failed', 'canceled', 'refunded');
create type public.entitlement_source as enum ('purchase', 'manual');
create type public.content_kind as enum ('exercise', 'article', 'video');
create type public.privacy_request_type as enum ('export', 'deletion', 'correction');
create type public.privacy_request_status as enum ('open', 'in_progress', 'completed', 'rejected');

-- ---------------------------------------------------------------------------
-- Generischer updated_at-Trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Benutzer und Rollen
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text,
  phone text check (char_length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------------
-- Spieler und Beziehungen
-- ---------------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  -- optionales Login des Spielers (nur mit Einwilligung der Eltern)
  user_id uuid unique references public.profiles (id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  birth_year smallint not null check (birth_year between 2000 and 2100),
  position text check (char_length(position) <= 60),
  dominant_foot text check (dominant_foot in ('links', 'rechts', 'beidfuessig')),
  club text check (char_length(club) <= 120),
  is_archived boolean not null default false,
  -- Testdaten sind klar von echten Kundendaten getrennt
  is_test_data boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();
create index players_name_idx on public.players (last_name, first_name);

create table public.guardian_player_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  relationship text not null default 'Elternteil' check (char_length(relationship) <= 40),
  status public.link_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (guardian_id, player_id)
);
create index guardian_links_player_idx on public.guardian_player_links (player_id);

-- Coaching-Zugang: aktiver Link = Spieler ist Coaching-Kunde
create table public.coach_player_links (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  status public.link_status not null default 'active',
  started_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now(),
  unique (coach_id, player_id)
);
create index coach_links_player_idx on public.coach_player_links (player_id);

-- Einwilligungen werden nie überschrieben: jede Änderung ist ein neuer Datensatz.
create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  consent_type public.consent_type not null,
  granted boolean not null,
  policy_version text not null check (char_length(policy_version) <= 20),
  created_at timestamptz not null default now()
);
create index guardian_consents_lookup_idx
  on public.guardian_consents (player_id, consent_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Übungen
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2,4}-[0-9]{3}$'), -- z.B. TEC-001
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  category public.exercise_category not null,
  age_min smallint not null default 6 check (age_min between 4 and 18),
  age_max smallint not null default 14 check (age_max between 4 and 18),
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  sets smallint check (sets between 1 and 50),
  repetitions smallint check (repetitions between 1 and 500),
  duration_seconds integer check (duration_seconds between 1 and 7200),
  rest_seconds integer check (rest_seconds between 0 and 3600),
  coaching_instructions text not null default '',
  safety_notes text not null default '',
  status public.publish_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min <= age_max)
);
create trigger exercises_touch before update on public.exercises
  for each row execute function public.touch_updated_at();
create index exercises_category_idx on public.exercises (category);

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  kind public.media_kind not null default 'video',
  storage_path text not null unique, -- Pfad im privaten Bucket 'exercise-media'
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index exercise_media_exercise_idx on public.exercise_media (exercise_id);

-- ---------------------------------------------------------------------------
-- Trainingsplanung
-- ---------------------------------------------------------------------------
create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  week_start date not null check (extract(isodow from week_start) = 1), -- Montag
  notes text not null default '',
  status public.publish_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger training_plans_touch before update on public.training_plans
  for each row execute function public.touch_updated_at();
create index training_plans_player_idx on public.training_plans (player_id, week_start desc);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  scheduled_on date not null,
  title text not null check (char_length(title) between 2 and 120),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index training_sessions_plan_idx on public.training_sessions (plan_id, scheduled_on);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,
  sets smallint check (sets between 1 and 50),
  repetitions smallint check (repetitions between 1 and 500),
  duration_seconds integer check (duration_seconds between 1 and 7200),
  rest_seconds integer check (rest_seconds between 0 and 3600),
  notes text not null default ''
);
create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);

create table public.session_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  -- null = ganze Einheit abgeschlossen, sonst einzelne Übung
  session_exercise_id uuid references public.session_exercises (id) on delete cascade,
  completed_by uuid not null references public.profiles (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 500),
  completed_at timestamptz not null default now()
);
create unique index session_completions_unique_idx
  on public.session_completions (session_id, coalesce(session_exercise_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------------
-- Entwicklung: Beurteilungen und Feedback
-- ---------------------------------------------------------------------------
create table public.assessment_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position smallint not null unique
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  coach_id uuid references public.profiles (id) on delete set null,
  kind public.assessment_kind not null default 'regular',
  assessed_on date not null default current_date,
  coach_notes text not null default '' check (char_length(coach_notes) <= 4000),
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index assessments_player_idx on public.assessments (player_id, assessed_on desc);
-- pro Spieler genau eine Erstbeurteilung
create unique index assessments_one_initial_idx
  on public.assessments (player_id) where kind = 'initial';

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  category_id uuid not null references public.assessment_categories (id) on delete restrict,
  score smallint check (score between 1 and 5), -- null = nicht beurteilt
  note text not null default '' check (char_length(note) <= 1000),
  unique (assessment_id, category_id)
);

create table public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 1 and 6000),
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_feedback_touch before update on public.coach_feedback
  for each row execute function public.touch_updated_at();
create index coach_feedback_player_idx on public.coach_feedback (player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Digitale Programme / Shop
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(title) between 2 and 120),
  summary text not null default '' check (char_length(summary) <= 300),
  description text not null default '',
  cover_image_path text, -- öffentlicher Bucket 'product-covers'
  price_cents integer not null check (price_cents >= 0 and price_cents <= 100000000),
  currency text not null default 'CHF' check (currency = 'CHF'),
  access_days integer check (access_days between 1 and 3650), -- null = unbefristet
  is_active boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_content (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.content_kind not null,
  title text not null check (char_length(title) between 2 and 160),
  body text not null default '',
  exercise_id uuid references public.exercises (id) on delete cascade,
  storage_path text, -- privater Bucket 'program-media'
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  check (kind <> 'exercise' or exercise_id is not null)
);
create index product_content_product_idx on public.product_content (product_id, position);
create index product_content_exercise_idx on public.product_content (exercise_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'pending',
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'CHF',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  title_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity smallint not null default 1 check (quantity = 1),
  access_days_snapshot integer,
  unique (order_id, product_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  source public.entitlement_source not null,
  order_id uuid references public.orders (id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (source <> 'purchase' or order_id is not null)
);
create index entitlements_user_idx on public.entitlements (user_id);
-- Idempotenz: pro Bestellung und Produkt höchstens eine Berechtigung
create unique index entitlements_order_product_idx
  on public.entitlements (order_id, product_id) where order_id is not null;

-- Verarbeitete Stripe-Events (Idempotenz der Webhooks)
create table public.stripe_events (
  id text primary key, -- Stripe event id (evt_...)
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Datenschutz und Audit
-- ---------------------------------------------------------------------------
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid references public.players (id) on delete set null,
  request_type public.privacy_request_type not null,
  details text not null default '' check (char_length(details) <= 2000),
  status public.privacy_request_status not null default 'open',
  resolution_note text not null default '',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index privacy_requests_status_idx on public.privacy_requests (status, created_at);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, -- bewusst ohne FK: Log bleibt bei Kontolöschung erhalten
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Referenzdaten: die acht Kompetenzen
-- ---------------------------------------------------------------------------
insert into public.assessment_categories (slug, name, position) values
  ('technik', 'Technik', 1),
  ('koordination', 'Koordination', 2),
  ('schnelligkeit', 'Schnelligkeit', 3),
  ('antritt', 'Antritt & Beschleunigung', 4),
  ('spielverstaendnis', 'Spielverständnis', 5),
  ('entscheidungsfaehigkeit', 'Entscheidungsfähigkeit', 6),
  ('kraft', 'Kraft & Körperstabilität', 7),
  ('ausdauer', 'Ausdauer & Belastbarkeit', 8);

-- Initiale Produktkonzepte: inaktiv, bis der Administrator Inhalte erfasst und sie freischaltet.
insert into public.products (slug, title, summary, price_cents, position) values
  ('flp-nutrition', 'FLP Nutrition', 'Allgemeine Ernährungsbildung für junge Fussballer und ihre Eltern.', 1900, 1),
  ('flp-training', 'FLP Training', 'Trainingspläne und Instruktionsvideos für das individuelle Training.', 3900, 2),
  ('flp-complete', 'FLP Complete', 'Training, Ernährungsbildung und mentale Leistungsfähigkeit.', 5900, 3);
