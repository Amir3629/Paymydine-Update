# PayMyDine Audit Update — Canonical SumUp/Ready2Order Modeling (2026-04-22)

## Part A — SumUp online payments: canonical route family

### Active online flow map

#### A1) `app/admin/routes.php` (runtime checkout lane used by storefront)

**Create checkout/session**
- `POST /api/v1/payments/card/create-session`
  - Resolves active provider from runtime payment-method mapping.
  - If provider for `card` is `sumup`, creates SumUp checkout (`/v0.1/checkouts`) with merchant-code auto-resolve fallback (`/v0.1/me`), persists pending transaction row when `order_id` exists, returns `checkout_id` + redirect candidates.

**Retrieve checkout/status**
- `POST /api/v1/payments/sumup/checkout-status`
  - Pulls SumUp checkout state from `/v0.1/checkouts/{id}`.
  - Maps upstream status into internal settlement status and updates `order_payment_transactions` when present.

**Webhook-like runtime event capture**
- `POST /api/v1/payments/sumup/widget-event`
  - Stores frontend widget lifecycle events for diagnostics.

**Health/debug**
- `GET /api/v1/payments/sumup/health`
  - Lightweight token/merchant readiness check via `/v0.1/me`.
- `GET /api/v1/payments/sumup/debug`
  - Diagnostic payload preview and `/v0.1/me` probe.

#### A2) `app/main/routes_sumup.php` (secondary SumUp route family)

**Create checkout/session**
- `POST /api/v1/payments/sumup/create-checkout`
- `POST /payments/sumup/create-hosted-checkout` (outside the tenant group, legacy-style config keys)

**Retrieve checkout/status**
- `GET /api/v1/payments/sumup/checkout/{checkoutId}`

**Webhook**
- `POST /api/v1/webhook/sumup`
  - Verifies checkout and calls `pmdFinalizeSumupCheckoutIfPaid`.

**Refund**
- `POST /api/v1/payments/sumup/refund/{txnId}`

**Payment finalization helper**
- `pmdFinalizeSumupCheckoutIfPaid(array $checkoutBody)`
  - Marks order as payment-processed and updates transaction rows to `paid`.

---

### Duplicate/conflicting endpoints

1. **Two create-checkout paths with overlapping purpose**
   - `POST /api/v1/payments/card/create-session` (`admin/routes.php`) vs `POST /api/v1/payments/sumup/create-checkout` (`main/routes_sumup.php`).
   - They both hit SumUp checkout creation but sit behind different orchestration logic.

2. **Two SumUp status/verification styles**
   - Polling status endpoint in `admin/routes.php` (`/payments/sumup/checkout-status`) is used by frontend return flow.
   - `main/routes_sumup.php` offers read endpoint (`/payments/sumup/checkout/{id}`) not used by current frontend flow.

3. **Webhook/finalization split from active checkout path**
   - Webhook/finalization exists in `main/routes_sumup.php`, but active frontend create+verify loop runs through `admin/routes.php` + polling.

4. **Legacy/alternate config keys in `create-hosted-checkout`**
   - Uses `transaction_mode` + `live_api_key/test_api_key` + `merchant_code/base_url` style, diverging from active provider fields (`access_token`, `url`, `id_application`).

---

### Canonical path recommendation

**Canonical production online path should be `app/admin/routes.php` family** because:
1. Frontend checkout orchestration targets `/api/v1/payments/card/create-session` and `/api/v1/payments/sumup/checkout-status` directly.
2. Provider resolution is unified there with method/provider runtime mapping (same decision engine used for non-SumUp providers).
3. Provider config loading aligns with Laravel Payments admin provider record (`Payments_model` code=`sumup`, `data` payload).
4. `main/routes_sumup.php` is functionally useful but currently behaves as parallel integration surface, not the storefront control plane.

---

### Config source-of-truth (online)

1. **Authoritative runtime credentials source**
   - `payments` row for `code='sumup'`, config in model `data` payload (`access_token`, `url`, `id_application`), loaded in both route families.

2. **How merchant code resolves**
   - Use `id_application` if available.
   - Else call SumUp `/v0.1/me` to resolve `merchant_code`.

