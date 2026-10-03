# PayMyDine Türkiye Tenant Readiness R1

## Scope

This change is intentionally **Türkiye-tenant only**. A location must resolve to country `TR` through `LocationPlatformContext` before any Turkey-specific service can read or write Turkey state. Other countries are not provisioned with `pmd_tr_*` tables or Turkey integration rows.

The implementation creates a safe product foundation for current and future Türkiye tenants. It does **not** fake private partner APIs, fiscal certification, acquiring approval, or credentials that PayMyDine does not yet possess.

## Automatic provisioning

When Superadmin applies the Türkiye market profile to a tenant, `SuperAdminTenantMarketService` now invokes `TurkeyTenantProvisioningService` while the tenant database is selected.

Provisioned domains:

- integration/provider configuration
- YN ÖKC fiscal transaction evidence/state
- delivery marketplace order/settlement normalization
- ingredients, recipes, stock movements, counts and waste
- customer identity, loyalty points and communication consent
- local/offline edge event outbox

All integrations are seeded disabled and `production_ready = false`.

## Turkey-only runtime guard

`TurkeyTenantContext` is the mandatory guard for Turkey services. Location country is authoritative. The existing tenant market setting remains only the fallback already defined by `LocationPlatformContext`.

## Fiscal / YN ÖKC

`TurkeyFiscalStateService` stores PMD-side evidence around the authoritative Turkish fiscal record. It never creates fiscal success by itself.

Supported PMD-side states:

- `ORDER_OPEN`
- `ORDER_PREPARING`
- `ORDER_AWAITING_FISCAL`
- `FISCAL_OPEN`
- `PAYMENT_PENDING`
- `PAYMENT_APPROVED_FISCAL_PENDING`
- `FISCALIZED`
- `SETTLED`
- `FISCAL_FAILED_REQUIRES_STAFF`

`FISCALIZED` requires a fiscal document type and number from the external fiscal ecosystem. `SETTLED` is rejected until fiscalization evidence exists.

Still external/partner-blocked:

- YN ÖKC manufacturer selection
- GMP-3/private SDK access
- device/security pairing agreement
- applicable manufacturer/TÜBİTAK certification path
- test/production device IDs and TSM environment
- authorized e-Fatura/e-Arşiv provider integration

## Payments

The root Türkiye country payment/terminal catalogue remains deliberately empty/fail-closed. This change does not enable an unverified Turkish PSP or terminal.

`TurkeyIntegrationRegistry` tracks:

- Turkish acquirer / TCMB-authorized PSP
- TR Karekod / FAST merchant-payment path
- YN ÖKC fiscal partner
- e-document provider

`TurkeyIntegrationConfigurationService` refuses raw secrets and accepts only credential references. Configuration never activates production. `markVerified()` requires explicit verification evidence, and regulated integrations additionally require an external approval status of `approved`, `active`, or `certified`.

Still external/partner-blocked:

- acquirer/PSP selection and merchant contract
- provider API credentials
- terminal/fiscal topology
- current authorization-scope verification
- production merchant IDs
- TR Karekod/FAST commercial activation

## Delivery marketplaces

`TurkeyMarketplaceGatewayService` provides a provider-neutral, idempotent canonical inbox for:

- `yemeksepeti`
- `uber_trendyol_go`

It records normalized order economics and settlement lines without coupling the PMD order domain to provider payloads.

New standalone GetirYemek work is explicitly catalogued as `do_not_start_new_connector`.

Still external/partner-blocked:

- Yemeksepeti client credentials and webhook signing contract
- Uber/Trendyol Go restaurant API/commercial contract
- provider-specific request/response adapters
- provider sandbox/UAT
- merchant/outlet mapping
- menu publication/status/cancellation API mapping

Do not point generic Trendyol Marketplace endpoints at this service unless the food/restaurant partner contract explicitly authorizes those endpoints.

## Stock / recipe / food cost / waste

`TurkeyInventoryService` provides an append-only movement ledger, on-hand calculation, recipe-cost calculation and idempotent waste recording.

Provisioned entities include:

- ingredients
- recipes and recipe lines
- stock movements
- physical counts/count lines
- waste events

The ledger is intentionally native PMD state. Accounting/supplier systems should attach through adapters rather than own PMD stock truth.

Still to build in product UI/workflows:

