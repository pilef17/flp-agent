-- FLP Performance – Sicherheitsreview: Profile nur bei Bedarf sichtbar
-- Vorher durfte jeder Coach alle Profile (Name, E-Mail, Telefon aller Eltern) lesen.
-- Neu: Admin sieht alle; ein Coach nur Eltern und Spieler-Logins seiner Spieler sowie
-- Coaches, die dieselben Spieler betreuen. Alle anderen nur das eigene Profil.

create or replace function public.can_view_profile(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p = auth.uid()
    or public.is_admin()
    or (
      public.has_role('coach') and (
        exists (
          select 1 from public.guardian_player_links g
          where g.guardian_id = p and g.status = 'active' and public.coaches_player(g.player_id)
        )
        or exists (
          select 1 from public.players pl
          where pl.user_id = p and public.coaches_player(pl.id)
        )
        or exists (
          select 1 from public.coach_player_links c
          where c.coach_id = p and c.status = 'active' and public.coaches_player(c.player_id)
        )
      )
    );
$$;
revoke execute on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));
