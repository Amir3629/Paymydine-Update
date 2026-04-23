# PayMyDine — SumUp Completion Plan (Implementation Engineer Draft)

Date: 2026-04-22
Scope: Safe completion of SumUp in both lanes (online provider + terminal/card-present) without breaking storefront checkout.

---

## 1. Final Target Architecture

### A) SumUp Online Payment Provider Lane

**Canonical runtime ownership**
- Route family: `app/admin/routes.php` (`/api/v1` group already used by storefront).
- Canonical create endpoint: `POST /api/v1/payments/card/create-session` (provider-resolved, supports `provider_code=sumup`).
- Canonical verify endpoint: `POST /api/v1/payments/sumup/checkout-status`.
- Canonical diagnostics endpoints: `/api/v1/payments/sumup/health`, `/api/v1/payments/sumup/debug`, `/api/v1/payments/sumup/widget-event`.

**Canonical config source**
- `payments` row for `code='sumup'` (via `Admin\Models\Payments_model`), config payload keys:
  - `access_token`
  - `url`
  - `id_application` (merchant code)

**Canonical supported method**
- `card` only (via method-provider mapping).

**Deprecation target**
- `app/main/routes_sumup.php` routes that duplicate active checkout flow.

---

### B) SumUp Terminal / POS Lane

**Canonical runtime ownership**
- Controller/UI/model: `TerminalDevices` (`app/admin/controllers/TerminalDevices.php`, `Terminal_devices_model`, config model).
- Canonical table: `terminal_devices`.

**Data split rule**
- Provider credentials stay in Payments provider config (`payments.data`).
- Reader/terminal state stays in `terminal_devices`.

**Non-canonical legacy residue**
- `pos_configs.sumup_*` columns (hidden fields) are migration residue unless external code proves usage.

---

### C) Admin Source-of-Truth

- **Only canonical admin**: Laravel backend admin (`app/admin/*`).
- Next.js `/frontend/app/admin/*` must not remain equal writable configuration authority.

---

### D) Method/Provider Governance

Current intended enforcement for SumUp as online provider:
- ✅ `card + sumup`
- ❌ `paypal + sumup`
- ❌ `wero + sumup`
- ⚠️ `apple_pay + sumup` (not production-supported until capability + implementation proof)
- ⚠️ `google_pay + sumup` (same)

Governance must be enforced in:
1. backend mapping matrix + write validation
2. runtime method resolution
3. operator UI options
4. storefront rendering branches

---

### E) Webhook / Finalization Ownership

- Final state should be owned by canonical online lane (`app/admin/routes.php` family).
- Webhook verification, finalization, and reconciliation should not live in a parallel non-canonical route family.

---

## 2. Critical Decisions

1. **Do not rewrite checkout architecture.** Keep current working create-session + status polling path intact.
2. **Consolidate behavior, not credentials first.** Move/alias overlapping SumUp routes to canonical handlers.
3. **Make deprecations explicit.** Keep compatibility wrappers returning `Deprecation` headers + logs before removal.
4. **Treat terminal lane as separate domain.** No terminal reader state in payment-provider config tables.
5. **Lock admin authority.** Next.js admin becomes read-only or disabled for writes.

---

## 3. Files to Change

### 3.1 Critical Cleanup (go-live safety)

1. `app/main/routes_sumup.php` (**blocking ambiguity**)
- Why: duplicate create/verify/webhook/refund surface, legacy key schema route (`create-hosted-checkout`) risks drift.
- Change:
  - keep helper functions only if reused;
  - convert active duplicate routes into wrappers to canonical admin handlers or return controlled deprecation response;
  - keep compatibility temporarily where external consumers may exist.
- Go-live impact: **blocking** (architectural ambiguity).

2. `app/admin/routes.php` (**canonical stabilization**)
- Why: canonical lane already active; needs full ownership for webhook/finalization/refund and explicit SumUp policy.
- Change:
  - add canonical refund endpoint (if not already canonicalized from main route);
  - add canonical webhook endpoint + signature validation scaffold;
  - add finalization utility invocation from webhook + optional post-verify path;
  - add idempotency/replay protection hooks.
- Go-live impact: **blocking** for robust operations.

3. `app/admin/models/Payments_model.php`
- Why: source matrix for method/provider compatibility.
- Change:
  - ensure SumUp remains only under `card` production path;
  - keep unsupported combos impossible in matrix + validation.
- Go-live impact: **blocking** for governance integrity.

