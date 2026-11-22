-- FLP Performance – Monatsplanung: Eltern melden pro Monat, ob ihr Kind aktiv trainiert oder pausiert,
-- und schlagen Trainingstermine mit Wunschzeit vor, die der Trainer bestätigt.
-- Rein informativ für den Trainer; der Coaching-Zugang wird weiterhin nur vom Trainer gesteuert.

create table public.player_month_status (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  active boolean not null,
  reason text not null default '' check (reason in ('', 'ferien', 'verletzung', 'schule', 'anderes')),
  note text not null default '' check (char_length(note) <= 200),
  set_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (player_id, month),
  check (active or reason <> '')
);
create index player_month_status_month_idx on public.player_month_status (month);

alter table public.player_month_status enable row level security;
alter table public.player_month_status force row level security;

-- Lesen: verknüpfte Eltern und Trainer/Admin
create policy month_status_select on public.player_month_status for select to authenticated
  using (public.is_guardian_of(player_id) or public.coaches_player(player_id));
-- Melden/ändern: verknüpfte Eltern (und Admin/Coach des Spielers), immer im eigenen Namen
create policy month_status_insert on public.player_month_status for insert to authenticated
  with check (set_by = auth.uid() and (public.is_guardian_of(player_id) or public.coaches_player(player_id)));
create policy month_status_update on public.player_month_status for update to authenticated
  using (public.is_guardian_of(player_id) or public.coaches_player(player_id))
  with check (set_by = auth.uid() and (public.is_guardian_of(player_id) or public.coaches_player(player_id)));
create policy month_status_delete on public.player_month_status for delete to authenticated
  using (public.is_admin());

revoke all on public.player_month_status from anon;

create trigger player_month_status_audit after insert or update or delete on public.player_month_status
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Trainingsanfragen: Eltern schlagen Tag, Wunschzeit und Ort vor, der Trainer bestätigt.
-- ---------------------------------------------------------------------------
create table public.training_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  day date not null,
  wish_times text not null check (char_length(wish_times) between 1 and 60),
  location text not null default '' check (char_length(location) <= 60),
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'angefragt' check (status in ('angefragt', 'bestaetigt', 'abgelehnt', 'erledigt')),
  confirmed_time text not null default '' check (char_length(confirmed_time) <= 20),
  coach_note text not null default '' check (char_length(coach_note) <= 200),
  requested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, day)
);
create index training_requests_day_idx on public.training_requests (day);

alter table public.training_requests enable row level security;
alter table public.training_requests force row level security;

-- Lesen: verknüpfte Eltern und Trainer/Admin
create policy training_requests_select on public.training_requests for select to authenticated
  using (public.is_guardian_of(player_id) or public.coaches_player(player_id));
-- Eltern stellen Anfragen im eigenen Namen, immer als «angefragt» ohne Trainer-Angaben
create policy training_requests_insert on public.training_requests for insert to authenticated
  with check (
    public.is_guardian_of(player_id) and requested_by = auth.uid()
    and status = 'angefragt' and confirmed_time = '' and coach_note = ''
  );
-- Bestätigen, absagen, erledigt: nur Trainer/Admin des Spielers
create policy training_requests_update on public.training_requests for update to authenticated
  using (public.coaches_player(player_id))
  with check (public.coaches_player(player_id));
-- Eltern ziehen offene Anfragen zurück; Admin darf alles löschen
create policy training_requests_delete on public.training_requests for delete to authenticated
  using ((public.is_guardian_of(player_id) and status = 'angefragt') or public.is_admin());

revoke all on public.training_requests from anon;

create trigger training_requests_audit after insert or update or delete on public.training_requests
  for each row execute function public.audit_row();
