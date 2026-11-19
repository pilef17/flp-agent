-- FLP Performance – Wochenfrage: Alter und Team des Athleten
-- Nullable, damit bestehende Antworten gültig bleiben; das Formular verlangt beide Angaben.
alter table public.weekly_answers
  add column athlete_age smallint check (athlete_age between 4 and 30),
  add column team text check (char_length(team) between 2 and 60);
