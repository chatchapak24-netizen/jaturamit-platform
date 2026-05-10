-- Arena Claim System V1 draft.
-- This migration is intentionally additive and is not applied automatically.
-- Claim codes use random opaque values; only hashes are stored in the DB.

create extension if not exists pgcrypto;

create table if not exists public.arena_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  handle text unique,
  display_name text not null default 'Arena Collector',
  avatar_url text,
  profile_status text not null default 'active' check (
    profile_status in ('active', 'suspended', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  template_type text not null default 'player_card' check (
    template_type in ('player_card', 'team_card', 'moment_card', 'special_card')
  ),
  design_key text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_editions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.card_templates(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text,
  season_label text,
  tournament_label text,
  rarity text not null check (
    rarity in ('common', 'rare', 'epic', 'legendary', 'limited')
  ),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'archived')
  ),
  edition_size integer check (edition_size is null or edition_size > 0),
  release_notes text,
  published_at timestamptz,
  locked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_editions_limited_has_size_check
    check (rarity <> 'limited' or edition_size is not null)
);

create table if not exists public.printed_cards (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.card_editions(id) on delete restrict,
  player_label text,
  school_label text,
  season_label text,
  jersey_number text,
  position_label text,
  serial_number integer not null check (serial_number > 0),
  serial_label text not null,
  status text not null default 'draft' check (
    status in ('draft', 'printed', 'claimable', 'claimed', 'archived')
  ),
  claim_status text not null default 'unissued' check (
    claim_status in ('unissued', 'claimable', 'claimed', 'archived')
  ),
  story text,
  created_context jsonb not null default '{}'::jsonb,
  printed_at timestamptz,
  first_claimed_at timestamptz,
  first_owner_profile_id uuid references public.arena_profiles(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, serial_number),
  unique (edition_id, serial_label)
);

