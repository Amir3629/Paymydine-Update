# Payment Provider Production Readiness Audit

Last updated: 2026-04-03

This file audits **real runtime status in this repo**, not theoretical capability alone.

## Status labels
- `proven_ready`
- `code_complete_but_runtime_unproven`
- `partial_not_safe`
- `unsupported`

## Pair-by-pair audit (current codebase)

| provider | method | status | exact code paths that implement it | exact missing pieces (if any) | dashboard prerequisites required from merchant | admin fields sufficient | extra credentials/setup required | should appear in admin dropdown now |
|---|---|---|---|---|---|---|---|---|
| stripe | card | code_complete_but_runtime_unproven | `frontend/app/menu/page.tsx` Stripe card form; `frontend/components/payment/secure-payment-form.tsx` StripeCardForm; `app/admin/routes.php` `/api/v1/payments/stripe/create-intent` | deployed runtime PASS evidence not yet attached in this repo | Stripe account active, API keys, currency support | yes | merchant must enable card acceptance in Stripe account | no |
| stripe | apple_pay | code_complete_but_runtime_unproven | `frontend/app/menu/page.tsx` WalletStripePay for `apple_pay`; `/api/v1/payments/stripe/create-intent` | wallet/device/domain runtime PASS evidence not yet attached | Apple Pay enabled for Stripe, domain verification, compatible device/browser | yes | Apple merchant/domain setup in Stripe | no |
| stripe | google_pay | code_complete_but_runtime_unproven | `frontend/app/menu/page.tsx` WalletStripePay for `google_pay`; `/api/v1/payments/stripe/create-intent` | wallet/device runtime PASS evidence not yet attached | Google Pay enabled/eligible in Stripe, supported browser/device | yes | Google Pay activation in Stripe context | no |
| stripe | paypal | unsupported | none | provider does not expose PayPal as Stripe method in this app architecture | n/a | n/a | n/a | no |
| stripe | cod | unsupported | none | COD is intentionally provider-less | n/a | n/a | n/a | no |
| paypal | card | partial_not_safe | `frontend/app/menu/page.tsx` has PayPal card rendering path; `frontend/components/payment/secure-payment-form.tsx` supports `paypalFundingSource="card"`; `/api/v1/payments/paypal/create-order` + capture | no strict eligibility safety contract; merchant capability variance | PayPal Advanced Checkout card eligibility + account approval | partially | may require advanced card product enablement beyond API keys | no |
| paypal | apple_pay | code_complete_but_runtime_unproven | none end-to-end in this app | not implemented in checkout runtime | PayPal Apple Pay eligibility, domain + merchant setup | no | yes | no |
| paypal | google_pay | code_complete_but_runtime_unproven | none end-to-end in this app | not implemented in checkout runtime | PayPal Google Pay eligibility and setup | no | yes | no |
| paypal | paypal | code_complete_but_runtime_unproven | `frontend/app/menu/page.tsx` PayPal method render; `frontend/components/payment/secure-payment-form.tsx` PayPalForm; `/api/v1/payments/paypal/create-order` + `/capture-order` in `app/admin/routes.php` | deployed runtime PASS evidence not yet attached in this repo | PayPal app credentials + checkout enabled | yes | live/sandbox app setup required | no |
| paypal | cod | unsupported | none | COD is provider-less | n/a | n/a | n/a | no |
| worldline | card | code_complete_but_runtime_unproven | `/api/v1/payments/card/create-session` worldline branch + `/api/v1/payments/worldline/checkout-status` verification + frontend return handler in `frontend/app/menu/page.tsx` | deployed runtime PASS evidence not yet attached in this repo | worldline contract/product + API creds + valid hosted checkout config | yes | merchant product enablement + contract settings | no |
| worldline | apple_pay | code_complete_but_runtime_unproven | none | no worldline wallet path in frontend/backend orchestration | wallet product enablement in worldline | no | yes | no |
| worldline | google_pay | code_complete_but_runtime_unproven | none | no worldline wallet path in frontend/backend orchestration | wallet product enablement in worldline | no | yes | no |
| worldline | paypal | code_complete_but_runtime_unproven | none in this checkout path | worldline PayPal product not wired in checkout runtime | worldline PayPal product activation | no | yes | no |
| worldline | cod | unsupported | none | COD is provider-less | n/a | n/a | n/a | no |
| sumup | card | code_complete_but_runtime_unproven | `/api/v1/payments/card/create-session` sumup branch + `/api/v1/payments/sumup/checkout-status` verification + frontend return handler in `frontend/app/menu/page.tsx` | deployed runtime PASS evidence not yet attached in this repo | SumUp merchant code + token + online checkout enabled | yes | merchant profile/config required | no |
| sumup | apple_pay | code_complete_but_runtime_unproven | none | no wallet-specific sumup web flow wired | depends on SumUp product/channel | no | yes | no |
| sumup | google_pay | code_complete_but_runtime_unproven | none | no wallet-specific sumup web flow wired | depends on SumUp product/channel | no | yes | no |
| sumup | paypal | unsupported | none | not supported in this app/provider model | n/a | n/a | n/a | no |
| sumup | cod | unsupported | none | COD is provider-less | n/a | n/a | n/a | no |
| square | card | code_complete_but_runtime_unproven | `/api/v1/payments/card/create-session` square branch + `/api/v1/payments/square/checkout-status` verification + frontend return handler in `frontend/app/menu/page.tsx` | deployed runtime PASS evidence not yet attached in this repo | square app token + location + checkout setup | yes | location/app enablement required | no |
| square | apple_pay | code_complete_but_runtime_unproven | none end-to-end | no Square Web Payments SDK Apple Pay integration in current frontend | apple pay verification + square wallet setup | no | yes | no |
| square | google_pay | code_complete_but_runtime_unproven | none end-to-end | no Square Web Payments SDK Google Pay integration in current frontend | google pay + square wallet setup | no | yes | no |
| square | paypal | unsupported | none | not supported by square in this app model | n/a | n/a | n/a | no |
| square | cod | unsupported | none | COD is provider-less | n/a | n/a | n/a | no |

