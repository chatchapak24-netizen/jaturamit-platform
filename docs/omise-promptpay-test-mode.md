# Omise/Opn PromptPay payments

This preorder payment path adds optional PromptPay QR payments through Omise/Opn. Slip upload and LINE OA remain available as fallback paths.

## Environment variables

Server-only variables:

```text
OMISE_SECRET_KEY=skey_test_xxx
OMISE_MODE=test
OMISE_PAYMENTS_ENABLED=true
OMISE_ALLOW_LIVE_PAYMENTS=false
SUPABASE_SERVICE_ROLE_KEY=...
```

Client/public variables:

```text
NEXT_PUBLIC_OMISE_PUBLIC_KEY=pkey_test_xxx
NEXT_PUBLIC_APP_URL=https://jaturamit-platform.vercel.app
```

`OMISE_PAYMENTS_ENABLED=false` disables PromptPay API routes without changing code. Use this as an emergency switch while keeping slip upload and LINE OA available.

`OMISE_MODE=live` is blocked unless `OMISE_ALLOW_LIVE_PAYMENTS=true` is also set. Do not enable live mode until the live-mode checklist below is complete.

## Webhook URL

Configure the Opn/Omise webhook URL for the active mode:

```text
https://jaturamit-platform.vercel.app/api/payments/omise/webhook
```

The webhook route never trusts the webhook payload alone. It retrieves the charge from Omise again and verifies:

- charge id
- amount
- currency
- Omise livemode matching `OMISE_MODE`

Only a verified successful charge updates `preorders.status = paid`.

## Database

Run:

```text
supabase/migrations/20260506_preorder_order_code_generation.sql
supabase/migrations/20260506_preorder_promptpay_payment_foundation.sql
```

The order-code migration ensures preorder rows have a customer-facing code such as `JR2026-0001`. PromptPay, slip upload, and check-order all depend on `order_code` plus `phone`.

The payment migration creates `public.preorder_payments` with RLS enabled. Public users cannot select or modify payment rows directly. Active admins can read payment rows through the existing `admin_users` pattern.

The server API routes require `SUPABASE_SERVICE_ROLE_KEY` and the database must grant the service role access to the order/payment tables:

```sql
grant usage on schema public to service_role;
grant select, update on public.preorders to service_role;
grant select, insert, update on public.preorder_payments to service_role;
grant usage, select on all sequences in schema public to service_role;
```

Do not grant public/anon select access to `preorders`, `preorder_order_items`, or `preorder_payments`.

## Test flow

1. Create a preorder order from `/preorder`.
2. On the success card, click `สร้าง QR พร้อมเพย์`.
3. The browser calls `POST /api/payments/omise/create` with `order_code` and `phone`.
4. The server looks up the order and uses the database `total_amount`.
5. The server creates an Omise PromptPay charge.
6. The success card displays the QR image if Omise returns one.
7. Omise sends a webhook when the charge changes.
8. The webhook retrieves and verifies the charge before marking the order paid.

## Fallback and rollback

PromptPay is optional. If QR creation fails, the customer can still:

- attach a slip in the website,
- send a slip or contact admins through LINE OA.

To temporarily disable PromptPay, set:

```text
OMISE_PAYMENTS_ENABLED=false
```

Then redeploy. Slip upload and LINE OA do not depend on Omise.

Admins can also hide the PromptPay QR section from the customer success card
without redeploying by turning off the preorder PromptPay setting in
`/admin/preorder`. The page stores this as
`site_settings.preorder_promptpay_enabled`. The server-side
`OMISE_PAYMENTS_ENABLED=false` switch still wins as the emergency API kill
switch if QR creation must be blocked even when the UI setting is on.

## Before live mode

- Confirm all preorder test flows pass in production deployment.
- Confirm webhook idempotency with repeated Omise events.
- Confirm amount mismatch does not mark orders paid.
- Confirm cancelled orders cannot be marked paid by webhook.
- Confirm public users cannot read `preorder_payments`, `preorders`, or `preorder_order_items`.
- Replace test keys with live keys only after approval.
- Set `OMISE_MODE=live`.
- Set `OMISE_ALLOW_LIVE_PAYMENTS=true` only when ready to accept real payments.
- Reconfigure the webhook in the live Omise dashboard.
- Run a low-value real transaction test.
- Remove or update customer-facing test-mode copy before public launch.
