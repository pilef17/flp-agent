-- FLP Performance – Monatsplanung: Eltern melden pro Monat, ob ihr Kind aktiv trainiert oder pausiert,
-- und wählen die Tage, an denen sie ein Training wünschen.
-- Rein informativ für den Trainer; der Coaching-Zugang wird weiterhin nur vom Trainer gesteuert.

create table public.player_month_status (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  active boolean not null,
  reason text not null default '' check (reason in ('', 'ferien', 'verletzung', 'schule', 'anderes')),
  note text not null default '' check (char_length(note) <= 200),
  -- Wunschtermine der Eltern für Trainings in diesem Monat (nur bei aktiv)
  dates date[] not null default '{}' check (cardinality(dates) <= 31),
  set_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (player_id, month),
  check (active or reason <> ''),
  check (active or cardinality(dates) = 0)
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