4. `app/admin/controllers/Payments.php`
- Why: Laravel admin source-of-truth for provider config and operator messaging.
- Change:
  - strengthen SumUp setup comments + unsupported methods notice;
  - add explicit environment mode field strategy (test/live) for SumUp if introduced;
  - ensure secrets masking behavior is consistent.
- Go-live impact: **important** (operator safety).

### 3.2 Required Completion Work

5. `app/Services/Payments/Providers/SumUpProvider.php`
- Why: currently stub; runtime bypasses provider abstraction.
- Change options:
  - minimal: mark intentionally non-runtime with explicit comments and deprecation note;
  - preferred incremental: implement helper methods used by canonical routes (without large rewrite).
- Go-live impact: **important** (maintainability), not immediate blocker if route logic remains stable.

6. `app/Services/Payments/PaymentProviderFactory.php`
- Why: includes SumUp provider but not authoritative execution path.
- Change:
  - document usage boundary or introduce thin adapter usage from canonical routes later.
- Go-live impact: **post-launch refactor** unless abstraction adoption is planned now.

7. `frontend/app/menu/page.tsx`
- Why: storefront path can present misleading provider labels and mixed method branches.
- Change:
  - ensure SumUp path only through `card + provider_code=sumup`;
  - remove misleading fallback labels implying Stripe when provider is SumUp;
  - keep redirect/widget pending status flow intact.
- Go-live impact: **blocking** for UX correctness if fake states remain.

8. `frontend/components/payment-flow.tsx`
9. `frontend/components/payment/secure-payment-flow.tsx`
- Why: direct `case "sumup"` still renders and can diverge from canonical method model.
- Change:
  - retire direct `sumup` method rendering or gate behind legacy flag;
  - keep `card + provider_code=sumup` rendering path.
- Go-live impact: **important** (consistency), can be phased carefully.

### 3.3 UX/Admin Cleanup

10. `frontend/app/admin/payment-providers/page.tsx`
11. `frontend/app/admin/payments/page.tsx`
- Why: writable duplicate admin surface.
- Change:
  - safest: read-only mode + banner “Laravel admin is canonical”;
  - stricter: hide route in production build or return disabled state;
  - never allow equal-write governance.
- Go-live impact: **blocking governance** if left writable without policy.

12. `app/admin/models/config/pos_configs_model.php`
13. `app/admin/database/migrations/2026_04_21_120000_add_sumup_terminal_fields_to_pos_configs.php`
- Why: legacy hidden SumUp terminal fields create confusion.
- Change:
  - mark deprecated in comments/UI;
  - stop reading/writing these fields in any path;
  - optional later migration cleanup after data verification.
- Go-live impact: **important** (clarity), not immediate blocker if unused.

### 3.4 Optional Refactor Later

14. `app/admin/controllers/PosConfigs.php`
- Change:
  - reduce SumUp special-case text clutter once terminal lane fully stabilized;
  - keep clear redirection to Terminal Devices.

15. `app/admin/controllers/TerminalDevices.php`
- Change:
  - add heartbeat and richer reader diagnostics later.

---

## 4. Patch Order (minimal-risk sequence)

### Step 1 — Lock architecture boundaries (no behavior break)
1. Add deprecation wrappers/logging in `app/main/routes_sumup.php` for overlapping endpoints.
2. Ensure canonical endpoint documentation/comments in `app/admin/routes.php` and Payments admin.

### Step 2 — Preserve working storefront online flow
3. Keep `/payments/card/create-session` + `/payments/sumup/checkout-status` unchanged in contract.
4. Move webhook/finalization ownership into canonical family (or bridge old webhook to canonical handler).

### Step 3 — Enforce method/provider truth
5. Harden backend matrix + API validation for unsupported SumUp combos.
6. Update storefront rendering to avoid direct non-canonical `sumup` method path.

### Step 4 — Admin governance cleanup
7. Convert Next.js admin pages to read-only/disabled writes.
8. Add explicit “Laravel admin canonical” messaging.

### Step 5 — Terminal lane clarity cleanup
9. Mark `pos_configs.sumup_*` fields deprecated and remove remaining runtime dependence.
10. Keep terminal flow on `terminal_devices` only.

### Step 6 — Operations hardening
11. Webhook signature validation.
12. Idempotency/reconciliation jobs and diagnostics expansions.

---

## 5. Go-Live Risks (classified)

