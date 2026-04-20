# Payment Architecture Audit (Laravel/TastyIgniter + Next.js)

Date: 2026-04-20

This report maps payment architecture from code paths currently present in this repository.

## Key source-of-truth findings

- Runtime payment method availability for frontend checkout is computed by `GET /api/v1/payments` in `app/admin/routes.php` via `$resolveRuntimeMethodCollection`, not from static frontend JSON.
- Method→provider assignment source-of-truth is `payment_methods.provider_code` (or `meta.provider_code` fallback) through `Admin\Models\Payments_model` storage mapping.
- Provider configs are split across:
  - `payments` / `payment_methods` row `data`/`meta` payloads
  - `settings` table JSON blobs (`sort=paymydine`, items `payment_methods`, `payment_providers`)
  - Worldline POS config (`pos_configs` + `pos_devices`) for tenant runtime.

## Notes on potentially stale/legacy code

- `frontend/app/api/payment-methods/route.ts` reads local `data/payment-methods.json`; checkout does **not** use this path.
- `frontend/app/api/payments/create-paypal-order` and `capture-paypal-order` explicitly return 410 deprecated.
- `frontend/app/api/payments/create-intent` still exists and can mint Stripe intents from Next env vars, but checkout uses Laravel `/api/v1/payments/stripe/create-intent`.
- `App\Models\PaymentMethod` and `App\Models\PaymentProvider` exist but runtime/admin payment flow uses `Admin\Models\Payments_model`.
