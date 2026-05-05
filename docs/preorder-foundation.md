# Preorder database foundation

This foundation adds normalized preorder tables without changing the current public preorder form or admin order dashboard.

## New tables

- `public.preorder_campaigns` stores preorder rounds such as `jaturamit-ratchaburi-2026`.
- `public.preorder_teams` stores school/team metadata used by preorder products.
- `public.preorder_products` stores products for a campaign, including price, image URL, size requirement, and custom name/number rules.
- `public.preorder_order_items` prepares for multi-item orders in a later milestone.

The existing `public.preorders` table remains the active order table. This migration only adds optional `campaign_id` and `product_id` columns for future compatibility. Existing columns such as `team`, `size`, `shirt_name`, `shirt_number`, `quantity`, `unit_price`, and `total_amount` remain in place.

## What this PR does not change

- It does not change `/preorder`.
- It does not change `components/preorder/PreorderForm.tsx`.
- It does not change admin preorder order management.
- It does not migrate existing preorder rows into `preorder_order_items`.

## Running the migration

Run the SQL file in Supabase SQL Editor:

```text
supabase/migrations/20260505_preorder_foundation.sql
```

The migration is additive and uses upserts for seed data so it can be rerun without duplicating the seeded campaign, teams, or products.

## Security model

Public users can read only active campaigns, active teams, and active products. Public users cannot read `preorders` or `preorder_order_items`.

Active admins are detected with the existing pattern:

```sql
exists (
  select 1
  from public.admin_users
  where auth_user_id = auth.uid()
    and status = 'active'
)
```

## Next milestone

PR 2 should add admin campaign/product management on top of these tables while keeping the existing public preorder flow backward compatible.