### Launch Blockers
1. Parallel SumUp online route families with overlapping responsibilities.
2. Missing single owner for webhook/finalization/idempotent event processing.
3. Writable Next.js admin duplication vs Laravel canonical admin.
4. Any remaining UI exposure of unsupported SumUp method combinations as if production-ready.

### Important but Not Blocking
1. Stub `SumUpProvider` abstraction mismatch.
2. Legacy `pos_configs.sumup_*` schema residue (if confirmed unused at runtime).
3. Incomplete environment separation strategy for SumUp credentials.

### Post-Launch Improvements
1. Full adapter/service refactor to use provider class abstraction consistently.
2. Terminal heartbeat monitoring and deeper diagnostics UX.
3. Automated capability detection for Apple/Google readiness by merchant account.

---

## 6. Exact Patch Recommendations

### 6.1 Online canonicalization

**File: `app/admin/routes.php`**
- Add/confirm canonical endpoints in one cluster:
  - create (`/payments/card/create-session`) — already canonical
  - verify (`/payments/sumup/checkout-status`) — already canonical
  - webhook (new canonical endpoint in this family)
  - refund (canonical endpoint in this family)
  - finalization helper call (shared utility)
- Introduce shared SumUp helper methods inside route bootstrapping closure:
  - `loadSumupProviderConfig()`
  - `resolveSumupMerchantCode()`
  - `finalizeIfPaid()`
- Add idempotency guard:
  - use checkout id + event id unique key in DB/cache to avoid double finalize.

**File: `app/main/routes_sumup.php`**
- Replace duplicate runtime routes with temporary compatibility shims:
  - either proxy to canonical handlers or return `410` + migration guidance for strictly internal endpoints.
- Keep only pure helper utilities if still reused.
- Remove/disable legacy `create-hosted-checkout` path using alternate key schema (`test_api_key/live_api_key`) unless explicitly required by active clients.

### 6.2 Terminal lane hard separation

**File: `app/admin/controllers/TerminalDevices.php`**
- Keep current reader discovery and terminal test APIs unchanged.
- Add explicit guardrail messages: “credentials from Payments > SumUp; terminal state from Terminal Devices only.”

**File: `app/admin/models/config/pos_configs_model.php`**
- Add deprecated labels/comments for hidden `sumup_*` fields.
- Do not expose new writes for these fields in UI flows.

**File: `app/admin/database/migrations/2026_04_21_120000_add_sumup_terminal_fields_to_pos_configs.php`**
- Leave as historical migration (don’t rewrite migration history), but add follow-up migration plan for data retirement after verification.

### 6.3 Admin source-of-truth enforcement

**File: `frontend/app/admin/payment-providers/page.tsx`**
- Disable POST in production or convert to read-only display.
- Add banner: “Configuration managed in Laravel Admin only.”

**File: `frontend/app/admin/payments/page.tsx`**
- Same: read-only/disabled writes in production.
- Keep visibility only if internal diagnostics require it.

### 6.4 Method/provider governance

**Backend enforcement**
- `app/admin/models/Payments_model.php` matrix remains strict for SumUp:
  - only `card` includes `sumup`.
- `app/admin/routes.php` POST `/payment-methods-admin` validation already rejects unsupported mappings; keep strict and add explicit SumUp-specific error copy.

**Frontend enforcement**
- `frontend/components/payment-flow.tsx`
- `frontend/components/payment/secure-payment-flow.tsx`
- `frontend/app/menu/page.tsx`
  - remove direct `sumup` method rendering path from production UX;
  - resolve SumUp only through method `card` provider mapping.

### 6.5 Secret handling / env separation / diagnostics

**File: `app/admin/controllers/Payments.php`**
- Introduce SumUp environment mode (test/live) if account strategy requires separate credentials.
- Mask secrets consistently and avoid plain-token redisplay.
- Add operator-facing status indicators:
  - last successful create-session test
  - last webhook receipt
  - last paid finalization timestamp

---

## 7. Questions still needing human verification

1. Are there any external clients currently using `app/main/routes_sumup.php` endpoints directly (especially refund/webhook/create-checkout)?
2. Is SumUp webhook signature secret available/contracted in this tenant model, or must we rely on verify-by-fetch only initially?
3. Do any out-of-repo scripts/jobs read `pos_configs.sumup_*` columns today?
4. Should Next.js admin pages be fully disabled in production, or retained read-only for internal support staff?
5. Is separate SumUp sandbox/live credentialing required for all tenants at launch, or can single-token mode be accepted temporarily?
6. Must refunds be exposed via public API immediately, or can refund handling remain operator/admin-only at first?
