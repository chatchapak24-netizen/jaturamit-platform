-- Optional preorder payment slip upload support.
-- Slips are stored in the private Supabase Storage bucket `preorder-slips`.
-- Public users can attach a slip only by matching order_code + phone through
-- the RPC below. Public users still cannot select or update preorders directly.

alter table public.preorders
  add column if not exists slip_path text,
  add column if not exists slip_uploaded_at timestamptz;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'preorder-slips',
  'preorder-slips',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload preorder slips" on storage.objects;
create policy "Public can upload preorder slips"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'preorder-slips');

drop policy if exists "Active admins can read preorder slips" on storage.objects;
create policy "Active admins can read preorder slips"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'preorder-slips'
    and exists (
      select 1
      from public.admin_users
      where auth_user_id = auth.uid()
        and status = 'active'
    )
  );

create or replace function public.attach_preorder_slip(
  p_order_code text,
  p_phone text,
  p_slip_path text
)
returns table(success boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_code text := btrim(coalesce(p_order_code, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_slip_path text := btrim(coalesce(p_slip_path, ''));
begin
  if v_order_code = '' or v_phone = '' or v_slip_path = '' then
    raise exception 'slip attachment information is incomplete';
  end if;

  if v_slip_path !~ '^[A-Za-z0-9._/-]+$' then
    raise exception 'slip path is invalid';
  end if;

  select id
  into v_order_id
  from public.preorders
  where order_code = v_order_code
    and phone = v_phone
  limit 1;

  if not found then
    raise exception 'slip could not be attached to this preorder';
  end if;

  update public.preorders
  set
    slip_path = v_slip_path,
    slip_uploaded_at = now()
  where id = v_order_id;

  return query select true;
end;
$$;

revoke all on function public.attach_preorder_slip(text, text, text)
  from public;
grant execute on function public.attach_preorder_slip(text, text, text)
  to anon, authenticated;

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
      'has_shipping_address', nullif(btrim(coalesce(v_order.address, '')), '') is not null,
      'has_slip', nullif(btrim(coalesce(v_order.slip_path, '')), '') is not null
    ),
    'items',
    v_items
  );
end;
$$;

grant execute on function public.lookup_preorder_status(text, text)
  to anon, authenticated;
