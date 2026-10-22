-- FLP Performance – Sicherheitsmodell
-- Grundsatz: Jede Berechtigung wird in der Datenbank (RLS) durchgesetzt.
-- Clientseitige Rollenprüfungen dienen nur der Darstellung.

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen (SECURITY DEFINER, damit RLS-Prüfungen nicht rekursiv werden)
-- ---------------------------------------------------------------------------
create or replace function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = r
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'coach')
  );
$$;

-- Admin oder aktiv zugewiesener Coach
create or replace function public.coaches_player(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.has_role('coach') and exists (
      select 1 from public.coach_player_links
      where player_id = p and coach_id = auth.uid() and status = 'active'
    )
  );
$$;

create or replace function public.is_guardian_of(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guardian_player_links
    where player_id = p and guardian_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_player_self(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.players where id = p and user_id = auth.uid()
  );
$$;

create or replace function public.can_view_player(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.coaches_player(p) or public.is_guardian_of(p) or public.is_player_self(p);
$$;

create or replace function public.has_entitlement(prod uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements
    where user_id = auth.uid() and product_id = prod
      and revoked_at is null
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  );
$$;

-- Hat der Benutzer (als Elternteil oder Spieler) einen aktiven Coaching-Kunden?
create or replace function public.has_coaching_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.players p
    join public.coach_player_links c on c.player_id = p.id and c.status = 'active'
    where not p.is_archived and (
      p.user_id = auth.uid() or exists (
        select 1 from public.guardian_player_links g
        where g.player_id = p.id and g.guardian_id = auth.uid() and g.status = 'active'
      )
    )
  );
$$;

create or replace function public.can_view_exercise(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.exercises x
    where x.id = e and x.status = 'published' and (
      public.has_coaching_access()
      or exists (
        select 1 from public.session_exercises se
        join public.training_sessions s on s.id = se.session_id
        join public.training_plans tp on tp.id = s.plan_id
        where se.exercise_id = e and tp.status = 'published'
          and public.can_view_player(tp.player_id)
      )
      or exists (
        select 1 from public.product_content pc
        where pc.exercise_id = e and public.has_entitlement(pc.product_id)
      )
    )
  );
$$;

create or replace function public.plan_player(plan uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select player_id from public.training_plans where id = plan;
$$;

create or replace function public.can_view_plan(plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.training_plans tp
    where tp.id = plan and (
      public.coaches_player(tp.player_id)
      or (tp.status = 'published' and public.can_view_player(tp.player_id))
    )
  );
$$;

create or replace function public.session_plan(sess uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select plan_id from public.training_sessions where id = sess;
$$;

create or replace function public.can_view_assessment(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments x
    where x.id = a and (
      public.coaches_player(x.player_id)
      or (x.status = 'published' and public.can_view_player(x.player_id))
    )
  );
$$;

create or replace function public.can_edit_assessment(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments x
    where x.id = a and x.status = 'draft' and public.coaches_player(x.player_id)
  );
$$;

-- Öffentliche Inhaltsübersicht eines aktiven Produkts (nur Titel, keine Inhalte)
create or replace function public.product_outline(prod uuid)
returns table (kind public.content_kind, title text, item_position smallint)
language sql stable security definer set search_path = '' as $$
  select pc.kind, pc.title, pc.position
  from public.product_content pc
  join public.products p on p.id = pc.product_id
  where pc.product_id = prod and (p.is_active or public.is_admin())
  order by pc.position, pc.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Audit-Log (nur Spaltennamen, keine Inhalte – Datenminimierung)
-- ---------------------------------------------------------------------------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changed text[];
  rec_id uuid;
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), '{}') into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
    if cardinality(changed) = 0 then
      return new;
    end if;
  end if;
  rec_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    rec_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('changed', changed) else '{}'::jsonb end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'user_roles', 'players', 'guardian_player_links', 'coach_player_links',
    'guardian_consents', 'assessments', 'coach_feedback', 'products',
    'entitlements', 'orders', 'privacy_requests'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auth-Integration: Profil bei Registrierung anlegen
-- Rollen kommen nie aus user_metadata (vom Benutzer änderbar), sondern nur aus
-- app_metadata (nur serverseitig mit Service-Key setzbar).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    new.email
  );
  insert into public.user_roles (user_id, role)
  values (
    new.id,
    case when new.raw_app_meta_data ->> 'flp_role' = 'player'
      then 'player'::public.app_role else 'parent'::public.app_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Coach, der einen Spieler erfasst, wird automatisch zugewiesen.
create or replace function public.link_creator_as_coach()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and public.is_staff() then
    insert into public.coach_player_links (coach_id, player_id)
    values (auth.uid(), new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger players_link_creator
  after insert on public.players
  for each row execute function public.link_creator_as_coach();

create or replace function public.set_created_by()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['players', 'guardian_player_links', 'exercises', 'training_plans'] loop
    execute format(
      'create trigger %I before insert on public.%I
         for each row execute function public.set_created_by()', t || '_created_by', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Unveränderlichkeit veröffentlichter Beurteilungen
-- ---------------------------------------------------------------------------
create or replace function public.guard_assessment()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Ausnahme: kaskadierende Löschung (Datenlöschung eines Spielers auf Antrag)
  if tg_op = 'DELETE' and old.status = 'published' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'published' then
    raise exception 'Veröffentlichte Beurteilungen können nicht verändert werden'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' then
    new.published_at := null;
    if new.status = 'published' then
      new.published_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.player_id <> old.player_id then
      raise exception 'Spieler kann nicht geändert werden' using errcode = 'check_violation';
    end if;
    if new.status = 'published' then
      new.published_at := now();
    end if;
    return new;
  end if;
  return old;
end $$;

create trigger assessments_guard
  before insert or update or delete on public.assessments
  for each row execute function public.guard_assessment();

create or replace function public.guard_assessment_score()
returns trigger language plpgsql set search_path = '' as $$
declare st public.publish_status;
begin
  select status into st from public.assessments
  where id = coalesce(new.assessment_id, old.assessment_id);
  -- Kaskadierende Löschung eines Spielers (Datenlöschung) bleibt möglich
  if st = 'published' and pg_trigger_depth() = 1 then
    raise exception 'Veröffentlichte Beurteilungen können nicht verändert werden'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;

create trigger assessment_scores_guard
  before insert or update or delete on public.assessment_scores
  for each row execute function public.guard_assessment_score();

create or replace function public.set_feedback_published_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;
  return new;
end $$;

create trigger coach_feedback_published_at
  before insert or update on public.coach_feedback
  for each row execute function public.set_feedback_published_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_roles', 'players', 'guardian_player_links', 'coach_player_links',
    'guardian_consents', 'exercises', 'exercise_media', 'training_plans',
    'training_sessions', 'session_exercises', 'session_completions',
    'assessment_categories', 'assessments', 'assessment_scores', 'coach_feedback',
    'products', 'product_content', 'orders', 'order_items', 'entitlements',
    'stripe_events', 'privacy_requests', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- Anonyme Benutzer haben grundsätzlich keinen Zugriff
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Interne Tabellen: nur Service-Rolle (Webhooks) und Trigger
revoke all on public.stripe_events from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.orders, public.order_items from authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;

-- user_roles: nur Administratoren vergeben Rollen
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_roles_insert on public.user_roles for insert to authenticated
  with check (public.is_admin());
create policy user_roles_delete on public.user_roles for delete to authenticated
  using (public.is_admin() and user_id <> auth.uid());

-- players
create policy players_select on public.players for select to authenticated
  using (public.can_view_player(id));
create policy players_insert on public.players for insert to authenticated
  with check (public.is_staff());
create policy players_update on public.players for update to authenticated
  using (public.coaches_player(id)) with check (public.coaches_player(id));
create policy players_delete on public.players for delete to authenticated
  using (public.is_admin());

-- guardian_player_links
create policy guardian_links_select on public.guardian_player_links for select to authenticated
  using (guardian_id = auth.uid() or public.coaches_player(player_id));
create policy guardian_links_insert on public.guardian_player_links for insert to authenticated
  with check (public.coaches_player(player_id));
create policy guardian_links_update on public.guardian_player_links for update to authenticated
  using (public.coaches_player(player_id)) with check (public.coaches_player(player_id));
create policy guardian_links_delete on public.guardian_player_links for delete to authenticated
  using (public.is_admin());

-- coach_player_links: Coaching-Zugang vergibt/entzieht nur der Administrator
create policy coach_links_select on public.coach_player_links for select to authenticated
  using (public.can_view_player(player_id));
create policy coach_links_insert on public.coach_player_links for insert to authenticated
  with check (public.is_admin());
create policy coach_links_update on public.coach_player_links for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy coach_links_delete on public.coach_player_links for delete to authenticated
  using (public.is_admin());

-- guardian_consents: nur anhängen, nie ändern
create policy consents_select on public.guardian_consents for select to authenticated
  using (guardian_id = auth.uid() or public.coaches_player(player_id));
create policy consents_insert on public.guardian_consents for insert to authenticated
  with check (guardian_id = auth.uid() and public.is_guardian_of(player_id));
revoke update, delete on public.guardian_consents from authenticated;

-- exercises & media
create policy exercises_select on public.exercises for select to authenticated
  using (public.can_view_exercise(id));
create policy exercises_insert on public.exercises for insert to authenticated
  with check (public.is_staff());
create policy exercises_update on public.exercises for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy exercises_delete on public.exercises for delete to authenticated
  using (public.is_admin());

create policy exercise_media_select on public.exercise_media for select to authenticated
  using (public.can_view_exercise(exercise_id));
create policy exercise_media_write on public.exercise_media for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- training_plans / sessions / session_exercises
create policy plans_select on public.training_plans for select to authenticated
  using (public.can_view_plan(id));
create policy plans_write on public.training_plans for all to authenticated
  using (public.coaches_player(player_id)) with check (public.coaches_player(player_id));

create policy sessions_select on public.training_sessions for select to authenticated
  using (public.can_view_plan(plan_id));
create policy sessions_write on public.training_sessions for all to authenticated
  using (public.coaches_player(public.plan_player(plan_id)))
  with check (public.coaches_player(public.plan_player(plan_id)));

create policy session_exercises_select on public.session_exercises for select to authenticated
  using (public.can_view_plan(public.session_plan(session_id)));
create policy session_exercises_write on public.session_exercises for all to authenticated
  using (public.coaches_player(public.plan_player(public.session_plan(session_id))))
  with check (public.coaches_player(public.plan_player(public.session_plan(session_id))));

-- session_completions: Spieler selbst oder Elternteil, nur bei veröffentlichtem Plan
create policy completions_select on public.session_completions for select to authenticated
  using (public.can_view_plan(public.session_plan(session_id)));
create policy completions_insert on public.session_completions for insert to authenticated
  with check (
    completed_by = auth.uid()
    and exists (
      select 1 from public.training_sessions s
      join public.training_plans tp on tp.id = s.plan_id
      where s.id = session_id and tp.status = 'published'
        and (public.is_player_self(tp.player_id) or public.is_guardian_of(tp.player_id))
    )
    and (
      session_exercise_id is null or exists (
        select 1 from public.session_exercises se
        where se.id = session_exercise_id and se.session_id = session_completions.session_id
      )
    )
  );
create policy completions_delete on public.session_completions for delete to authenticated
  using (completed_by = auth.uid());

-- assessment_categories: Referenzdaten
create policy categories_select on public.assessment_categories for select to authenticated
  using (true);
revoke insert, update, delete on public.assessment_categories from authenticated;

-- assessments & scores
create policy assessments_select on public.assessments for select to authenticated
  using (public.can_view_assessment(id));
create policy assessments_insert on public.assessments for insert to authenticated
  with check (public.coaches_player(player_id) and coach_id = auth.uid());
create policy assessments_update on public.assessments for update to authenticated
  using (public.coaches_player(player_id)) with check (public.coaches_player(player_id));
create policy assessments_delete on public.assessments for delete to authenticated
  using (public.coaches_player(player_id));

create policy scores_select on public.assessment_scores for select to authenticated
  using (public.can_view_assessment(assessment_id));
create policy scores_write on public.assessment_scores for all to authenticated
  using (public.can_edit_assessment(assessment_id))
  with check (public.can_edit_assessment(assessment_id));

-- coach_feedback: Eltern/Spieler sehen nur freigegebenes Feedback
create policy feedback_select on public.coach_feedback for select to authenticated
  using (
    public.coaches_player(player_id)
    or (status = 'published' and public.can_view_player(player_id))
  );
create policy feedback_write on public.coach_feedback for all to authenticated
  using (public.coaches_player(player_id)) with check (public.coaches_player(player_id));

-- products: aktive Produkte sind öffentlich sichtbar (Katalog)
grant select on public.products to anon;
create policy products_select_anon on public.products for select to anon
  using (is_active);
create policy products_select on public.products for select to authenticated
  using (is_active or public.is_admin());
create policy products_write on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy product_content_select on public.product_content for select to authenticated
  using (public.is_admin() or public.has_entitlement(product_id));
create policy product_content_write on public.product_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- orders: nur lesen; geschrieben wird ausschliesslich serverseitig (Service-Rolle)
create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
  ));

-- entitlements: Käufe via Service-Rolle; manuelle Freigaben nur durch Admin
create policy entitlements_select on public.entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy entitlements_insert on public.entitlements for insert to authenticated
  with check (public.is_admin() and source = 'manual' and granted_by = auth.uid());
create policy entitlements_update on public.entitlements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.entitlements from authenticated;

-- privacy_requests
create policy privacy_select on public.privacy_requests for select to authenticated
  using (requester_id = auth.uid() or public.is_admin());
create policy privacy_insert on public.privacy_requests for insert to authenticated
  with check (
    requester_id = auth.uid() and status = 'open'
    and (player_id is null or public.is_guardian_of(player_id))
  );
create policy privacy_update on public.privacy_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.privacy_requests from authenticated;

-- audit_logs: nur Administratoren lesen
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin());

-- Hilfsfunktionen nicht für anonyme Aufrufe freigeben
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
grant execute on function public.product_outline(uuid) to anon;
