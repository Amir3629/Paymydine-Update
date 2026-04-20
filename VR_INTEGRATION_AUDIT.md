# VR Integration Audit (PayMyDine)

Date: 2026-04-20

## 1) Investigation scope
Inspected files:
- `app/admin/controllers/Payments.php`
- `app/admin/models/Payments_model.php`
- `app/admin/classes/VRPaymentGatewayService.php`
- `app/admin/routes.php`
- `frontend/app/menu/page.tsx`

## 2) Current payment architecture
### Backend source of truth
- **Payment method/provider assignment source of truth is method `provider_code`** on payment method rows.
- Admin payment method edit flow persists `provider_code` from method forms.
- Runtime method availability is resolved in `app/admin/routes.php` (`resolveRuntimeMethodCollection`) and then consumed by create-session routes.

### Method/provider catalogs
- Method matrix includes: `card`, `apple_pay`, `google_pay`, `wero`, `paypal`, `cod`.
- Provider matrix includes: `stripe`, `paypal`, `worldline`, `sumup`, `square`, `vr_payment`.
- Compatibility matrix exists in `Payments_model::METHOD_PROVIDER_MATRIX`.

### Admin UX observed
- Method edit UI uses a **single provider selector** (`provider_code`) and no fallback checkbox UI.
- Provider edit UI for VR contains core provider config fields (mode/base URL/space/user/auth/webhook key/integration mode) without method toggles.

### Frontend flow observed
- Frontend menu checkout (`frontend/app/menu/page.tsx`) reads backend-provided methods/provider selection and routes create-session calls by selected provider.
- VR-specific endpoints in use:
  - `/api/v1/payments/vr-payment/card/create-session`
  - `/api/v1/payments/vr-payment/wero/create-session`
  - `/api/v1/payments/vr-payment/apple-pay/create-session`
  - `/api/v1/payments/vr-payment/google-pay/create-session`
  - `/api/v1/payments/vr-payment/paypal/create-session`
- Return handling uses `/api/v1/payments/vr-payment/return-status` with pending checkout localStorage recovery.

## 3) Runtime resolution and diagnostics behavior
- Runtime selection currently honors method `provider_code` and provider readiness.
- VR readiness is provided by `VRPaymentGatewayService::getConfigForDiagnostics()` and method checks via `isMethodReady()`.
- Diagnostics endpoint `/api/v1/payments/vr-payment/diagnostics` is available and includes readiness/runtime context.

## 4) Current VR integration shape
- VR service handles:
  - create redirect session
  - status fetch
  - webhook signature verification
  - payment status normalization
- Session persistence:
  - `vr_payment_sessions` table stores method/provider/merchant reference/session IDs/state/raw snapshot.
- Webhook event persistence:
  - `vr_payment_webhook_events` for idempotent event tracking.

## 5) Risks/bugs identified
1. If VR host is unreachable, failures must be clearly classified as connectivity/infrastructure, not generic app errors.
2. Failed session persistence previously relied on provider IDs only; failures before receiving IDs could be dropped.
3. Diagnostics need explicit method mapping + connectivity + normalized last error for fast root-cause analysis.
4. Wallet capability can still be account-entitlement dependent on VR side (Apple Pay/Google Pay/Wero/PayPal); readiness should not be interpreted as guaranteed settlement capability without provider-side enablement.

## 6) What must change
- Keep admin UX simple (method provider_code assignment only; provider core config only).
- Harden VR error normalization and payload consistency.
- Add explicit connectivity probe output to diagnostics/readiness.
- Persist failed create-session snapshots using merchant reference fallback when provider session IDs are not yet available.
- Keep frontend unchanged unless strictly required.

## 7) What must NOT change
- Do not break Stripe/PayPal/Worldline flows.
- Do not reintroduce fallback checkbox UI on method forms.
- Do not add provider-side method assignment toggles in VR provider form.
- Do not do broad risky rewrites in frontend checkout.

## 8) Root cause classification for current blocker
- Observed condition: DNS may resolve but TCP/HTTPS to VR host (`asia.vrpy.de:443`) times out.
- This indicates **environment/network path issue (e.g., firewall/egress/allowlist/routing)**, not only application logic.
- App code should still provide accurate diagnostics and normalized failures under this condition.
