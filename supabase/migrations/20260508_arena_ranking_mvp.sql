-- Arena + ranking MVP.
-- Public visitors can vote for one arena entry per contest through an RPC.
-- Rankings are exposed through a read-only RPC so the UI does not need vote
-- table access.

create extension if not exists pgcrypto;

create table if not exists public.arena_contests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arena_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.arena_contests(id) on delete cascade,
  slug text not null,
  display_name text not null,
  short_name text,
  description text,
  color_label text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contest_id, slug)
);

create table if not exists public.arena_votes (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.arena_contests(id) on delete cascade,
  entry_id uuid not null references public.arena_entries(id) on delete cascade,
  voter_token_hash text not null,
  voter_label text,
  created_at timestamptz not null default now(),
  unique (contest_id, voter_token_hash)
);

create index if not exists arena_entries_contest_active_idx
  on public.arena_entries (contest_id, is_active, sort_order);

create index if not exists arena_votes_contest_entry_idx
  on public.arena_votes (contest_id, entry_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_contests_updated_at'
  ) then
    create trigger set_arena_contests_updated_at
    before update on public.arena_contests
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_entries_updated_at'
  ) then
    create trigger set_arena_entries_updated_at
    before update on public.arena_entries
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

insert into public.arena_contests (
  slug,
  title,
  description,
  status,
  sort_order
) values (
  'jaturamit-arena-2026',
  'Jaturamit Arena',
  'Vote for the school side you want to push up the live arena ranking.',
  'active',
  1
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

with current_contest as (
  select id
  from public.arena_contests
  where slug = 'jaturamit-arena-2026'
),
seed_entries as (
  select
    current_contest.id as contest_id,
    entry.slug,
    entry.display_name,
    entry.short_name,
    entry.color_label,
    entry.sort_order
  from current_contest
  join (
    values
      ('photha', 'Phothawatthana Senee', 'Photha', 'Yellow / Blue', 1),
      ('benjamarachutit', 'Benjamarachutit Ratchaburi', 'Benjama', 'Pink / Blue', 2),
      ('daruna', 'Daruna Ratchaburi', 'Daruna', 'White / Red', 3),
      ('sarasit', 'Sarasit Phitthayalai', 'Sarasit', 'Blue', 4)
  ) as entry(slug, display_name, short_name, color_label, sort_order) on true
)
insert into public.arena_entries (
  contest_id,
  slug,
  display_name,
  short_name,
  color_label,
  is_active,
  sort_order
)
select
  contest_id,
  slug,
  display_name,
  short_name,
  color_label,
  true,
  sort_order
from seed_entries
on conflict (contest_id, slug) do update set
  display_name = excluded.display_name,
  short_name = excluded.short_name,
  color_label = excluded.color_label,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.get_arena_ranking(p_contest_id uuid)
returns table(
  entry_id uuid,
  slug text,
  display_name text,
  short_name text,
  description text,
  color_label text,
  image_url text,
  vote_count bigint,
  rank_position bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked_entries as (
    select
      entry.id as entry_id,
      entry.slug,
      entry.display_name,
      entry.short_name,
      entry.description,
      entry.color_label,
      entry.image_url,
      count(vote.id) as vote_count,
      row_number() over (
        order by count(vote.id) desc, entry.sort_order asc, entry.display_name asc
      ) as rank_position
    from public.arena_entries as entry
    join public.arena_contests as contest on contest.id = entry.contest_id
    left join public.arena_votes as vote on vote.entry_id = entry.id
    where entry.contest_id = p_contest_id
      and entry.is_active = true
      and contest.status in ('active', 'closed')
    group by entry.id
  )
  select *
  from ranked_entries
  order by rank_position asc;
$$;

create or replace function public.cast_arena_vote(
  p_contest_id uuid,
  p_entry_id uuid,
  p_voter_token text,
  p_voter_label text default null
)
returns table(
  success boolean,
  message text,
  entry_id uuid,
  total_votes bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contest public.arena_contests%rowtype;
  v_entry public.arena_entries%rowtype;
  v_token_hash text;
  v_total_votes bigint;
  v_inserted_count integer;
begin
  if nullif(btrim(coalesce(p_voter_token, '')), '') is null then
    raise exception 'voter token is required';
  end if;

  select *
  into v_contest
  from public.arena_contests
  where id = p_contest_id
  limit 1;

  if not found or v_contest.status <> 'active' then
    return query select false, 'Arena voting is not active', p_entry_id, 0::bigint;
    return;
  end if;

  if v_contest.starts_at is not null and now() < v_contest.starts_at then
    return query select false, 'Arena voting has not started', p_entry_id, 0::bigint;
    return;
  end if;

  if v_contest.ends_at is not null and now() > v_contest.ends_at then
    return query select false, 'Arena voting has ended', p_entry_id, 0::bigint;
    return;
  end if;

  select *
  into v_entry
  from public.arena_entries
  where id = p_entry_id
    and contest_id = p_contest_id
    and is_active = true
  limit 1;

  if not found then
    return query select false, 'Arena entry was not found', p_entry_id, 0::bigint;
    return;
  end if;

  v_token_hash := encode(digest(btrim(p_voter_token), 'sha256'), 'hex');

  insert into public.arena_votes (
    contest_id,
    entry_id,
    voter_token_hash,
    voter_label
  ) values (
    p_contest_id,
    p_entry_id,
    v_token_hash,
    nullif(btrim(coalesce(p_voter_label, '')), '')
  )
  on conflict (contest_id, voter_token_hash) do nothing;

  get diagnostics v_inserted_count = row_count;

  select count(*)
  into v_total_votes
  from public.arena_votes
  where arena_votes.entry_id = p_entry_id;

  if v_inserted_count = 0 then
    return query select false, 'This device already voted in this arena', p_entry_id, v_total_votes;
    return;
  end if;

  return query select true, 'Vote counted', p_entry_id, v_total_votes;
end;
$$;

revoke all on function public.get_arena_ranking(uuid) from public;
grant execute on function public.get_arena_ranking(uuid) to anon, authenticated;

revoke all on function public.cast_arena_vote(uuid, uuid, text, text) from public;
grant execute on function public.cast_arena_vote(uuid, uuid, text, text) to anon, authenticated;

alter table public.arena_contests enable row level security;
alter table public.arena_entries enable row level security;
alter table public.arena_votes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_contests'
      and policyname = 'Public can read visible arena contests'
  ) then
    create policy "Public can read visible arena contests"
      on public.arena_contests
      for select
      to anon, authenticated
      using (status in ('active', 'closed'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_entries'
      and policyname = 'Public can read visible arena entries'
  ) then
    create policy "Public can read visible arena entries"
      on public.arena_entries
      for select
      to anon, authenticated
      using (
        is_active = true
        and exists (
          select 1
          from public.arena_contests
          where arena_contests.id = arena_entries.contest_id
            and arena_contests.status in ('active', 'closed')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_contests'
      and policyname = 'Active admins can manage arena contests'
  ) then
    create policy "Active admins can manage arena contests"
      on public.arena_contests
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
      and tablename = 'arena_entries'
      and policyname = 'Active admins can manage arena entries'
  ) then
    create policy "Active admins can manage arena entries"
      on public.arena_entries
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
      and tablename = 'arena_votes'
      and policyname = 'Active admins can read arena votes'
  ) then
    create policy "Active admins can read arena votes"
      on public.arena_votes
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
