-- Arena collection read RPC.
-- Exposes only safe display fields for the authenticated user's current cards.

create or replace function public.get_my_arena_collection()
returns table(
  user_card_id uuid,
  printed_card_id uuid,
  card_name text,
  edition_name text,
  rarity text,
  serial_label text,
  player_label text,
  school_label text,
  season_label text,
  position_label text,
  ownership_status text,
  acquired_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with current_profile as (
    select public.current_arena_profile_id() as id
  )
  select
    user_card.id as user_card_id,
    printed_card.id as printed_card_id,
    card_template.name as card_name,
    card_edition.name as edition_name,
    card_edition.rarity,
    printed_card.serial_label,
    printed_card.player_label,
    printed_card.school_label,
    coalesce(printed_card.season_label, card_edition.season_label) as season_label,
    printed_card.position_label,
    user_card.ownership_status,
    user_card.acquired_at
  from public.user_cards as user_card
  join current_profile on current_profile.id = user_card.profile_id
  join public.printed_cards as printed_card
    on printed_card.id = user_card.printed_card_id
  join public.card_editions as card_edition
    on card_edition.id = printed_card.edition_id
  join public.card_templates as card_template
    on card_template.id = card_edition.template_id
  where user_card.ownership_status in (
    'owned',
    'locked',
    'transferable',
    'disputed',
    'frozen'
  )
  order by user_card.acquired_at desc, user_card.id desc;
$$;

revoke all on function public.get_my_arena_collection() from public;
grant execute on function public.get_my_arena_collection() to authenticated;
