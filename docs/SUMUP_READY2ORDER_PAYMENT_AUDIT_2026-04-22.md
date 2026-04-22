# PayMyDine SumUp / Ready2Order / Payment Mapping Audit (2026-04-22)

## Section 1: File inventory

### SumUp inventory
- `app/admin/controllers/Payments.php`
  - SumUp provider form fields (`access_token`, `url`, `id_application`) and validation.
  - Auto merchant identity resolution via `GET /v0.1/me`.
  - Provider connection testing.
- `app/admin/routes.php`
  - Runtime method/provider resolution.
  - Card checkout session creation branch for provider `sumup`.
  - SumUp checkout status verification endpoint.
  - SumUp widget event logging endpoint.
  - SumUp health/debug endpoints.
- `app/main/routes_sumup.php`
  - Additional SumUp routes: merchant profile, create checkout, checkout lookup, refund, webhook.
  - Includes payment finalization helper for paid checkouts.
- `app/admin/controllers/TerminalDevices.php`
  - SumUp reader discovery and terminal connection testing.
  - Explicit split between online provider config and terminal setup.
- `app/admin/models/Terminal_devices_model.php`
  - Terminal device domain model (card-present setup).
- `app/admin/models/config/terminal_devices_model.php`
  - Laravel admin fields and toolbar actions for reader setup.
- `app/admin/models/config/pos_configs_model.php`
  - Legacy/hidden SumUp terminal fields still present in POS config schema.
- `app/admin/models/Pos_configs_model.php`
  - Global scope excludes SumUp from POS config listings.
- `app/admin/controllers/PosConfigs.php`
  - SumUp path treated as no-menu-sync mode and webhook-registration skipped.
- `app/admin/database/migrations/2026_04_21_120000_add_sumup_terminal_fields_to_pos_configs.php`
  - Adds hidden SumUp terminal columns to `pos_configs` (legacy overlap with terminal_devices).
- `app/admin/database/migrations/2026_04_22_000100_create_terminal_devices_table.php`
  - Creates dedicated `terminal_devices` table for card-present.
- `app/admin/requests/TerminalDevices.php`
  - Validation rules for terminal device setup.
- `app/Services/Payments/PaymentProviderFactory.php`
  - Declares SumUp as a selectable payment provider.
- `app/Services/Payments/Providers/SumUpProvider.php`
  - Stub only (returns `success=false`, no real createPayment implementation).
- `config/logging.php`
  - Dedicated `sumup` daily log channel.
- `frontend/app/menu/page.tsx`
  - Handles SumUp pending checkout localStorage and return-status verification.
- `frontend/components/payment/sumup-hosted-checkout.tsx`
  - SumUp widget + redirect hybrid flow.
- `frontend/components/payment-flow.tsx` and `frontend/components/payment/secure-payment-flow.tsx`
  - Frontend routes SumUp via `sumup` method code OR `card` method with `provider_code=sumup`.
- `frontend/app/admin/payment-providers/page.tsx`
  - Next.js admin-like surface exposes SumUp credentials.
- `frontend/app/admin/payments/page.tsx`
  - Next.js method/provider assignment UI.

### Ready2Order inventory
- `app/admin/controllers/PosConfigs.php`
  - Ready2Order detection and direct products sync behavior.
  - Generic webhook registration intentionally skipped for Ready2Order direct mode.
- `app/admin/models/Pos_configs_model.php`
  - Ready2Order table sync shell execution (`pmd_r2o_sync_tables.php`, `pmd_r2o_auto_create_tables.php`).
- `app/admin/views/posconfigs/edit.blade.php`
  - Ready2Order sync modal and client-side sync UI behavior.
- `app/admin/controllers/PosWebhookController.php`
  - Webhook ingestion path for external POS payloads (provider-driven).
- `app/admin/controllers/Api/PosWebhookController.php`
  - Similar POS webhook ingestion controller variant.
- `app/system/helpers/r2o_outbound_dryrun_helper.php`
  - Outbound payload dry-run and optional live push to Ready2Order orders API.
  - Uses settings-based payment/table/product mapping keys.
- `app/Services/R2O/pmd_r2o_import_orders_fullscan.php`
  - Fullscan importer from Ready2Order invoices, with DB table bootstrapping.
- `app/Services/R2O/pmd_r2o_stateful_tracker.php`
  - Stateful invoice fetch/tracking utility.
- `app/admin/routes.php`
  - Calls dry-run outbound helper after order creation.
  - Includes routes for POS invoice PDF retrieval via ready2order API token.
- `routes/api.php`
  - Attempts to require `routes/api_r2o_webhook.php` (file not found in repository).

---

## Section 2: Architecture grouping

### Laravel admin UI/config
- **Payment providers UI (active):** SumUp provider credentials are actively managed in Laravel `Payments` provider mode (`access_token`, `url`, auto merchant code, test connection).  
- **POS config UI (mixed active + legacy):** SumUp is explicitly excluded from active POS config use, but hidden SumUp terminal fields still exist in `pos_configs` config + migration, indicating legacy residue.  
- **Terminal Devices UI (active):** New dedicated SumUp card-present setup path exists and is the intended layer for readers/pairing.

### Payment provider logic
- **Active:** Runtime card session route supports `sumup` in `app/admin/routes.php` and creates checkouts against `/v0.1/checkouts`.  
- **Partially duplicated:** `app/main/routes_sumup.php` provides another SumUp API surface for create/lookup/refund/webhook, partially overlapping admin routes.  
- **Legacy/stub signal:** `App\Services\Payments\Providers\SumUpProvider` is still a stub and not the real execution path.

