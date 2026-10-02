# Orders / Cashier Workspace — `/admin/orders`

## Purpose

Orders is the cashier/order-control workspace. It combines the clean KPI/Floor shell, date-scoped real orders and a cashier-native order detail/composer experience, while preserving existing Waiter/POS business logic as the underlying write authority.

- Clean URL: `/admin/orders`
- Internal route: `/admin/cashierlab`
- Controller: `app/admin/controllers/Cashierlab.php`
- Base: `PmdCleanWorkspaceControllerV1`
- View: `app/admin/views/cashierlab/index.blade.php`
- Entry permission: `Admin.Dashboard`; downstream POS/payment actions enforce their own contracts.
- Business timezone constant: `Europe/Berlin`
- Controller date-range guard: 90 days.

## Authority split

**This page owns/composes:** Cashier workspace presentation, KPI selection, shared Floor host, date/range order list, order-center/composer entry points, Cashier-authorized Floor-layout save and mobile same-route launcher.

**It does not replace:** canonical item/cart/order/customer/KDS/payment writers in existing Waiter/POS/payment services. Pricing, coupon, settlement and KDS state machines must not be duplicated in browser JS.

## Default KPIs

`open_bills`, `average_settlement_time`, `failed_transactions`, `cash_percent`.

## Date-scoped order behavior

The current workspace reads real `orders.order_date` for selected business day/range and intentionally includes closed/paid orders. This differs from older “current orders only” logic. Existing table-reference resolution remains canonical. Debug missing orders by checking business date, status inclusion, table resolution, location scope and UI filter/range separately.

## Cashier composer/actions

High-signal assets include `pmd-cashier-order-composer-v1.css`, `pmd-cashier-order-composer-r51.js`, `pmd-cashier-r45-actions.js`, `pmd-cashier-lab-order-center.js`, `pmd-cashier-lab-order-center.css` and `pmd-cashier-ui-r51.css`. New Order/Open Order/Add Items/Payment are cashier-native entry points over established server writers.

## Mobile Waiter Quick host

`?pmd_cashier_quick=1` hosts the existing `waiter_dashboard_new` surface on narrow screens while normalizing browser history back to `/admin/cashierlab`. Wide-screen transition returns to standard Cashier. The server injects canonical shared-Floor bootstrap and serves no-store HTML. This is a host/navigation shim, **not** a second order engine.

## Floor writes

Cashier exposes `onPmdCashierFloorLayoutSave` because older shared Floor POST targets were Owner-dashboard routes and could 403 for Cashier. The bridge still invokes canonical tenant/location persistence; it fixes route authorization without forking storage.

## Payment/KDS invariants

A provider redirect is not payment truth. Verified server-side provider state plus canonical amount/currency/order/allocation must drive idempotent settlement. Send-to-kitchen and preparation changes must flow through established POS/KDS authorities; a browser badge alone is not evidence of a write.

## Regression matrix

- Paid/closed orders appear in valid selected ranges.
- Business-day math matches Europe/Berlin.
- 90-day range guard cannot be bypassed by query manipulation.
- Floor state matches other shared-Floor surfaces.
- New/Open/Add/Payment use canonical writers.
- Mobile quick mode does not diverge order data.
- Split/partial retries remain idempotent.
- No cross-tenant/location order appears.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` plus supplied PayMyDine handoffs.