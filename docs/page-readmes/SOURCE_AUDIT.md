# Source audit record

## Baseline and scope

- **Repository:** `Amir3629/Paymydine-Update`
- **Audit SHA:** `dc71afabca0f254d4e2228bf6bf67bdcfb2398e2`
- **Audit date:** 2026-09-06 UTC
- **Scope:** all page guides linked from this directory; documentation only.
- **Source-of-truth rule:** tracked files at the audit SHA. Historical documents/snapshots were used only to recognize duplicates, never to establish current behavior.

## Method

The audit started at each visible browser URL, checked active route bootstrap files (`app/admin/routes.php`, `app/main/routes.php`), followed the clean URL bridge to its internal target, then inspected controllers, inherited action classes/traits, services, models/table names, Blade/React, controller-registered assets, and public API/payment route files. Searches included similarly named lab/version/backup implementations. Files under `storage/`, `.before-*`, `.disabled-*`, `old_*`, `broken_before_*`, and hotfix backups were classified as retired unless current active code imports them.

No credentials, tenant secrets, tokens, webhook material, customer records, or live responses were read or reproduced. No application request, deployment, migration, or database mutation was performed.

## Active routing conclusions

`app/admin/routes.php` loads `routes/admin-app-before.php`. Its native clean URL bridge preserves browser paths while internally dispatching Dashboardlab/Managerlab/Accountantlab/Pmdmenus/Pmdsettings/Pmddevices/Pmdfinance. This removes stale claims that users must browse historical `*lab` or `pmd*` URLs. Conventional controller routing still owns pages such as Orders, Shifts, Coupons and PMD Intelligence. Reservations has multiple generations: troubleshoot the clean bridge/Reservationslab path first, and use the canonical Reservations model/form handlers only where delegated.

`app/main/routes.php` loads `app/main/routes/main-app-before.php`, which includes theme settings plus Frontend V2 theme/media bridges. The current customer contract is spread across the active `api-v1-*` route files and provider-specific route files; `routes/root-app-before.php` contains compatibility/public surfaces and must be evaluated by actual include/route order rather than assumed from its filename.

## Authority conclusions

- Dashboard hosts compose read data through shared dashboard/report services. Manager and Reservations consume shared reservation/Floor authorities; they do not own independent Floor implementations.
- Menu (`Pmdmenus`) is a composer; canonical Menus/Categories/Combos controllers and models write catalog state.
- Settings is a hub. Restaurant profile, customer-menu experience, devices and finance retain separate handlers and writer boundaries.
- PMD Intelligence writes only scoped chat continuity. `PmdReadAuthority`/registered tools—not previous assistant prose—supply facts.
- Finance configuration uses market context and payments compatibility storage. A method is not a provider; a terminal is not either; an admin/customer UI is only a surface.
- Payment completion requires durable server-side settlement/reconciliation. Provider confirmation, return navigation and webhook delivery are evidence/input, not sufficient truth in isolation.

## Frontend V2 verification

The integrated package directory is `frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815`. Current package metadata reports:

- package/version: `paymydine-frontend-v2-revolution` / `1.1.1-staging.20260815-integrated-r2`;
- runtime floor: Node `>=20.11`, npm `10.9.2`;
- pinned core dependencies: Next `16.3.1`, React/React DOM `19.2.6`, `connect-sdk-client-js` `6.0.6`, `lucide-react` `0.454.0`, `server-only` `0.0.1`;
- bootstrap owners: `app/page.tsx`, `app/menu/page.tsx`, `src/server/page-context.ts`, `src/server/bootstrap.ts`, `src/server/backend.ts`, and the Laravel `api-v1-*`/theme/media routes;
- theme owners: `src/themes/catalog.ts` and `ThemeRenderer.tsx`. The ten canonical IDs are `noir_editorial`, `verdant_modern`, `lumiere_fine_dining`, `kazen_japanese`, `azzurra_coastal`, `neon_cocktail_bar`, `art_deco_speakeasy`, `shahrazad_persian`, `anatolia_turkish`, and `ember_steakhouse`;
- split payments: runtime types carry `splitBill`, settled and remaining amounts; provider components prepare/cancel split intents, submit grouped allocations and call settlement endpoints. UI refs suppress duplicate in-component settlement, but server idempotency/durable records remain authoritative;
- release audit: `npm run release:audit` chains offline typecheck, theme/source/guest-AI/product/structure/import/package audits plus backend contract, admin integration and feature coverage scripts. `verify` additionally builds but uses the normal typecheck.

The older root `frontend/` package is a separate application lineage and is not documented as the integrated V2 package.

## Stale statements removed or explicitly rejected

- Historical internal controller names are not presented as browser URLs.
- Dashboard/Manager/Reservations are not described as separate Floor authorities.
- Pmdmenus, Settings and Devices are not incorrectly described as universal writers.
- Provider success and browser return are not described as settlement.
- Payment method/provider/terminal/surface are not conflated.
- Chat history is not described as factual restaurant storage.
- Backup, disabled, storage snapshot and old controller copies are not listed as active implementations.
- Frontend V2 version, dependency versions, catalog size/IDs and audit scripts are taken from its current files rather than handoff notes.

## Unresolved production/schema checks

Source review cannot prove the following and no live access was attempted:

1. Which commit/image is deployed on each tenant host and whether reverse-proxy clean URL rules match this checkout.
2. Actual tenant migration state, optional columns/tables, compatibility choice between `payment_methods` and `payments`, indexes, constraints, and timezone/settings values.
3. Real staff-group capability assignments, selected location behavior and feature rollout flags.
4. Queue/webhook delivery, provider dashboards, terminal pairing/health, settlement reconciliation backlog and fiscal service availability.
5. Frontend V2 process/version currently serving each domain, environment variable presence, CDN/cache state and whether its release manifest matches deployed files.
6. Browser visual/loading/degraded behavior with real authenticated fixtures. Playwright was not run because no credentials/test tenant were provided and QA must not touch business data.

Resolve these with read-only, redacted production diagnostics and an approved test tenant. Never paste secrets or PII into an issue or PR.

## Re-audit rule

Immediately before merge, compare `git diff dc71afabca0f254d4e2228bf6bf67bdcfb2398e2..HEAD --` for every route, controller, service, model, view, asset and Frontend V2 file cited by these guides. Re-audit materially changed surfaces and update both the audit SHA and affected guides. Documentation-only changes in this branch do not change product authority.
