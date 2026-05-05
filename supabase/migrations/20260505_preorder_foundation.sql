-- Preorder database foundation.
-- This migration is additive only. It keeps the existing public.preorders flow
-- working while preparing campaign, team, product, and order item models.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.preorder_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  hero_title text,
  hero_subtitle text,
  terms text,
  payment_bank_name text,
  payment_account_name text,
  payment_account_number text,
  payment_note text,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preorder_teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  colors text,
  logo_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preorder_products (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.preorder_campaigns(id) on delete set null,
  team_id uuid references public.preorder_teams(id) on delete set null,
  product_type text not null check (
    product_type in (
      'jersey',
      'shorts',
      'socks',
      'training_shirt',
      'scarf',
      'souvenir',
      'other'
    )
  ),
  name text not null,
  description text,
  price integer not null check (price > 0),
  image_url text,
  requires_size boolean not null default true,
  allows_custom_name boolean not null default false,
  requires_custom_name boolean not null default false,
  allows_custom_number boolean not null default false,
  requires_custom_number boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preorder_products_custom_name_requires_allow_check
    check (requires_custom_name = false or allows_custom_name = true),
  constraint preorder_products_custom_number_requires_allow_check
    check (requires_custom_number = false or allows_custom_number = true)
);

create unique index if not exists preorder_products_seed_identity_idx
  on public.preorder_products (campaign_id, team_id, product_type, name);

alter table public.preorders
  add column if not exists campaign_id uuid references public.preorder_campaigns(id),
  add column if not exists product_id uuid references public.preorder_products(id);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'preorders'
      and column_name = 'id'
  ) then
    alter table public.preorders
      add column id uuid default gen_random_uuid();
  end if;
end;
$$;

update public.preorders
set id = gen_random_uuid()
where id is null;

alter table public.preorders
  alter column id set default gen_random_uuid(),
  alter column id set not null;

create unique index if not exists preorders_id_unique_idx
  on public.preorders (id);

create table if not exists public.preorder_order_items (
  id uuid primary key default gen_random_uuid(),
  preorder_id uuid references public.preorders(id) on delete cascade,
  product_id uuid references public.preorder_products(id),
  team_id_snapshot uuid,
  team_slug_snapshot text,
  team_name_snapshot text,
  product_name_snapshot text not null,
  product_type_snapshot text not null,
  unit_price_snapshot integer not null,
  quantity integer not null check (quantity > 0),
  size text,
  custom_name text,
  custom_number text,
  line_total integer not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_preorder_campaigns_updated_at'
  ) then
    create trigger set_preorder_campaigns_updated_at
    before update on public.preorder_campaigns
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_preorder_teams_updated_at'
  ) then
    create trigger set_preorder_teams_updated_at
    before update on public.preorder_teams
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_preorder_products_updated_at'
  ) then
    create trigger set_preorder_products_updated_at
    before update on public.preorder_products
    for each row execute function public.set_updated_at();
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'preorders'
      and column_name = 'updated_at'
  ) and not exists (
    select 1 from pg_trigger
    where tgname = 'set_preorders_updated_at'
  ) then
    create trigger set_preorders_updated_at
    before update on public.preorders
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

insert into public.preorder_teams (
  slug,
  name,
  short_name,
  colors,
  is_active,
  sort_order
) values
  ('photha', 'โพธาวัฒนาเสนี', 'โพธา', 'เหลือง-น้ำเงิน', true, 1),
  ('benjamarachutit', 'เบญจมราชูทิศราชบุรี', 'เบญจม', 'ชมพู-น้ำเงิน', true, 2),
  ('daruna', 'ดรุณาราชบุรี', 'ดรุณา', 'ขาว-แดง', true, 3),
  ('sarasit', 'สารสิทธิ์พิทยาลัย', 'สารสิทธิ์', 'น้ำเงิน', true, 4)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  colors = excluded.colors,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.preorder_campaigns (
  slug,
  name,
  hero_title,
  hero_subtitle,
  payment_bank_name,
  payment_account_name,
  payment_account_number,
  payment_note,
  is_active,
  sort_order
) values (
  'jaturamit-ratchaburi-2026',
  'จตุรมิตรราชบุรี ครั้งที่ 2',
  'พรีออเดอร์เสื้อจตุรมิตรราชบุรี ครั้งที่ 2',
  'ผลิตโดย ลิงชิงบอล สปอร์ต ใส่ชื่อและเบอร์หลังเสื้อฟรี',
  'ออมสิน',
  'นางวาสนา เรื่องแตง',
  '020477888224',
  'หลังโอนเงิน กรุณาส่งสลิปทาง LINE OA ลิงชิงบอล สปอร์ต พร้อมแจ้งชื่อผู้สั่งซื้อและเบอร์โทร',
  true,
  1
)
on conflict (slug) do update set
  name = excluded.name,
  hero_title = excluded.hero_title,
  hero_subtitle = excluded.hero_subtitle,
  payment_bank_name = excluded.payment_bank_name,
  payment_account_name = excluded.payment_account_name,
  payment_account_number = excluded.payment_account_number,
  payment_note = excluded.payment_note,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

