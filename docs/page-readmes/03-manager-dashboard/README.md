# Manager Dashboard — `/admin/managerdashboard`

## Purpose and inheritance

Manager is a role-specific clean workspace. It deliberately reuses the same Owner analytics authority while presenting a manager-oriented operational top layer: live orders, attention, table occupancy/availability, reservations, staff presence and kitchen team state.

- Clean URL: `/admin/managerdashboard`
- Internal route/controller: `/admin/managerlab`
- Controller: `app/admin/controllers/Managerlab.php`
- Base: `PmdCleanWorkspaceControllerV1`
- Permission: `Admin.Dashboard`
- Shared data: `PmdCleanWorkspaceSharedV1`, `PmdRoleDashboardDataV1`
- Presence: `PmdAdminPresenceService`
- Reservation schedule: `PmdReservationsLabScheduleV1`
- Kitchen workforce: `App\Services\PmdKitchenWorkforceService`

## Workspace contract

`pmdWorkspaceKey()` = `manager`; KPI mode is `owner` because underlying report math is reused. Shared Floor is enabled and the post-Floor partial is manager-specific.

Default top KPIs: live orders, open alerts/needs attention, occupied tables, upcoming reservations. Selectable cards also include available tables and staff online. The older six manager-only insight cards were intentionally removed and must not be revived merely because an old handoff mentions them.

## Server lifecycle

`?pmd_analytics=1` delegates to `PmdRoleDashboardDataV1::ownerAnalyticsPayload()`. Normal requests use the shared clean-workspace lifecycle. `pmdPrepareWorkspaceVars()` loads the shared reservation schedule, bundles live orders/alerts/reservations, reconciles table counts against the visible Floor, installs owner analytics bootstrap, resolves online staff, resolves today's kitchen team, composes manager KPIs and then translates finished presentation payloads where appropriate.

## Visible Floor authority invariant

Occupied/enabled counts are rewritten from already-resolved visible display tables rather than trusting a parallel count. Operational occupied states include `occupied`, `attention` and `waiter-call`.

**Invariant:** the KPI must never disagree with the Floor immediately above it.

## Online staff vs schedule

`PmdAdminPresenceService` owns presence. Manager must not infer “online” from shift assignment. Presence, planned schedule and attendance are separate concepts. `PmdKitchenWorkforceService` owns today's kitchen workforce card.

## Reservations integration

The same `PmdReservationsLabScheduleV1` payload used by ReservationsLab is hosted here. Manager is not a second reservation schedule authority.

## Security and mutations

Manager inherits shared Floor actions; table management is separately restricted to owner/manager and active location. Side-menu visibility is not authorization.

## Regression checklist

- Exactly four selected top KPI slots render.
- Visible Floor counts equal KPI table counts.
- Analytics match Owner analytics for same location/period.
- Reservation schedule matches ReservationsLab.
- Online staff is presence-derived, not schedule-derived.
- Kitchen team is workforce-service-derived.
- Floor preference persists under workspace key `manager`.
- Removed insight-card layer remains absent unless explicitly redesigned.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` plus supplied engineering handoffs. Current code wins over historical notes.