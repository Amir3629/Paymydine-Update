# PayMyDine legacy CSS folder

Phase 6D moved the active CSS rules out of this broad legacy folder into structured files under `styles/customer/`.

The files in this folder are now migration markers only. They intentionally remain imported by `styles/global/paymydine-legacy-globals.css` until a final removal step updates guards and documentation.

Do not put new CSS here. New visual work must go into owner-adjacent files:

- `styles/customer/themes/*-compat.css` for theme-isolated rules
- `styles/customer/checkout/checkout-theme-compat.css` for checkout/payment rules
- `styles/customer/actions/action-controls-compat.css` for action/quantity/cart/category rules
- `styles/customer/modals/modal-compat.css` for food/product modal rules
- `styles/customer/valet/valet-compat.css` for valet rules
- `styles/customer/core/*-compat.css` for unavoidable shared/base compatibility
