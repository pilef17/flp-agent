-- FLP Performance – Positionsprogramme: strukturierte Trainingseinheiten als Programminhalt

-- Neue Inhaltsart «session» (Einheit mit Zielen und Übungen als JSON)
alter type public.content_kind add value if not exists 'session';

alter table public.product_content
  add column data jsonb,
  -- kind::text, weil der neue Enum-Wert in derselben Transaktion noch nicht verwendet werden darf
  add constraint product_content_session_check check (
    kind::text <> 'session' or (data is not null and jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000)
  );

-- Importiert ein Programm (Produkt + Einheiten) in einer Transaktion.
-- Neues Produkt: inaktiv, mit Preis und Laufzeit aus dem Import.
-- Bestehendes Produkt (gleicher Slug): Texte werden aktualisiert, Preis, Laufzeit und Sichtbarkeit bleiben,
-- die Einheiten werden ersetzt. Andere Inhalte (Lektionen, Videos) bleiben unverändert.
create or replace function public.import_program_product(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_sessions jsonb := coalesce(p->'sessions', '[]'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Nur Administratoren dürfen Programme importieren' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(v_sessions) <> 'array' or jsonb_array_length(v_sessions) = 0 or jsonb_array_length(v_sessions) > 60 then
    raise exception 'Ein Programm braucht 1 bis 60 Einheiten' using errcode = 'check_violation';
  end if;

  select id into v_id from public.products where slug = p->>'slug';
  if v_id is null then
    insert into public.products (slug, title, summary, description, price_cents, access_days, position)
    values (
      p->>'slug', p->>'title', coalesce(p->>'summary', ''), coalesce(p->>'description', ''),
      (p->>'price_cents')::integer, nullif(p->>'access_days', '')::integer, coalesce((p->>'position')::smallint, 0)
    )
    returning id into v_id;
  else
    update public.products
    set title = p->>'title', summary = coalesce(p->>'summary', ''), description = coalesce(p->>'description', '')
    where id = v_id;
  end if;

  delete from public.product_content where product_id = v_id and kind::text = 'session';
  insert into public.product_content (product_id, kind, title, data, position)
  select v_id, 'session'::public.content_kind, s.value->>'title', s.value->'data', s.ordinality::smallint
  from jsonb_array_elements(v_sessions) with ordinality as s;

  return v_id;
end $$;
revoke execute on function public.import_program_product(jsonb) from anon, public;
grant execute on function public.import_program_product(jsonb) to authenticated;
