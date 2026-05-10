-- Enforce preorder campaign date windows for public order creation.
-- This keeps the existing RPC contract and table structure unchanged.

create or replace function public.create_preorder_order(
  p_campaign_id uuid,
  p_full_name text,
  p_phone text,
  p_delivery_method text,
  p_address text,
  p_note text,
  p_payment_note text,
  p_items jsonb
)
returns table(
  success boolean,
  order_id uuid,
  order_code text,
  total_amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.preorder_campaigns%rowtype;
  v_product public.preorder_products%rowtype;
  v_order public.preorders%rowtype;
  v_item jsonb;
  v_item_index integer;
  v_product_id uuid;
  v_quantity integer;
  v_size text;
  v_custom_name text;
  v_custom_number text;
  v_team_id uuid;
  v_team_slug text;
  v_team_name text;
  v_line_total integer;
  v_total_amount integer := 0;
  v_total_quantity integer := 0;
  v_first_item record;
begin
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then
    raise exception 'full_name is required';
  end if;

  if nullif(btrim(coalesce(p_phone, '')), '') is null then
    raise exception 'phone is required';
  end if;

  if p_delivery_method is null or p_delivery_method not in ('pickup', 'shipping') then
    raise exception 'delivery_method is invalid';
  end if;

  if p_delivery_method = 'shipping' and nullif(btrim(coalesce(p_address, '')), '') is null then
    raise exception 'address is required for shipping';
  end if;

  if p_campaign_id is null then
    raise exception 'campaign_id is required';
  end if;

  select campaign.*
  into v_campaign
  from public.preorder_campaigns as campaign
  where campaign.id = p_campaign_id
    and campaign.is_active = true
    and (campaign.starts_at is null or now() >= campaign.starts_at)
    and (campaign.ends_at is null or now() <= campaign.ends_at)
  limit 1;

  if not found then
    raise exception 'active preorder campaign was not found';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items array is required';
  end if;

  create temporary table if not exists pg_temp.preorder_item_buffer (
    item_index integer not null,
    product_id uuid not null,
    team_id_snapshot uuid,
    team_slug_snapshot text,
    team_name_snapshot text,
    product_name_snapshot text not null,
    product_type_snapshot text not null,
    unit_price_snapshot integer not null,
    quantity integer not null,
    size text,
    custom_name text,
    custom_number text,
    line_total integer not null
  ) on commit drop;

  truncate table pg_temp.preorder_item_buffer;

  for v_item, v_item_index in
    select value, ordinality::integer
    from jsonb_array_elements(p_items) with ordinality
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := coalesce(nullif(v_item->>'quantity', '')::integer, 0);
    v_size := nullif(btrim(coalesce(v_item->>'size', '')), '');
    v_custom_name := nullif(btrim(coalesce(v_item->>'custom_name', '')), '');
    v_custom_number := nullif(btrim(coalesce(v_item->>'custom_number', '')), '');
    v_team_id := null;
    v_team_slug := null;
    v_team_name := null;

    if v_product_id is null then
      raise exception 'product_id is required for item %', v_item_index;
    end if;

    if v_quantity <= 0 then
      raise exception 'quantity must be greater than 0 for item %', v_item_index;
    end if;

    select product.*
    into v_product
    from public.preorder_products as product
    where product.id = v_product_id
      and product.campaign_id = v_campaign.id
      and product.is_active = true
    limit 1;

    if not found then
      raise exception 'active preorder product was not found for item %', v_item_index;
    end if;

    if v_product.team_id is not null then
      select team.id, team.slug, team.name
      into v_team_id, v_team_slug, v_team_name
      from public.preorder_teams as team
      where team.id = v_product.team_id
        and team.is_active = true
      limit 1;

      if not found then
        raise exception 'active preorder team was not found for item %', v_item_index;
      end if;
    end if;

    if v_product.requires_size and v_size is null then
      raise exception 'size is required for item %', v_item_index;
    end if;

    if not v_product.requires_size then
      v_size := null;
    end if;

    if not v_product.allows_custom_name and v_custom_name is not null then
      raise exception 'custom_name is not allowed for item %', v_item_index;
    end if;

    if v_custom_name is not null and v_custom_name !~ '^[A-Z]+$' then
      raise exception 'custom_name must contain uppercase English letters only for item %', v_item_index;
    end if;

    if not v_product.allows_custom_number and v_custom_number is not null then
      raise exception 'custom_number is not allowed for item %', v_item_index;
    end if;

    if v_custom_number is not null and v_custom_number !~ '^[0-9]+$' then
      raise exception 'custom_number must contain numbers only for item %', v_item_index;
    end if;

    v_line_total := v_product.price * v_quantity;
    v_total_amount := v_total_amount + v_line_total;
    v_total_quantity := v_total_quantity + v_quantity;

    insert into pg_temp.preorder_item_buffer (
      item_index,
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
      v_item_index,
      v_product.id,
      v_team_id,
      v_team_slug,
      v_team_name,
      v_product.name,
      v_product.product_type,
      v_product.price,
      v_quantity,
      v_size,
      v_custom_name,
      v_custom_number,
      v_line_total
    );
  end loop;

  select *
  into v_first_item
  from pg_temp.preorder_item_buffer
  order by item_index
  limit 1;

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
    unit_price,
    total_amount
  ) values (
    v_campaign.id,
    v_first_item.product_id,
    btrim(p_full_name),
    btrim(p_phone),
    coalesce(v_first_item.team_slug_snapshot, 'other'),
    v_first_item.size,
    coalesce(v_first_item.custom_name, ''),
    coalesce(v_first_item.custom_number, ''),
    v_total_quantity,
    p_delivery_method,
    case when p_delivery_method = 'shipping' then nullif(btrim(coalesce(p_address, '')), '') else null end,
    nullif(btrim(coalesce(p_note, '')), ''),
    nullif(btrim(coalesce(p_payment_note, '')), ''),
    v_first_item.unit_price_snapshot,
    v_total_amount
  )
  returning * into v_order;

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
  )
  select
    v_order.id,
    buffer.product_id,
    buffer.team_id_snapshot,
    buffer.team_slug_snapshot,
    buffer.team_name_snapshot,
    buffer.product_name_snapshot,
    buffer.product_type_snapshot,
    buffer.unit_price_snapshot,
    buffer.quantity,
    buffer.size,
    buffer.custom_name,
    buffer.custom_number,
    buffer.line_total
  from pg_temp.preorder_item_buffer as buffer
  order by buffer.item_index;

  return query
  select
    true,
    v_order.id,
    v_order.order_code,
    coalesce(v_order.total_amount, v_total_amount)::integer;
end;
$$;

revoke all on function public.create_preorder_order(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

grant execute on function public.create_preorder_order(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;
