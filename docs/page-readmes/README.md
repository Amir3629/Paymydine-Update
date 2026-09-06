# PayMyDine Page-by-Page Engineering Documentation

**Audit date:** 2026-09-06  
**Repository:** `Amir3629/Paymydine-Update`  
**Baseline:** `main` @ `602b677a1bc775b634f731390792225faed66401`

This directory is the engineering map for the current PayMyDine admin and customer surfaces. It is intentionally page-oriented: a developer should be able to start from the URL visible in the browser and trace that page down to its controller, services, data authorities, mutations, frontend assets, security boundaries, and dependent systems.

## Clean URL to implementation map

| Product surface | Browser URL | Primary implementation authority |
|---|---|---|
| Owner Dashboard | `/admin/ownerdashboard` | `app/admin/controllers/Dashboardlab.php` (`dashboardlab`) |
| PMD Intelligence | `/admin/pmdintelligence` | `app/admin/controllers/Pmdintelligence.php` |
| Manager | `/admin/managerdashboard` | `app/admin/controllers/Managerlab.php` (`managerlab`) |
| Accountant | `/admin/accountantdashboard` | `app/admin/controllers/Accountantlab.php` (`accountantlab`) |
| Orders | `/admin/orders` | `app/admin/controllers/Cashierlab.php` (`cashierlab`) + Waiter/POS write authorities |
| Reservations | `/admin/reservations` | `app/admin/controllers/Reservationslab.php` (`reservationslab`) |
| Shifts | `/admin/shifts` | `app/admin/controllers/Shifts.php` |
| Coupons & Gifts | `/admin/coupons` | `app/admin/controllers/Coupons.php` + `pmdcoupons` view |
| Menu | `/admin/menu` | `app/admin/controllers/Pmdmenus.php`; writes remain in `Menus.php`/`Combos.php` |
| Settings | `/admin/settings` | `app/admin/controllers/Pmdsettings.php` |
| Restaurant profile | `/admin/settings/restaurant` | `Pmdsettings::restaurant()` |
| Customer menu theme | `/admin/settings/customer-menu` | `Pmdsettings::frontend()` |
| Devices | `/admin/settings/devices` | `app/admin/controllers/Pmddevices.php` |
| Payments & finance | `/admin/settings/finance` | `app/admin/controllers/Pmdfinance.php` + payment runtime APIs |
| Customer frontend | customer QR/table routes | `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815` + Laravel public APIs |

The clean URLs are product-facing aliases. Several internal controller names intentionally remain the historical names because replacing them would create unnecessary framework and compatibility risk. Debug both identities: **visible URL** and **internal controller/action**.

## Core architectural rules

1. **One authority per concern.** A page can compose data owned elsewhere; it should not silently become a second writer. Examples: Dashboard uses Dashboard2 KPI data but does not import the Dashboard2 browser runtime; Menu manager composes catalog presentation while `Menus` and `Combos` remain write authorities; Devices provides a single clean UI while existing device controllers own create/edit AJAX writes.
2. **Tenant and location scope are part of correctness.** Never treat a central/default DB row as the restaurant's state unless the relevant service explicitly resolves that connection. Location-aware pages must resolve the canonical active location before reading or mutating operational data.
3. **Server-first first paint is deliberate.** Many recent revisions removed browser boot fetches, layout rewrites, theme flashes, retry observers, and competing DOM authorities. Do not reintroduce client-side first-paint competition without a measured reason.
4. **Provider != payment method != terminal.** Finance/payment code must keep those concepts separate. Settlement is server-authoritative and provider confirmation must be verified before an order is considered paid.
5. **Shared Floor is a shared domain, not copied markup.** Owner, Manager, Orders/Cashier and Reservations share floor/table concepts, registry/location scope, reservation busy windows and user/page view preferences. Avoid page-specific geometry/data forks.
6. **Role-specific dashboards share data authorities.** Manager and Accountant intentionally reuse owner analytics where appropriate instead of duplicating report logic.
7. **Secrets stay server-side.** Payment credentials, webhook secrets, AI provider credentials and admin/session data must never enter public customer bootstrap or logs intended for operators.
8. **Relative dates are restaurant-local.** Current operational code repeatedly grounds business time in restaurant/local timezone (with Europe/Berlin explicitly used in several admin workflows). Do not use browser/UTC guesses for business-day reporting.

## Role/navigation model

The product shell resolves role landing pages and capability visibility. Owner/admin has the broadest access. Manager is oriented around dashboard, orders, reservations, menu, shifts, coupons, reports and settings. Cashier is focused on orders/reservations/coupons. Kitchen and delivery roles primarily land in orders. Accountant uses dashboard/orders/reports/settings. Individual controllers still enforce their own framework permissions and, in some surfaces such as Shifts, additional role checks.

