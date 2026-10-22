-- FLP Performance – Storage-Buckets und Richtlinien
-- Videos von Übungen, Programmen und Spielern sind privat und werden nur über
-- zeitlich begrenzte Signed URLs ausgeliefert.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('exercise-media', 'exercise-media', false, 524288000, array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']),
  ('program-media', 'program-media', false, 524288000, array['video/mp4', 'video/webm', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('player-media', 'player-media', false, 524288000, array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png']),
  ('product-covers', 'product-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.try_uuid(t text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- Letzte Erklärung eines Elternteils für eine Einwilligungsart
create or replace function public.has_consent(p uuid, c public.consent_type)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select granted from public.guardian_consents
    where player_id = p and consent_type = c
    order by created_at desc limit 1
  ), false);
$$;
revoke execute on function public.has_consent(uuid, public.consent_type) from anon, public;
grant execute on function public.has_consent(uuid, public.consent_type) to authenticated;
revoke execute on function public.try_uuid(text) from anon, public;
grant execute on function public.try_uuid(text) to authenticated;

-- exercise-media
create policy "exercise media read" on storage.objects for select to authenticated
  using (
    bucket_id = 'exercise-media' and (
      public.is_staff() or exists (
        select 1 from public.exercise_media m
        where m.storage_path = name and public.can_view_exercise(m.exercise_id)
      )
    )
  );
create policy "exercise media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-media' and public.is_staff());
create policy "exercise media update" on storage.objects for update to authenticated
  using (bucket_id = 'exercise-media' and public.is_staff());
create policy "exercise media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-media' and public.is_staff());

-- program-media
create policy "program media read" on storage.objects for select to authenticated
  using (
    bucket_id = 'program-media' and (
      public.is_admin() or exists (
        select 1 from public.product_content pc
        where pc.storage_path = name and public.has_entitlement(pc.product_id)
      )
    )
  );
create policy "program media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'program-media' and public.is_admin());
create policy "program media update" on storage.objects for update to authenticated
  using (bucket_id = 'program-media' and public.is_admin());
create policy "program media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'program-media' and public.is_admin());

-- player-media: Pfad '<player_id>/<datei>'; nur zuständige Coaches und Eltern
create policy "player media read" on storage.objects for select to authenticated
  using (
    bucket_id = 'player-media'
    and (public.coaches_player(public.try_uuid(split_part(name, '/', 1)))
      or public.is_guardian_of(public.try_uuid(split_part(name, '/', 1))))
  );
create policy "player media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'player-media'
    and public.coaches_player(public.try_uuid(split_part(name, '/', 1)))
    and public.has_consent(public.try_uuid(split_part(name, '/', 1)), 'video_recording')
  );
create policy "player media delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'player-media'
    and public.coaches_player(public.try_uuid(split_part(name, '/', 1)))
  );

-- product-covers: öffentlich lesbar (Bucket ist public), schreiben nur Admin
create policy "product covers insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-covers' and public.is_admin());
create policy "product covers update" on storage.objects for update to authenticated
  using (bucket_id = 'product-covers' and public.is_admin());
create policy "product covers delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-covers' and public.is_admin());
