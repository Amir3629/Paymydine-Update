# VR Integration Audit (Paymydine)

Date: 2026-04-20

## Scope audited
- Laravel/TastyIgniter admin payment controller/model/routes:
  - `app/admin/controllers/Payments.php`
  - `app/admin/models/Payments_model.php`
  - `app/admin/routes.php`
- VR service and diagnostics:
  - `app/admin/classes/VRPaymentGatewayService.php`
- Frontend checkout entrypoint (read-only audit):
  - `frontend/app/menu/page.tsx`

## Current architecture (as implemented now)

### 1) Source of truth for provider assignment
- Payment methods currently resolve provider from `payment_methods.provider_code` (with meta fallback in some paths).
- Admin method edit form exposes `provider_code` as the assignment field.
- `supported_providers` fallback arrays are mostly removed from runtime selection, but legacy model helpers still exist.

### 2) Source of truth for provider readiness
- Runtime readiness is computed in `app/admin/routes.php` via provider-specific readiness helpers:
  - Stripe readiness
  - Worldline readiness (+ Wero product readiness)
  - VR readiness via `VRPaymentGatewayService::getConfigForDiagnostics()` / `isMethodReady()`
- Current VR readiness is too optimistic for non-card methods: it marks methods ready if provider is enabled + credentials present + integration mode, without proving account/method entitlement.

### 3) Frontend flow per method
- Frontend menu page chooses endpoint based on backend-selected `provider_code`.
- For VR provider, method-specific create-session endpoints are used:
  - `/api/v1/payments/vr-payment/{method}/create-session`
- Return handling uses `/api/v1/payments/vr-payment/return-status`.
- There is special localStorage state handling for pending VR checkout.

## What is already correct
- Admin/provider split is mostly aligned: method owns `provider_code` assignment.
- VR provider form has core config fields (mode/base URL/space/user/auth/webhook key/integration mode).
- VR routes exist for diagnostics, create-session, return-status, webhook, and persistence tables.
- Runtime selection currently does not apply method-level fallback arrays.

## What is redundant / wrong / risky
1. **VR error normalization too generic**
   - Create-session failures collapse into broad codes (`vr_payment_checkout_create_failed`) and do not clearly classify connectivity/auth/validation/capability failures.
2. **Diagnostics do not explicitly classify connectivity blocker**
   - There is no first-class, explicit connectivity probe result to configured VR host in diagnostics payload.
3. **Method readiness semantics are not capability-aware**
   - `isMethodReady()` currently returns true for all supported methods when config exists, which can misrepresent account entitlement (Apple Pay/Google Pay/Wero/PayPal on VR).
4. **Method metadata compatibility remains in model layer**
   - `supported_providers` helper/accessors still exist in `Payments_model`; they are legacy and potentially confusing though no longer central in runtime selection.

## Environment blocker observed
- External connectivity to VR host (example observed: `https://asia.vrpy.de`) can fail at TCP/HTTPS timeout level from this server environment.
- This is an infra/network/allowlist problem, not always an app-code bug.
- Diagnostics should surface this explicitly.

## Files that should change (and why)
1. `app/admin/classes/VRPaymentGatewayService.php`
   - Add robust request payload normalization (merchant reference generation, deterministic method handling).
   - Add error classification for timeout/DNS/TLS/4xx/5xx/method-not-supported/account-capability.
   - Add safe connectivity probe helper for diagnostics.
2. `app/admin/routes.php`
   - Enrich `/payments/vr-payment/diagnostics` with method mapping + connectivity classification + latest normalized error context.
   - Ensure VR create-session endpoints persist richer diagnostics (error category/code/details) without leaking secrets.
3. `app/admin/models/Payments_model.php` (optional/minimal)
   - Keep compatibility, but avoid re-introducing `supported_providers` semantics into active paths.
4. `VR_INTEGRATION_DELIVERY.md`
   - Delivery and operations/testing guide.

## Files that should NOT be changed unless strictly required
- `frontend/app/menu/page.tsx` (currently already wired for backend-selected provider endpoints).
- Existing Stripe/PayPal/Worldline runtime flows.
