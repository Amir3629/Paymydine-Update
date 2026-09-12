# Devices & Hardware — `/admin/settings/devices`

## Product contract

Devices is one clean server-first overview for hardware/integration inventory. Existing specialized device controllers remain POST/AJAX write authorities; their legacy visible GET pages route back into this overview/modal.

- Clean URL: `/admin/settings/devices`
- Internal: `/admin/pmddevices`
- Controller: `app/admin/controllers/Pmddevices.php`
- Permission: `Site.Settings`
- View: `app/admin/views/pmddevices/index.blade.php`
- Main assets: `pmd-device-inline-v6.css`, `pmd-device-inline-v6.js`, shared owner-settings shell.

## Device families

First paint gathers:

- POS devices — `Pos_devices_model` / `pos_devices`
- payment terminals — `Terminal_devices_model` / `terminal_devices`
- cash drawers — `Cash_drawers_model` / `cash_drawers`
- biometric devices — `FingerDevices_model` / `finger_devices`
- KDS stations — `Kds_stations_model` / `kds_stations`
- POS integrations — `Pos_configs_model` / `pos_configs` + device relations

`safeCollection()` allows optional/legacy tables to fail independently instead of blanking the entire page.

## Terminal filtering and archived rows

The overview reads terminal inventory then filters visible rows against `Terminal_devices_model::listProviderOptions()`. Historical rows whose provider is no longer valid/selectable are counted as archived rather than presented as active terminals. This protects market/provider UI from stale global rows.

## Single visible UI and child routes

Controller methods `pos`, `terminals`, `kds`, `drawers`, `biometric`, `integrations` normalize `list/create/edit` and redirect back to `/admin/pmddevices` with query/hash modal state. `buildDevicePage()` supplies record, form array name, backend URL and option lists. Actual create/edit posts can still target mature terminal/KDS/drawer/biometric/POS-config controllers.

## Workplace Access

The page exposes the dedicated Workplace Access hub. Trusted-device authentication/MFA is related to hardware but is a separate security authority and should not be collapsed into terminal/POS configuration fields.

## Provider != terminal

A terminal is a specific physical/logical endpoint registered under a payment provider. Provider credentials/method enablement belong in Finance/provider configuration. Enabling a provider does not automatically create a usable terminal; a terminal label must never become a credential store.

## KDS/POS relationships

KDS configuration can consume category/POS-device options, and POS integrations can attach devices. The clean modal is a presentation shell over server validation; referential/tenant checks remain backend authority.

## Regression matrix

- Overview still renders when an optional device table is absent.
- Child GET routes converge on one clean UI.
- Modal submits to canonical writer.
- Terminal provider choices are market/capability compatible.
- Unknown historical provider rows are not selectable live terminals.
- KDS/POS option lists stay tenant-scoped.
- Stats equal visible collections.
- Provider secrets never enter inventory payload.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`.