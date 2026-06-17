# Customer menu legacy DOM repairs

This folder contains production DOM repair hooks that are still active in the live customer ordering and checkout UI. They are technical debt, but they must not be deleted blindly because the affected screens include checkout/payment flows.

## Active customer routes

- `/menu`: primary live customer menu route. It selects one of the active themes from `CustomerMenuPage.tsx`.
- `/checkout`: compatibility route that currently redirects; a `307` response is expected in production smoke checks.
- `/worldline-return`: live payment return handling route.

## Active themes to preserve

- Gold Luxury
- Modern Green
- Organic Botanical Paper
- Kazen Japanese

## Remaining repairs and why they stay

- `usePaymentModalDomRepairs.ts`: high-risk checkout/payment visual repairs. Keep until payment modal E2E coverage can verify review, split-bill, hosted checkout, and paid states. One duplicate send-kitchen marker pass was removed because the later table-order action marker still owns the same data attributes used by CSS.
- `useOrganicCheckoutDomPolish.ts`: organic-theme checkout polish. Keep until the same polish is represented in React/CSS and all active themes are visually checked.

## Removed safely

- `debugInstallers.ts`: debug/remote-console helpers only; no production visual repair behavior.
- `useMenuActionCircleColorRepair.ts`: replaced by `PMD_MENU_ACTION_CIRCLE_COLOR_REPAIR_CSS` in `styles/global/paymydine-legacy-globals.css`.
- `useKazenMenuDomRepairs.ts`: replaced by `PMD_KAZEN_VISIBILITY_REPAIR_CSS` in `styles/global/paymydine-legacy-globals.css`.
- `useCheckoutVisualRepairs.ts`: removed after checkout payment markup rendered `Items total`/`Share amount` instead of the legacy `Base amount` row; `checkout:safety` now guards that source invariant.
- `footerLogoInstaller.ts`: replaced by `MenuPayMyDineFooterLogo`, rendered from `CustomerMenuPage.tsx` for Modern Green and Organic/Botanical without MutationObserver or DOM append/query repair logic.

## Safe cleanup rule

Remove only one repair group at a time. First move the visual rule into owned React/CSS, then run build, TypeScript, production smoke, and visual QA for all active themes. Do not remove checkout/payment repairs without E2E-style coverage.
