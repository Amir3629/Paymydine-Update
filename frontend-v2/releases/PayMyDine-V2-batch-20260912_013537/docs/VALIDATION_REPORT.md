# Validation Report — Integrated V2

Release: `1.1.0-staging.20260815-integrated`

## Proven in the supplied real VPS run before this integration delta

The user executed the Build-Fixed V2 on the production VPS staging directory with Node 20, upgraded Next to `16.3.1`, obtained `found 0 vulnerabilities`, passed all existing release audits, and completed a real `next build`. The process started on port 3002; `/api/health`, `/api/bootstrap`, `/`, `/preview`, and `/preview/kazen_japanese` returned HTTP 200. `/api/bootstrap` returned real Mimoza tenant/restaurant/theme data rather than demo data.

## Integrated delta in this release

- Removed Phone / Call-to-Order UI from all Themes/shared runtime.
- Removed Table Note UI/API calls from all Themes/shared runtime.
- Kept Waiter Call and optional Valet.
- Added V2-only `/api/v1/frontend-theme-v2` bridge supporting all ten Theme IDs.
- Added ten-theme Admin field definition and backup-aware installer.
- Switched settings bootstrap to `/api/v1/settings`.
- Added tenant-aware `PMD_BACKEND_ORIGIN=auto` behavior.
- Added correct media normalization for backend root-relative restaurant assets.
- Locked tip fallback to `0/5/10`.
- Added product-contract and Admin-integration audits.
- Pinned Next to `16.3.1`.

## Static validation required for the final source package

`npm run release:audit` checks:

- offline TypeScript source correctness;
- exactly 10 isolated Theme directories;
- no iframe/theme bridge or runtime styling repair architecture;
- QR dine-in Product Contract: no phone-order or Table Note UI/API;
- required menu/order/payment/backend contracts;
- ten-theme Admin bridge and installer;
- import resolution and release-package safety.

## Dependency policy

The earlier lockfile referred to the pre-security-fix Next tree and is intentionally not shipped. `npm run secure:install` must be run on the target machine to generate a fresh lock from exact root pins, run `npm audit fix` without `--force`, and require the production dependency audit to pass.

## Live QA still required before port-3001 cutover

A successful build proves the package can compile; it does not prove live business behavior. Use a real Mimoza table/QR and run the full `docs/QA_MATRIX.md`, especially two-device shared order, second order before payment, Waiter Call, optional Valet, split payments/provider returns, and paid confirmation on other open devices without refresh.
