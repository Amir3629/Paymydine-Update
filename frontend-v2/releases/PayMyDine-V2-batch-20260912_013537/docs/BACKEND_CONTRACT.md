# Backend Contract — Frontend V2

Frontend V2 adapts the existing public PayMyDine business endpoints and adds one **read-only V2 Theme endpoint**. No database migration is required.

## Initial server-side bootstrap

| Endpoint | Purpose |
|---|---|
| `/api/v1/settings` | Restaurant name/logo, default language, social settings and public settings |
| `/api/v1/restaurant` | Restaurant identity/address/currency/timezone data |
| `/api/v1/menu` | Categories, items, combos, media, options, dietary data and highlights |
| `/api/v1/frontend-theme-v2` | Canonical V2 Theme ID/version and V2 feature flags |
| `/simple-theme` | Temporary fallback while V2 bridge is not installed |
| `/api/v1/payments` | Enabled public payment methods |
| `/api/v1/vat-settings` then `/vat-settings` | VAT/tax configuration |
| `/api/v1/tip-settings` when available | Tip configuration |
| `/api/v1/table-info` | Table identity from table ID/no/QR |
| `/api/v1/table-order-draft` | Draft/submitted order/status/settlement state |

## Customer actions used by V2

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/table-order-draft/confirm-items` | POST | Add one guest's personal cart to shared table draft |
| `/api/v1/table-order-draft/submit` | POST | Submit/merge table order and send to kitchen |
| `/api/v1/waiter-call` | POST | Create waiter-call notification |
| `/api/v1/valet-request` | POST | Create valet notification when enabled |
| `/api/v1/reviews` | POST | Submit one 1–5 star customer review for a completed order; review is stored pending moderation |
| `/validate-coupon` | POST | Validate coupon and return discount |
| `/api/v1/orders/pay-existing` | POST | Full/partial/selected-item settlement where supported |
| provider session routes | POST | Start the selected payment provider flow |
| provider return/status routes | GET/POST | Verify provider result and settle order |

**V2 does not expose Phone/Call-to-Order or Table Note actions.** A legacy table-note endpoint may still exist for older clients; it is outside the V2 customer contract.

## Table identity

The adapter preserves current URL forms:

```text
table_id
table_no
table
qr
/table/<id-or-number>
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

## V2 Theme contract

`integration/laravel/pmd-frontend-v2-theme.php` registers:

```text
GET /api/v1/frontend-theme-v2
```

It returns a canonical V2 ID from this catalog:

```text
noir_editorial
verdant_modern
lumiere_fine_dining
kazen_japanese
azzurra_coastal
neon_cocktail_bar
art_deco_speakeasy
shahrazad_persian
anatolia_turkish
ember_steakhouse
```

It also returns `theme_version` and V2 feature settings for languages, waiter call, valet, table ordering, split bill, tips, coupons and social links. It intentionally does **not** replace legacy `/simple-theme`, allowing port 3001 to remain untouched during staging.

## Multi-tenant origin

`PMD_BACKEND_ORIGIN=auto` resolves the backend from the tenant host. Staging may pin `PMD_TENANT_HOST_OVERRIDE=mimoza.paymydine.com`; production should normally resolve from the real request host. The browser cannot choose the tenant override unless `PMD_TRUST_TENANT_OVERRIDE_HEADER` is explicitly enabled, which is false by default.

## Payment routes represented in V2

| Endpoint | Purpose |
|---|---|
| `/api/v1/payments/config-public` | Public provider configuration only |
| `/api/v1/payments/paypal/create-order` | Create PayPal order |
| `/api/v1/payments/paypal/capture-order` | Capture approved PayPal order |
| `/api/v1/payments/card/create-session` | Hosted card-provider session |
| `/api/v1/payments/wero/create-session` | Wero-compatible hosted session |
| `/api/v1/payments/worldline/wero/create-session` | Worldline Wero session |
| `/api/v1/payments/vr-payment/<method>/create-session` | VR Payment method session |
| `/api/v1/payments/worldline/checkout-status` | Worldline return verification |
| `/api/v1/payments/sumup/checkout-status` | SumUp return verification |
| `/api/v1/payments/square/checkout-status` | Square return verification |
| `/api/v1/payments/vr-payment/return-status` | VR Payment return verification |
| `/api/v1/payments/wero/checkout-status` | Wero return verification |
| `/api/v1/orders/finalize-payment` | Finalize non-QR provider payment |

For an existing `qr_pay_later` table order, V2 settles the existing order through `pay-existing` after provider confirmation, preserving partial/selected-item settlement data where supported.

## Security

Only public values may enter customer bootstrap. Provider secrets, webhook secrets and Admin credentials must stay server-side. The V2 Admin bridge is read-only on GET and only reads the tenant's existing theme/settings values.


## Split Payment Safety R35

`POST /api/v1/orders/split-intent` reserves a short-lived server-authoritative split allocation before a provider charge. Equal and percentage splits use a fixed plan base; item and My Items splits reserve exact unpaid quantities. The returned `intent_token` is carried through hosted/PayPal settlement to `/api/v1/orders/pay-existing`, making a provider-confirmed retry idempotent and preventing a second guest from charging the same reserved allocation. Guest Cash is a staff request and is never self-settled by the QR browser.

Service cost settings are stored as `pmd_service_charge_enabled`, `pmd_service_charge_type`, `pmd_service_charge_value`, and `pmd_service_charge_label`. The canonical table-order totals helper writes a `service_charge` order total for new orders only; existing order totals are not recalculated retroactively.
