-- Arena Fantasy Phase 1A player settings.
-- Additive only: fantasy metadata is attached to existing season_players.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.season_players') is null then
    raise exception 'public.season_players is required before arena player settings';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() is required before arena player settings';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weekly_lineups'
      and policyname = 'Arena users can create their own open weekly lineup'
  ) then
    create policy "Arena users can create their own open weekly lineup"
      on public.arena_weekly_lineups
      for insert
      to authenticated
      with check (
        profile_id = public.current_arena_profile_id()
        and status = 'draft'
        and exists (
          select 1
          from public.arena_weeks
          where arena_weeks.id = arena_weekly_lineups.week_id
            and arena_weeks.status = 'open'
            and (
              arena_weeks.lineup_opens_at is null
              or now() >= arena_weeks.lineup_opens_at
            )
            and (
              arena_weeks.lineup_locks_at is null
              or now() < arena_weeks.lineup_locks_at
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_weekly_lineups'
      and policyname = 'Arena users can update their own unlocked weekly lineup'
  ) then
    create policy "Arena users can update their own unlocked weekly lineup"
      on public.arena_weekly_lineups
      for update
      to authenticated
      using (
        profile_id = public.current_arena_profile_id()
        and status in ('draft', 'submitted')
        and exists (
          select 1
          from public.arena_weeks
          where arena_weeks.id = arena_weekly_lineups.week_id
            and arena_weeks.status = 'open'
            and (
              arena_weeks.lineup_locks_at is null
              or now() < arena_weeks.lineup_locks_at
            )
        )
      )
      with check (
        profile_id = public.current_arena_profile_id()
        and status in ('draft', 'locked')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_lineup_players'
      and policyname = 'Arena users can add players to their own draft lineup'
  ) then
    create policy "Arena users can add players to their own draft lineup"
      on public.arena_lineup_players
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.arena_weekly_lineups as lineup
          join public.arena_weeks as week on week.id = lineup.week_id
          where lineup.id = arena_lineup_players.lineup_id
            and lineup.profile_id = public.current_arena_profile_id()
            and lineup.status = 'draft'
            and week.status = 'open'
            and (
              week.lineup_locks_at is null
              or now() < week.lineup_locks_at
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_lineup_players'
      and policyname = 'Arena users can remove players from their own draft lineup'
  ) then
    create policy "Arena users can remove players from their own draft lineup"
      on public.arena_lineup_players
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.arena_weekly_lineups as lineup
          join public.arena_weeks as week on week.id = lineup.week_id
          where lineup.id = arena_lineup_players.lineup_id
            and lineup.profile_id = public.current_arena_profile_id()
            and lineup.status = 'draft'
            and week.status = 'open'
            and (
              week.lineup_locks_at is null
              or now() < week.lineup_locks_at
            )
        )
      );
  end if;
end;
$$;

create table if not exists public.arena_player_settings (
  id uuid primary key default gen_random_uuid(),
  season_player_id uuid not null references public.season_players(id) on delete cascade,
  star_rating integer not null default 1 check (star_rating between 1 and 5),
  fantasy_status text not null default 'active' check (
    fantasy_status in ('active', 'inactive', 'injured', 'suspended')
  ),
  fantasy_position_override text check (
    fantasy_position_override is null
    or fantasy_position_override in ('GK', 'DF', 'MF', 'FW')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_player_id)
);

create index if not exists arena_player_settings_status_idx
  on public.arena_player_settings (fantasy_status, star_rating);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_player_settings_updated_at'
  ) then
    create trigger set_arena_player_settings_updated_at
    before update on public.arena_player_settings
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.arena_player_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_player_settings'
      and policyname = 'Public can read arena player settings'
  ) then
    create policy "Public can read arena player settings"
      on public.arena_player_settings
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_player_settings'
      and policyname = 'Active admins can manage arena player settings'
  ) then
    create policy "Active admins can manage arena player settings"
      on public.arena_player_settings
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;
end;
$$;
