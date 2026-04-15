# Payment Provider Production Readiness Audit

Last updated: 2026-04-15

This file audits **real runtime status in this repo**, not theoretical capability alone.

## Status labels
- `fully_implemented_and_runtime_wired`
- `partially_implemented_but_not_safe_for_admin_assignment`
- `capability_only_not_implemented`
- `unsupported_by_provider`

## Pair-by-pair audit (current codebase)

| provider | method | status | exact code paths that implement it | exact missing pieces (if any) | dashboard prerequisites required from merchant | admin fields sufficient | extra credentials/setup required | should appear in admin dropdown now |
|---|---|---|---|---|---|---|---|---|
| stripe | card | fully_implemented_and_runtime_wired | `frontend/app/menu/page.tsx` Stripe card form; `frontend/components/payment/secure-payment-form.tsx` StripeCardForm; `app/admin/routes.php` `/api/v1/payments/stripe/create-intent` | none critical in app flow | Stripe account active, API keys, currency support | yes | merchant must enable card acceptance in Stripe account | yes |
| stripe | apple_pay | fully_implemented_and_runtime_wired | `frontend/app/menu/page.tsx` WalletStripePay for `apple_pay`; `/api/v1/payments/stripe/create-intent` | none critical in app flow | Apple Pay enabled for Stripe, domain verification, compatible device/browser | yes | Apple merchant/domain setup in Stripe | yes |
| stripe | google_pay | fully_implemented_and_runtime_wired | `frontend/app/menu/page.tsx` WalletStripePay for `google_pay`; `/api/v1/payments/stripe/create-intent` | none critical in app flow | Google Pay enabled/eligible in Stripe, supported browser/device | yes | Google Pay activation in Stripe context | yes |
| stripe | wero | fully_implemented_and_runtime_wired | `frontend/app/menu/page.tsx` Wero redirect flow; `/api/v1/payments/wero/create-session`; `/api/v1/payments/wero/checkout-status` | none critical in redirect-verify-submit flow | Stripe account with Wero enabled for the merchant, supported market/currency | yes | Wero must be enabled in Stripe dashboard + merchant eligibility | yes |
| stripe | paypal | unsupported_by_provider | none | provider does not expose PayPal as Stripe method in this app architecture | n/a | n/a | n/a | no |
| stripe | cod | unsupported_by_provider | none | COD is intentionally provider-less | n/a | n/a | n/a | no |
| paypal | card | partially_implemented_but_not_safe_for_admin_assignment | `frontend/app/menu/page.tsx` has PayPal card rendering path; `frontend/components/payment/secure-payment-form.tsx` supports `paypalFundingSource="card"`; `/api/v1/payments/paypal/create-order` + capture | not marked implemented in backend matrix; no dedicated advanced card-fields eligibility contract checks; region/merchant capability variance high | PayPal Advanced Checkout card eligibility + account approval | partially | may require advanced card product enablement beyond API keys | no |
| paypal | apple_pay | capability_only_not_implemented | none end-to-end | no PayPal Apple Pay frontend component flow wired; no method-specific create/capture orchestration | PayPal Apple Pay eligibility, domain + merchant setup | no | yes | no |
| paypal | google_pay | capability_only_not_implemented | none end-to-end | no PayPal Google Pay frontend component flow wired; no method-specific orchestration | PayPal Google Pay eligibility and setup | no | yes | no |
| paypal | paypal | fully_implemented_and_runtime_wired | `frontend/app/menu/page.tsx` PayPal method render; `frontend/components/payment/secure-payment-form.tsx` PayPalForm; `/api/v1/payments/paypal/create-order` + `/capture-order` in `app/admin/routes.php` | none critical in app flow | PayPal app credentials + checkout enabled | yes | live/sandbox app setup required | yes |
| paypal | cod | unsupported_by_provider | none | COD is provider-less | n/a | n/a | n/a | no |
| worldline | card | fully_implemented_and_runtime_wired | `/api/v1/payments/card/create-session` worldline branch + `/api/v1/payments/worldline/checkout-status` verification + frontend return handler in `frontend/app/menu/page.tsx` | none critical in current redirect-verify-submit flow | worldline contract/product + API creds + valid hosted checkout config | yes | merchant product enablement + contract settings | yes |
| worldline | apple_pay | capability_only_not_implemented | none | no worldline wallet path in frontend/backend orchestration | wallet product enablement in worldline | no | yes | no |
| worldline | google_pay | capability_only_not_implemented | none | no worldline wallet path in frontend/backend orchestration | wallet product enablement in worldline | no | yes | no |
| worldline | paypal | capability_only_not_implemented | none in this checkout path | worldline PayPal product not wired in checkout runtime | worldline PayPal product activation | no | yes | no |
| worldline | cod | unsupported_by_provider | none | COD is provider-less | n/a | n/a | n/a | no |
| sumup | card | fully_implemented_and_runtime_wired | `/api/v1/payments/card/create-session` sumup branch + `/api/v1/payments/sumup/checkout-status` verification + frontend return handler in `frontend/app/menu/page.tsx` | none critical in current redirect-verify-submit flow | SumUp merchant code + token + online checkout enabled | yes | merchant profile/config required | yes |
| sumup | apple_pay | capability_only_not_implemented | none | no wallet-specific sumup web flow wired | depends on SumUp product/channel | no | yes | no |
| sumup | google_pay | capability_only_not_implemented | none | no wallet-specific sumup web flow wired | depends on SumUp product/channel | no | yes | no |
| sumup | paypal | unsupported_by_provider | none | not supported in this app/provider model | n/a | n/a | n/a | no |
| sumup | cod | unsupported_by_provider | none | COD is provider-less | n/a | n/a | n/a | no |
| square | card | fully_implemented_and_runtime_wired | `/api/v1/payments/card/create-session` square branch + `/api/v1/payments/square/checkout-status` verification + frontend return handler in `frontend/app/menu/page.tsx` | none critical in current redirect-verify-submit flow | square app token + location + checkout setup | yes | location/app enablement required | yes |
| square | apple_pay | capability_only_not_implemented | none end-to-end | no Square Web Payments SDK Apple Pay integration in current frontend | apple pay verification + square wallet setup | no | yes | no |
| square | google_pay | capability_only_not_implemented | none end-to-end | no Square Web Payments SDK Google Pay integration in current frontend | google pay + square wallet setup | no | yes | no |
| square | paypal | unsupported_by_provider | none | not supported by square in this app model | n/a | n/a | n/a | no |
| square | cod | unsupported_by_provider | none | COD is provider-less | n/a | n/a | n/a | no |

## Current enforced dropdown matrix (should be live now)
- `card` -> `stripe`, `worldline`, `sumup`, `square`
- `apple_pay` -> `stripe`
- `google_pay` -> `stripe`
- `wero` -> `stripe`
- `paypal` -> `paypal`
- `cod` -> provider-less only

## Code enforcement points
- Controller matrix gate: `app/admin/controllers/Payments.php` -> `implementedProviderFlows()`, `availableProviderCodesForMethod()`, `getCompatibleProviders()`.
- API matrix gate: `app/admin/routes.php` -> `implementedFlowMatrix`, `availableProviderCodesForMethod`, `/api/v1/payments`, `/api/v1/payment-methods-admin`.

## Merchant prerequisites (beyond API keys)
- Stripe wallets require wallet/domain setup and supported device/browser.
- PayPal requires product eligibility (especially cards/APMs) and account/app approvals.
- Square/Worldline/SumUp typically require account-level product/location/channel enablement and sometimes merchant/domain verification for wallets.
