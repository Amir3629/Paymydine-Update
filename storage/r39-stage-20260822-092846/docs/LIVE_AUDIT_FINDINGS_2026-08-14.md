# Live frontend audit findings — 2026-08-14

This document records the read-only audit output returned by the PayMyDine owner before the V2 package was produced. It is a baseline, not a deployment instruction.

## Runtime truth

- Production customer frontend process: Next.js on port `3001`.
- PM2 process: `paymydine-frontend`.
- Existing process had been online for approximately seven days at audit time.
- Mimoza customer routes in Nginx proxy to `127.0.0.1:3001`.
- V2 must therefore use a different staging process/port (`3002`) until cutover.

## Repository truth

- Repository checkout: `/var/www/paymydine/frontend/Paymydine-Update`.
- Branch: `stabilization/admin-runtime-audit`.
- Audited head: `c7ab192d5932628f43b8d27799363a605d2a20d9`.
- The checkout contains many unrelated Admin/Reservations uncommitted changes. V2 deployment must not reset, clean, or overwrite that checkout.

## Current frontend complexity

The audit reported:

- `472` frontend files.
- `44` CSS files.
- `1,478,445` CSS bytes.
- `14,564` occurrences of `!important`.
- `12` MutationObserver references.
- `14` setInterval references.
- `264` runtime `style.setProperty` references.
- `2` iframe references.

The largest CSS authorities included the checkout compatibility bundle, Kazen/Velvet standalone files, action-control compatibility CSS, and multiple legacy theme compatibility files. This confirms that V2 must be isolated rather than layered on top of the existing frontend.

## Backend/theme truth

- The audited Laravel source contains seven `/simple-theme` route definitions.
- The public Mimoza response at audit time resolved to:
  - `theme_id=kazen_japanese`
  - `frontend_theme=kazen_japanese`
  - `admin_theme=kazen_japanese`
  - `kazen_menu_layout=tabs`
- V2 reads the current endpoint for compatibility but keeps one theme resolver inside the new frontend. Laravel route consolidation remains a separate, audited backend task.

## Data truth

At audit time:

- `/api/v1/menu` returned HTTP 200.
- Menu API version: `menu-highlights-v2`.
- Item count: `44`.
- Category count: `8`.
- `/settings`, `/api/v1/restaurant`, and `/simple-theme` returned HTTP 200.

The optional table test was run with the literal placeholder `<SAFE_TEST_TABLE_ID>`. Therefore, its table-info 404 does not establish a real table failure. Real QR/table QA still requires a valid safe table ID and QR.

## V2 safety decisions derived from this audit

1. Do not alter port `3001` during development.
2. Do not overwrite the existing repository checkout.
3. Run V2 from its own directory and PM2 process on port `3002`.
4. Use a separate preview hostname.
5. Do not copy the seven Laravel theme authorities into V2.
6. Do not silently render demo restaurant data when the live backend is unavailable.
7. Keep backend/order/payment behavior behind normalized adapters and test with a real table before cutover.
