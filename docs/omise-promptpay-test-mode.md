# Omise/Opn PromptPay test mode

This preorder payment foundation adds an optional PromptPay QR path for test mode only. Slip upload and LINE OA remain the fallback paths.

## Environment variables

Server-only variables:

```text
OMISE_SECRET_KEY=skey_test_xxx
OMISE_MODE=test
SUPABASE_SERVICE_ROLE_KEY=...
```

Client/public variables:

```text
NEXT_PUBLIC_OMISE_PUBLIC_KEY=pkey_test_xxx
NEXT_PUBLIC_APP_URL=https://jaturamit-platform.vercel.app
```

Do not use live keys in this foundation PR. The API routes reject `OMISE_MODE` values other than `test` and reject secret keys that start with `skey_live_`.

## Webhook URL

Configure the Opn/Omise test-mode webhook URL:

```text
https://jaturamit-platform.vercel.app/api/payments/omise/webhook
```

The webhook route does not trust the webhook payload alone. It retrieves the charge from Omise again before marking an order as paid.

## Database

Run:

```text
supabase/migrations/20260506_preorder_order_code_generation.sql
supabase/migrations/20260506_preorder_promptpay_payment_foundation.sql
```

The order-code migration ensures new and existing preorder rows have a customer-facing code such as `JR2026-0001`. PromptPay, slip upload, and check-order all depend on `order_code` plus `phone`.

The migration creates `public.preorder_payments` with RLS enabled. Public users cannot select or modify payment rows directly. Active admins can read payment rows through the existing `admin_users` pattern.

## Test flow

1. Create a preorder order from `/preorder`.
2. On the success card, click `สร้าง QR พร้อมเพย์`.
3. The browser calls `POST /api/payments/omise/create` with `order_code` and `phone`.
4. The server looks up the order and uses the database `total_amount`.
5. The server creates an Omise PromptPay charge in test mode.
6. The success card displays the QR image if Omise returns one.
7. Omise sends a webhook when the charge changes.
8. The webhook route retrieves the charge from Omise and verifies amount, currency, and test mode before updating `preorders.status = paid`.

## Fallback and rollback

PromptPay is optional. If QR creation fails, the customer can still:

- attach a slip in the website,
- send a slip or contact admins through LINE OA.

To roll back the payment option, hide or remove the PromptPay section in `components/preorder/PreorderForm.tsx`. Existing slip upload and LINE OA paths do not depend on Omise.

## Before live mode

- Replace test keys with live keys only after approval.
- Change the mode gate intentionally.
- Reconfigure the webhook in the live Omise dashboard.
- Run a low-value real transaction test.
- Confirm webhook idempotency.
- Confirm amount mismatch does not mark orders paid.
- Confirm public users cannot read `preorder_payments`, `preorders`, or `preorder_order_items`.
