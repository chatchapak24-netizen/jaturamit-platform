-- Safe public preorder lookup by order code and phone.
-- This function intentionally returns only limited status fields and item
-- snapshots. It does not expose full address, payment notes, or customer PII
-- beyond what the customer already has to provide for the lookup.

create or replace function public.lookup_preorder_status(
  p_order_code text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.preorders%rowtype;
  v_items jsonb;
  v_order_code text := btrim(coalesce(p_order_code, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
begin
  -- TODO: add rate limiting or captcha before heavy public traffic.
  if v_order_code = '' or v_phone = '' then
    raise exception 'order_code and phone are required';
  end if;

  select *
  into v_order
  from public.preorders
  where order_code = v_order_code
    and phone = v_phone
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_name_snapshot', item.product_name_snapshot,
        'team_name_snapshot', item.team_name_snapshot,
        'product_type_snapshot', item.product_type_snapshot,
        'size', item.size,
        'custom_name', item.custom_name,
        'custom_number', item.custom_number,
        'quantity', item.quantity,
        'line_total', item.line_total
      )
      order by item.created_at asc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.preorder_order_items as item
  where item.preorder_id = v_order.id;

  if jsonb_array_length(v_items) = 0 then
    v_items := jsonb_build_array(
      jsonb_build_object(
        'product_name_snapshot', 'Legacy preorder item',
        'team_name_snapshot', v_order.team,
        'product_type_snapshot', 'jersey',
        'size', v_order.size,
        'custom_name', v_order.shirt_name,
        'custom_number', v_order.shirt_number,
        'quantity', coalesce(v_order.quantity, 0),
        'line_total', coalesce(
          v_order.total_amount,
          coalesce(v_order.unit_price, 0) * coalesce(v_order.quantity, 0)
        )
      )
    );
  end if;

  return jsonb_build_object(
    'order',
    jsonb_build_object(
      'order_code', v_order.order_code,
      'status', v_order.status,
      'created_at', v_order.created_at,
      'updated_at', v_order.updated_at,
      'total_amount', v_order.total_amount,
      'delivery_method', v_order.delivery_method,
      'has_shipping_address', nullif(btrim(coalesce(v_order.address, '')), '') is not null
    ),
    'items',
    v_items
  );
end;
$$;

grant execute on function public.lookup_preorder_status(text, text)
  to anon, authenticated;
