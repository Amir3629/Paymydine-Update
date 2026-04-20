# VR Payment / Wero Integration Trace (Evidence-Based)

Date: 2026-04-20

Scope: backend + frontend trace for Wero routed through VR Payment, with explicit verdicts.

## 1) Where "VR Payment" is defined in code

### Provider registry / labels / capability
- Provider code and label are defined in runtime defaults as:
  - `code: vr_payment`, `name: VR Payment`, with supported methods `card, apple_pay, google_pay, paypal, wero` in `app/admin/routes.php` (`$providerCapabilityMatrix`, `$defaultPaymentProviders`).
- Admin controller includes `vr_payment` in provider enums and defaults:
  - `PROVIDER_CODES` includes `vr_payment`.
  - Provider defaults label is set to `VR Payment`.
  - `supported_methods` for `vr_payment` includes `wero`.
  - Provider-specific config fields for `vr_payment` are declared (`mode`, `api_base_url`, `space_id`, `user_id`, `auth_key`, `webhook_signing_key`, `preferred_integration_mode`).
- Method/provider capability matrix includes Wero→VR compatibility:
  - `Admin\Models\Payments_model::METHOD_PROVIDER_MATRIX` has `wero => [worldline, vr_payment]`.

### Runtime service class
- Core runtime class exists at `Admin\Classes\VRPaymentGatewayService`:
  - `SUPPORTED_METHODS = ['card', 'apple_pay', 'google_pay', 'paypal', 'wero']`.
  - Reads provider row `payments.code = 'vr_payment'` and config from `data`.

**Verdict:** **works** (defined in multiple source-of-truth paths and has active runtime class).

---

## 2) Where "Wero" is defined as a payment method

- Method code `wero` exists in default method set in `app/admin/routes.php` (`$defaultPaymentMethods`) with default provider `worldline`.
- Method code list includes `wero` in admin `Payments` controller (`METHOD_CODES`).
- Database-backed compatibility matrix includes `wero`.
- Frontend checkout explicitly allows method `wero` in menu flow and renders a dedicated Wero UI path in `frontend/app/menu/page.tsx`.

**Verdict:** **works**.

---

## 3) How Wero is assigned to VR Payment in admin and persistence

### Admin assignment path
- Admin method edit exposes `provider_code` select for non-`cod` methods (`app/admin/controllers/Payments.php`, `formExtendFields`).
- Compatible providers are derived from `Payments_model::supportedProvidersForMethod`, so Wero can select `vr_payment`.

### Persistence path
- `Payments_model` persists `provider_code` column (and mirrors in `meta.provider_code`), with storage mapping that can target `payment_methods` tables when present.
- Runtime resolver (`$loadMethodRecordsFromPayments`) resolves provider in order:
  1. `row.provider_code`
  2. fallback `meta.provider_code`
- Runtime availability (`$resolveRuntimeMethodCollection`) includes method only if provider is configured, enabled, and method-ready.

### Evidence of Wero→VR enforcement during session creation
- `POST /api/v1/payments/vr-payment/wero/create-session` is registered via `$registerVRPaymentSessionRoute('wero', ...)`.
- Handler rejects when selected runtime provider for method is not `vr_payment` (`error_code: vr_payment_method_not_active`).

**Verdict:** **works** (admin assignment + persistence + runtime guard are aligned).

---

## 4) Backend class/service handling VR runtime requests

- Runtime orchestration class: `Admin\Classes\VRPaymentGatewayService`.
  - `createRedirectSession()` calls VR endpoint `POST {api_base_url}/checkout/sessions`.
  - `fetchPaymentStatus()` calls `POST {api_base_url}/checkout/status`.
  - `verifyWebhookSignature()` verifies `x-vr-signature` (+ optional timestamp variant).
  - `normalizePaymentStatus()` maps provider statuses to internal canonical states.
- API routes call that service in `app/admin/routes.php`:
  - `/payments/vr-payment/*/create-session`
  - `/payments/vr-payment/return-status`
  - `/payments/vr-payment/webhook`

**Verdict:** **works**.

---

## 5) Frontend pages/components launching the payment flow

- Main launcher: `frontend/app/menu/page.tsx` (`startHostedRedirectCheckout`).
  - Computes `providerCode` based on selected method/provider mapping.
  - For Wero + VR mapping, uses endpoint: `/api/v1/payments/vr-payment/wero/create-session`.
  - Persists pending state in localStorage key `pmd_vr_payment_pending_checkout`.
