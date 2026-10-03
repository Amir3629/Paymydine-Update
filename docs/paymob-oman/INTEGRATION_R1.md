# Paymob Oman Integration R1

Status: scaffold only. No Paymob payment method is enabled yet.

## Goal

Add Paymob as a tenant-scoped PMD payment provider for Oman without creating a second payment authority. The first production flow will be Paymob API + Unified Checkout, with backend callback/HMAC verification as the only settlement authority.

## Official Paymob contract used for R1

- Region: Oman (`https://oman.paymob.com/`).
- Development uses test credentials first.
- API integrations require a merchant account, dashboard access, API Secret/Public credentials, Integration ID(s), webhook endpoint, and redirect URLs.
- Every API payment starts by creating a Payment Intention on the backend.
- The intention response provides a client secret used to launch Unified Checkout or Pixel.
- Backend callbacks/webhooks are the source of truth for final payment state.
- Callback authenticity must be verified with Paymob HMAC before PMD settles an order.
- Public catalogue includes Card (Visa/Mastercard/Amex), OmanNet, Apple Pay, and Google Pay, but Paymob states that actual method availability depends on merchant account configuration.
- Paymob also markets in-person/Tap-to-Pay products. PMD must NOT claim terminal integration until Paymob Oman provides a supported terminal/ECR/Cloud Terminal API contract for the merchant account.

## PMD architecture rules

1. `Payments.php` remains save/validation/provider authority.
2. `Pmdfinance.php` remains presentation/schema for owner Payment Settings.
3. `ProviderCapabilityRegistry` separates catalogue capability from implemented runtime capability.
4. `Payments_model::METHOD_PROVIDER_MATRIX` is updated only when an end-to-end PMD flow exists.
5. Provider assignment never implies merchant-account readiness. Runtime readiness must be verified.
6. No order is marked paid from browser redirect/UI state. Only a verified backend callback (or a trusted provider status reconciliation path) can settle.
7. Reuse PMD payment-attempt/settlement/idempotency infrastructure; do not create a Paymob-only order settlement engine.
8. Cashier and Waiter UI must consume the shared payment runtime, not implement separate Paymob logic.

## Planned provider configuration

Test and production credentials must stay separate. Exact storage will be finalized after the merchant dashboard is available.

Candidate fields:

- environment: `test|production`
- api_base_url (Oman regional base)
- secret_key (server secret; encrypted/never exposed client-side)
- public_key
- api_key, only if required by the enabled Paymob API path
- hmac_secret (server secret; encrypted)
- card_integration_id
- omannet_integration_id
- apple_pay_integration_id
- google_pay_integration_id
- checkout_mode: default `unified_checkout`; later optional `pixel`
- connection_status
- last_tested_at
- discovered_payment_methods

Do not require all integration IDs. Save/test must accept the subset actually enabled by Paymob for that Oman merchant.

## R1 online flow

1. Owner connects Paymob Test credentials in Payments & Finance.
2. PMD validates credentials without logging or returning secrets.
3. PMD records/discovers the merchant-enabled Paymob methods.
4. Owner assigns only an implemented + discovered Paymob method.
5. At checkout PMD creates one local payment attempt/idempotency reference.
6. Backend creates Paymob Payment Intention with amount, currency, PMD order/reference, and allowed Integration ID(s).
7. Frontend launches Paymob Unified Checkout using returned client secret.
8. Customer completes 3DS/payment at Paymob.
9. Browser redirect updates UX only; it does not settle the order.
10. Paymob backend callback reaches PMD.
11. PMD verifies HMAC using the exact Paymob callback contract.
12. PMD validates order/reference, amount, currency, provider transaction identifier and success state.
13. PMD performs idempotent settlement through the shared PMD settlement path.
14. Duplicate callbacks return success/no-op after confirming already-settled state.

## Oman method plan

- `card`: Paymob catalogue capability; implementation target R1.
- `omannet`: new PMD method code; implementation target R1 when enabled on merchant account.
- `apple_pay`: implementation target after merchant dashboard confirms its Paymob Integration ID/readiness.
- `google_pay`: implementation target after merchant dashboard confirms its Paymob Integration ID/readiness.

Nothing is automatically enabled just because it exists in Paymob documentation.

## POS / terminal plan

Paymob has in-person products, but R1 deliberately does not add `terminal_payments` as implemented capability.

Before terminal work, request from Paymob Oman:

- POS/ECR integration guide
- terminal API / Cloud Terminal API documentation
- supported Oman terminal models
- how PMD can enumerate/pair terminals
- whether amount can be pushed remotely from PMD to a terminal
- transaction create/status/cancel/refund endpoints
- webhook/status contract for terminal payments
- test MID/TID and test/virtual terminal support
- App-to-App / SmartPOS integration documentation

If a supported remote terminal API exists, implement `PaymobTerminalProvider` behind PMD's existing `TerminalPaymentProviderInterface` and route it through `TerminalPaymentService`. Do not create a parallel terminal settlement flow.

## Work sequence

### R1-A - scaffold (safe before merchant approval)
- Add Paymob/OmanNet catalogue capability.
- Keep `implemented_*` empty.
- Prepare architecture and credential contract.

### R1-B - provider settings
- Add `paymob` to provider records/UI.
- Add test/live credential fields.
- Add redaction/encryption rules.
- Add Test Connection.
- Persist runtime method discovery.

### R1-C - online payment runtime
- Add tenant-scoped Paymob API client.
- Add Intention creation.
- Add Unified Checkout start endpoint.
- Add callback + HMAC verifier.
- Add idempotent reconciliation/settlement.
- Then mark each finished method as implemented.

### R1-D - Oman methods
- Add `omannet` as a PMD payment method.
- Card first; then OmanNet; then Apple Pay/Google Pay as merchant readiness is confirmed.

### R1-E - terminal (only after private/merchant docs)
- Add Paymob terminal adapter only if Paymob Oman provides a supported ECR/terminal API.

## Merchant dashboard information needed later

Never paste secret values into tickets/docs/chat. We only need to know which fields/methods exist.

- Test mode enabled: yes/no
- API Keys page available: yes/no
- Card integration available + Integration ID exists: yes/no
- OmanNet integration available + Integration ID exists: yes/no
- Apple Pay integration available + Integration ID exists: yes/no
- Google Pay integration available + Integration ID exists: yes/no
- HMAC secret available: yes/no
- POS / Tap to Pay / terminal section present: yes/no

## Current safety gate

At the end of R1-A, Paymob is visible only to the internal capability catalogue. It is NOT assignable as a working provider and cannot charge or settle orders. This prevents a half-built provider from appearing live while merchant onboarding is still pending.
