-- Preorder PromptPay payment foundation.
-- Test-mode Omise/Opn payments are recorded here without exposing payment rows
-- to public clients. Public checkout still uses server API routes only.

create table if not exists public.preorder_payments (
  id uuid primary key default gen_random_uuid(),
  preorder_id uuid references public.preorders(id) on delete set null,
  order_code text not null,
  provider text not null default 'omise',
  payment_method text not null default 'promptpay',
  omise_source_id text,
  omise_charge_id text unique,
  amount integer not null,
  currency text not null default 'THB',
  status text not null default 'pending',
  qr_code_uri text,
  expires_at timestamptz,
  paid_at timestamptz,
  raw_charge jsonb,
  raw_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preorder_payments_status_check
    check (status in ('pending', 'successful', 'failed', 'expired', 'cancelled')),
  constraint preorder_payments_amount_check
    check (amount > 0),
  constraint preorder_payments_provider_check
    check (provider = 'omise'),
  constraint preorder_payments_method_check
    check (payment_method = 'promptpay'),
  constraint preorder_payments_currency_check
    check (currency = 'THB')
);

create index if not exists preorder_payments_preorder_id_idx
  on public.preorder_payments (preorder_id);

create index if not exists preorder_payments_order_code_idx
  on public.preorder_payments (order_code);

create index if not exists preorder_payments_status_idx
  on public.preorder_payments (status);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_preorder_payments_updated_at'
  ) then
    create trigger set_preorder_payments_updated_at
    before update on public.preorder_payments
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.preorder_payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_payments'
      and policyname = 'Active admins can read preorder payments'
  ) then
    create policy "Active admins can read preorder payments"
      on public.preorder_payments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;
end;
$$;

revoke all on table public.preorder_payments from anon;
revoke all on table public.preorder_payments from authenticated;
grant select on table public.preorder_payments to authenticated;