create table if not exists public.claim_codes (
  id uuid primary key default gen_random_uuid(),
  printed_card_id uuid not null references public.printed_cards(id) on delete restrict,
  code_hash text not null unique,
  code_hint text,
  status text not null default 'active' check (
    status in ('active', 'claimed', 'disabled', 'expired')
  ),
  expires_at timestamptz,
  claimed_at timestamptz,
  claimed_by_profile_id uuid references public.arena_profiles(id) on delete set null,
  disabled_at timestamptz,
  disabled_reason text,
  reissued_from_claim_code_id uuid references public.claim_codes(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.arena_profiles(id) on delete cascade,
  printed_card_id uuid not null references public.printed_cards(id) on delete restrict,
  ownership_status text not null default 'owned' check (
    ownership_status in (
      'owned',
      'locked',
      'transferable',
      'disputed',
      'frozen',
      'archived'
    )
  ),
  acquired_via text not null default 'claim' check (
    acquired_via in (
      'claim',
      'admin_correction',
      'transfer',
      'marketplace',
      'trade',
      'gift'
    )
  ),
  acquired_at timestamptz not null default now(),
  locked_until timestamptz,
  lock_reason text,
  visibility text not null default 'private' check (
    visibility in ('private', 'public', 'unlisted')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, printed_card_id)
);

create table if not exists public.card_claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_code_id uuid references public.claim_codes(id) on delete set null,
  printed_card_id uuid references public.printed_cards(id) on delete set null,
  profile_id uuid references public.arena_profiles(id) on delete set null,
  user_card_id uuid references public.user_cards(id) on delete set null,
  event_type text not null check (
    event_type in ('claim_attempt', 'claim_success', 'claim_failed')
  ),
  result text not null check (result in ('success', 'failed')),
  failure_reason text,
  request_fingerprint text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.card_ownership_history (
  id uuid primary key default gen_random_uuid(),
  printed_card_id uuid not null references public.printed_cards(id) on delete restrict,
  user_card_id uuid references public.user_cards(id) on delete set null,
  from_profile_id uuid references public.arena_profiles(id) on delete set null,
  to_profile_id uuid references public.arena_profiles(id) on delete set null,
  event_type text not null check (
    event_type in ('claim', 'transfer', 'admin_correction', 'archive')
  ),
  reason text,
  actor_profile_id uuid references public.arena_profiles(id) on delete set null,
  actor_admin_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.arena_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (
    actor_type in ('anonymous', 'user', 'admin', 'system')
  ),
  actor_profile_id uuid references public.arena_profiles(id) on delete set null,
  actor_admin_user_id uuid,
  action text not null,
  target_entity_type text not null,
  target_entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  request_fingerprint text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists claim_codes_single_active_card_uidx
  on public.claim_codes (printed_card_id)
  where status in ('active', 'claimed');

create unique index if not exists user_cards_current_owner_uidx
  on public.user_cards (printed_card_id)
  where ownership_status in ('owned', 'locked', 'transferable', 'disputed', 'frozen');

create index if not exists arena_profiles_auth_user_idx
  on public.arena_profiles (auth_user_id);

create index if not exists card_editions_template_status_idx
  on public.card_editions (template_id, status);

create index if not exists printed_cards_edition_status_idx
  on public.printed_cards (edition_id, status, claim_status);

create index if not exists printed_cards_claim_status_idx
  on public.printed_cards (status, claim_status, created_at desc);

create index if not exists claim_codes_hash_status_idx
  on public.claim_codes (code_hash, status);

create index if not exists claim_codes_printed_card_status_idx
  on public.claim_codes (printed_card_id, status);

create index if not exists user_cards_profile_status_idx
  on public.user_cards (profile_id, ownership_status, acquired_at desc);

create index if not exists card_claim_events_printed_card_idx
  on public.card_claim_events (printed_card_id, created_at desc);

create index if not exists card_ownership_history_printed_card_idx
  on public.card_ownership_history (printed_card_id, created_at desc);

create index if not exists arena_audit_logs_target_idx
  on public.arena_audit_logs (target_entity_type, target_entity_id, created_at desc);

create index if not exists arena_audit_logs_actor_idx
  on public.arena_audit_logs (actor_type, actor_profile_id, created_at desc);

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.current_arena_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.arena_profiles
  where auth_user_id = auth.uid()
    and profile_status = 'active'
  limit 1;
$$;

create or replace function public.current_user_owns_printed_card(
  p_printed_card_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_cards as user_card
    join public.arena_profiles as profile on profile.id = user_card.profile_id
    where user_card.printed_card_id = p_printed_card_id
      and profile.auth_user_id = auth.uid()
      and user_card.ownership_status in (
        'owned',
        'locked',
        'transferable',
        'disputed',
        'frozen'
      )
  );
$$;

create or replace function public.normalize_claim_code(p_claim_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(upper(btrim(coalesce(p_claim_code, ''))), '[^A-Z0-9]', '', 'g');
$$;

create or replace function public.claim_code_hash(p_claim_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(digest(public.normalize_claim_code(p_claim_code), 'sha256'), 'hex');
$$;

create or replace function public.prevent_arena_append_only_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'arena append-only records cannot be deleted';
  end if;

  if tg_table_name = 'card_claim_events' then
    if new.id is not distinct from old.id
      and new.claim_code_id is not distinct from old.claim_code_id
      and new.printed_card_id is not distinct from old.printed_card_id
      and new.profile_id is not distinct from old.profile_id
      and new.user_card_id is not distinct from old.user_card_id
      and new.event_type is not distinct from old.event_type
      and new.result is not distinct from old.result
      and new.failure_reason is not distinct from old.failure_reason
      and new.metadata is not distinct from old.metadata
      and new.created_at is not distinct from old.created_at
      and (
        new.request_fingerprint is not distinct from old.request_fingerprint
        or new.request_fingerprint is null
      )
      and (
        new.user_agent is not distinct from old.user_agent
        or new.user_agent is null
      )
    then
      return new;
    end if;
  end if;

  if tg_table_name = 'arena_audit_logs' then
    if new.id is not distinct from old.id
      and new.actor_type is not distinct from old.actor_type
      and new.actor_profile_id is not distinct from old.actor_profile_id
      and new.actor_admin_user_id is not distinct from old.actor_admin_user_id
      and new.action is not distinct from old.action
      and new.target_entity_type is not distinct from old.target_entity_type
      and new.target_entity_id is not distinct from old.target_entity_id
      and new.before_state is not distinct from old.before_state
      and new.after_state is not distinct from old.after_state
      and new.reason is not distinct from old.reason
      and new.metadata is not distinct from old.metadata
      and new.created_at is not distinct from old.created_at
      and (
        new.request_fingerprint is not distinct from old.request_fingerprint
        or new.request_fingerprint is null
      )
      and (
        new.ip_address is not distinct from old.ip_address
        or new.ip_address is null
      )
      and (
        new.user_agent is not distinct from old.user_agent
        or new.user_agent is null
      )
    then
      return new;
    end if;
  end if;

  raise exception 'arena append-only records cannot be rewritten';
end;
$$;

create or replace function public.prevent_arena_profile_privileged_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_active_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.auth_user_id is distinct from old.auth_user_id
    or new.profile_status is distinct from old.profile_status
    or new.created_at is distinct from old.created_at
  then
    raise exception 'arena profile privileged fields cannot be updated by profile owners';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_card_editions_locked_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_printed_count integer;
begin
  if old.status = 'published' and (
    new.template_id is distinct from old.template_id
    or new.slug is distinct from old.slug
    or new.rarity is distinct from old.rarity
    or new.edition_size is distinct from old.edition_size
    or new.season_label is distinct from old.season_label
    or new.tournament_label is distinct from old.tournament_label
  ) then
    raise exception 'published card editions cannot change immutable fields';
  end if;

  if old.status <> 'published' and new.status = 'published' then
    new.published_at = coalesce(new.published_at, now());
    new.locked_at = coalesce(new.locked_at, now());
  end if;

  if new.edition_size is not null then
    select count(*)
    into v_printed_count
    from public.printed_cards
    where edition_id = new.id;

    if v_printed_count > new.edition_size then
      raise exception 'edition size cannot be lower than existing printed cards';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_printed_cards_locked_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('printed', 'claimable', 'claimed') and (
    new.edition_id is distinct from old.edition_id
    or new.player_label is distinct from old.player_label
    or new.school_label is distinct from old.school_label
    or new.season_label is distinct from old.season_label
    or new.jersey_number is distinct from old.jersey_number
    or new.position_label is distinct from old.position_label
    or new.serial_number is distinct from old.serial_number
    or new.serial_label is distinct from old.serial_label
    or new.created_context is distinct from old.created_context
    or new.printed_at is distinct from old.printed_at
  ) then
    raise exception 'printed cards cannot change immutable fields after printing';
  end if;

  if old.first_claimed_at is not null
    and new.first_claimed_at is distinct from old.first_claimed_at
  then
    raise exception 'first claim timestamp cannot be changed after claim';
  end if;

  if old.first_owner_profile_id is not null
    and new.first_owner_profile_id is distinct from old.first_owner_profile_id
  then
    raise exception 'first owner cannot be changed after claim';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_printed_card_edition_size()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_edition_size integer;
  v_printed_count integer;
begin
  select edition_size
  into v_edition_size
  from public.card_editions
  where id = new.edition_id
  for update;

  if v_edition_size is not null then
    select count(*)
    into v_printed_count
    from public.printed_cards
    where edition_id = new.edition_id
      and id is distinct from new.id;

    if v_printed_count + 1 > v_edition_size then
      raise exception 'printed card count cannot exceed edition size';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_arena_profiles_updated_at'
  ) then
    create trigger set_arena_profiles_updated_at
    before update on public.arena_profiles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'protect_arena_profile_privileged_fields'
  ) then
    create trigger protect_arena_profile_privileged_fields
    before update on public.arena_profiles
    for each row execute function public.prevent_arena_profile_privileged_update();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_card_templates_updated_at'
  ) then
    create trigger set_card_templates_updated_at
    before update on public.card_templates
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_card_editions_updated_at'
  ) then
    create trigger set_card_editions_updated_at
    before update on public.card_editions
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'lock_card_editions_after_publish'
  ) then
    create trigger lock_card_editions_after_publish
    before update on public.card_editions
    for each row execute function public.prevent_card_editions_locked_update();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_printed_cards_updated_at'
  ) then
    create trigger set_printed_cards_updated_at
    before update on public.printed_cards
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'lock_printed_cards_after_printing'
  ) then
    create trigger lock_printed_cards_after_printing
    before update on public.printed_cards
    for each row execute function public.prevent_printed_cards_locked_update();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'enforce_printed_cards_edition_size'
  ) then
    create trigger enforce_printed_cards_edition_size
    before insert or update of edition_id on public.printed_cards
    for each row execute function public.enforce_printed_card_edition_size();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_claim_codes_updated_at'
  ) then
    create trigger set_claim_codes_updated_at
    before update on public.claim_codes
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_user_cards_updated_at'
  ) then
    create trigger set_user_cards_updated_at
    before update on public.user_cards
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'card_claim_events_append_only'
  ) then
    create trigger card_claim_events_append_only
    before update or delete on public.card_claim_events
    for each row execute function public.prevent_arena_append_only_changes();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'card_ownership_history_append_only'
  ) then
    create trigger card_ownership_history_append_only
    before update or delete on public.card_ownership_history
    for each row execute function public.prevent_arena_append_only_changes();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'arena_audit_logs_append_only'
  ) then
    create trigger arena_audit_logs_append_only
    before update or delete on public.arena_audit_logs
    for each row execute function public.prevent_arena_append_only_changes();
  end if;