with current_campaign as (
  select id
  from public.preorder_campaigns
  where slug = 'jaturamit-ratchaburi-2026'
),
seed_products as (
  select
    current_campaign.id as campaign_id,
    team.id as team_id,
    product.name,
    product.product_type,
    product.price,
    product.requires_size,
    product.allows_custom_name,
    product.requires_custom_name,
    product.allows_custom_number,
    product.requires_custom_number,
    product.is_active,
    product.sort_order
  from current_campaign
  join (
    values
      ('photha', 'เสื้อจตุรมิตร - โพธา', 'jersey', 350, true, true, true, true, true, true, 1),
      ('benjamarachutit', 'เสื้อจตุรมิตร - เบญจมราชูทิศ', 'jersey', 350, true, true, true, true, true, true, 2),
      ('daruna', 'เสื้อจตุรมิตร - ดรุณาราชบุรี', 'jersey', 350, true, true, true, true, true, true, 3),
      ('sarasit', 'เสื้อจตุรมิตร - สารสิทธิ์พิทยาลัย', 'jersey', 350, true, true, true, true, true, true, 4)
  ) as product(
    team_slug,
    name,
    product_type,
    price,
    requires_size,
    allows_custom_name,
    requires_custom_name,
    allows_custom_number,
    requires_custom_number,
    is_active,
    sort_order
  ) on true
  join public.preorder_teams as team on team.slug = product.team_slug
)
insert into public.preorder_products (
  campaign_id,
  team_id,
  product_type,
  name,
  price,
  requires_size,
  allows_custom_name,
  requires_custom_name,
  allows_custom_number,
  requires_custom_number,
  is_active,
  sort_order
)
select
  campaign_id,
  team_id,
  product_type,
  name,
  price,
  requires_size,
  allows_custom_name,
  requires_custom_name,
  allows_custom_number,
  requires_custom_number,
  is_active,
  sort_order
from seed_products
on conflict (campaign_id, team_id, product_type, name) do update set
  price = excluded.price,
  requires_size = excluded.requires_size,
  allows_custom_name = excluded.allows_custom_name,
  requires_custom_name = excluded.requires_custom_name,
  allows_custom_number = excluded.allows_custom_number,
  requires_custom_number = excluded.requires_custom_number,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.preorder_campaigns enable row level security;
alter table public.preorder_teams enable row level security;
alter table public.preorder_products enable row level security;
alter table public.preorder_order_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_campaigns'
      and policyname = 'Public can read active preorder campaigns'
  ) then
    create policy "Public can read active preorder campaigns"
      on public.preorder_campaigns
      for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_teams'
      and policyname = 'Public can read active preorder teams'
  ) then
    create policy "Public can read active preorder teams"
      on public.preorder_teams
      for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_products'
      and policyname = 'Public can read active preorder products'
  ) then
    create policy "Public can read active preorder products"
      on public.preorder_products
      for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_campaigns'
      and policyname = 'Active admins can manage preorder campaigns'
  ) then
    create policy "Active admins can manage preorder campaigns"
      on public.preorder_campaigns
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      )
      with check (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_teams'
      and policyname = 'Active admins can manage preorder teams'
  ) then
    create policy "Active admins can manage preorder teams"
      on public.preorder_teams
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      )
      with check (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_products'
      and policyname = 'Active admins can manage preorder products'
  ) then
    create policy "Active admins can manage preorder products"
      on public.preorder_products
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      )
      with check (
        exists (
          select 1
          from public.admin_users
          where auth_user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preorder_order_items'
      and policyname = 'Active admins can read preorder order items'
  ) then
    create policy "Active admins can read preorder order items"
      on public.preorder_order_items
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