## Enforcement notes (runtime safety)
- Admin dropdown options are now constrained by:
  1) provider capability matrix
  2) implemented flow matrix
  3) provider runtime readiness (required credential/config presence for active mode)
- `/api/v1/payments` also suppresses methods whose assigned provider is disabled or missing required runtime credentials.
- `/api/v1/payment-methods-admin` save now rejects assignments to providers that are not runtime-ready.
- `/api/v1/payment-providers-admin` save now rejects enabling providers with missing required credentials and syncs provider config into `payments` table runtime data.

## FINAL ENFORCED ADMIN DROPDOWN MATRIX
- `card` -> _none_ (blocked until provider pair is runtime-proven by UAT)
- `apple_pay` -> _none_ (blocked until provider pair is runtime-proven by UAT)
- `google_pay` -> _none_ (blocked until provider pair is runtime-proven by UAT)
- `paypal` -> _none_ (blocked until provider pair is runtime-proven by UAT)
- `cod` -> provider-less only

## Code enforcement points
- Controller matrix gate: `app/admin/controllers/Payments.php` -> `implementedProviderFlows()`, `availableProviderCodesForMethod()`, `getCompatibleProviders()`.
- API matrix gate: `app/admin/routes.php` -> `implementedFlowMatrix`, `availableProviderCodesForMethod`, `/api/v1/payments`, `/api/v1/payment-methods-admin`.

## Merchant prerequisites (beyond API keys)
- Stripe wallets require wallet/domain setup and supported device/browser.
- PayPal requires product eligibility (especially cards/APMs) and account/app approvals.
- Square/Worldline/SumUp typically require account-level product/location/channel enablement and sometimes merchant/domain verification for wallets.