end;
$$;

create or replace function public.preview_claim_card(p_claim_code text)
returns table(
  success boolean,
  message text,
  card_name text,
  edition_name text,
  rarity text,
  serial_label text,
  player_label text,
  school_label text,
  season_label text,
  position_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code_hash text;
begin
  if public.normalize_claim_code(p_claim_code) = '' then
    return query select
      false,
      'กรุณากรอกรหัสเคลมการ์ด',
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  v_code_hash := public.claim_code_hash(p_claim_code);

  return query
    select
      true,
      'พบการ์ดที่พร้อมตรวจสอบ',
      template.name,
      edition.name,
      edition.rarity,
      printed_card.serial_label,
      printed_card.player_label,
      printed_card.school_label,
      printed_card.season_label,
      printed_card.position_label
    from public.claim_codes as claim_code
    join public.printed_cards as printed_card
      on printed_card.id = claim_code.printed_card_id
    join public.card_editions as edition
      on edition.id = printed_card.edition_id
    join public.card_templates as template
      on template.id = edition.template_id
    where claim_code.code_hash = v_code_hash
      and claim_code.status = 'active'
      and (claim_code.expires_at is null or claim_code.expires_at > now())
      and edition.status = 'published'
      and printed_card.status = 'claimable'
      and printed_card.claim_status = 'claimable'
    limit 1;

  if not found then
    return query select
      false,
      'ไม่พบการ์ดที่พร้อมเคลม',
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text;
  end if;
end;
$$;

create or replace function public.claim_card(
  p_claim_code text,
  p_request_fingerprint text default null,
  p_user_agent text default null
)
returns table(
  success boolean,
  message text,
  printed_card_id uuid,
  user_card_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_profile public.arena_profiles%rowtype;
  v_claim_code public.claim_codes%rowtype;
  v_printed_card public.printed_cards%rowtype;
  v_edition public.card_editions%rowtype;
  v_code_hash text;
  v_existing_user_card_id uuid;
  v_user_card_id uuid;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    return query select
      false,
      'กรุณาเข้าสู่ระบบก่อนเคลมการ์ด',
      null::uuid,
      null::uuid;
    return;
  end if;

  if public.normalize_claim_code(p_claim_code) = '' then
    return query select
      false,
      'กรุณากรอกรหัสเคลมการ์ด',
      null::uuid,
      null::uuid;
    return;
  end if;

  select *
  into v_profile
  from public.arena_profiles
  where auth_user_id = v_auth_user_id
  for update;

  if not found then
    insert into public.arena_profiles (auth_user_id)
    values (v_auth_user_id)
    on conflict (auth_user_id) do nothing
    returning *
    into v_profile;

    if not found then
      select *
      into v_profile
      from public.arena_profiles
      where auth_user_id = v_auth_user_id
      for update;
    end if;
  end if;

  if v_profile.profile_status <> 'active' then
    return query select
      false,
      'บัญชี Arena นี้ยังไม่สามารถเคลมการ์ดได้',
      null::uuid,
      null::uuid;
    return;
  end if;

  v_code_hash := public.claim_code_hash(p_claim_code);

  select *
  into v_claim_code
  from public.claim_codes
  where code_hash = v_code_hash
  for update;

  if not found then
    insert into public.card_claim_events (
      profile_id,
      event_type,
      result,
      failure_reason,
      request_fingerprint,
      user_agent
    ) values (
      v_profile.id,
      'claim_failed',
      'failed',
      'invalid_code',
      p_request_fingerprint,
      p_user_agent
    );

    insert into public.arena_audit_logs (
      actor_type,
      actor_profile_id,
      action,
      target_entity_type,
      reason,
      request_fingerprint,
      user_agent
    ) values (
      'user',
      v_profile.id,
      'claim_failed',
      'claim_code',
      'invalid_code',
      p_request_fingerprint,
      p_user_agent
    );

    return query select
      false,
      'รหัสเคลมไม่ถูกต้องหรือไม่พร้อมใช้งาน',
      null::uuid,
      null::uuid;
    return;
  end if;

  select *
  into v_printed_card
  from public.printed_cards
  where id = v_claim_code.printed_card_id
  for update;

  select *
  into v_edition
  from public.card_editions
  where id = v_printed_card.edition_id
  for update;

  select id
  into v_existing_user_card_id
  from public.user_cards
  where printed_card_id = v_printed_card.id
    and ownership_status in ('owned', 'locked', 'transferable', 'disputed', 'frozen')
  for update;

  if v_claim_code.status = 'claimed'
    and v_claim_code.claimed_by_profile_id = v_profile.id
    and v_existing_user_card_id is not null
  then
    return query select
      true,
      'การ์ดใบนี้อยู่ใน Collection ของคุณแล้ว',
      v_printed_card.id,
      v_existing_user_card_id;
    return;
  end if;

  if v_claim_code.status <> 'active'
    or (v_claim_code.expires_at is not null and v_claim_code.expires_at <= now())
    or v_edition.status <> 'published'
    or v_printed_card.status <> 'claimable'
    or v_printed_card.claim_status <> 'claimable'
    or v_existing_user_card_id is not null
  then
    insert into public.card_claim_events (
      claim_code_id,
      printed_card_id,
      profile_id,
      event_type,
      result,
      failure_reason,
      request_fingerprint,
      user_agent
    ) values (
      v_claim_code.id,
      v_printed_card.id,
      v_profile.id,
      'claim_failed',
      'failed',
      'not_claimable',
      p_request_fingerprint,
      p_user_agent
    );

    insert into public.arena_audit_logs (
      actor_type,
      actor_profile_id,
      action,
      target_entity_type,
      target_entity_id,
      reason,
      request_fingerprint,
      user_agent
    ) values (
      'user',
      v_profile.id,
      'claim_failed',
      'printed_card',
      v_printed_card.id,
      'not_claimable',
      p_request_fingerprint,
      p_user_agent
    );

    return query select
      false,
      'การ์ดใบนี้ถูกเคลมแล้วหรือยังไม่พร้อมให้เคลม',
      v_printed_card.id,
      null::uuid;
    return;
  end if;

  insert into public.user_cards (
    profile_id,
    printed_card_id,
    ownership_status,
    acquired_via
  ) values (
    v_profile.id,
    v_printed_card.id,
    'owned',
    'claim'
  )
  returning id
  into v_user_card_id;

  update public.claim_codes
  set
    status = 'claimed',
    claimed_at = now(),
    claimed_by_profile_id = v_profile.id
  where id = v_claim_code.id;

  update public.printed_cards
  set
    status = 'claimed',
    claim_status = 'claimed',
    first_claimed_at = coalesce(first_claimed_at, now()),
    first_owner_profile_id = coalesce(first_owner_profile_id, v_profile.id)
  where id = v_printed_card.id;

  insert into public.card_claim_events (
    claim_code_id,
    printed_card_id,
    profile_id,
    user_card_id,
    event_type,
    result,
    request_fingerprint,
    user_agent
  ) values (
    v_claim_code.id,
    v_printed_card.id,
    v_profile.id,
    v_user_card_id,
    'claim_success',
    'success',
    p_request_fingerprint,
    p_user_agent
  );

  insert into public.card_ownership_history (
    printed_card_id,
    user_card_id,
    to_profile_id,
    event_type,
    reason,
    actor_profile_id
  ) values (
    v_printed_card.id,
    v_user_card_id,
    v_profile.id,
    'claim',
    'initial_claim',
    v_profile.id
  );

  insert into public.arena_audit_logs (
    actor_type,
    actor_profile_id,
    action,
    target_entity_type,
    target_entity_id,
    after_state,
    reason,
    request_fingerprint,
    user_agent
  ) values (
    'user',
    v_profile.id,
    'claim_success',
    'printed_card',
    v_printed_card.id,
    jsonb_build_object(
      'user_card_id', v_user_card_id,
      'claim_code_id', v_claim_code.id,
      'profile_id', v_profile.id
    ),
    'initial_claim',
    p_request_fingerprint,
    p_user_agent
  );

  return query select
    true,
    'เคลมการ์ดสำเร็จ การ์ดถูกเพิ่มเข้า Collection ของคุณแล้ว',
    v_printed_card.id,
    v_user_card_id;
end;
$$;

alter table public.arena_profiles enable row level security;
alter table public.card_templates enable row level security;
alter table public.card_editions enable row level security;
alter table public.printed_cards enable row level security;
alter table public.claim_codes enable row level security;
alter table public.user_cards enable row level security;
alter table public.card_claim_events enable row level security;
alter table public.card_ownership_history enable row level security;
alter table public.arena_audit_logs enable row level security;

do $$
begin
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
      using (auth_user_id = auth.uid() or public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_profiles'
      and policyname = 'Arena profile owners can update safe profile fields'
  ) then
    create policy "Arena profile owners can update safe profile fields"
      on public.arena_profiles
      for update
      to authenticated
      using (auth_user_id = auth.uid() or public.is_active_admin())
      with check (auth_user_id = auth.uid() or public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_profiles'
      and policyname = 'Authenticated users can create their arena profile'
  ) then
    create policy "Authenticated users can create their arena profile"
      on public.arena_profiles
      for insert
      to authenticated
      with check (auth_user_id = auth.uid() or public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'card_templates'
      and policyname = 'Public can read active card templates'
  ) then
    create policy "Public can read active card templates"
      on public.card_templates
      for select
      to anon, authenticated
      using (is_active = true or public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'card_templates'
      and policyname = 'Active admins can manage card templates'
  ) then
    create policy "Active admins can manage card templates"
      on public.card_templates
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'card_editions'
      and policyname = 'Public can read published card editions'
  ) then
    create policy "Public can read published card editions"
      on public.card_editions
      for select
      to anon, authenticated
      using (status = 'published' or public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'card_editions'
      and policyname = 'Active admins can manage card editions'
  ) then
    create policy "Active admins can manage card editions"
      on public.card_editions
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'printed_cards'
      and policyname = 'Card owners and admins can read printed cards'
  ) then
    create policy "Card owners and admins can read printed cards"
      on public.printed_cards
      for select
      to authenticated
      using (
        public.current_user_owns_printed_card(id)
        or public.is_active_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'printed_cards'
      and policyname = 'Active admins can manage printed cards'
  ) then
    create policy "Active admins can manage printed cards"
      on public.printed_cards
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'claim_codes'
      and policyname = 'Active admins can manage claim codes'
  ) then
    create policy "Active admins can manage claim codes"
      on public.claim_codes
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_cards'
      and policyname = 'Arena users can read their cards'
  ) then
    create policy "Arena users can read their cards"
      on public.user_cards
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
      and tablename = 'user_cards'
      and policyname = 'Active admins can manage user cards'
  ) then
    create policy "Active admins can manage user cards"
      on public.user_cards
      for all
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'card_claim_events'
      and policyname = 'Active admins can read card claim events'
  ) then
    create policy "Active admins can read card claim events"
      on public.card_claim_events
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'card_ownership_history'
      and policyname = 'Active admins can read card ownership history'
  ) then
    create policy "Active admins can read card ownership history"
      on public.card_ownership_history
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_audit_logs'
      and policyname = 'Active admins can read arena audit logs'
  ) then
    create policy "Active admins can read arena audit logs"
      on public.arena_audit_logs
      for select
      to authenticated
      using (public.is_active_admin());
  end if;
end;
$$;

revoke all on function public.preview_claim_card(text) from public;
grant execute on function public.preview_claim_card(text) to anon, authenticated;

revoke all on function public.claim_card(text, text, text) from public;
grant execute on function public.claim_card(text, text, text) to authenticated;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to anon, authenticated;

revoke all on function public.current_arena_profile_id() from public;
grant execute on function public.current_arena_profile_id() to authenticated;

revoke all on function public.current_user_owns_printed_card(uuid) from public;
grant execute on function public.current_user_owns_printed_card(uuid) to authenticated;

revoke all on function public.normalize_claim_code(text) from public;
revoke all on function public.claim_code_hash(text) from public;
revoke all on function public.prevent_arena_append_only_changes() from public;
revoke all on function public.prevent_arena_profile_privileged_update() from public;
revoke all on function public.prevent_card_editions_locked_update() from public;
revoke all on function public.prevent_printed_cards_locked_update() from public;
revoke all on function public.enforce_printed_card_edition_size() from public;