- Return verification in same page `useEffect`:
  - Reads query param `payment_return_provider=vr_payment`.
  - Calls `/api/v1/payments/vr-payment/return-status` with `session_id` + optional refs.
  - On paid status, submits order payment via `handlePayment(...)`.

**Verdict:** **works** (launch + return verification exist in production checkout page).

---

## 6) Integration mode (hosted-page / direct API / mixed)

- VR integration is explicitly constrained to hosted redirect mode:
  - Required config `preferred_integration_mode` and validation requires `payment_page`.
  - `createRedirectSession()` requires `return_url`/`cancel_url` and expects `redirect_url` from provider.
- Frontend behavior is redirect-based (`window.location.href = redirect_url`).

**Verdict:** **hosted-page** and **works**.

---

## 7) Return URLs, callback URLs, webhook handlers

### Return URL wiring
- Frontend sends `return_url` and `cancel_url` to VR create-session endpoints.
- Frontend appends `payment_return_provider=vr_payment` to return URL when provider is VR.

### Backend return/callback handler
- `Route::match(['GET','POST'], '/payments/vr-payment/return-status', ...)` in `app/admin/routes.php`.
  - Validates refs (`session_id` / `transaction_id` / `provider_reference` / `merchant_reference`).
  - Calls `fetchPaymentStatus()`.
  - Persists status and triggers order-transaction reconciliation.

### Webhook handler
- `POST /payments/vr-payment/webhook`:
  - signature validation via `verifyWebhookSignature()`.
  - idempotency via `vr_payment_webhook_events.event_id` check.
  - persists webhook payload + reconciles settlement state.

**Verdict:** **works** (return + webhook endpoints both implemented).

---

## 8) Success/failure/cancel mapping back to orders

### Status normalization
- `VRPaymentGatewayService::normalizePaymentStatus()` maps:
  - paid/succeeded/captured → `completed`
  - authorized → `authorized`
  - failed/declined → `failed`
  - cancelled/canceled → `cancelled`
  - expired/timeout → `expired`

### Reconciliation logic
- `$reconcileVRPaymentState` maps VR status to settlement status:
  - `authorized|completed` → `paid`
  - `failed` → `failed`
  - `cancelled|expired` → `cancelled`
- It matches `order_payment_transactions.payment_reference` against candidate refs (`session_id`, `transaction_id`, `provider_reference`, `merchant_reference`) and updates:
  - `order_payment_transactions.settlement_status`
  - `orders.payment_provider = 'vr_payment'`
  - `orders.payment_reference = first reference candidate`

### Practical caveat
- During create-session persistence, `vr_payment_sessions.order_id` is not assigned in current flow (only nullable column exists). reconciliation depends on existing transaction `payment_reference` linkage created elsewhere.

**Verdict:** **partially wired** (state mapping exists, but explicit `vr_payment_sessions.order_id` linkage is not filled in this flow).

---

## 9) Required credentials/config fields in code

### VR Payment required for readiness
- From `VRPaymentGatewayService::requiredCredentialsPresent()`:
  - `api_base_url`
  - `space_id`
  - `user_id`
  - `auth_key`
- Additional operational field:
  - `webhook_signing_key` (required for webhook signature validation; diagnostics reports presence)
- Integration mode:
  - `preferred_integration_mode` must be `payment_page`.

### Where configured
- Admin provider fields for `vr_payment` in `Payments::getProviderSpecificFields()`.
- Runtime defaults for the provider in `app/admin/routes.php` (`$defaultPaymentProviders`).

**Verdict:** **works**.

---

## 10) What is missing / half-wired / dead code today

1. **Frontend admin typing omits `vr_payment` provider in Next admin pages**
   - `frontend/app/admin/payments/page.tsx` `PaymentMethod.provider_code` union excludes `vr_payment`.
   - `frontend/app/admin/payment-providers/page.tsx` `ProviderCode` union excludes `vr_payment`.
   - Backend supports VR provider, so Next admin typing/UI is stale versus backend capability.
   - **Verdict:** **partially wired** (backend-ready, frontend admin model lagging).

2. **`vr_payment_sessions.order_id` column exists but is not populated by VR flow routes**
   - Table has nullable `order_id`, but `$persistVRPaymentSession` only sets `order_id` if provided in record, and create/return/webhook callsites do not pass it.
   - Reconciliation still can work via `order_payment_transactions.payment_reference`, but direct session→order FK is not established.
   - **Verdict:** **partially wired**.

