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
