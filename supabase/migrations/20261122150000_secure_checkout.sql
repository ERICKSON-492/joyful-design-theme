-- Secure checkout for the Supabase cutover.
-- Browser totals are advisory only; this function calculates the order from live rows.

create or replace function public.check_stock_before_order()
returns trigger
language plpgsql
as $$
declare
  item jsonb;
  available_stock integer;
  requested_qty integer;
  product_name text;
  item_id text;
  product_id uuid;
  variant_label text;
begin
  for item in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    item_id := item->>'id';
    requested_qty := coalesce((item->>'quantity')::integer, 0);
    if item_id like '%::%' then
      product_id := split_part(item_id, '::', 1)::uuid;
      variant_label := split_part(item_id, '::', 2);
      select pv.stock, p.name into available_stock, product_name
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.product_id = product_id and pv.variant_label = variant_label and pv.is_active = true;
    else
      product_id := item_id::uuid;
      select stock, name into available_stock, product_name
      from public.products where id = product_id and is_active = true;
    end if;
    if available_stock is null then raise exception 'Product or variant not found: %', item_id; end if;
    if requested_qty <= 0 then raise exception 'Invalid quantity for %', item_id; end if;
    if requested_qty > available_stock then
      raise exception 'Not enough stock for "%". Available: %, Requested: %', product_name, available_stock, requested_qty;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.create_order_secure(
  p_phone text,
  p_customer_name text,
  p_email text,
  p_items jsonb,
  p_shipping_method_id uuid,
  p_shipping_address jsonb,
  p_coupon_code text default null,
  p_status text default 'pending',
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  item jsonb;
  item_id text;
  product_id uuid;
  variant_label text;
  quantity integer;
  product_name text;
  unit_price numeric;
  available_stock integer;
  canonical_items jsonb := '[]'::jsonb;
  subtotal numeric := 0;
  shipping_price numeric := 0;
  shipping_name text;
  coupon_result jsonb := null;
  discount numeric := 0;
  final_total numeric;
  new_order public.orders;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty'; end if;
  if p_status not in ('pending', 'confirmed') then p_status := 'pending'; end if;

  if p_shipping_method_id is not null then
    select name, price into shipping_name, shipping_price
    from public.shipping_methods
    where id = p_shipping_method_id and is_active = true;
    if shipping_name is null then raise exception 'Shipping method is unavailable'; end if;
  else
    shipping_price := 0;
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    item_id := item->>'id';
    quantity := coalesce((item->>'quantity')::integer, 0);
    if item_id is null or quantity <= 0 then raise exception 'Invalid cart item'; end if;

    if item_id like '%::%' then
      product_id := split_part(item_id, '::', 1)::uuid;
      variant_label := split_part(item_id, '::', 2);
      select p.name || ' · ' || pv.variant_label, pv.price, pv.stock
      into product_name, unit_price, available_stock
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.product_id = product_id and pv.variant_label = variant_label
        and pv.is_active = true and p.is_active = true
      for update of pv;
    else
      product_id := item_id::uuid;
      select name, coalesce(
        case when sale_price is not null
          and (sale_starts_at is null or sale_starts_at <= now())
          and (sale_ends_at is null or sale_ends_at >= now())
        then sale_price else price end, price), stock
      into product_name, unit_price, available_stock
      from public.products
      where id = product_id and is_active = true
      for update;
    end if;

    if product_name is null or unit_price is null then raise exception 'Product or variant unavailable: %', item_id; end if;
    if quantity > available_stock then raise exception 'Not enough stock for "%". Available: %, Requested: %', product_name, available_stock, quantity; end if;
    subtotal := subtotal + (unit_price * quantity);
    canonical_items := canonical_items || jsonb_build_array(jsonb_build_object(
      'id', item_id, 'name', product_name, 'price', unit_price, 'quantity', quantity
    ));
  end loop;

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    coupon_result := public.validate_coupon(btrim(p_coupon_code), subtotal);
    if coalesce((coupon_result->>'valid')::boolean, false) then
      discount := coalesce((coupon_result->>'discount_amount')::numeric, 0);
    else
      raise exception '%', coalesce(coupon_result->>'message', 'Invalid coupon');
    end if;
  end if;
  final_total := greatest(round(subtotal - discount + coalesce(shipping_price, 0)), 0);

  insert into public.orders (
    phone, customer_name, email, total_amount, status, items, user_id,
    shipping_address, shipping_method, shipping_cost, latitude, longitude,
    coupon_code, discount_amount, stock_decremented
  ) values (
    p_phone, p_customer_name, nullif(p_email, ''), final_total, p_status, canonical_items, caller,
    p_shipping_address, shipping_name, coalesce(shipping_price, 0), p_latitude, p_longitude,
    nullif(p_coupon_code, ''), discount, false
  ) returning * into new_order;

  if p_coupon_code is not null and coupon_result is not null then
    update public.coupons set times_used = times_used + 1
    where id = (coupon_result->>'coupon_id')::uuid;
  end if;

  return jsonb_build_object('order', to_jsonb(new_order), 'total', final_total, 'subtotal', subtotal, 'discount', discount, 'shipping_cost', shipping_price);
end;
$$;

revoke all on function public.create_order_secure(text, text, text, jsonb, uuid, jsonb, text, text, double precision, double precision) from public, anon;
grant execute on function public.create_order_secure(text, text, text, jsonb, uuid, jsonb, text, text, double precision, double precision) to authenticated;