### POS integration logic
- **Ready2Order is mature POS lane:** Config detection, table sync utilities, menu import-first sync, outbound dry-run/live push scaffolding, invoice retrieval, and webhook ingestion paths.  
- **SumUp POS lane is transitional:** Dedicated terminal domain exists, but legacy `pos_configs` fields remain and POS controller still contains SumUp-specific bypass behavior.

### Frontend checkout logic
- **SumUp online checkout is active:** Frontend supports redirect + widget fallback via `checkout_id`, stores pending SumUp checkout IDs, and verifies status after return.  
- **Provider-based routing is active:** `card` method delegates to provider chosen in backend (`provider_code`) and can reach SumUp branch.

### Webhook/status logic
- **SumUp:** Checkout status verification endpoint + widget event logging endpoint + optional webhook route in `app/main/routes_sumup.php`.  
- **Ready2Order:** Webhook controllers exist, plus external POS pull in handlers.

### Logs/diagnostics
- **SumUp logs:** Dedicated `sumup` channel records identity lookup, create session requests/responses, widget events, health/debug checks.  
- **Ready2Order logs:** Uses system log with prefixed entries for import/fullscan/stateful/outbound dry-run and push.

### Database/migrations
- **SumUp provider data:** Stored in payment config payload (`Payments_model` data/meta).  
- **SumUp terminal data:** Stored in `terminal_devices` (new), but duplicated historical fields persisted in `pos_configs`.  
- **Ready2Order operational data:** Importer creates/uses POS import and mapping tables (`ti_pos_order_imports`, `ti_pos_order_import_items`, `ti_pos_product_mappings`, etc.) in scripts.

---

## Section 3: Duplicate/conflicting modeling

1. **Two active SumUp API surfaces for online payments**
   - `app/admin/routes.php` has `/payments/card/create-session` sumup branch + checkout-status + health/debug/widget-event.
   - `app/main/routes_sumup.php` also has create-checkout/checkout/refund/webhook endpoints.
   - Risk: behavior drift, duplicated auth/config assumptions.

2. **SumUp terminal modeled in two storage layers**
   - New canonical: `terminal_devices` table + model/controller.
   - Legacy duplicate: hidden `sumup_*` fields in `pos_configs` migration/config.
   - Risk: conflicting source of truth for reader setup.

3. **Payment provider config duplicated across DB settings and payment rows**
   - `payment_providers` JSON settings (admin API) and `payments` table config payload both store overlapping provider config.
   - Runtime loaders merge across both, increasing ambiguity.

4. **Ready2Order webhook path ambiguity**
   - `routes/api.php` references a missing `api_r2o_webhook.php` file while webhook controllers/routes exist elsewhere.
   - Risk: hidden dead/expected route contract mismatch.

5. **Frontend Next.js admin pages duplicate Laravel admin concerns**
   - `frontend/app/admin/payment-providers` and `frontend/app/admin/payments` are additional config surfaces even though Laravel admin is stated source of truth.

---

## Section 4: Missing pieces for production readiness

### SumUp payment provider
- No clear idempotency strategy recorded for create-checkout retries.
- No signed webhook verification path shown for `/webhook/sumup`.
- No explicit capability discovery matrix from SumUp account entitlements (only coarse health identity check).
- No strong environment split in SumUp provider fields (single token/base URL set).
- Secret masking UX is partial (fields shown as text in some surfaces, especially Next.js admin pages).
- No explicit reconciliation job for long-pending checkouts.

### SumUp POS / terminal
- Terminal pairing lifecycle is represented, but no explicit periodic heartbeat/reader-online monitor found.
- Legacy fields in `pos_configs` indicate migration not fully consolidated.

### Payment method/provider governance
- METHOD_PROVIDER_MATRIX allows combinations broader than implemented capabilities for some methods.
- Runtime checks are strong in save API, but frontend surfaces can still present stale combinations before server rejects.
- Potential dangerous UI state: admin can see/support methods for providers whose runtime flow remains incomplete or provider disabled.

### Ready2Order baseline gaps (despite being richer)
- Significant operational logic still lives in standalone scripts with hardcoded paths/DB names.
- Uses shell exec dependencies (`/home/ubuntu/...`) in model/controller flows.
- Not all mapping/config appears centralized in Laravel models/controllers (some in `settings` key-value conventions).

---

## Section 5: Questions unresolved

1. Which SumUp route family is canonical for production: `app/admin/routes.php` endpoints or `app/main/routes_sumup.php` endpoints?
2. Should `pos_configs` SumUp columns be considered migrated/obsolete now that `terminal_devices` exists?
3. Is Next.js `/admin/*` intended for real operator config, or only transitional tooling while Laravel admin remains source of truth?
4. What is the intended webhook contract for SumUp: polling checkout-status only, webhook only, or both with signature verification?
5. Is `routes/api.php` missing `api_r2o_webhook.php` accidental technical debt or an intentionally removed route?
6. For method/provider mapping, is the authoritative source `payments` table rows, `settings.payment_methods`, or resolved runtime merge output?
7. Are Apple Pay / Google Pay / PayPal / Wero under SumUp expected roadmap items or should they be hard-blocked at admin UX + API level now?
