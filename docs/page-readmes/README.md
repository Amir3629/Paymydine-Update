# PayMyDine page engineering guides

These documents are the current-code navigation map for production troubleshooting. They were audited at commit `dc71afabca0f254d4e2228bf6bf67bdcfb2398e2`; begin with the browser URL and follow the active route includes, controller/base class, services, models, writer and assets. Do not treat historical handoffs, comments, backups, filenames, or AI conversation text as restaurant truth.

## Pages

| Product page | Browser entry | Guide |
|---|---|---|
| Owner Dashboard | `/admin/ownerdashboard` | [Owner Dashboard](owner-dashboard.md) |
| PMD Intelligence | `/admin/pmdintelligence` | [PMD Intelligence](pmd-intelligence.md) |
| Manager | `/admin/managerdashboard` | [Manager](manager.md) |
| Accountant | `/admin/accountantdashboard` | [Accountant](accountant.md) |
| Orders | `/admin/orders` | [Orders](orders.md) |
| Reservations | `/admin/reservations` | [Reservations](reservations.md) |
| Shifts | `/admin/shifts` | [Shifts](shifts.md) |
| Coupons & Gifts | `/admin/coupons` | [Coupons & Gifts](coupons-gifts.md) |
| Menu | `/admin/menu` | [Menu](menu.md) |
| Settings | `/admin/settings` | [Settings](settings.md) |
| Restaurant Profile | `/admin/settings/restaurant` | [Restaurant Profile](restaurant-profile.md) |
| Customer Menu Theme | `/admin/settings/customer-menu` | [Customer Menu Theme](customer-menu-theme.md) |
| Devices | `/admin/settings/devices` | [Devices](devices.md) |
| Payments & Finance | `/admin/settings/finance` | [Payments & Finance](payments-finance.md) |
| Customer Frontend V2 | tenant `/`, `/menu`, `/table/{table}` | [Customer Frontend V2](customer-frontend-v2.md) |

See [SOURCE_AUDIT.md](SOURCE_AUDIT.md) for audit method, active-route evidence, shared invariants, Frontend V2 release facts, and production checks that source inspection cannot resolve.

## Mandatory debugging order

1. Capture host, clean path, method, response status, authenticated role/capability and selected location—without secrets or PII.
2. Confirm the active route include and any clean-to-internal mapping in `routes/admin-app-before.php` or `app/main/routes/main-app-before.php`.
3. Read the controller and inherited action/trait; identify display authority separately from the actual writer.
4. Follow services to models/tables and transaction/idempotency boundaries.
5. Only then inspect Blade/React and registered CSS/JS. Browser state cannot override server authority.
6. Check tenant connection, location scope and restaurant timezone at every boundary.
7. Search duplicates, but exclude `.before-*`, `.disabled-*`, backups and `storage/` snapshots unless active code imports them.

## Architecture invariants

- A clean product URL may intentionally execute a historical internal controller name without redirecting the browser.
- A composer/display page may delegate every mutation to another controller or service.
- Payment **method**, **provider**, **terminal**, and **surface** are different entities.
- A redirect, webhook receipt, or provider status by itself never proves settlement; durable PMD reconciliation is required.
- Owner, Manager and Reservations host the shared Floor; do not create page-specific forks.
- Persisted AI chat provides continuity only. Current restaurant facts come from `PmdReadAuthority` and its registered read tools.