3. **No dedicated VR provider model/class extending legacy payment gateway abstraction discovered for runtime path**
   - Runtime is handled via service + explicit API routes, not via classic gateway entrypoint callbacks.
   - Not necessarily broken, but diverges from legacy gateway model pattern.
   - **Verdict:** **works (by alternate architecture)**, but legacy parity is **not applicable / not implemented**.

---

## Exact DB tables/columns and keys involved (VR/Wero path)

- `payments` / mapped `payment_methods` table (via `Payments_model` storage mapping):
  - method rows: `code = 'wero'`
  - provider row: `code = 'vr_payment'`
  - columns used: `provider_code`, `status`, `priority`, `data`, `meta`
- `settings` (`sort = paymydine`):
  - `item = payment_methods`, `item = payment_providers` JSON fallbacks/defaults
- `vr_payment_sessions`:
  - `provider_code`, `method_code`, `merchant_reference`, `session_id`, `transaction_id`, `provider_reference`, `state`, `order_id`, `amount`, `currency`, `raw_snapshot`
- `vr_payment_webhook_events`:
  - `event_id`, `event_type`, `session_id`, `transaction_id`, `provider_reference`, `state`, `processed_at`, `payload`
- `order_payment_transactions`:
  - `payment_reference`, `settlement_status`, `order_id`
- `orders`:
  - `payment_provider`, `payment_reference`

---

## End-to-end stage verdict summary (Wero on VR)

1. Definition/registry of VR provider: **works**
2. Wero method definition: **works**
3. Wero→VR assignment in admin/persistence: **works**
4. VR backend runtime handler: **works**
5. Frontend launch + verification flow: **works**
6. Integration style: **hosted-page** (**works**)
7. Return + webhook handlers: **works**
8. Status/order reconciliation: **partially wired**
9. Credentials/schema requirements: **works**
10. Missing/half-wired/dead paths: **partially wired** (typed Next admin mismatch, missing `order_id` session binding)

---

## Reference Provider Pattern to Mirror (Best Match): **Worldline Hosted Checkout**

Why this reference:
- It is the most complete **redirect/hosted** implementation in this repo and is the closest architectural match to VR Payment (`create-session` → redirect → status verification) rather than Stripe’s PaymentIntent-heavy inline/card path.
- It already includes mature service-level normalization, request/response instrumentation, tenant-aware config resolution, and frontend return verification wiring.

> Note: Worldline’s dedicated webhook endpoint is present but currently a logging stub (“phase 2”), so webhook **signature verification** is not yet its strong point.

### 1) Admin settings form definition (Worldline reference)
- Defined in `Payments::getProviderSpecificFields('worldline')` with fields:
  - `api_endpoint`, `merchant_id`, `api_key_id`, `secret_api_key`, `webhook_secret`.
- Provider record is normalized through provider-specific save flow in `Payments` controller.

### 2) Config validation
- Runtime config load and hard-fail behavior is in `WorldlineHostedCheckoutService::getConfig()`:
  - resolves tenant by host
  - loads latest `pos_configs` for `pos_devices.code = worldline`
  - throws when config is missing.
- Request-level validation is enforced in routes (`/payments/card/create-session`, `/payments/worldline/create-hosted-checkout`, `/payments/worldline/checkout-status`).

### 3) Secret handling
- Secrets are persisted in provider config fields and in POS config (`access_token`, `password` mapping for Worldline).
- Logging is sanitized by `sanitizeForLogs()` to redact `secret|token|password|api_key|authorization` keys.
- Admin side has secret field retention/redaction behavior via `providerSecretFields()` + `filterProviderDataFromPost()`.

### 4) Readiness checks
- Runtime method gating in `/api/v1/payments` path uses worldline readiness closures:
  - `$resolveWorldlineInlineReadiness`
  - `$resolveWorldlineWeroReadiness`
  - `$isProviderReadyForMethod`.
- Diagnostics endpoint exists: `/api/v1/payments/worldline/auth-diagnostic` and `/api/v1/payments/worldline/debug-config`.

### 5) Checkout/session creation
- Service-level hosted checkout construction in `createHostedCheckout()`:
  - validates amount
  - builds SDK request object
  - sets return URL/locale/payment product filters
  - logs payload and raw response
  - resolves final redirect URL with candidate fallback
  - persists checkout session snapshot.
- Route usage:
  - generic `/payments/card/create-session` branches to Worldline when `provider_code=worldline`
  - Wero-specific `/payments/worldline/wero/create-session` invokes same service with product/method constraints.

