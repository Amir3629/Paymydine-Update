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
