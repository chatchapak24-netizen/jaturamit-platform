-- Ensure every preorder has a customer-facing order code.
-- This is additive and safe for existing rows. Existing non-empty order_code
-- values are preserved.

alter table public.preorders
  add column if not exists order_code text;

create sequence if not exists public.preorder_order_code_seq;

do $$
declare
  v_max_suffix bigint;
begin
  select coalesce(max(substring(order_code from '([0-9]+)$')::bigint), 0)
  into v_max_suffix
  from public.preorders
  where order_code ~ '[0-9]+$';

  if v_max_suffix > 0 then
    perform setval('public.preorder_order_code_seq', v_max_suffix, true);
  else
    perform setval('public.preorder_order_code_seq', 1, false);
  end if;
end;
$$;

create or replace function public.next_preorder_order_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
  v_code text;
begin
  loop
    v_next := nextval('public.preorder_order_code_seq');
    v_code := 'JR2026-' || lpad(v_next::text, 4, '0');

    if not exists (
      select 1
      from public.preorders
      where order_code = v_code
    ) then
      return v_code;
    end if;
  end loop;
end;
$$;

create or replace function public.set_preorder_order_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(new.order_code, '')), '') is null then
    new.order_code := public.next_preorder_order_code();
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_preorder_order_code_before_insert'
  ) then
    create trigger set_preorder_order_code_before_insert
    before insert on public.preorders
    for each row execute function public.set_preorder_order_code();
  end if;
end;
$$;

update public.preorders
set order_code = public.next_preorder_order_code()
where nullif(btrim(coalesce(order_code, '')), '') is null;

create unique index if not exists preorders_order_code_unique_idx
  on public.preorders (order_code)
  where order_code is not null;

revoke all on function public.next_preorder_order_code() from public;
revoke all on function public.set_preorder_order_code() from public;
