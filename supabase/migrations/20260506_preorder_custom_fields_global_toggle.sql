-- Enforce the global preorder custom name/number toggle for secure writes.
-- Product-level settings still control each item, but this guard lets the
-- existing admin preorder setting disable custom fields for every product.

create or replace function public.preorder_custom_fields_enabled()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config_text text;
  v_config jsonb;
  v_legacy_text text;
  v_enabled boolean := true;
begin
  select value::text
  into v_legacy_text
  from public.site_settings
  where key = 'preorder_custom_fields_enabled'
  limit 1;

  if lower(trim(both '"' from coalesce(v_legacy_text, ''))) = 'false' then
    return false;
  end if;

  select value::text
  into v_config_text
  from public.site_settings
  where key = 'preorder_config'
  limit 1;

  if v_config_text is not null then
    begin
      v_config := v_config_text::jsonb;

      if v_config ? 'customFieldsEnabled' then
        v_enabled := coalesce(
          (v_config->>'customFieldsEnabled')::boolean,
          v_enabled
        );
      end if;
    exception
      when others then
        v_enabled := v_enabled;
    end;
  end if;

  return v_enabled;
end;
$$;

create or replace function public.enforce_preorder_custom_fields_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.preorder_custom_fields_enabled() = false
    and (
      nullif(btrim(coalesce(new.custom_name, '')), '') is not null
      or nullif(btrim(coalesce(new.custom_number, '')), '') is not null
    )
  then
    raise exception 'preorder custom name and number fields are disabled';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_preorder_custom_fields_enabled
  on public.preorder_order_items;

create trigger enforce_preorder_custom_fields_enabled
before insert or update on public.preorder_order_items
for each row
execute function public.enforce_preorder_custom_fields_enabled();

grant execute on function public.preorder_custom_fields_enabled()
  to anon, authenticated;
