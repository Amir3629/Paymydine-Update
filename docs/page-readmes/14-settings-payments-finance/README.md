# Payments & Finance — `/admin/settings/finance`

## Purpose

Payments & Finance is the owner configuration surface for payment methods/providers, VAT/tax, invoice/receipt behavior, fiscalization and provider/terminal readiness. It is **not** the transaction settlement engine; provider services and payment APIs remain payment truth.

- Clean URL: `/admin/settings/finance`
- Internal: `/admin/pmdfinance`
- Controller: `app/admin/controllers/Pmdfinance.php`
- Permission: `Site.Settings`
- View: `app/admin/views/pmdfinance/index.blade.php`
- Market context: `LocationPlatformContext`, `CountryPlatformProfileRegistry`
- Catalog model: `Payments_model`

## Method != provider != terminal != surface

- **Method:** Card, Apple Pay, Google Pay, Wero, PayPal, cash/COD, etc.
- **Provider:** Stripe, PayPal, Worldline, SumUp, Square, VR Payment, or market-specific PSP.
- **Terminal:** a concrete physical/logical terminal attached to a provider.
- **Surface:** QR frontend, Admin POS/Cashier, physical terminal, hosted checkout, embedded SDK.

Do not merge these concepts. Many historical payment bugs came from treating a provider row as a method or assuming a provider implied a terminal.

## Base catalog and country filtering

Base method codes: `card`, `apple_pay`, `google_pay`, `wero`, `paypal`, `cod`, `cash`. Base provider codes: `stripe`, `paypal`, `worldline`, `sumup`, `square`, `vr_payment`.

Market profiles narrow the visible/allowed set:

- **Germany / DE:** mature canonical storage remains, but only providers declared by the DE profile are selectable.
- **Oman / OM:** method/provider definitions come from Oman profile, including provider candidates per method.
- **Canada / CA:** Square is current provider; card/Apple Pay/Google Pay map to Square, with COD/cash providerless.
- **Türkiye / TR:** intentionally payment-empty until a reviewed integration exists. Do not flash historical global providers.

Unsupported market/provider combinations fail closed.

## Finance save contract

`onSaveFinance()` validates/persists tax percentage/enabled state, delivery-charge taxation, invoice logo/template/footer/prefix, receipt/paper/compact/font settings, logo/QR/Fiskaly display, print-dialog/auto-print hints and Fiskaly environment/identifiers/secrets.

Current VAT policy forces menu prices to remain net with VAT added once (`tax_menu_price = 1`). The save populates framework settings for compatibility **and** directly persists durable tenant settings so Admin Finance and public VAT APIs share one authority.

## Provider configuration

Inline provider-field definitions exist for Stripe, PayPal, Square, SumUp, Worldline and VR Payment. Secret fields are separately classified so the UI can mask/preserve credentials instead of echoing them as ordinary values. Credentials, webhook secrets and authentication keys must never be logged or exposed through public configuration.

## VR terminal inventory

Finance builds a VR Payment terminal readiness summary from `terminal_devices`, distinguishing provider rows, real usable terminals and simulators. Devices remains the hardware CRUD UI authority; Finance consumes inventory for payment readiness/configuration.

## Fiskaly / fiscalization

`fiskalyPayload()` reads location-scoped config only when schema exists and does not repopulate secret/PIN values into normal first paint. `saveFiskaly()` performs bounded update. Tax calculation, payment settlement and fiscal receipt/signing are separate stages.

## Settlement invariants — do not weaken

1. Browser return/redirect is **not** payment truth.
2. Webhook alone is insufficient unless signature, provider event, order and idempotency are verified.
3. Provider status alone is insufficient without canonical order, amount, currency and expected allocation/state.
4. Settlement must be idempotent across retries.
5. Raw card data must never reach PayMyDine backend where provider SDK/hosted fields tokenize it.
6. Existing-order split/partial settlement must preserve server allocation authority; Frontend V2 uses split intents before provider charge.
7. Live/test environments and credentials must not mix.
8. A terminal must belong to the active provider/location/market.

## Public runtime relationship

Frontend V2 uses public enabled-method/config routes plus provider-specific session/capture/status flows for PayPal, hosted card/Wero, Worldline, SumUp, Square and VR Payment. Verified provider confirmation then applies to canonical existing-order settlement/finalization. A Finance “connected” indicator never means an order was paid.

## Regression matrix

- Market profile exposes only allowed methods/providers.
- TR remains fail-closed until integration exists.
- VAT Admin value equals public VAT/order-total behavior.
- Invoice settings persist and print correctly.
- Secrets remain masked and absent from public config.
- VR real/simulator classification is correct.
- Provider test/connect never mutates order settlement.
- Full/partial/item split and retry remain idempotent.
- Webhook/return cannot settle mismatched amount/currency/order/allocation.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` plus Payments/Worldline/Square/VR/SumUp handoffs.