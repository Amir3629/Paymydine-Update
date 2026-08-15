# Backend Contract

Frontend V2 currently adapts the existing public PayMyDine endpoints. It does not require a database migration.

## Initial GET requests

| Endpoint | Purpose |
|---|---|
| `/settings` | Restaurant name, logo, language, social and feature settings |
| `/simple-theme` | Admin-selected frontend Theme and Theme options |
| `/api/v1/restaurant` | Restaurant identity, contact, address, currency and timezone |
| `/api/v1/menu` | Categories, menu items, combos, media, options, dietary data and highlights |
| `/api/v1/payments` | Enabled public payment methods |
| `/api/v1/vat-settings` | VAT/tax configuration when available |
| `/api/v1/table-info` | Table identity from table ID/no/QR |
| `/api/v1/table-order-draft` | Draft, submitted order, status and settlement state |

## Public actions

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/table-order-draft/confirm-items` | POST | Add one guest's personal cart to shared table draft |
| `/api/v1/table-order-draft/submit` | POST | Submit/merge table order and send to kitchen |
| `/api/v1/waiter-call` | POST | Create waiter-call notification |
| `/api/v1/table-notes` | POST | Create table-note notification |
| `/api/v1/valet-request` | POST | Create valet notification |
| `/api/v1/orders/pay-existing` | POST | Full or selected-item settlement where supported |
| `/api/v1/orders/start-payment` | POST | Begin provider/cash payment workflow |
| `/validate-coupon` | POST | Validate coupon and return discount |

## Table identity

The adapter preserves all current forms:

```text
table_id
table_no
table
qr
```

## Menu fields normalized

- ID, name, description and translations
- category ID/name/priority
- price and availability
- primary image and gallery/media
- options, option values, required/default and price delta
- allergens/allergy tags
- halal, vegetarian and vegan
- calories, protein, carbs, fat, sugar and serving size
- chef recommendation and bestseller markers
- preparation time when returned

## Theme response

Frontend reads these existing aliases:

```text
frontend_theme
theme_id
theme_configuration
pmd_visual_theme_selection
admin_theme
```

The first matching value is normalized against the V2 catalog. The long-term backend target is one canonical theme field plus a version, but the V2 adapter remains compatible with the current endpoint during migration.

## Security

Only public values may be returned to the customer frontend. Stripe secret keys, PayPal secrets, Worldline secrets, private webhook keys and Admin credentials must never enter `/settings`, `/simple-theme` or a customer bootstrap response.

## Provider session and return routes represented in V2

| Endpoint | Purpose |
|---|---|
| `/api/v1/payments/config-public` | PayPal/public provider configuration only |
| `/api/v1/payments/paypal/create-order` | Create PayPal order |
| `/api/v1/payments/paypal/capture-order` | Capture approved PayPal order |
| `/api/v1/payments/card/create-session` | Current canonical hosted card-provider session |
| `/api/v1/payments/wero/create-session` | Wero/Stripe-compatible hosted session |
| `/api/v1/payments/worldline/wero/create-session` | Worldline Wero session |
| `/api/v1/payments/vr-payment/<method>/create-session` | VR Payment method session |
| `/api/v1/payments/worldline/checkout-status` | Worldline return verification |
| `/api/v1/payments/sumup/checkout-status` | SumUp return verification |
| `/api/v1/payments/square/checkout-status` | Square return verification |
| `/api/v1/payments/vr-payment/return-status` | VR Payment return verification |
| `/api/v1/payments/wero/checkout-status` | Wero return verification |
| `/api/v1/orders/finalize-payment` | Finalize non-QR provider payment |

For an existing table order whose `payment` value is `qr_pay_later`, V2 does **not** call `/orders/start-payment` before the provider. After provider confirmation it calls `/orders/pay-existing`, including the provider reference, amount, tip/coupon adjustments and selected `order_menu_id` quantities. This follows the active backend contract recorded in the supplied sources.