**Do not use side-menu visibility as authorization.** The server/controller permission is the security boundary.

## Shared runtime concepts

- **Clean workspace shell:** `PmdCleanWorkspaceControllerV1` composes server-rendered KPI/Floor workspaces and owns common Floor actions, reservation busy windows, table-manager access, location resolution and per-user/page Floor view preference.
- **Shared workspace data:** `PmdCleanWorkspaceSharedV1` supplies canonical clean-workspace location/Floor context.
- **Role dashboard reports:** `PmdRoleDashboardDataV1` owns reusable role/owner analytics bundles.
- **Shared Floor registry:** `PmdSharedFloorRegistryV1` owns floor registry selection and user/page/location view preferences.
- **Reservations schedule:** `PmdReservationsLabScheduleV1` is reused by Reservations and other host surfaces rather than copied.
- **Reservation composer:** `ReservationComposerService` owns load, availability and save workflows from ReservationsLab.
- **Operational workforce:** `pmd_operational_people`, `pmd_operational_shifts` and `pmd_operational_shift_people` underpin the current rota, with reconciliation services keeping staff/login and operational identities coherent.
- **Country platform context:** `LocationPlatformContext` + `CountryPlatformProfileRegistry` shape country-specific Finance behavior.
- **Frontend V2:** Next.js performs tenant-resolved server bootstrap, selects exactly one isolated theme, then hydrates interactions without replacing first-paint theme authority.

## Cross-surface flows worth understanding

### Reservation -> Floor -> dashboards
A reservation is written through the reservation domain/composer. Shared Floor logic reads non-cancelled table reservations into busy windows. Owner/Manager/Reservations can therefore render table pressure from the same conceptual authority. Manager additionally synchronizes visible-floor counts into its operational KPI bundle so the KPI cannot disagree with the floor directly above it.

### Menu -> Customer frontend
Admin menu writes update canonical menu/category/combo/media/allergen data. Frontend V2 server bootstrap calls `/api/v1/menu`, normalizes it, then renders the selected isolated theme. Customer-menu theme/feature settings are saved in Settings and exposed via the V2 theme/settings bridge.

### Shifts -> workforce/ETA/AI
Shifts manages operational people and planned shifts, assignment/confirmation and kitchen-capacity settings. Kitchen workforce services consume that data; PMD Intelligence can read workforce schedule/current kitchen workforce. Keep planning, attendance evidence and AI read models separate.

### Orders -> payments -> settlement -> analytics
Orders/Cashier composes operational order views and opens the existing POS/order writer. Public checkout initiates a provider-specific flow. Payment truth is verified server-side, idempotently applied to the existing order/settlement state, then reports/analytics consume the resulting canonical order/payment data.

## Files in this documentation set

- `01-owner-dashboard/README.md`
- `02-ai-intelligence/README.md`
- `03-manager-dashboard/README.md`
- `04-accountant-dashboard/README.md`
- `05-orders/README.md`
- `06-reservations/README.md`
- `07-shifts/README.md`
- `08-coupons-gifts/README.md`
- `09-menu/README.md`
- `10-settings/README.md`
- `11-settings-restaurant-profile/README.md`
- `12-settings-customer-menu-theme/README.md`
- `13-settings-devices/README.md`
- `14-settings-payments-finance/README.md`
- `15-customer-frontend-v2/README.md`
- `SOURCE_AUDIT.md`
- `CODEX_DOCUMENTATION_MAINTENANCE_PROMPT.md`

## Recommended debugging order

For any page bug: confirm the clean URL and role -> resolve internal controller/action -> identify first-paint data service -> identify actual write authority -> confirm tenant/location -> inspect browser asset authority -> reproduce with one exact entity/date -> inspect response and canonical DB row -> only then patch. This avoids the project's historically expensive class of fixes where a visible symptom was patched in a late CSS/JS layer while the real authority remained wrong.


---

## Documentation authority and maintenance rule

This page was audited on **2026-09-06** against `Amir3629/Paymydine-Update` `main` at commit `602b677a1bc775b634f731390792225faed66401`, plus the supplied PayMyDine engineering handoffs. When code and an older handoff disagree, **current `main` is authoritative**. Handoffs are used for rationale, production lessons, invariants, and historical context—not to resurrect retired behavior.

When changing this surface, update this README in the same pull request if any route, controller/service boundary, permission, persisted field, API contract, UI state, asset authority, or cross-page invariant changes.
