# CMS store split

`store/cms-store.ts` remains the public backward-compatible facade because many production components already import `useCmsStore()`.

The implementation is now split into focused modules under `store/cms/`:

- `types.ts` — shared CMS/payment/tax/coupon/merchant types.
- `defaults.ts` — initial CMS, payment option, tip, VAT and merchant defaults.
- `merchant-settings.ts` — merchant settings parser and review/social platform normalization.
- `vat-settings.ts` — VAT/tax API parser.
- `coupon-settings.ts` — applied coupon mapper.

## Why keep the facade?

Switching every consumer to new stores in one deploy would be high risk. Keeping `useCmsStore()` stable avoids runtime behavior changes while the mixed responsibilities are moved out of the giant file.

## Guard

Run:

```bash
npm run cms-store:guard
```

## Consumer migration update

Active frontend consumers should no longer import the broad `@/store/cms-store` facade directly.
They should import focused hooks instead:

- `useCmsConfigStore()` for app settings and menu item admin/mock state.
- `usePaymentSettingsStore()` for merchant/payment settings.
- `useTaxSettingsStore()` / `getTaxSettingsSnapshot()` for VAT/tax settings.
- `useTipSettingsStore()` for tip settings.
- `useCouponStore()` for coupon validation/removal/runtime coupon state.

`useCmsStore()` remains as a compatibility backing store for this migration step. It should not be used by active UI components directly.

The old `/app/admin/*` frontend CMS screens are local/mock Next screens. They are not the Laravel admin panel, but they still need to compile while present in the frontend route tree.