3. **Method/provider decision source**
   - Provider assignment for `card` comes from payment-method resolver in `admin/routes.php`, constrained by `Payments_model::METHOD_PROVIDER_MATRIX` and runtime method mapping.

---

### Why `SumUpProvider.php` is still a stub

- `PaymentProviderFactory` can instantiate `SumUpProvider`, but active checkout HTTP routes do not call `PaymentProviderFactory::make('sumup')` for session creation.
- Online flow is implemented procedurally in route closures (`admin/routes.php` and `main/routes_sumup.php`), bypassing the provider service abstraction.
- Result: the provider class is currently non-authoritative and effectively dormant for live checkout execution.

---

### Online lane risks

1. Parallel route families increase behavior drift risk (payload shapes, key names, status mapping).
2. Webhook/finalization not co-located with active checkout create/status loop.
3. Legacy hosted-checkout route in `main/routes_sumup.php` uses different credential schema.
4. Operational confusion: engineers/operators can’t easily tell which endpoint family is “real.”


## Part B — SumUp terminal/card-present model

### Terminal architecture map

1. **Dedicated terminal model exists**
   - `terminal_devices` table + `Terminal_devices_model` + `terminal_devices_model` admin config.
2. **Terminal controller depends on online provider readiness**
   - `TerminalDevices` reads SumUp provider token from Payments config, discovers readers, tests connection.
3. **POS configs lane explicitly demotes SumUp**
   - `PosConfigs` shows migration notice and blocks SumUp POS integration test/sync semantics.
4. **`pos_configs` still contains hidden SumUp fields**
   - Form config + migration keep `sumup_*` columns, but they are hidden and not part of active controller read/write path.

---

### Storage sources (terminal fields)

#### Canonical active store
- `terminal_devices` columns:
  - `provider_code`, `location_id`, `affiliate_key`, `reader_id`, `reader_label`, `pairing_state`, `terminal_status`, `metadata`, `is_active`.
- Written/read by:
  - `TerminalDevices` controller form save + onDiscoverReaders/onTestTerminalConnection workflow.
  - `TerminalDevices` form request validation.

#### Legacy/deferred store
- `pos_configs` hidden fields:
  - `sumup_affiliate_key`, `sumup_reader_id`, `sumup_pairing_code`, `sumup_pairing_state`, `sumup_reader_label`.
- Present in migration + form config only.
- Not used by active SumUp terminal controller runtime.

---

### Active vs dead fields

**Active (terminal lane):**
- `terminal_devices.*` fields listed above.

**Likely dead / migration residue:**
- `pos_configs.sumup_affiliate_key`
- `pos_configs.sumup_reader_id`
- `pos_configs.sumup_pairing_code`
- `pos_configs.sumup_pairing_state`
- `pos_configs.sumup_reader_label`

Reason: repo-wide runtime references are limited to form schema/migration definitions; no active execution path in current terminal/checkout controllers depends on these fields.

---

### Canonical source recommendation (terminal)

- Treat **`terminal_devices` as canonical source of truth** for SumUp card-present state.
- Treat hidden `pos_configs.sumup_*` as **technical debt / migration residue** unless an external script outside repo still consumes them.
- Keep online provider credentials in Payments provider config; keep reader/terminal state in `terminal_devices`.

---

### Terminal lane risks

1. Hidden `pos_configs.sumup_*` fields imply obsolete but still-schema-visible source.
2. Operators may misread “POS Configs” vs “Terminal Devices” separation.
3. Split mental model can cause support errors (editing wrong page, stale values, conflicting expectations).


## Part C — Frontend exposure of SumUp flows

### User-facing SumUp rendering map

SumUp can render in three ways:
1. `selectedMethod.code === "sumup"` renders `SumUpHostedCheckout` (`payment-flow` and `secure-payment-flow`).
2. `selectedMethod.code === "card" && provider_code === "sumup"` also renders `SumUpHostedCheckout`.
3. `menu/page.tsx` hosted redirect orchestrator uses provider-based routing and persists SumUp pending checkout for return verification.

**Important:** route orchestrator in menu page is method/provider-driven and treats SumUp as card provider via `/payments/card/create-session`; there is no dedicated Apple Pay/Google Pay/Wero/PayPal SumUp endpoint branch.

---

### Operator-facing config surfaces

