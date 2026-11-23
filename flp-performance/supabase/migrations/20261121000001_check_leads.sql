-- FLP Performance – Spieler-Check: Kontaktanfragen von Eltern
-- Eltern füllen den Check ohne Login aus. Nur wer ausdrücklich zustimmt, hinterlässt Kontaktdaten.
-- Geschrieben wird nur über den Server (Service-Rolle, nach Validierung); lesen und löschen dürfen Admin/Coach.

create table public.check_leads (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null check (char_length(parent_name) between 2 and 80),
  email text not null check (char_length(email) between 5 and 254 and email = lower(email)),
  child_age smallint check (child_age between 4 and 20),
  position text not null default '' check (char_length(position) <= 40),
  level text not null check (level in ('einsteiger', 'mittel', 'fortgeschritten')),
  score smallint not null check (score between 0 and 24),
  technik smallint not null check (technik between 0 and 12),
  taktik smallint not null check (taktik between 0 and 12),
  answers smallint[] not null check (cardinality(answers) = 12),
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index check_leads_created_idx on public.check_leads (created_at desc);

alter table public.check_leads enable row level security;
alter table public.check_leads force row level security;

create policy check_leads_select on public.check_leads for select to authenticated
  using (public.is_staff());
create policy check_leads_delete on public.check_leads for delete to authenticated
  using (public.is_staff());
-- Kein insert/update für anon/authenticated: Schreiben nur über die Service-Rolle.

revoke all on public.check_leads from anon;
revoke insert, update on public.check_leads from authenticated;
