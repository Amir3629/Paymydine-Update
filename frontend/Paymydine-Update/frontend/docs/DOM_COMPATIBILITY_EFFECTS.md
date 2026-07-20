# DOM compatibility effects

The old `features/customer-menu/legacy-dom-repairs/` folder has been removed from the active frontend structure.

The effects were not blindly deleted because they still protect live checkout/theme visuals. Instead, they were moved beside the owner feature/theme that needs them:

- Checkout/payment DOM compatibility:
  - `features/customer-menu/checkout/dom-compat/useCheckoutDomCompatibilityEffects.ts`
- Organic theme checkout polish:
  - `features/customer-menu/theme/organic/useOrganicCheckoutDomPolish.ts`

## Rule

No new code should import from `features/customer-menu/legacy-dom-repairs/`.

New visual fixes should be handled by React-owned data attributes/classes and CSS in the relevant owner folder. DOM compatibility effects are allowed only as a temporary bridge while the root component/CSS ownership is migrated.

## Guard

Run:

```bash
npm run dom-compat:guard
```

## 2026-06-17 real CSS/component replacement

The remaining checkout and Organic DOM compatibility effects were reduced to small hook boundaries.

- `useCheckoutDomCompatibilityEffects.ts` is now a no-op compatibility boundary. The previous `querySelector`, `MutationObserver`, inline style mutation, and text-based panel detection logic was removed.
- `useOrganicCheckoutDomPolish.ts` is now marker-only and no longer scans checkout DOM nodes.
- Checkout visual stabilization rules now live in `styles/customer/checkout/checkout-theme-compat.css`.
- Organic checkout polish now lives in `styles/customer/themes/shared-theme-compat.css`.
- `pmd-dom-compat-guard.sh` prevents heavy DOM repair APIs from returning to these compatibility boundaries.

The Organic theme still uses message/delegated action effects in `useOrganicThemeEffects.ts` for iframe/dock behavior. Those are behavior bridges, not visual DOM repair styling.
