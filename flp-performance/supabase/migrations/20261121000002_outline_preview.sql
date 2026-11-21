-- FLP Performance – Öffentliche Inhaltsübersicht nur als Vorschau
-- Ohne Kauf liefert product_outline weiterhin alle Zeilen (für die Anzahl je Art),
-- aber nur die ersten 3 Titel. Käufer und Admin sehen alle Titel.

create or replace function public.product_outline(prod uuid)
returns table (kind public.content_kind, title text, item_position smallint)
language sql stable security definer set search_path = '' as $$
  select o.kind,
         case when o.rn <= 3 or public.is_admin() or public.has_entitlement(prod) then o.title end,
         o.position
  from (
    select pc.kind, pc.title, pc.position,
           row_number() over (order by pc.position, pc.created_at) as rn
    from public.product_content pc
    join public.products p on p.id = pc.product_id
    where pc.product_id = prod and (p.is_active or public.is_admin())
  ) o
  order by o.rn;
$$;

grant execute on function public.product_outline(uuid) to anon, authenticated;
