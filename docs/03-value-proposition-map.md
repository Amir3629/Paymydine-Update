# PayMyDine Sales Value Proposition Map (Phase 3)

## Revenue growth
- **Value statement:** Increase order value through modifiers, combos, upsell-capable digital flows.
- **Supporting features:** Menu options, combos, coupons, tips.
- **Best-fit customer type:** Full-service restaurants, fast casual, multi-location groups.
- **Suggested sales wording:** “Turn your menu into a dynamic revenue engine, not a static PDF.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/models/Menu_item_options_model.php`, `Menu_combos_model.php`, `Coupons_model.php`, `Tips_shifts_model.php`

## Higher direct ordering share
- **Value statement:** Own direct guest ordering via table/menu flows and tenant domain routing.
- **Supporting features:** Table/QR routes, tenant-aware URLs, frontend menu/table pages.
- **Best-fit:** Restaurants relying on in-house guest traffic.
- **Suggested sales wording:** “Move more orders to your own channel and control the guest journey.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/Http/Controllers/Api/TableController.php`, `app/admin/routes.php`, `frontend/app/menu/page.tsx`, `frontend/app/table/[table_id]/page.tsx`

## Better guest experience
- **Value statement:** Faster self-service ordering and mobile-friendly payment paths.
- **Supporting features:** Mobile table UX, payment method APIs, wallet-capable structures.
- **Best-fit:** High-turnover venues.
- **Suggested wording:** “Guests scan, order, and pay with fewer steps.”
- **Confidence:** LIKELY_FROM_CODE_STRUCTURE
- **Evidence:** `frontend/app/menu/page.tsx`, `app/admin/routes.php` payment endpoints, `frontend/public/manifest.json`

## Faster service / fewer mistakes
- **Value statement:** Structured digital orders reduce miscommunication.
- **Supporting features:** Order item/options validation, table context, status updates.
- **Best-fit:** Table-service restaurants.
- **Suggested wording:** “Digital order capture reduces verbal errors and rework.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/Http/Controllers/Api/OrderController.php`, `app/admin/controllers/Orders.php`, `Statuses.php`

## Better staff coordination
- **Value statement:** Role-based admin + notifications + waiter-call workflows support floor coordination.
- **Supporting features:** staff roles/groups, notifications, waiter calls.
- **Best-fit:** Mid/large teams.
- **Suggested wording:** “Coordinate FOH/BOH in one operational system.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/StaffRoles.php`, `StaffGroups.php`, `Notifications.php`, `app/admin/routes.php` waiter-call

## Better kitchen flow
- **Value statement:** KDS stations with category filtering and status transitions improve throughput.
- **Supporting features:** KitchenDisplay, KDS stations.
- **Best-fit:** Multi-station kitchens.
- **Suggested wording:** “Give each prep station exactly what it needs to see.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/KitchenDisplay.php`, `KdsStations.php`, `app/admin/models/Kds_stations_model.php`

## Better payment experience
- **Value statement:** Unified payment orchestration across multiple providers.
- **Supporting features:** method/provider matrix, provider-specific create/check/capture routes, webhooks.
- **Best-fit:** Restaurants with varying PSP contracts.
- **Suggested wording:** “Use the payment providers that fit your market and contracts.”
- **Confidence:** CONFIRMED_FROM_CODE (code), NEEDS_HUMAN_CONFIRMATION (production setup by tenant)
- **Evidence:** `app/admin/controllers/Payments.php`, `app/admin/routes.php`, `app/admin/controllers/WebhooksController.php`

## Better operational control
- **Value statement:** Admin modules cover orders, reservations, tables, POS, staff, customers.
- **Supporting features:** admin controller landscape.
- **Best-fit:** Operators replacing fragmented tools.
- **Suggested wording:** “One back office for guest service and operations.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/*` (Orders, Reservations, Tables, POS, Staff, Customers)

## Better compliance readiness
- **Value statement:** Germany-oriented fiscalization artifacts and biometric GDPR utilities exist.
- **Supporting features:** Fiskaly services/migrations, GDPRComplianceService.
- **Best-fit:** Germany-focused operators.
- **Suggested wording:** “Built with compliance hooks for Germany-focused operations.”
- **Confidence:** CONFIRMED_FROM_CODE (artifacts), NEEDS_HUMAN_CONFIRMATION (audit/legal fit)
- **Evidence:** `app/admin/services/Fiskaly/*`, `app/admin/database/migrations/2026_03_09_*.php`, `app/admin/services/BiometricDeviceService/GDPRComplianceService.php`

## Better scalability for multi-location / multi-brand
- **Value statement:** Superadmin tenant provisioning and tenant DB isolation support expansion.
- **Supporting features:** superadmin tenant create/update, tenant middleware.
- **Best-fit:** Chains and platform operators.
- **Suggested wording:** “Scale locations/brands with isolated tenant environments.”
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/SuperAdminController.php`, `app/Http/Middleware/DetectTenant.php`, `config/database.php`