1. **Laravel admin (intended source):**
   - Payments provider forms and payment-method mapping APIs.
2. **Next.js admin pages (also writable):**
   - `/admin/payment-providers` writes to `/api/v1/payment-providers-admin`.
   - `/admin/payments` writes to `/api/v1/payment-methods-admin`.

These Next.js pages are not read-only and therefore duplicate operator configuration surface area.

---

### Unsupported/fake UI states

1. **Direct method code `sumup` is still renderable in frontend components**
   - Even though backend method matrix is centered around `card` + provider assignment.
   - This can create stale or non-canonical presentation path.

2. **Wallet/payment method UX can appear provider-agnostic**
   - UI supports Apple Pay/Google Pay/PayPal/Wero methods broadly; backend compatibility is provider-specific and enforced server-side.
   - Potential mismatch between what operator sees selectable and what backend will actually execute.

3. **Provider label fallback in hosted redirect flow**
   - Non-worldline/non-vr provider errors are labelled “Stripe” by default in one branch, which can mislead when SumUp is the selected provider.

---

### Source-of-truth conflicts

- Laravel admin is declared source-of-truth, but Next.js admin pages are writable against same admin APIs.
- This creates governance ambiguity (which admin UX is official), and increases risk of inconsistent operator guidance/validation messaging.

---

### Recommendations (frontend, conceptual only)

1. Show SumUp only via canonical card-provider path (`card + provider_code=sumup`).
2. Hide/retire direct `sumup` method rendering in payment components unless backend explicitly keeps method code `sumup` as first-class.
3. Keep Next.js admin pages read-only or clearly mark as non-canonical if Laravel backend remains official admin.
4. Keep backend hard validation as final authority for unsupported provider/method combinations.


## Part D — Ready2Order vs SumUp (architecture + operational readiness)

### Ready2Order baseline (POS integration)

**Config**
- POS config detection for `ready2order`, base URL helper, token usage.

**Menu sync**
- POS→local normalization/import in `PosConfigs::onSyncMenu`.
- Local→POS push intentionally skipped for ready2order direct mode (guarded behavior).

**Table sync**
- `Pos_configs_model::syncReady2OrderTables` executes dedicated sync scripts.

**Order push**
- `r2o_outbound_dryrun_helper` builds outbound payload with mapping keys and can push to Ready2Order orders endpoint when enabled.

**Webhook/status ingestion**
- POS webhook controllers exist for provider-based inbound order ingestion.

**Logs/diagnostics**
- Extensive prefixed logging in helper/scripts/controllers.

---

### SumUp online baseline (payment provider lane)

- Card checkout creation, redirect/widget support, return-status polling, diagnostics endpoints, and optional webhook + finalization helper in secondary route family.
- Credentials managed in Payments provider configuration.

---

### SumUp terminal baseline (card-present lane)

- Dedicated `terminal_devices` model/UI.
- Reader discovery and connection tests using SumUp readers endpoint.
- Explicit dependency on online SumUp provider readiness (token must be configured/enabled first).

---

### Valid comparison points (Ready2Order vs SumUp)

Valid:
1. Admin clarity and source-of-truth consistency.
2. Runtime observability/diagnostics completeness.
3. Duplicate surface risk and configuration drift controls.

---

### Invalid comparison points

Invalid/unfair:
1. Expecting SumUp online provider lane to offer full POS menu/table sync parity with Ready2Order.
2. Treating SumUp as a single domain equal to a full POS aggregator without separating online payments vs terminal card-present concerns.

---

### Architecture recommendation

1. **SumUp online**
   - Canonical execution path: `app/admin/routes.php` provider-resolved checkout/status flow.
   - Consolidate webhook/finalization with this path conceptually.

2. **SumUp terminal/card-present**
   - Canonical storage: `terminal_devices` only.
   - `pos_configs.sumup_*` should be treated as deprecation residue unless external dependency is proven.

3. **Ready2Order POS**
   - Keep as POS baseline lane (menu/table/order sync behavior), but continue reducing script/path hardcoding and key-value mapping sprawl.

4. **Cross-cutting governance**
   - One canonical admin surface (Laravel), with any Next.js admin pages read-only or explicitly secondary.
   - One canonical route family per domain lane to prevent drift.
