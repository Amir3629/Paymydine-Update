# Customer Frontend V2

> Audited against `dc71afabca0f254d4e2228bf6bf67bdcfb2398e2`. Start at the visible URL; historical handoffs/chat are non-authoritative context.

## Product purpose and role

Server-resolved, themed customer menu, table ordering, coupon/tip/VAT/valet and payment experience.

## Route and authority chain

- **Visible URL:** `tenant origin `/`, `/menu`, `/table/{table}` and payment routes`
- **Internal route/controller target:** `Next.js App Router; Laravel main API and proxy routes`
- **Primary controller/composer:** `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/app/page.tsx`
- **Server gate:** Public guest surface; tenant host/table context and endpoint validation replace admin permissions.
- **Canonical sources:** server/bootstrap.ts via backend API contracts: api-v1-menu/settings/table/order/coupon/theme/media; no demo/mock data in production authority.
- **Public/AJAX handlers:** Next pages/route handlers and client-api; Laravel public API route files; payment initiation/return/webhook/provider verification handlers.
- **Write authority:** Guest order flow is the order writer; coupon validation is read/validation; payment writers delegate provider transactions. Split-payment allocation must total the payable amount and settlement must be confirmed by durable server reconciliation—not redirect/webhook/provider status alone.
- **Frontend authority:** package `paymydine-frontend-v2-revolution` 1.1.1-staging.20260815-integrated-r2; Next 16.3.1/React 19.2.6; ten-theme catalog + ThemeRenderer; app/layout and globals bootstrap.

## Request and first paint

1. Tenant middleware resolves the request host/database before admin or public data is read; the configured admin URI defaults to `/admin`.
2. The clean URL is kept in the browser. `routes/admin-app-before.php` may duplicate the request internally to the historical controller path; that internal name is implementation detail, not the product URL.
3. The controller/base action checks authentication and `$requiredPermissions`, resolves current location/locale, composes canonical data, registers assets, then returns Blade/React HTML.
4. JavaScript enhances already-authoritative server output or calls documented handlers. A spinner, cached card, DOM text, or client-side provider response is never canonical business state.

## Tenant, location and time

All reads/writes must remain on the tenant connection selected from the request host. Location-aware actions use the authenticated/current location and must reject cross-location record IDs. Date filters are interpreted in the restaurant/application timezone by the owning service, then persisted/query-bounded consistently; browser-local time is display input, not database authority. Never silently fall back to another tenant or location.

## States and failure handling

- **Loading:** server first paint should carry stable shell/data where implemented; enhancement requests expose an explicit busy state.
- **Empty:** render a legitimate empty collection, not demo or previous-tenant data.
- **Validation/auth:** return framework validation (typically 422), unauthenticated (401/redirect), or forbidden (403), without mutating.
- **Degraded:** optional cards/integrations may log and render unavailable/empty; core writers must fail closed and must not imply success.
- **Retry/idempotency:** safe GETs may retry. Never blindly retry POST/payment/device commands; use the owning operation's identifiers and persisted state.

## Security and privacy boundary

Session/CSRF and server permissions are mandatory for mutations. Do not log or render credentials, API/webhook secrets, auth tokens, passwords, recovery material, or customer PII. IDs from the browser are untrusted and require tenant/location ownership checks. Error payloads should be public-safe; detailed exceptions belong in protected logs.

## Regression matrix

| Case | Expected |
|---|---|
| permitted user, populated tenant | correct clean URL, tenant/location data, no cross-tenant queries |
| no rows | stable empty state and usable navigation |
| missing capability | 403/hidden action; direct handler call still denied |
| invalid/stale/cross-location ID | 404/409/422, no write |
| dependency/provider unavailable | degraded/error state; no false success |
| duplicate submit/retry | no duplicate mutation where operation promises idempotency |
| locale/timezone boundary | correct translated labels and restaurant-day range |
| narrow viewport/no JS | readable server shell; critical permissions remain server-side |

## Legacy and duplicate implementations

Files named `.before-*`, `.disabled-*`, backup/snapshot trees under `storage/`, and historical lab/version controllers are not current authority unless an active route/service explicitly imports them. Keep them for compatibility/forensics, but trace from the current route before using one.

## Cross-page integrations

Navigation/actions may open Orders, Reservations, Shifts, Menu, Settings, Devices, Finance, reports, or the customer surface. Those links do not transfer write authority. The shared Floor remains one component/data contract across hosts and must not fork per page. Events/status history/notifications are side effects only when emitted by the owning writer after a successful mutation.

## Exact source-file map

- `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/app/page.tsx`
- `app/main/routes/api-v1-menu.php`
- `app/main/routes/api-v1-settings.php`
- `app/main/routes/api-v1-table-order.php`
- `app/main/routes/api-v1-guest-order-flow-r60t.php`
- `app/main/routes/pmd-frontend-v2-theme.php`
- `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/package.json`
- `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/bootstrap.ts`
- `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/lib/guest-order-flow-r60t.ts`
- `routes/admin-app-before.php` (clean admin URL bridge and admin helpers)
- `app/Http/Middleware/TenantDatabaseMiddleware.php` (tenant binding)
