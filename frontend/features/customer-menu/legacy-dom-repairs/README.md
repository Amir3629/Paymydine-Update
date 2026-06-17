# legacy-dom-repairs

This folder contains production DOM repair hooks. They are technical debt, but they must not be deleted blindly.

Current rule:
- Remove only one repair group at a time.
- First move the visual rule into real React/CSS.
- Then run build, typecheck, and manual visual QA on all active themes.

High-risk file:
- usePaymentModalDomRepairs.ts

Removed safely:
- debugInstallers.ts: removed because it only installed debug/remote-console helpers and had zero DOM repair operations.

Removed safely:

- useMenuActionCircleColorRepair.ts: replaced by `PMD_MENU_ACTION_CIRCLE_COLOR_REPAIR_CSS` in `styles/global/paymydine-legacy-globals.css`.
- useKazenMenuDomRepairs.ts: replaced by `PMD_KAZEN_VISIBILITY_REPAIR_CSS` in `styles/global/paymydine-legacy-globals.css`.
- useCheckoutVisualRepairs.ts: reduced; quantity icon and split-method text repairs moved to `PMD_CHECKOUT_VISUAL_REPAIR_CSS`. Remaining hook only hides old text-based `Base amount` rows.
