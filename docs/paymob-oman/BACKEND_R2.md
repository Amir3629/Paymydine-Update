# Paymob Oman Backend R2

Status: prepared for sandbox credentials; no Paymob payment method is automatically enabled.

## Product rule

Paymob is integrated as a regional provider. Oman payment methods have their own market identities so PMD can later render Payment Settings from the restaurant location instead of showing every country's methods to every tenant.

Oman variants:

- `om_card` -> Cards (Oman) -> canonical `card`
- `om_omannet` -> OmanNet (Oman) -> canonical `omannet`
- `om_apple_pay` -> Apple Pay (Oman) -> canonical `apple_pay`
- `om_google_pay` -> Google Pay (Oman) -> canonical `google_pay`

The variant is a PMD catalogue/UI identity. The provider protocol still uses Paymob Integration IDs through the Intention API.

## Market resolution

`PaymentMarketContext` resolves the current tenant from the default restaurant location. `Locations_model::getAddress()` provides `iso_code_2`. Oman is normalized to `OM`.

Do not infer market from browser locale, selected currency, provider credential, request IP, or hostname.

## Oman money

OMR has three minor digits: 1 OMR = 1000 baisa.

`MoneyMinorUnitConverter` must be used at the Paymob boundary:

- `1.000 OMR` -> `1000`
- `8.500 OMR` -> `8500`
- `12.345 OMR` -> `12345`

Never reuse a hard-coded `amount * 100` payment helper for OMR.

## Credentials

The provider config is tenant-scoped. Each restaurant/merchant must use its own Paymob account unless Paymob explicitly approves a platform/sub-merchant model for PMD.

Configuration schema:

- Environment: Test or Live
- Oman API base: `https://oman.paymob.com`
- Currency: OMR
- Test Secret Key
- Test Public Key
- Test API Key
- Test HMAC Secret
- Test Cards (Oman) Integration ID
- Test OmanNet (Oman) Integration ID
- Test Apple Pay (Oman) Integration ID
- Test Google Pay (Oman) Integration ID
- Live equivalents
- Checkout experience: Unified Checkout first, Pixel after QA

An Integration ID is optional at save time because method enablement is account-specific. A missing Integration ID means that method is not offerable.

## API authentication

Two auth models are deliberately kept separate:

1. Intention/refund/void/capture: `Authorization: Token {secret_key}`.
2. Transaction Inquiry: API Key -> `/api/auth/tokens` -> short-lived token.

Do not use the Inquiry token for the Intention API and do not put the Secret Key in the browser.

## Checkout flow

1. PMD persists a stable payment-attempt identity and a stable `special_reference`.
2. PMD resolves the tenant market as Oman.
3. PMD resolves requested regional method variants to this tenant's Paymob Integration IDs.
4. PMD converts OMR to baisa/minor units.
5. PMD sends `POST /v1/intention/`.
6. Paymob returns `client_secret`.
7. Frontend opens Unified Checkout using Public Key + `client_secret`.
8. Browser return is UX only.
9. Paymob POST callback reaches PMD.
10. PMD verifies HMAC-SHA512 in the documented 20-field order.
11. PMD verifies currency, amount and merchant reference against the local attempt.
12. Only then may the shared PMD settlement authority mark the order paid.
13. Duplicate callbacks are deduplicated by Paymob transaction ID/local idempotency key.

`PaymobOmanRuntimeService` stops before DB settlement intentionally. It returns `settlement_candidate=true`; a single shared PMD settlement authority must perform the financial write.

## Billing data

Paymob requires billing data for Intention requests. The runtime fills unused address fields with `NA`, but requires a real customer `phone_number`.

Country defaults to `OM` for the Oman provider.

## Payment methods in Oman

Current Paymob regional documentation/catalogue supports these Oman online method families:

- Cards: Visa / Mastercard / American Express
- OmanNet
- Apple Pay
- Google Pay

Availability on a specific merchant is not inferred from the public catalogue. PMD requires the corresponding Integration ID from that merchant's dashboard before offering the method.

Do not seed Egypt-only wallets, Egypt kiosks, Egypt bank installments, or unsupported BNPL methods into the Oman market.

## Refund / void / capture

`PaymobApiClient` implements the documented provider operations:

