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
