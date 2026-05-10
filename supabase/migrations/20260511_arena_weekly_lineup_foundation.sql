-- Arena weekly lineup database foundation.
-- Additive only: reuses existing seasons, season_players, and arena_profiles.
-- Scoring and lineup submission RPCs intentionally come later.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.seasons') is null then
    raise exception 'public.seasons is required before arena weekly lineup foundation';
  end if;

  if to_regclass('public.season_players') is null then
    raise exception 'public.season_players is required before arena weekly lineup foundation';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() is required before arena weekly lineup foundation';
  end if;
end;
$$;

create table if not exists public.arena_weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  slug text not null unique,
  name text not null,
  week_number integer not null check (week_number > 0),
  status text not null default 'draft' check (
    status in ('draft', 'open', 'locked', 'scoring', 'final')
  ),
  lineup_opens_at timestamptz,
  lineup_locks_at timestamptz,
  scoring_starts_at timestamptz,
  scoring_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, week_number),
  constraint arena_weeks_lineup_window_check
    check (
      lineup_opens_at is null
      or lineup_locks_at is null
      or lineup_opens_at < lineup_locks_at
    ),
  constraint arena_weeks_scoring_window_check
    check (
      scoring_starts_at is null
      or scoring_ends_at is null
      or scoring_starts_at < scoring_ends_at
    )
);

create table if not exists public.arena_weekly_lineups (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.arena_weeks(id) on delete restrict,
  profile_id uuid not null references public.arena_profiles(id) on delete cascade,
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'locked', 'scored', 'void')
  ),
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, profile_id)
);

create table if not exists public.arena_lineup_players (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.arena_weekly_lineups(id) on delete cascade,
  season_player_id uuid not null references public.season_players(id) on delete restrict,
  slot_number integer not null check (slot_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lineup_id, slot_number),
  unique (lineup_id, season_player_id)
);

create table if not exists public.arena_weekly_scores (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.arena_weeks(id) on delete restrict,
  lineup_id uuid not null references public.arena_weekly_lineups(id) on delete cascade,
  profile_id uuid not null references public.arena_profiles(id) on delete cascade,
  total_points integer not null default 0,
  score_breakdown jsonb not null default '{}'::jsonb,
  scored_at timestamptz,
  status text not null default 'pending' check (
    status in ('pending', 'scored', 'final', 'void')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, profile_id),
  unique (lineup_id)
);

create table if not exists public.arena_coin_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.arena_profiles(id) on delete cascade,
  week_id uuid references public.arena_weeks(id) on delete set null,
  lineup_id uuid references public.arena_weekly_lineups(id) on delete set null,
  weekly_score_id uuid references public.arena_weekly_scores(id) on delete set null,
  entry_type text not null check (
    entry_type in ('weekly_score_reward', 'admin_adjustment', 'system_adjustment')
  ),
  amount integer not null check (amount <> 0),
  reason text,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arena_weeks_season_status_idx
  on public.arena_weeks (season_id, status, week_number);

create index if not exists arena_weeks_lineup_window_idx
  on public.arena_weeks (lineup_opens_at, lineup_locks_at);

create index if not exists arena_weekly_lineups_profile_week_idx
  on public.arena_weekly_lineups (profile_id, week_id);

create index if not exists arena_weekly_lineups_week_status_idx
  on public.arena_weekly_lineups (week_id, status, submitted_at desc);

create index if not exists arena_lineup_players_lineup_slot_idx
  on public.arena_lineup_players (lineup_id, slot_number);

create index if not exists arena_lineup_players_season_player_idx
  on public.arena_lineup_players (season_player_id);

create index if not exists arena_weekly_scores_profile_week_idx
  on public.arena_weekly_scores (profile_id, week_id);

create index if not exists arena_weekly_scores_week_points_idx
  on public.arena_weekly_scores (week_id, total_points desc, scored_at desc);

create index if not exists arena_coin_ledger_profile_created_idx
  on public.arena_coin_ledger (profile_id, created_at desc);

create index if not exists arena_coin_ledger_week_profile_idx
  on public.arena_coin_ledger (week_id, profile_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_weeks_updated_at'
  ) then
    create trigger set_arena_weeks_updated_at
    before update on public.arena_weeks
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_weekly_lineups_updated_at'
  ) then
    create trigger set_arena_weekly_lineups_updated_at
    before update on public.arena_weekly_lineups
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_lineup_players_updated_at'
  ) then
    create trigger set_arena_lineup_players_updated_at
    before update on public.arena_lineup_players
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_weekly_scores_updated_at'
  ) then
    create trigger set_arena_weekly_scores_updated_at
    before update on public.arena_weekly_scores
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_coin_ledger_updated_at'
  ) then
    create trigger set_arena_coin_ledger_updated_at
    before update on public.arena_coin_ledger
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.arena_weeks enable row level security;
alter table public.arena_weekly_lineups enable row level security;
alter table public.arena_lineup_players enable row level security;
alter table public.arena_weekly_scores enable row level security;
alter table public.arena_coin_ledger enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weeks'
      and policyname = 'Authenticated users can read arena weeks'
  ) then
    create policy "Authenticated users can read arena weeks"
      on public.arena_weeks
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weeks'
      and policyname = 'Active admins can manage arena weeks'
  ) then
    create policy "Active admins can manage arena weeks"
      on public.arena_weeks
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weekly_lineups'
      and policyname = 'Arena users can read their weekly lineups'
  ) then
    create policy "Arena users can read their weekly lineups"
      on public.arena_weekly_lineups
      for select
      to authenticated
      using (
        profile_id = public.current_arena_profile_id()
        or public.is_active_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weekly_lineups'
      and policyname = 'Active admins can manage arena weekly lineups'
  ) then
    create policy "Active admins can manage arena weekly lineups"
      on public.arena_weekly_lineups
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_lineup_players'
      and policyname = 'Arena users can read their lineup players'
  ) then
    create policy "Arena users can read their lineup players"
      on public.arena_lineup_players
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.arena_weekly_lineups as lineup
          where lineup.id = arena_lineup_players.lineup_id
            and lineup.profile_id = public.current_arena_profile_id()
        )
        or public.is_active_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_lineup_players'
      and policyname = 'Active admins can manage arena lineup players'
  ) then
    create policy "Active admins can manage arena lineup players"
      on public.arena_lineup_players
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weekly_scores'
      and policyname = 'Arena users can read their weekly scores'
  ) then
    create policy "Arena users can read their weekly scores"
      on public.arena_weekly_scores
      for select
      to authenticated
      using (
        profile_id = public.current_arena_profile_id()
        or public.is_active_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weekly_scores'
      and policyname = 'Active admins can manage arena weekly scores'
  ) then
    create policy "Active admins can manage arena weekly scores"
      on public.arena_weekly_scores
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_coin_ledger'
      and policyname = 'Arena users can read their coin ledger'
  ) then
    create policy "Arena users can read their coin ledger"
      on public.arena_coin_ledger
      for select
      to authenticated
      using (
        profile_id = public.current_arena_profile_id()
        or public.is_active_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_coin_ledger'
      and policyname = 'Active admins can manage arena coin ledger'
  ) then
    create policy "Active admins can manage arena coin ledger"
      on public.arena_coin_ledger
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;
end;
$$;
