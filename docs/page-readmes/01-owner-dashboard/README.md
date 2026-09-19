# Owner Dashboard — `/admin/ownerdashboard`

## Purpose

The Owner Dashboard is the broad operational overview. Its current implementation is intentionally **server-first** and uses existing domain/report services as data authorities rather than importing old dashboard browser runtimes. It combines configurable KPIs, the shared Floor/table state, reservation schedule context and Owner analytics in one owner-facing surface.

## Entry points and implementation

- Product URL: `/admin/ownerdashboard`
- Internal controller URL: `/admin/dashboardlab`
- Controller: `app/admin/controllers/Dashboardlab.php`
- Controller class: `Admin\Controllers\Dashboardlab extends AdminController`
- Framework permission: `Admin.Dashboard`
- Main view: `app/admin/views/dashboardlab/index.blade.php`
- Reused KPI authority: `Dashboard2` **data methods only**
- Role/report/location helper: `Admin\Services\PmdRoleDashboardDataV1`
- Shared Floor registry: `Admin\Services\PmdSharedFloorRegistryV1`
- Reservations schedule: `Admin\Services\PmdReservationsLabScheduleV1`

## First-paint lifecycle

1. Controller resolves the restaurant/location context.
2. KPI payload is resolved on the server through the existing Dashboard2 aggregate implementation. `Dashboard2::index()` is not called; the legacy page/runtime is not rendered.
3. Cards are normalized into the approved dashboard KPI contract.
4. Shared Floor registry and active-floor selection are resolved before Blade render, including current/legacy cookie migration.
5. Reservation schedule payload is resolved through the same schedule service used by ReservationsLab.
6. Owner analytics bootstrap is resolved server-side so initial analytics do not wait for a browser boot fetch.
7. Blade renders the complete first state; JS adds interaction/refresh rather than becoming the first data authority.

## KPI contract

Canonical KPI order in the controller:

`revenue`, `guests`, `turnover`, `channels`, `kitchen`, `occupancy`, `menu`, `tips`.

Default top selection:

`revenue`, `guests`, `turnover`, `channels`.

The KPI chooser is presentation preference over existing KPI data; it must not create a second reporting formula.

## Floor/table contract

The dashboard uses the shared Floor visual/data stack. The active floor is selected from a registry and may migrate an older floor cookie. User view preference is saved through `onSaveFloorViewPreference` with strict validation:

- authenticated user required;
- `floor_id` currently must be `main-floor` for this action;
- `layout_mode`: `full` or `row`;
- zoom numeric range: `0.4..1.6`;
- canonical active location must resolve;
- persistence scope is authenticated-user + page + location.

Table QR generation is not owned by the dashboard. Shared table manager code may display existing QR identity but must not regenerate/clear QR tokens outside the canonical table model lifecycle.

## Reservation and analytics integration

Dashboard hosts the same schedule payload authority used by ReservationsLab; only the host surface differs. This is important: do not fork reservation schedule calculations for the dashboard.

Analytics has an explicit lightweight JSON mode (`?pmd_analytics=1` with a period) plus server-resolved bootstrap. Dashboard2 remains an aggregate **data source**, not a browser runtime dependency.

## Primary assets

The controller registers first-paint shell/KPI CSS, Floor V1/shared-floor CSS, dashboard-lab analytics CSS, kitchen-team styling, plus route-scoped JS for KPI chooser, exact Floor behavior, shared multi-floor coordination, analytics rendering and live refresh.

High-signal files include:

- `css/pmd-dashboard-lab-v1.css`
- `css/pmd-reservations2-kpis-v307.css`
- `css/pmd-floor-v1*.css`
- `css/pmd-shared-floor-multi-floor-v1.css`
- `css/pmd-dashboard-lab-analytics-v1.css`
- `js/pmd-dashboard-lab-kpis-v1.js`
- `js/pmd-dashboard-lab-exact-floor-v1.js`
- `js/pmd-shared-floor-multi-floor-v1.js`
- `js/pmd-dashboard-lab-analytics-v1.js`
- `js/pmd-dashboard-live-refresh-v1.js`

## Security and tenancy

`Admin.Dashboard` is the entry permission; downstream table-management actions additionally restrict owner/manager operations where appropriate. Never infer authorization from visible controls. Every Floor/table write must be checked against active location. Analytics/business dates must use the restaurant business clock, not the browser's timezone.

## Failure/degraded states

The page is designed to keep independent sections from blanking the entire dashboard. Shared Floor registry and reservation schedule bridges catch/log failures and fall back to empty section payloads. If a location cannot be resolved for a write, the action should fail closed rather than mutate an arbitrary location.

## One-time onboarding / Quick setup welcome

The current Dashboard also owns the one-time PayMyDine welcome/onboarding presentation. As of the latest audited `main`, this is a **centered modal with a blurred backdrop**, not content inserted into normal Dashboard document flow. Its Quick setup / Not now behavior remains unchanged; the redesign is presentation/geometry only. High-signal assets are `pmd-onboarding-welcome-v1.css` and `pmd-onboarding-welcome-v1.js`. Keep onboarding state/decision logic separate from Dashboard KPI/Floor data, and do not let the modal shift the underlying page layout.

## Regression checklist

- Owner URL stays clean after navigation/history events.
- First paint contains KPI values; no initial blank-to-filled flash.
- KPI chooser never changes underlying KPI calculation.
- Active floor is the same floor on Owner/Manager/Reservations/Orders for the same user/location where shared behavior is expected.
- Reservation busy state excludes cancelled reservations.
- Analytics Today/Month values match the reusable report authority.
- Floor preference persists per user/page/location and cannot be saved unauthenticated.
- No legacy Dashboard2/Reservations2 browser runtime is accidentally reintroduced.

---

## Documentation authority and maintenance rule

This page was audited on **2026-09-06** against `Amir3629/Paymydine-Update` `main` at commit `d6e443b88a0fd72a5727854b245d8f0678497447`, plus the supplied PayMyDine engineering handoffs. When code and an older handoff disagree, **current `main` is authoritative**. Handoffs are used for rationale, production lessons, invariants, and historical context—not to resurrect retired behavior.

When changing this surface, update this README in the same pull request if any route, controller/service boundary, permission, persisted field, API contract, UI state, asset authority, or cross-page invariant changes.