- ingredient and supplier administration screens
- recipe editor and version workflow
- purchase order/goods receipt UX
- physical count workflow
- low-stock/reorder UX
- theoretical-vs-actual food-cost reports
- automatic recipe consumption from canonical PMD order/KDS events
- accounting/supplier adapters

## Loyalty / CRM / KVKK / İYS

`TurkeyLoyaltyService` adds:

- normalized customer identity
- explicit phone verification state
- separate communication-consent ledger
- loyalty accounts
- append-only points ledger
- channel-specific marketing permission checks

Authentication/verification, privacy notice, loyalty membership and marketing consent remain separate concepts. No code here converts an OTP into marketing consent.

Still external/partner-blocked:

- legal review of KVKK notices/retention/data transfers
- İYS authorized integration route and credentials
- Turkish SMS/OTP provider
- WhatsApp Business onboarding
- customer-facing consent UX
- IYS synchronization worker/webhooks

## Offline / PMD Edge foundation

`TurkeyEdgeEventService` implements the durable event contract for a future location-local PMD Edge agent:

- globally unique event ID
- aggregate/version
- idempotency key
- pending/retry/ack state
- durable payload

This is only the cloud/data contract. A production Edge executable/service, LAN discovery, local DB replication, KDS/cashier/waiter routing and hardware drivers still need implementation and field testing.

## Readiness report

`TurkeyReadinessService` reports schema and partner activation state for a Türkiye location.

For a first fiscal/payment pilot it currently treats these as hard blockers:

- `yn_okc` production-ready
- `acquirer` production-ready
- all Turkey foundation tables present

`e_document` and `yemeksepeti` are reported as recommended pilot integrations.

Important: PMD's `production_ready` flag is internal evidence only. The selected fiscal manufacturer, bank/PSP, GİB/e-document provider and other external partners remain authoritative for real certification/activation.

## Test procedure

### Static/source self-test

Run:

```bash
php scripts/turkey-tenant-readiness-r1-selftest.php
```

This validates the TR country profile, fail-closed payment posture, integration catalogue and service-class availability.

### Tenant provisioning test

In a non-production clone of a tenant DB:

1. Apply the tenant market as Türkiye through the existing Superadmin market flow.
2. Confirm only the Türkiye tenant receives `pmd_tr_*` tables.
3. Confirm a Germany/Oman/Canada tenant receives no `pmd_tr_*` provisioning from this flow.
4. Run `TurkeyReadinessService::report()` and confirm `pilot_ready=false` until real YN ÖKC and acquirer evidence is recorded.

### Fiscal state tests

Test at minimum:

- open order -> attach real/sandbox fiscal unique ID
- payment pending -> approved evidence
- reject `SETTLED` before fiscalization
- reject fiscalization without document number/type
- fiscalized -> settled
- failure -> staff-required state
- refund/reversal evidence preservation

### Marketplace tests

- duplicate webhook/payload returns duplicate without another row
- changed payload for same external order updates canonical state
- reject unknown provider
- record commission/fee settlement lines
- preserve external IDs independently of PMD order IDs

### Inventory tests

- duplicate stock idempotency key does not double-post
- receipts add stock
- recipe consumption removes stock
- waste creates both waste event and negative movement
- latest effective ingredient cost contributes to theoretical recipe cost
- physical counts reconcile through explicit adjustment movements

### Loyalty tests

- phone/email customer resolution
- phone verification stored separately
- marketing denied without latest `GRANTED` consent
- revocation overrides earlier grant
- duplicate points idempotency key does not double-credit
- expired points are excluded from balance

### Failure/offline tests (after Edge runtime exists)

- WAN unplug during open table
- PMD Cloud unavailable
- Edge restart
- waiter Wi-Fi loss/reconnect
- KDS loss
- YN ÖKC power cycle mid-order
- payment approved but PMD acknowledgement lost
- payment command sent but response lost
- two phones attempt split settlement
- marketplace duplicate webhook
- menu changes during outage
- reconnect after multi-hour outage

## What is safe to test now

Safe now in a staging/non-production Turkey tenant:

- tenant-only schema provisioning
- integration configuration state
- readiness report
- fiscal state machine using sandbox/mock evidence only
- marketplace normalization with test payloads
- inventory/recipe ledger
- loyalty/consent ledger
- edge event queue contract

Do **not** claim or test real production fiscal/payment acceptance until the selected YN ÖKC/acquirer partner has supplied the correct contract, SDK, credentials, devices and approval/certification evidence.
