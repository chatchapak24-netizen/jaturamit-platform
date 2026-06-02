-- Arena Fantasy Prototype seed.
-- Manual patch only. Do not apply through `supabase db push`.
-- Seeds one active season, one open Arena week, and a 72-player prototype pool.

begin;

with upserted_season as (
  insert into public.seasons (
    slug,
    name,
    year,
    status
  )
  values (
    'jaturamit-ratchaburi-2',
    'Jaturamit Ratchaburi II',
    2026,
    'active'
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    year = excluded.year,
    status = excluded.status,
    updated_at = now()
  returning id
)
insert into public.arena_weeks (
  season_id,
  slug,
  name,
  week_number,
  status,
  lineup_opens_at,
  lineup_locks_at
)
select
  upserted_season.id,
  'week-1',
  'Week 1 (แมตช์วีค 1)',
  1,
  'open',
  now() - interval '1 day',
  now() + interval '30 days'
from upserted_season
on conflict (slug) do update
set
  season_id = excluded.season_id,
  name = excluded.name,
  week_number = excluded.week_number,
  status = excluded.status,
  lineup_opens_at = excluded.lineup_opens_at,
  lineup_locks_at = excluded.lineup_locks_at,
  updated_at = now();

with prototype_roster as (
  select
    school_code,
    player_number,
    case
      when player_number between 1 and 2 then 'GK'
      when player_number between 3 and 8 then 'DF'
      when player_number between 9 and 14 then 'MF'
      else 'FW'
    end as position,
    case player_number
      when 1 then 3
      when 2 then 2
      when 3 then 3
      when 4 then 3
      when 5 then 2
      when 6 then 2
      when 7 then 1
      when 8 then 1
      when 9 then 4
      when 10 then 3
      when 11 then 3
      when 12 then 2
      when 13 then 2
      when 14 then 1
      when 15 then 4
      when 16 then 3
      when 17 then 2
      else 2
    end as star_rating
  from (
    values
      ('DARUNA'),
      ('PHOTHA'),
      ('SARASIT'),
      ('BENJ')
  ) as schools(school_code)
  cross join generate_series(1, 18) as numbers(player_number)
),
prototype_players as (
  select
    school_code,
    player_number,
    position,
    star_rating,
    player_number as shirt_number,
    school_code || ' Player ' || lpad(player_number::text, 2, '0') as player_name
  from prototype_roster
)
insert into public.players (
  first_name,
  last_name,
  nickname,
  status
)
select
  school_code,
  'Player ' || lpad(player_number::text, 2, '0'),
  player_name,
  'active'
from prototype_players
where not exists (
  select 1
  from public.players
  where players.nickname = prototype_players.player_name
);

with active_season as (
  select id
  from public.seasons
  where slug = 'jaturamit-ratchaburi-2'
),
prototype_roster as (
  select
    school_code,
    player_number,
    case
      when player_number between 1 and 2 then 'GK'
      when player_number between 3 and 8 then 'DF'
      when player_number between 9 and 14 then 'MF'
      else 'FW'
    end as position,
    case player_number
      when 1 then 3
      when 2 then 2
      when 3 then 3
      when 4 then 3
      when 5 then 2
      when 6 then 2
      when 7 then 1
      when 8 then 1
      when 9 then 4
      when 10 then 3
      when 11 then 3
      when 12 then 2
      when 13 then 2
      when 14 then 1
      when 15 then 4
      when 16 then 3
      when 17 then 2
      else 2
    end as star_rating
  from (
    values
      ('DARUNA'),
      ('PHOTHA'),
      ('SARASIT'),
      ('BENJ')
  ) as schools(school_code)
  cross join generate_series(1, 18) as numbers(player_number)
),
prototype_players as (
  select
    school_code,
    player_number,
    position,
    star_rating,
    player_number as shirt_number,
    school_code || ' Player ' || lpad(player_number::text, 2, '0') as player_name
  from prototype_roster
),
resolved_players as (
  select
    prototype_players.school_code,
    prototype_players.player_number,
    prototype_players.position,
    prototype_players.star_rating,
    prototype_players.shirt_number,
    player_record.id as player_id
  from prototype_players
  join lateral (
    select id
    from public.players
    where nickname = prototype_players.player_name
    order by created_at asc, id asc
    limit 1
  ) as player_record on true
),
upserted_season_players as (
  insert into public.season_players (
    season_id,
    team_id,
    player_id,
    shirt_number,
    position,
    status
  )
  select
    active_season.id,
    schools.id,
    resolved_players.player_id,
    resolved_players.shirt_number,
    resolved_players.position,
    'active'
  from resolved_players
  join active_season on true
  join public.schools on schools.code = resolved_players.school_code
  on conflict (season_id, player_id) do update
  set
    team_id = excluded.team_id,
    shirt_number = excluded.shirt_number,
    position = excluded.position,
    status = excluded.status,
    updated_at = now()
  returning
    public.season_players.id,
    public.season_players.player_id,
    public.season_players.position
)
insert into public.arena_player_settings (
  season_player_id,
  star_rating,
  fantasy_status,
  fantasy_position_override
)
select
  upserted_season_players.id,
  resolved_players.star_rating,
  'active',
  upserted_season_players.position
from upserted_season_players
join resolved_players
  on resolved_players.player_id = upserted_season_players.player_id
on conflict (season_player_id) do update
set
  star_rating = excluded.star_rating,
  fantasy_status = excluded.fantasy_status,
  fantasy_position_override = excluded.fantasy_position_override,
  updated_at = now();

commit;

select
  schools.code as school_code,
  season_players.position,
  count(*) as player_count
from public.season_players
join public.seasons on seasons.id = season_players.season_id
join public.schools on schools.id = season_players.team_id
where seasons.slug = 'jaturamit-ratchaburi-2'
group by schools.code, season_players.position
order by schools.code, season_players.position;
