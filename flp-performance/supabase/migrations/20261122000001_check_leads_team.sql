-- FLP Performance – Spieler-Check: Verein/Team des Kindes (freiwillig)
alter table public.check_leads
  add column if not exists team text not null default '' check (char_length(team) <= 60);