### 6) Redirect/return flow
- Frontend (`frontend/app/menu/page.tsx`) creates session then redirects browser to provider URL.
- For worldline returns, frontend stores `pmd_worldline_pending_checkout`, then verifies via `/api/v1/payments/worldline/checkout-status` on return (`payment_return_provider=worldline`).

### 7) Webhook verification
- Endpoint `/worldline/webhook` exists but currently only logs payload and states signature verification is future phase.
- So reference provider webhook verification pattern is currently **incomplete**.

### 8) Transaction persistence
- Durable provider session persistence:
  - Worldline checkout snapshots are written to `storage/app/worldline_checkout_sessions/<host>/<hostedCheckoutId>.json`.
- Order/payment persistence is shared in QR settlement endpoint `/orders/pay-existing`:
  - inserts `order_payment_transactions`
  - inserts `order_payment_transaction_items`
  - stores `payment_reference` and method.

### 9) Order status updates
- `/orders/pay-existing` updates:
  - `orders.settlement_status`
  - `orders.settled_amount`
  - `orders.settlement_method`
  - `orders.settlement_reference`
  - `orders.processed`, `orders.settled_at`
- Also writes `order_totals` (`payment_method`, optional `payment_reference`) and emits notification events.

### 10) Diagnostics/logging
- Strong structured logging in `WorldlineHostedCheckoutService` via `PaymentLogger`:
  - request payload
  - raw response
  - redirect candidate selection
  - exceptions with categorized details.
- Additional runtime diagnostics routes in `app/admin/routes.php`.

---

## Reference (Worldline) vs VR Payment Gap Analysis

### What VR already has (good parity)
- **Admin provider form fields** for VR in `Payments::getProviderSpecificFields('vr_payment')`.
- **Secret field handling** via `providerSecretFields()` + posted-data filtering.
- **Readiness diagnostics** in `VRPaymentGatewayService::getConfigForDiagnostics()` and `/payments/vr-payment/diagnostics`.
- **Hosted checkout session creation** via `VRPaymentGatewayService::createRedirectSession()` and dedicated method routes (`/payments/vr-payment/*/create-session`).
- **Return verification flow** via `/payments/vr-payment/return-status` + frontend `payment_return_provider=vr_payment` path.
- **Webhook verification and idempotency** are actually stronger than Worldline currently:
  - signature verification (`verifyWebhookSignature`)
  - event dedupe (`vr_payment_webhook_events.event_id`).
- **Status normalization + reconciliation** implemented (`normalizePaymentStatus`, `$reconcileVRPaymentState`).

### What VR is missing / weaker than reference runtime pattern
- **Session↔order binding not completed:** `vr_payment_sessions.order_id` exists but is not populated in create/return/webhook callsites.
- **No durable JSON session snapshot directory equivalent** to Worldline’s `worldline_checkout_sessions` host-scoped files (VR uses DB sessions table only).
- **Less request-level contextual logging richness** than Worldline’s multi-step payload/response/redirect candidate logs.
- **Admin Next.js typings lag backend support** (`vr_payment` absent in `frontend/app/admin/payments/page.tsx` and `frontend/app/admin/payment-providers/page.tsx` unions).

### What should be copied structurally from reference provider
1. **Adopt Worldline-style staged logging around VR create-session:**
   - request payload snapshot (sanitized)
   - raw provider response snapshot
   - redirect candidate evaluation decision.
2. **Add explicit session-order correlation contract** (copy intent of settlement tracking):
   - persist `order_id` into `vr_payment_sessions` at checkout initiation and keep through return/webhook updates.
3. **Preserve a single “status mapping contract” layer** (already started in `normalizePaymentStatus`) and make it authoritative for all return/webhook code paths.
4. **Add explicit provider diagnostics endpoints parity fields** that Worldline exposes (host, tenant DB, config id, environment, key-length/prefix diagnostics).
5. **Mirror Worldline’s request validation strictness per endpoint** (already mostly present; keep standardized error contract for all VR method routes).
6. **Keep webhook rigor at VR level (already stronger) and use it as standard for other providers**.

---

## Practical Recommendation

If the goal is “VR should look like the most production-hardened redirect provider in this repo,” use **Worldline Hosted Checkout** as the structural blueprint for:
- config loading discipline,
- staged observability,
- redirect candidate handling,
- frontend return orchestration,

and keep VR’s existing webhook verification model as the security baseline to exceed that reference.