- Refund: `/api/acceptance/void_refund/refund`
- Void: `/api/acceptance/void_refund/void`
- Capture: `/api/acceptance/capture`

Refund amount uses the OMR minor-unit converter.

These methods are provider API primitives only. PMD must add operation-level authorization, idempotency, local audit records and reconciliation before owner-facing refund buttons are enabled.

## Reconciliation

Primary truth is the HMAC-verified callback.

Inquiry is the safety net for missing callbacks/support/reconciliation:

- transaction: `/api/acceptance/transactions/{transaction_id}`
- order: `/api/ecommerce/orders/{order_id}`

Inquiry obtains a short-lived auth token from `/api/auth/tokens` using API Key.

The exact merchant-order/special-reference search URL varies by regional/account API Explorer and is intentionally not hard-coded before sandbox access.

## HMAC types

Implemented now:

- Transaction callback: 20-field SHA-512 HMAC
- Card-token callback: 8-field SHA-512 HMAC

Subscription callback has a separate HMAC shape and is not wired into PMD R2.

## Saved cards / subscriptions / split

Paymob documents tokenization, MIT, subscriptions, split features and convenience fees, but several require account enablement and field shapes can vary.

PMD R2 does not expose these features to restaurants yet. They should be added only after the Oman merchant/API Explorer confirms the exact account contract.

## Terminal / POS status

Paymob publicly advertises in-person `Tap to Pay` through the Paymob App on supported devices.

That is **not** enough evidence for PMD to implement remote terminal control.

The public developer material currently does not provide the contract PMD needs for:

- list/discover Paymob Oman terminals
- pair/provision a terminal
- send an amount from PMD to a physical terminal
- poll a terminal transaction
- receive a terminal-specific webhook
- test against a virtual/test terminal

Therefore:

- `tap_to_pay_product = true`
- `remote_terminal_api = false`
- `pmd_terminal_runtime = false`

PMD's existing unknown-provider terminal path remains fail-closed through `NullTerminalProvider`; no fake success is allowed.

Ask Paymob Oman for:

1. POS/ECR or Cloud Terminal API documentation
2. App-to-App integration documentation
3. supported terminal/device models
4. terminal discovery and pairing/provisioning contract
5. remote purchase/charge endpoint
6. status/reconciliation endpoint
7. terminal refund/cancel API
8. test terminal/simulator
9. certification/partner requirements
10. merchant MID/TID and multi-location model

Only after those documents are received should `PaymobOmanTerminalProvider` and `TerminalPaymentService` routing be implemented.

## Tenant catalogue

`PaymobOmanTenantCatalogService` is idempotent and country-gated.

It creates, only for an Oman tenant:

- provider `paymob` / Paymob (Oman)
- `om_card`
- `om_omannet`
- `om_apple_pay`
- `om_google_pay`

Every new row starts disabled / Not offered. It never copies credentials and does not auto-enable anything.

This service should be invoked as part of Oman tenant onboarding after the default restaurant location country is set to Oman. It must not be run globally for existing Germany tenants.

## Current backend files

- `app/Services/Payments/ProviderCapabilityRegistry.php`
- `app/Services/Payments/PaymobApiClient.php`
- `app/Services/Payments/PaymentMarketRegistry.php`
- `app/Services/Payments/PaymentMarketContext.php`
- `app/Services/Payments/MoneyMinorUnitConverter.php`
- `app/Services/Payments/PaymobOmanConfigSchema.php`
- `app/Services/Payments/PaymobOmanConnectionService.php`
- `app/Services/Payments/PaymobOmanRuntimeService.php`
- `app/Services/Payments/PaymobOmanTenantCatalogService.php`

## Still intentionally blocked before sandbox/account approval

- No Paymob method is marked implemented in `ProviderCapabilityRegistry` yet.
- No Paymob method is auto-enabled for guests.
- No live/test Intention is created without merchant credentials.
- No provider callback is allowed to settle an order until the shared PMD settlement route/service is wired with durable idempotency.
- No terminal charge can be sent until Paymob provides its Oman POS/ECR contract.
- No account-dependent advanced feature is advertised merely because the provider has it in a general catalogue.

This is deliberate fail-closed behavior, not unfinished error handling.
