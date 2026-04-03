# Payment Provider Compatibility Matrices

_Last updated: 2026-04-03_

## Scope
This matrix is for current product payment methods only:
- `card`
- `apple_pay`
- `google_pay`
- `paypal`
- `cod`

And current providers only:
- Stripe
- PayPal
- Square
- Worldline
- SumUp

---

## A) Official provider capability matrix (official docs target)

> Important: capability means the provider platform can support that method in at least some products/regions. It does **not** mean this repository currently implements that flow.

| Provider | card | apple_pay | google_pay | paypal | Notes |
|---|---:|---:|---:|---:|---|
| Stripe | ✅ | ✅ | ✅ | ❌ | Stripe docs cover cards + Apple Pay + Google Pay. |
| PayPal | ✅ | ✅ | ✅ | ✅ | PayPal supports PayPal checkout and advanced card checkout; Apple Pay/Google Pay are separate APM integrations with eligibility constraints. |
| Square | ✅ | ✅ | ✅ | ❌ | Square Web Payments digital wallets docs cover Apple Pay + Google Pay in supported regions/setup. |
| Worldline | ✅ | ⚠️ | ⚠️ | ✅ | Card + PayPal documented in Worldline product docs; Apple/Google depend on product/country/contract enablement. |
| SumUp | ✅ | ⚠️ | ⚠️ | ❌/⚠️ | SumUp online docs clearly cover card checkout; Apple/Google exist in some SDK paths (not our current web stack). |

### Official source links
- Stripe Apple Pay: https://docs.stripe.com/payments/apple-pay
- Stripe Google Pay: https://docs.stripe.com/google-pay
- Stripe payment method support: https://docs.stripe.com/payments/payment-methods/payment-method-support
- PayPal advanced checkout (cards): https://developer.paypal.com/studio/checkout/advanced
- PayPal Apple Pay APM: https://developer.paypal.com/docs/checkout/apm/apple-pay/
- PayPal Google Pay APM: https://developer.paypal.com/docs/checkout/apm/google-pay/
- Square digital wallets: https://developer.squareup.com/docs/web-payments/digital-wallets
- Worldline PayPal payment product: https://docs.connect.worldline-solutions.com/payment-product/paypal/testing
- Worldline payment products reference: https://docs.connect.worldline-solutions.com/documentation/payment-product-api/payment-products
- SumUp online payments introduction: https://developer.sumup.com/online-payments/introduction/
- SumUp React Native SDK (wallet mention): https://developer.sumup.com/online-payments/sdks/react-native-sdk/

---

## B) Implemented flow matrix (this codebase, end-to-end)

### Implemented criteria
A pair is marked **implemented** only when all are aligned:
- admin dropdown/validation
- `/api/v1/payment-methods-admin` save validation
- checkout feed (`/api/v1/payments`)
- frontend render path
- backend create/capture/session route
- finalization path used by current checkout flow

| Provider\Method | card | apple_pay | google_pay | paypal | cod |
|---|---|---|---|---|---|
| Stripe | ✅ implemented | ✅ implemented | ✅ implemented | ❌ not implemented | n/a |
| PayPal | ✅ implemented | ❌ not implemented | ❌ not implemented | ✅ implemented | n/a |
| Square | ❌ not implemented | ❌ not implemented | ❌ not implemented | ❌ not implemented | n/a |
| Worldline | ❌ not implemented | ❌ not implemented | ❌ not implemented | ❌ not implemented | n/a |
| SumUp | ❌ not implemented | ❌ not implemented | ❌ not implemented | ❌ not implemented | n/a |

### Why currently blocked (high-level)
- **PayPal + Apple Pay / Google Pay**: requires dedicated PayPal APM client + domain + eligibility setup and frontend APM components not currently implemented in this checkout.
- **Square + Apple/Google Pay**: requires Square Web Payments SDK wallet integration and merchant verification flow not present in current frontend/backend stack.
- **Worldline wallets / PayPal via Worldline**: requires explicit product enablement + provider-specific request/response handling + callback finalization mapping not implemented.
- **SumUp wallets**: current code path uses generic hosted checkout for card; no completed wallet-specific web flow in this stack.

---

## C) Enforced selectable providers (admin dropdown)

`available_provider_options_for_method = intersection(capability, implemented)`

Current enforced result:
- `card` → `stripe`, `paypal`
- `apple_pay` → `stripe`
- `google_pay` → `stripe`
- `paypal` → `paypal`
- `cod` → no provider

---

## D) Merchant dashboard requirements (for officially supported pairs)

> “Credentials saved in admin” is never enough by itself for wallets. Merchant-side activation is required.

| Provider+method | Merchant dashboard requirements |
|---|---|
| Stripe+card | API keys, account enabled for card payments, currency/location compatibility. |
| Stripe+apple_pay | Apple Pay enabled in Stripe, domain registration/verification for web checkout, compatible browser/device. |
| Stripe+google_pay | Google Pay enabled/eligible in Stripe, domain + browser/device eligibility, supported country/currency. |
| PayPal+paypal | REST app credentials (client id/secret), account mode (sandbox/live), app approved for checkout. |
| PayPal+card | Advanced Checkout card eligibility + card processing enabled for merchant account; JS SDK advanced checkout integration. |
| PayPal+apple_pay | PayPal Apple Pay product enablement, Apple Pay merchant/domain requirements, region/account eligibility. |
| PayPal+google_pay | PayPal Google Pay product enablement, Google Pay merchant/domain requirements, region/account eligibility. |
| Square+card | App credentials + location id, account/location enabled for online payments. |
| Square+apple_pay | Square wallet support + Apple Pay merchant/domain verification + supported region/account. |
| Square+google_pay | Square wallet support + Google Pay setup + supported region/account. |
| Worldline+card | Contract/product activation for card product IDs, merchant/API credentials, endpoint environment alignment. |
| Worldline+apple_pay | Apple Pay product enabled in Worldline account/contract; country/currency/product availability checks. |
| Worldline+google_pay | Google Pay product enabled in Worldline account/contract; country/currency/product availability checks. |
| Worldline+paypal | PayPal product enabled via Worldline platform for merchant contract and market. |
| SumUp+card | Access token + merchant code + online checkout enabled for merchant profile. |
| SumUp+apple_pay | Wallet support must be enabled in merchant context/product path (not implemented in this app). |
| SumUp+google_pay | Wallet support must be enabled in merchant context/product path (not implemented in this app). |

