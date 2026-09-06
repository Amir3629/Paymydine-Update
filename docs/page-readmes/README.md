# PayMyDine Page-by-Page Engineering Documentation

**Audit date:** 2026-09-06  
**Repository:** `Amir3629/Paymydine-Update`  
**Baseline:** `main` @ `d6e443b88a0fd72a5727854b245d8f0678497447`

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

The clean URLs are product-facing aliases. Several internal controller names intentionally remain historical names because replacing them would create unnecessary framework/compatibility risk. Debug both identities: **visible URL** and **internal controller/action**.

## Core architectural rules

1. **One authority per concern.** A page may compose data owned elsewhere but must not silently become a second writer. Dashboard uses Dashboard2 KPI data without importing its browser runtime; Menu composes presentation while `Menus`/`Combos` remain writers; Devices composes one clean UI while specialized controllers retain writes.
2. **Tenant and location scope are correctness.** Never treat central/default DB state as restaurant state unless the relevant service explicitly resolves it.
3. **Server-first first paint is deliberate.** Avoid browser boot fetches/layout rewrites/theme flashes/retry observers competing with server-rendered authority.
4. **Provider != payment method != terminal != surface.** Settlement is server-authoritative and provider confirmation must be verified before an order is paid.
5. **Shared Floor is a shared domain.** Owner, Manager, Orders and Reservations share floor/table registry, location scope, reservation busy windows and user/page view preferences.
6. **Role dashboards share report authorities.** Manager/Accountant intentionally reuse Owner analytics where appropriate.
7. **Secrets stay server-side.** Payment/AI/provider/admin secrets never enter customer bootstrap or normal operator payloads.
8. **Relative dates are restaurant-local.** Business reporting/AI date interpretation must use canonical restaurant clock, not browser guesses.

## Role/navigation model

The shell resolves role landing pages and capability visibility, but **side-menu visibility is not authorization**. Controllers/actions remain the security boundary. Shifts, shared Floor table management, payment writes and other sensitive flows add role/capability checks beyond broad navigation permission.

## Shared runtime concepts

- `PmdCleanWorkspaceControllerV1`: server-rendered KPI/Floor shell and common Floor actions.
- `PmdCleanWorkspaceSharedV1`: canonical clean-workspace location/Floor context.
- `PmdRoleDashboardDataV1`: reusable role/Owner analytics bundles.
- `PmdSharedFloorRegistryV1`: floor registry and user/page/location view preference.
- `PmdReservationsLabScheduleV1`: shared reservations schedule authority.
- `ReservationComposerService`: reservation load/availability/save authority.
- Operational workforce tables/services: current rota/team/assignment domain.
- `LocationPlatformContext` + `CountryPlatformProfileRegistry`: market-specific Finance behavior.
- Frontend V2: tenant-resolved Next.js server bootstrap, one isolated theme, hydration for interaction only.

## Cross-surface flows

### Reservation -> Floor -> dashboards
Reservation domain/composer writes canonical data. Shared Floor reads non-cancelled reservation table windows. Manager reconciles visible-floor counts into KPI values so a KPI cannot disagree with the Floor above it.

### Menu -> Customer frontend
Admin writers persist canonical food/category/combo/media/allergen data. Frontend V2 reads `/api/v1/menu`, normalizes it and renders the server-selected theme. Theme/feature settings flow from Settings through the V2 public bridge.

### Shifts -> workforce/ETA/AI
Shifts plans operational people/shifts and capacity settings. Kitchen workforce consumes them; PMD Intelligence reads approved schedule/workforce facts. Planning, attendance evidence and AI read models remain separate.

### Orders -> payments -> settlement -> analytics
Orders/Cashier composes operational views and delegates to existing POS writers. Provider payment is verified server-side and applied idempotently to canonical settlement before analytics/reporting consume it.

## Files

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

Confirm clean URL/role -> resolve internal controller/action -> identify first-paint service -> identify real writer -> confirm tenant/location/timezone -> inspect current browser asset authority -> reproduce with one exact entity/date -> inspect response + canonical DB row -> patch the authority, not a late visual symptom.

## Documentation authority

Audited on **2026-09-06** against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447` plus supplied PayMyDine handoffs. Current code wins when older handoffs disagree. Update the relevant README in the same PR whenever routes, permissions, authority boundaries, persisted fields, APIs, UI states or cross-page invariants change.
