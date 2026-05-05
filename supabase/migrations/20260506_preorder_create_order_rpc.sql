-- Secure preorder order creation.
-- This keeps the public form compatible with public.preorders while moving
-- product price lookup and order insertion into the database.

create or replace function public.create_preorder_order(
  p_campaign_id uuid,
  p_product_id uuid,
  p_full_name text,
  p_phone text,
  p_size text,
  p_shirt_name text,
  p_shirt_number text,
  p_quantity integer,
  p_delivery_method text,
  p_address text,
  p_note text,
  p_payment_note text
)
returns table(preorder_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.preorder_products%rowtype;
  v_team public.preorder_teams%rowtype;
  v_preorder_id uuid;
  v_quantity integer := coalesce(p_quantity, 0);
  v_size text := nullif(btrim(coalesce(p_size, '')), '');
  v_shirt_name text := btrim(coalesce(p_shirt_name, ''));
  v_shirt_number text := btrim(coalesce(p_shirt_number, ''));
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
begin
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then
    raise exception 'full_name is required';
  end if;

  if nullif(btrim(coalesce(p_phone, '')), '') is null then
    raise exception 'phone is required';
  end if;

  if p_campaign_id is null or p_product_id is null then
    raise exception 'campaign_id and product_id are required';
  end if;

  if v_quantity <= 0 then
    raise exception 'quantity must be greater than 0';
  end if;

  if p_delivery_method is null or p_delivery_method not in ('pickup', 'shipping') then
    raise exception 'delivery_method is invalid';
  end if;

  if p_delivery_method = 'shipping' and v_address is null then
    raise exception 'address is required for shipping';
  end if;

  select product.*
  into v_product
  from public.preorder_products as product
  join public.preorder_campaigns as campaign
    on campaign.id = product.campaign_id
  where product.id = p_product_id
    and product.campaign_id = p_campaign_id
    and product.is_active = true
    and campaign.is_active = true
  limit 1;

  if not found then
    raise exception 'active preorder product was not found';
  end if;

  if v_product.team_id is null then
    raise exception 'product must be linked to a team for the current preorder flow';
  end if;

  select team.*
  into v_team
  from public.preorder_teams as team
  where team.id = v_product.team_id
    and team.is_active = true
  limit 1;

  if not found then
    raise exception 'active preorder team was not found';
  end if;

  if v_product.requires_size and v_size is null then
    raise exception 'size is required for this product';
  end if;

  if not v_product.requires_size then
    v_size := null;
  end if;

  if not v_product.allows_custom_name then
    v_shirt_name := '';
  elsif v_product.requires_custom_name and v_shirt_name = '' then
    raise exception 'shirt_name is required for this product';
  end if;

  if not v_product.allows_custom_number then
    v_shirt_number := '';
  elsif v_product.requires_custom_number and v_shirt_number = '' then
    raise exception 'shirt_number is required for this product';
  end if;

  insert into public.preorders (
    campaign_id,
    product_id,
    full_name,
    phone,
    team,
    size,
    shirt_name,
    shirt_number,
    quantity,
    delivery_method,
    address,
    note,
    payment_note,
    unit_price
  ) values (
    v_product.campaign_id,
    v_product.id,
    btrim(p_full_name),
    btrim(p_phone),
    v_team.slug,
    v_size,
    v_shirt_name,
    v_shirt_number,
    v_quantity,
    p_delivery_method,
    case when p_delivery_method = 'shipping' then v_address else null end,
    nullif(btrim(coalesce(p_note, '')), ''),
    nullif(btrim(coalesce(p_payment_note, '')), ''),
    v_product.price
  )
  returning id into v_preorder_id;

  insert into public.preorder_order_items (
    preorder_id,
    product_id,
    team_id_snapshot,
    team_slug_snapshot,
    team_name_snapshot,
    product_name_snapshot,
    product_type_snapshot,
    unit_price_snapshot,
    quantity,
    size,
    custom_name,
    custom_number,
    line_total
  ) values (
    v_preorder_id,
    v_product.id,
    v_team.id,
    v_team.slug,
    v_team.name,
    v_product.name,
    v_product.product_type,
    v_product.price,
    v_quantity,
    v_size,
    nullif(v_shirt_name, ''),
    nullif(v_shirt_number, ''),
    v_product.price * v_quantity
  );

  return query select v_preorder_id;
end;
$$;

revoke all on function public.create_preorder_order(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.create_preorder_order(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) to anon, authenticated;
