# PayMyDine Frontend V2 — Integrated Release Report

Release: `1.1.0-staging.20260815-integrated`

This release turns the V2 prototype package into a connected dine-in QR-menu staging candidate. The visual system remains ten isolated Themes, while business state is shared through one runtime and the existing PayMyDine backend contracts.

## Final customer UI contract

The QR Menu includes restaurant branding, table identity, language, configured social links, Waiter Call, optional Valet, menu/categories/items/options/allergens/dietary metadata, personal cart, shared Table Order, kitchen submit/status, continue-ordering, VAT/tips/coupons, payment and Split Bill.

It intentionally excludes customer-facing Phone/Call-to-Order and Table Note UI. Those concepts are not part of the V2 dine-in menu contract.

## Admin/theme connection

A V2-only backend read endpoint and 10-theme Admin field definition are included. The installer adds `/api/v1/frontend-theme-v2` after the legacy theme routes, backs up affected live files and does not replace `/simple-theme`. This isolates staging V2 from current port-3001 theme compatibility.

## Theme architecture

All ten Themes have independent component/CSS-module ownership. Theme selection is resolved server-side. No iframe, postMessage visual bridge, styling MutationObserver, styling interval or global emergency override architecture is used.

## Backend integration

The initial bootstrap reads the tenant's existing settings, restaurant, menu, V2 Theme (legacy fallback), payment methods, table/order state, VAT and optional tips. Runtime actions preserve personal cart → shared draft → submit-to-kitchen → order-status → payment separation and use current waiter/valet/order/payment endpoints.

## Safety

This is still a staging candidate until real QR/multi-device/payment QA passes. Production port 3001 and legacy `/simple-theme` remain rollback authorities. See `docs/DEPLOYMENT.md` and `docs/QA_MATRIX.md`.
