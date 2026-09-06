# Customer Frontend V2 — QR/Table Menu

## Product scope

Current bundled customer application: `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815`.

It is an independent Next.js QR/table menu. A guest scans a table QR, browses, confirms personal items into a shared table order, submits to kitchen, continues ordering and settles full/split bills through supported providers.

Package baseline: Next.js `16.3.1`, React/React DOM `19.2.6`, TypeScript `5.8.3`, Node `>=20.11`, default V2 port `3002`.

## Runtime topology

`Customer Browser -> Next.js V2 :3002 -> Laravel/PayMyDine -> tenant DB`

Server fetches preserve tenant Host context. Browser business requests use same-origin/API rewrites so customers do not need an internal Laravel origin.

## Server-first bootstrap / zero theme flash

1. Resolve tenant host/table/QR/locale.
2. Server loader requests restaurant/settings/menu/theme/payment/VAT/tip/table/shared-order state.
3. Normalize backend data in server normalization layer.
4. Normalize theme ID once in `src/themes/catalog.ts`.
5. `ThemeRenderer` imports exactly one theme.
6. HTML + selected CSS Module render together.
7. Hydration adds behavior without replacing theme/default repaint.

Ownership map: `src/server/bootstrap.ts` initial tenant/data; `src/server/normalize.ts` backend normalization; `src/themes/catalog.ts` theme aliases; `MenuRuntimeContext.tsx` cart/guest/table sync; `RuntimeOverlays.tsx` dialogs; `src/lib/client-api.ts` requests; `src/lib/i18n.ts` translations.

## Customer product contract

Includes language/table identity, optional social links, waiter call, optional valet, categories/search/item detail/options, allergens/dietary/nutrition, personal cart, multi-device shared table order, send to kitchen/preparation status, continue ordering on same open unpaid order, VAT/tips/coupons, full payment, split bill and settlement sync.

It intentionally does **not** expose phone/Call-to-Order or Table Note UI even if legacy backend compatibility remains.

## Ten isolated themes

`noir_editorial`, `verdant_modern`, `lumiere_fine_dining`, `kazen_japanese`, `azzurra_coastal`, `neon_cocktail_bar`, `art_deco_speakeasy`, `shahrazad_persian`, `anatolia_turkish`, `ember_steakhouse`.

Each theme owns TSX + CSS Module. No cross-theme imports, iframe/postMessage bridge, MutationObserver styling or runtime global-style authority. Preview routes use fixtures and must never issue production writes.

## Bootstrap API reads

Key endpoints: `/api/v1/settings`, `/api/v1/restaurant`, `/api/v1/menu`, `/api/v1/frontend-theme-v2` (temporary `/simple-theme` fallback), `/api/v1/payments`, `/api/v1/vat-settings`/`/vat-settings`, `/api/v1/tip-settings`, `/api/v1/table-info`, `/api/v1/table-order-draft`.

## Customer writes

Key actions: `POST /api/v1/table-order-draft/confirm-items`, `POST /api/v1/table-order-draft/submit`, waiter-call, valet-request, reviews, `/validate-coupon`, `/api/v1/orders/pay-existing` and provider-specific session/capture/status/finalize routes. Table identity supports table ID/no/alias/QR and `/table/<id-or-number>` forms.

## Multi-device shared table order

A tenant/table-scoped guest UUID is stored locally. Personal items are confirmed under that identity. One runtime owner polls shared state roughly every five seconds and on focus/visibility return. Submit creates or merges into the current unpaid table order. Settlement on one device must converge on other devices through server snapshots.

Local cart state is never settlement authority.

## Split-payment safety

`POST /api/v1/orders/split-intent` reserves a short-lived server-authoritative allocation before provider charge. Equal/percentage plans use fixed bases; item/My Items splits reserve exact unpaid quantities. The intent token follows hosted/PayPal settlement into `pay-existing`, making retries idempotent and preventing two guests from charging the same allocation. Guest Cash is a staff request and is not self-settled by the QR browser.

## Payment representation

The frontend contract supports public provider config plus PayPal, hosted card/Wero, Worldline, SumUp, Square, VR Payment and finalization routes where applicable. Provider return/status must be server-verified before canonical settlement.

## Tenant/environment safety

`PMD_BACKEND_ORIGIN=auto` resolves backend from tenant host. An isolated staging process may pin server-owned `PMD_TENANT_HOST_OVERRIDE`; `PMD_TRUST_TENANT_OVERRIDE_HEADER=false` prevents the browser from choosing another tenant. Mock fallback should be off for production verification.

## Release verification

The package includes typecheck, theme isolation, source safety, guest-AI contract, structure, product contract, import-resolution, package, backend-contract, Admin-integration and feature-coverage audits. `release:audit` should precede build/cutover; secure install avoids forced audit upgrades.

## End-to-end regression matrix

- Real QR resolves correct tenant/table.
- Initial HTML already has final theme; no flash.
- Menu/order reflects Admin canonical data.
- Two phones converge shared draft/order/settlement.
- Submit is idempotent and does not duplicate open order.
- Continue ordering merges into current unpaid order.
- Coupon/VAT/tip/service-charge totals match backend.
- Split intent prevents overlapping allocation.
- Unverified provider return cannot mark paid.
- Waiter/valet/review actions are tenant/table/order scoped.
- Preview cannot perform production POSTs.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` and current Frontend V2 README/architecture/backend contract.