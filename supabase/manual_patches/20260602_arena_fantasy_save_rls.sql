-- Arena Fantasy Save Team RLS patch.
-- Manual patch only. Do not apply through `supabase db push`.
-- Goal: allow authenticated Arena users to save and resave their own lineup
-- for an open week, while keeping user-writable statuses to draft/submitted.

begin;

alter table public.schools enable row level security;
alter table public.players enable row level security;
alter table public.season_players enable row level security;
alter table public.arena_player_settings enable row level security;
alter table public.arena_profiles enable row level security;
alter table public.arena_weekly_lineups enable row level security;
alter table public.arena_lineup_players enable row level security;

grant usage on schema public to authenticated;
grant select on public.schools to authenticated;
grant select on public.players to authenticated;
grant select on public.season_players to authenticated;
grant select on public.arena_player_settings to authenticated;
grant select on public.arena_weeks to authenticated;
grant select, insert, update on public.arena_profiles to authenticated;
grant select, insert, update on public.arena_weekly_lineups to authenticated;
grant select, insert, delete on public.arena_lineup_players to authenticated;
grant execute on function public.current_arena_profile_id() to authenticated;
grant execute on function public.is_active_admin() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'schools'
      and policyname = 'Authenticated users can read schools for fantasy'
  ) then
    create policy "Authenticated users can read schools for fantasy"
      on public.schools
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'Authenticated users can read players for fantasy'
  ) then
    create policy "Authenticated users can read players for fantasy"
      on public.players
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'season_players'
      and policyname = 'Authenticated users can read season players for fantasy'
  ) then
    create policy "Authenticated users can read season players for fantasy"
      on public.season_players
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_player_settings'
      and policyname = 'Authenticated users can read arena player settings for fantasy'
  ) then
    create policy "Authenticated users can read arena player settings for fantasy"
      on public.arena_player_settings
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_profiles'
      and policyname = 'Arena profile owners can read their profile'
  ) then
    create policy "Arena profile owners can read their profile"
      on public.arena_profiles
      for select
      to authenticated
      using (
        auth_user_id = auth.uid()
        or public.is_active_admin()
      );
  end if;
end;
$$;

drop policy if exists "Authenticated users can create their arena profile"
  on public.arena_profiles;
drop policy if exists "Arena profile owners can update safe profile fields"
  on public.arena_profiles;

create policy "Authenticated users can create their own arena profile"
  on public.arena_profiles
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    or public.is_active_admin()
  );

create policy "Arena profile owners can update their own profile"
  on public.arena_profiles
  for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.is_active_admin()
  )
  with check (
    auth_user_id = auth.uid()
    or public.is_active_admin()
  );

drop policy if exists "Arena users can create their own open weekly lineup"
  on public.arena_weekly_lineups;
drop policy if exists "Arena users can update their own unlocked weekly lineup"
  on public.arena_weekly_lineups;

create policy "Arena users can create their own open weekly lineup"
  on public.arena_weekly_lineups
  for insert
  to authenticated
  with check (
    profile_id = public.current_arena_profile_id()
    and status in ('draft', 'submitted')
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

create policy "Arena users can update their own open weekly lineup"
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
  );

drop policy if exists "Arena users can add players to their own draft lineup"
  on public.arena_lineup_players;
drop policy if exists "Arena users can remove players from their own draft lineup"
  on public.arena_lineup_players;

create policy "Arena users can add players to their own open lineup"
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
        and lineup.status in ('draft', 'submitted')
        and week.status = 'open'
        and (
          week.lineup_locks_at is null
          or now() < week.lineup_locks_at
        )
    )
  );

create policy "Arena users can remove players from their own open lineup"
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
        and lineup.status in ('draft', 'submitted')
        and week.status = 'open'
        and (
          week.lineup_locks_at is null
          or now() < week.lineup_locks_at
        )
    )
  );

commit;

notify pgrst, 'reload schema';
