# Project Context

## Current architecture
This repository is a single Next.js App Router application, not a monorepo.

Routes live under `app/`.
Shared UI lives under `components/`.
Helpers live under `lib/`.
Supabase migrations live under `supabase/migrations/`.

Do not move the project into `apps/web`, `apps/arena`, or any monorepo structure unless explicitly requested.

## Stack
- Next.js App Router
- React
- Supabase
- Vercel
- Omise / PromptPay payment route handlers

## Preorder system
The public preorder page lives at:

`app/preorder/page.tsx`

The main preorder form lives at:

`components/preorder/PreorderForm.tsx`

Public order creation should go through the Supabase RPC:

`create_preorder_order`

Do not insert public preorder data directly into tables from the client.

## Admin preorder system
Admin preorder pages live under:

`app/admin/preorder-*`
`app/admin/preorders`

Shared admin preorder helpers live at:

`components/admin/preorder/shared.tsx`

## Payment system
Payment integration lives under:

`app/api/payments/omise`

Payment route handlers should remain isolated in App Router API routes.

## Development guardrails
- Keep the current single-app structure.
- Do not convert to a monorepo.
- Do not perform large refactors without approval.
- Prefer small, safe changes.
- Inspect existing routes/components before adding new ones.
- Explain database schema changes before editing migrations.
- Run build/check commands before committing.
