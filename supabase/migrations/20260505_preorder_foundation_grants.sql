-- Grant table privileges for the preorder foundation tables.
-- RLS policies still control row access; these grants only allow the roles to
-- reach those policies.

grant select on public.preorder_campaigns to anon, authenticated;
grant select on public.preorder_teams to anon, authenticated;
grant select on public.preorder_products to anon, authenticated;

grant insert, update, delete on public.preorder_campaigns to authenticated;
grant insert, update, delete on public.preorder_teams to authenticated;
grant insert, update, delete on public.preorder_products to authenticated;

grant select on public.preorder_order_items to authenticated;
