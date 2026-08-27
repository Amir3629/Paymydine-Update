# PayMyDine Location / Country Platform R3

## Authority

`CountryPlatformProfileRegistry` is the product catalogue for regional defaults.
`LocationPlatformContext` is the runtime authority for a physical restaurant location.

Country is **not** owned by Payments. Payments, terminals, currency, language and time all consume the same location profile.

```text
Physical Location
  -> Country
     -> Country Platform Profile
        -> Timezone / calendar context
        -> Currency + minor units
        -> Eligible languages
        -> Payment providers
        -> Payment methods
        -> Terminal products/runtime policy
        -> Future regional product/fiscal policy
```

## Current markets

### Germany (DE)

- Timezone: `Europe/Berlin`
- Currency: `EUR`, 2 minor digits
- Market languages: German + English
- Regional payment identities:
  - `de_card`
  - `de_apple_pay`
  - `de_google_pay`
  - `de_wero`
  - `de_paypal`
  - `de_cash`
- Current terminal product catalogue includes SumUp and VR Payment runtime; Worldline remains not certified in PMD.

### Oman (OM)

- Timezone: `Asia/Muscat`
- Currency: `OMR`, 3 minor digits / baisa
- Market languages: English + Arabic eligibility. English stays the safe default until an Arabic language pack is actually installed/enabled in the tenant.
- Regional payment identities:
  - `om_card`
  - `om_omannet`
  - `om_apple_pay`
  - `om_google_pay`
  - `om_cash`
- Paymob is the Oman online provider profile.
- Paymob Tap to Pay is catalogued as an in-person product, but PMD remote terminal runtime remains fail-closed until Paymob Oman supplies the POS/ECR/Cloud Terminal contract and certification details.

## Superadmin behaviour

`/superadmin/new` is the central market-selection authority for the tenant's initial/default location.

When Superadmin creates or edits a tenant with Oman:

1. Central tenant country becomes canonical `Oman`.
2. The tenant database is selected temporarily.
3. Oman country catalogue row is found/created and enabled.
4. OMR is found/created and enabled with 3 decimals.
5. The default location gets Oman `location_country_id`.
6. Tenant framework defaults become `Asia/Muscat`, OMR, and the enabled subset of Oman-eligible languages.
7. Oman regional payment identities are seeded disabled.
8. Paymob Oman provider metadata is seeded disabled.
9. No merchant credential is copied and no payment method is auto-offered.
10. Central DB connection is restored.

Germany follows the same platform path with Germany/EUR/Berlin and Germany regional payment identities.

## Multi-location rule

Tenant-global framework settings are defaults for legacy/framework code. New regional runtime code must use `LocationPlatformContext` with the actual `location_id` whenever an order, reservation, report, payment or device belongs to a specific location.

This allows future tenants with locations in different countries to resolve different currency/payment/terminal/time policies without adding provider-specific country guesses.

## What Country does NOT auto-decide

The profile does not guess:

- restaurant opening/closing hours
- tax/VAT registration or legal/fiscal setup
- merchant payment credentials
- enabled Paymob Integration IDs
- terminal pairing
- language pack content that is not installed

Those remain explicit restaurant/provider configuration.

## Payment safety

Regional method rows are catalogue identities only and start disabled.

For Oman, `om_cash` is platform-owned and is never considered a Paymob method. The Paymob-specific catalogue contains only:

- `om_card`
- `om_omannet`
- `om_apple_pay`
- `om_google_pay`

Paymob methods remain non-offerable until the account-specific Integration ID/readiness and the PMD end-to-end flow are enabled.
