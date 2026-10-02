# Reservations — `/admin/reservations`

## Purpose

Reservations is a clean workspace combining reservation KPIs, shared Floor state, server-built schedule/calendar data and a canonical reservation composer.

- Clean URL: `/admin/reservations`
- Internal: `/admin/reservationslab`
- Controller: `app/admin/controllers/Reservationslab.php`
- Base: `PmdCleanWorkspaceControllerV1`
- Permission: `Admin.Reservations`
- View: `app/admin/views/reservationslab/index.blade.php`
- Schedule authority: `Admin\Services\PmdReservationsLabScheduleV1`
- Composer authority: `Admin\Services\ReservationComposerService`

## Workspace contract

Workspace key `reservations`; KPI mode `reservations`; menu context Reservations/Sales; shared Floor enabled; schedule partial after Floor; reservation cards below Floor. Defaults: reservations today, upcoming arrivals, available tables, table occupancy.

## Server first paint

`pmdPrepareWorkspaceVars()` calls `PmdReservationsLabScheduleV1::payload(location, locale)`. Dashboard and Manager reuse this same schedule authority. If schedule semantics are wrong, fix the service—not each host Blade.

## Composer actions

The controller intentionally stays thin:

- `onLoadReservationComposer()` -> `ReservationComposerService::load(request()->all())`
- `onCheckReservationAvailability()` -> `availability(request()->all())`
- `onSaveReservationComposer()` -> `save(request()->all())`

Validation, availability rules, create/update decisions and persistence belong in the composer/domain service. Avoid adding competing reservation SQL to the controller.

## Floor busy windows

The clean-workspace base reads location reservations/tables around the current operational window. Cancelled reservations are excluded using canonical `Reservations_model::isCanceled()`. Each valid reservation contributes table-specific start/end milliseconds derived from reserve date/time + duration. An event/focus refresh action updates busy windows without requiring constant full-page polling.

## Table-card filtering

`pmd-reservations-lab-table-card-filter-v1.js` adds reservation-specific interaction on top of shared Floor state. It is not a separate table-availability engine.

## Core invariant

A cancelled reservation must never continue blocking a table. If that happens, inspect canonical reservation status history and `isCanceled()` before patching Floor rendering.

## Regression matrix

- Create/edit composer loads from canonical service.
- Availability and save use identical location/date/table assumptions.
- Cancelled reservations stop contributing busy windows.
- Schedule matches Manager/Dashboard for same location/locale.
- Occupancy KPI agrees with shared Floor.
- Validation errors produce no partial write.
- Locale/time formatting does not mutate stored reservation timestamps.
- Cross-tenant reservation/table IDs cannot be loaded or saved.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` plus supplied PayMyDine handoffs.