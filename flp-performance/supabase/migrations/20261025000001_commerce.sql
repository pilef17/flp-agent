-- FLP Performance – Shop: Bestellabwicklung (Phase 4)
-- Alle zahlungsrelevanten Schreibvorgänge laufen über diese Funktionen und nur mit
-- der Service-Rolle (Stripe-Webhook / Checkout-Erstellung). Clients können weder
-- Bestellungen anlegen noch als bezahlt markieren.

-- Mindestbetrag von Stripe für CHF: 0.50
alter table public.products drop constraint products_price_cents_check;
alter table public.products add constraint products_price_cents_check
  check (price_cents >= 50 and price_cents <= 100000000);

alter table public.orders add column failure_reason text;
alter table public.orders add column refunded_at timestamptz;
create index orders_status_idx on public.orders (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Bestellung anlegen (vor dem Weiterleiten zu Stripe)
-- ---------------------------------------------------------------------------
create or replace function public.create_pending_order(p_user uuid, p_product uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  prod public.products%rowtype;
  oid uuid;
begin
  select * into prod from public.products where id = p_product and is_active;
  if not found then
    raise exception 'Produkt nicht verfügbar' using errcode = 'P0002';
  end if;
  insert into public.orders (user_id, status, total_cents, currency)
  values (p_user, 'pending', prod.price_cents, prod.currency)
  returning id into oid;
  insert into public.order_items (order_id, product_id, title_snapshot, unit_price_cents, access_days_snapshot)
  values (oid, prod.id, prod.title, prod.price_cents, prod.access_days);
  return oid;
end $$;

-- ---------------------------------------------------------------------------
-- Erfolgreiche Zahlung verbuchen – atomar und idempotent.
-- Rückgabe: 'fulfilled' | 'duplicate' | 'unknown_order' | 'mismatch' | 'not_pending'
-- ---------------------------------------------------------------------------
create or replace function public.fulfill_checkout(
  p_event_id text,
  p_event_type text,
  p_order_id uuid,
  p_session_id text,
  p_payment_intent text,
  p_amount_total integer,
  p_currency text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  -- Idempotenz: jedes Stripe-Event nur einmal verarbeiten
  insert into public.stripe_events (id, type) values (p_event_id, p_event_type)
  on conflict (id) do nothing;
  if not found then
    return 'duplicate';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return 'unknown_order';
  end if;
  if o.stripe_checkout_session_id is distinct from p_session_id
     or o.total_cents <> p_amount_total
     or lower(p_currency) <> lower(o.currency) then
    update public.orders set failure_reason = 'Betrag, Währung oder Session stimmen nicht überein'
    where id = o.id;
    return 'mismatch';
  end if;
  if o.status = 'paid' then
    return 'duplicate';
  end if;
  if o.status not in ('pending', 'failed', 'canceled') then
    return 'not_pending';
  end if;

  update public.orders
  set status = 'paid', paid_at = now(), stripe_payment_intent_id = p_payment_intent, failure_reason = null
  where id = o.id;

  insert into public.entitlements (user_id, product_id, source, order_id, starts_at, ends_at)
  select o.user_id, oi.product_id, 'purchase', o.id, now(),
         case when oi.access_days_snapshot is null then null
              else now() + make_interval(days => oi.access_days_snapshot) end
  from public.order_items oi
  where oi.order_id = o.id
  on conflict (order_id, product_id) where order_id is not null do nothing;

  return 'fulfilled';
end $$;

-- ---------------------------------------------------------------------------
-- Statuswechsel ohne Zugang: abgelaufen, fehlgeschlagen, rückerstattet
-- ---------------------------------------------------------------------------
create or replace function public.update_order_from_stripe(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_payment_intent text,
  p_status public.order_status
) returns text language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  insert into public.stripe_events (id, type) values (p_event_id, p_event_type)
  on conflict (id) do nothing;
  if not found then
    return 'duplicate';
  end if;

  select * into o from public.orders
  where (p_session_id is not null and stripe_checkout_session_id = p_session_id)
     or (p_payment_intent is not null and stripe_payment_intent_id = p_payment_intent)
  limit 1
  for update;
  if not found then
    return 'unknown_order';
  end if;

  if p_status = 'refunded' then
    if o.status <> 'paid' then
      return 'not_paid';
    end if;
    update public.orders set status = 'refunded', refunded_at = now() where id = o.id;
    update public.entitlements set revoked_at = now()
    where order_id = o.id and revoked_at is null;
    return 'refunded';
  end if;

  -- Eine bezahlte Bestellung wird nie durch spätere Events zurückgestuft
  if o.status <> 'pending' then
    return 'ignored';
  end if;
  update public.orders set status = p_status where id = o.id;
  return p_status::text;
end $$;

-- Nur die Service-Rolle darf diese Funktionen aufrufen
revoke execute on function public.create_pending_order(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.fulfill_checkout(text, text, uuid, text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.update_order_from_stripe(text, text, text, text, public.order_status) from public, anon, authenticated;
grant execute on function public.create_pending_order(uuid, uuid) to service_role;
grant execute on function public.fulfill_checkout(text, text, uuid, text, text, integer, text) to service_role;
grant execute on function public.update_order_from_stripe(text, text, text, text, public.order_status) to service_role;

-- Programmdateien liegen im Ordner ihres Produkts
alter table public.product_content
  add constraint product_content_path_check check (storage_path is null or storage_path like product_id::text || '/%');
-- Titelbild im Ordner des Produkts
alter table public.products
  add constraint products_cover_path_check check (cover_image_path is null or cover_image_path like id::text || '/%');
