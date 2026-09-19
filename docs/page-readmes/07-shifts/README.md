# Shifts / Team / Attendance Planning — `/admin/shifts`

## Purpose

Shifts is the first-class staff planning surface. Current design keeps five concepts separate: staff/login access identity, operational schedulable person identity, planned shifts/assignments, attendance confirmation/evidence, and kitchen-capacity/ETA settings.

- URL: `/admin/shifts`
- Controller: `app/admin/controllers/Shifts.php`
- Base class: `AdminController`
- Framework permission: `Admin.Dashboard`
- `index()` and mutations additionally enforce Owner/Manager via `assertOwnerOrManager()`.
- View: `app/admin/views/pmdshifts/index.blade.php`
- Server rota partial: `pmdshifts/_server_rota_v13.blade.php`

Do not weaken the explicit Owner/Manager gate merely because another role has `Admin.Dashboard`.

## Canonical operational storage

Primary planning tables are `pmd_operational_people`, `pmd_operational_shifts` and `pmd_operational_shift_people`. Supporting state includes Staff/User/access-role records, `pmd_staff_requests`, attendance storage where provisioned and tenant settings for kitchen capacity.

`PmdOperationalRosterReconciler` synchronizes enabled Staff/User accounts into operational people. Reconciliation failure is logged and intentionally should not blank the complete rota.

## Render lifecycle

1. Resolve active location and selected day/month/week windows.
2. Check operational schema readiness.
3. Reconcile location roster.
4. Coalesce overlapping/touching equivalent-team shifts; material schedule geometry change invalidates stale confirmation.
5. Read active operational people ordered by department/name.
6. Read non-cancelled shifts across visible calendar range.
7. Attach shift-person assignment rows.
8. Resolve current kitchen workforce/current shift.
9. Calculate today/month metrics and scheduled hours.
10. Resolve access roles and staff/login linkage.
11. Load pending staff requests.
12. Resolve kitchen-capacity thresholds/peak settings.
13. Render server-first calendar/rota.

Departments currently include Kitchen, Floor, Bar, Reception and Other.

## Public controller actions

- `saveperson` — create/update operational member and required access/login linkage.
- `removeperson` — remove/deactivate under safety checks.
- `handlerequest` — process pending team/staff requests.
- `saveshift` — create/update planned shift and assignments.
- `removeshift` — remove/cancel planned shift.
- `copyweek` — copy weekly schedule pattern.
- `confirm` — confirm shift/attendance plan, present/absent/replacement state for its scope.
- `saveeta` — save kitchen load/ETA capacity controls.
- `portalmfastatus` — inspect portal MFA/trusted-access state.
- `resetportalmfa` — Owner/Manager reset of portal MFA state.

Browser drag/resize geometry is never database authority; all persistence must pass server validation.

## Hours, overnight shifts and breaks

Scheduled hours derive from start/end minutes. If end <= start, the calculation treats end as next-day. Bounded break minutes are subtracted before multiplying by assigned headcount. Month stats only count shifts inside selected month. Payroll/accounting must never be inferred from CSS bar width or pixels.

## Confirmation and attendance

Scheduled, present and missing are different states. “Present now” / “missing now” metrics are exposed only when current shift is confirmed. First-party attendance services/listeners are a cross-cutting authority; Shifts plans/confirms and consumes real attendance evidence rather than inventing punch truth. Material schedule edits must invalidate/reconfirm stale confirmation.

## Kitchen capacity / ETA

The workspace exposes bounded busy/very-busy item thresholds, busy/very-busy extra minutes, peak enabled/start/end, peak extra minutes and related ETA display controls where supported. ETA consumers combine these settings with canonical kitchen workforce. Guest ETA calculation should not be duplicated in the rota renderer.

## First-paint/geometry authority

Shifts has a long history of first-paint fixes. Current assets cover canonical first paint, toolbar/grid alignment, endpoint labels, big calendar, planner rules, reservation-time markers, pause/group merge polish, zero-hover/no-plus behavior, refresh stability, local font first paint, bar fitting and scroll-memory/day navigation.

**Maintenance rule:** do not respond to a geometry bug by adding another late CSS/JS override layer. Find the current writer and remove/repair the conflict.

## Regression matrix

- Only Owner/Manager can mutate.
- Access role and operational job/department remain distinct.
- Overnight shifts/breaks calculate correctly.
- Copy week does not duplicate/corrupt assignments.
- Equivalent overlaps coalesce deterministically.
- Material edits invalidate stale confirmation.
- Requests are location-scoped.
- Attendance uses canonical evidence after confirmation.
- ETA settings respect bounds and survive reload.
- First-paint bars do not jump after hydration/refresh.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` and supplied Shifts/workspace handoffs.