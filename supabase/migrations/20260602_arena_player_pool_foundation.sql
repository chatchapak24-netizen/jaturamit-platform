-- Arena player pool foundation for Fantasy Prototype.
-- Additive only: creates the missing school, season, player, and season player pool.

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() is required before arena player pool foundation';
  end if;
end;
$$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  slug text not null,
  name text not null,
  short_name text not null,
  thai_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'archived')
  ),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (slug)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  year integer not null check (year >= 2000),
  status text not null default 'draft' check (
    status in ('draft', 'active', 'completed', 'archived')
  ),
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug),
  unique (year, name),
  constraint seasons_date_window_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  nickname text,
  photo_url text,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_has_name_check
    check (
      nullif(btrim(coalesce(first_name, '')), '') is not null
      or nullif(btrim(coalesce(last_name, '')), '') is not null
      or nullif(btrim(coalesce(nickname, '')), '') is not null
    )
);

create table if not exists public.season_players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.schools(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete cascade,
  shirt_number integer check (shirt_number is null or shirt_number between 1 and 99),
  position text check (position is null or position in ('GK', 'DF', 'MF', 'FW')),
  status text not null default 'active' check (
    status in ('active', 'inactive', 'injured', 'suspended', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id),
  unique (season_id, team_id, shirt_number)
);

create index if not exists schools_status_sort_idx
  on public.schools (status, sort_order, name);

create index if not exists seasons_status_year_idx
  on public.seasons (status, year desc);

create index if not exists players_status_name_idx
  on public.players (status, last_name, first_name, nickname);

create index if not exists season_players_season_team_idx
  on public.season_players (season_id, team_id, status);

create index if not exists season_players_position_idx
  on public.season_players (season_id, position, status);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_schools_updated_at'
  ) then
    create trigger set_schools_updated_at
    before update on public.schools
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_seasons_updated_at'
  ) then
    create trigger set_seasons_updated_at
    before update on public.seasons
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_players_updated_at'
  ) then
    create trigger set_players_updated_at
    before update on public.players
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_season_players_updated_at'
  ) then
    create trigger set_season_players_updated_at
    before update on public.season_players
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

insert into public.schools (
  code,
  slug,
  name,
  short_name,
  thai_name,
  primary_color,
  secondary_color,
  status,
  sort_order
)
values
  ('DARUNA', 'daruna', 'Daruna Ratchaburi', 'DARUNA', 'ดรุณาราชบุรี', '#b91c1c', '#ffffff', 'active', 10),
  ('PHOTHA', 'photha', 'Phothawattanasenee', 'PHOTHA', 'โพธาวัฒนาเสนี', '#2563eb', '#ffffff', 'active', 20),
  ('SARASIT', 'sarasit', 'Sarasit Phitthayalai', 'SARASIT', 'สารสิทธิ์พิทยาลัย', '#047857', '#ffffff', 'active', 30),
  ('BENJ', 'benj', 'Benchamarachutit Ratchaburi', 'BENJ', 'เบญจมราชูทิศราชบุรี', '#7c3aed', '#ffffff', 'active', 40)
on conflict (code) do update
set
  slug = excluded.slug,
  name = excluded.name,
  short_name = excluded.short_name,
  thai_name = excluded.thai_name,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.schools enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.season_players enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'schools'
      and policyname = 'Public can read schools'
  ) then
    create policy "Public can read schools"
      on public.schools
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'seasons'
      and policyname = 'Public can read seasons'
  ) then
    create policy "Public can read seasons"
      on public.seasons
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'Public can read players'
  ) then
    create policy "Public can read players"
      on public.players
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'season_players'
      and policyname = 'Public can read season players'
  ) then
    create policy "Public can read season players"
      on public.season_players
      for select
      to anon, authenticated
      using (true);
  end if;

  if to_regprocedure('public.is_active_admin()') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'schools'
        and policyname = 'Active admins can manage schools'
    ) then
      create policy "Active admins can manage schools"
        on public.schools
        for all
        to authenticated
        using (public.is_active_admin())
        with check (public.is_active_admin());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'seasons'
        and policyname = 'Active admins can manage seasons'
    ) then
      create policy "Active admins can manage seasons"
        on public.seasons
        for all
        to authenticated
        using (public.is_active_admin())
        with check (public.is_active_admin());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'players'
        and policyname = 'Active admins can manage players'
    ) then
      create policy "Active admins can manage players"
        on public.players
        for all
        to authenticated
        using (public.is_active_admin())
        with check (public.is_active_admin());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'season_players'
        and policyname = 'Active admins can manage season players'
    ) then
      create policy "Active admins can manage season players"
        on public.season_players
        for all
        to authenticated
        using (public.is_active_admin())
        with check (public.is_active_admin());
    end if;
  end if;
end;
$$;
