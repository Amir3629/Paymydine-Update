# Accountant Dashboard — `/admin/accountantdashboard`

## Purpose

Accountant is the finance-oriented role dashboard. It shares the clean workspace and Owner analytics authority but intentionally **does not render the Floor** and does not render the older intermediate finance-insight card strip.

- Clean URL: `/admin/accountantdashboard`
- Internal: `/admin/accountantlab`
- Controller: `app/admin/controllers/Accountantlab.php`
- Base: `PmdCleanWorkspaceControllerV1`
- Permission: `Admin.Dashboard`
- Shared data: `PmdCleanWorkspaceSharedV1`, `PmdRoleDashboardDataV1`

## Page contract

- `pmdWorkspaceKey()` = `accountant`
- `pmdKpiMode()` = `accountant`
- `pmdUsesFloor()` = `false`
- analytics reuse Owner analytics
- role-dashboard partial renders below the top section

Default KPI selection is `vat_month`, `gross_to_net`, `total_loss`, `cash_percent`. Persisted selection is capped to four; missing/empty selection falls back to those defaults.

## Analytics lifecycle

Like Manager, `?pmd_analytics=1&period=...` returns `PmdRoleDashboardDataV1::ownerAnalyticsPayload()`. Normal first paint preloads `ownerAnalyticsBootstrap()` and sets the accountant endpoint for period changes. The design deliberately keeps one report-calculation authority and changes presentation by role rather than copying financial SQL/formulas.

## Deliberately removed layer

Current code sets `pmdRoleInsightCards = []`. Historical Revenue bridge, Settlement totals, Payment mix, Tips ledger, Average checks and Tax/loss-control cards are not current UI. Their data may exist elsewhere, but absence here is intentional product behavior.

## Floor behavior

No Floor is rendered. Shared Floor actions inherited from the base must fail/degrade safely for this workspace rather than creating phantom accountant Floor state.

## Relationship to Payments & Finance

This dashboard is reporting/monitoring. Provider credentials, VAT/invoice configuration, terminals, provider enablement and fiscalization belong to `/admin/settings/finance`. No provider secret should ever be moved into Accountant dashboard payloads.

## Security / regression checklist

- No Floor/table manager appears.
- Four KPI slots maximum, stable defaults.
- Owner analytics values match shared report authority for same location/period.
- No payment/provider secrets leak into the dashboard.
- Removed finance insight strip remains removed unless product requirements change.
- Role navigation never substitutes for controller permission.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` plus supplied PayMyDine handoffs.