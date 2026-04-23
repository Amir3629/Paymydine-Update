# PayMyDine Platform Architecture Map (Phase 1)

## Scope & method
This map is based on direct repository evidence from:
- Core backend: `var/www/paymydine`
- Guest/admin frontend: `var/www/paymydine/frontend`
- Marketing/customer dashboard app: `var/www/Landingpage`

Confidence labels:
- **CONFIRMED_FROM_CODE** = direct implementation evidence in active code.
- **LIKELY_FROM_CODE_STRUCTURE** = strong structural signal, but full flow not validated end-to-end.
- **MENTIONED_BUT_NOT_PROVEN** = appears in docs/UI text/file names only.
- **NEEDS_HUMAN_CONFIRMATION** = cannot safely claim without runtime/demo/business confirmation.

---

## 1) Frontend apps and purpose

### A. Restaurant guest + merchant frontend (`var/www/paymydine/frontend`)
- **Purpose:** Ordering UI, table/QR entry points, checkout, payment UX, some admin pages.
- **Evidence:** `app/menu/page.tsx`, `app/table/[table_id]/page.tsx`, `app/checkout/page.tsx`, `app/admin/*`.  
- **Confidence:** **CONFIRMED_FROM_CODE**

### B. Platform landing/customer dashboard frontend (`var/www/Landingpage`)
- **Purpose:** Marketing site + auth + dashboard-like flows + feature pages (sales-facing).
- **Evidence:** `app/features/*`, `app/dashboard/page.tsx`, `app/auth/*`, `components/dashboard/*`.  
- **Confidence:** **CONFIRMED_FROM_CODE**

### C. Theme layer for storefront/admin visuals
- **Purpose:** Multi-theme and branded rendering support.
- **Evidence:** `var/www/paymydine/themes/*`, `app/system/views/themes`, `Themes_model::activateTheme('frontend-theme')` in superadmin flow.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 2) Backend apps/modules and purpose

### A. Core Laravel-style API + business layer
- **Evidence:** `routes/api.php`, `app/Http/Controllers/Api/*`, `config/database.php`, `app/Helpers/*`.
- **Core domains found:** menu, categories, orders, tables, tenant detection, media delivery.
- **Confidence:** **CONFIRMED_FROM_CODE**

### B. Admin module (restaurant operations/back-office)
- **Evidence:** `app/admin/controllers/*`, `app/admin/models/*`, `app/admin/routes.php`, `app/admin/views/*`.
- **Core modules include:** orders, menus, categories, reservations, tables, KDS, staff, roles, payments, POS, notifications.
- **Confidence:** **CONFIRMED_FROM_CODE**

### C. System/main modules
- **Evidence:** `app/system/*`, `app/main/*`.
- **Purpose:** framework-level settings, themes, languages, media, logging.
- **Confidence:** **LIKELY_FROM_CODE_STRUCTURE**

---

## 3) Admin area/modules
- Orders: `app/admin/controllers/Orders.php`
- Menus/Categories/Combos: `Menus.php`, `Categories.php`, `Combos.php`
- Reservations/Tables: `Reservations.php`, `Tables.php`
- Kitchen display + KDS stations: `KitchenDisplay.php`, `KdsStations.php`
- Customers & groups: `Customers.php`, `CustomerGroups.php`
- Staff/roles/groups: `Staffs.php`, `StaffRoles.php`, `StaffGroups.php`
- Payments: `Payments.php`, `PaymentController.php`
- POS devices/config: `PosDevices.php`, `PosConfigs.php`, `PosWebhookController.php`
- Notifications: `Notifications.php`, `NotificationsApiController.php`
- Cash drawers & tips: `CashDrawers.php`, `Tips.php`
- Biometric devices & staff auth: `Biometricdevices.php`, `BiometricDevicesAPI.php`, `StaffAuthController.php`
- Superadmin tenant management: `SuperAdminController.php`

**Confidence:** **CONFIRMED_FROM_CODE**

---

## 4) Tenant-related architecture

### Tenant detection and DB switching
- Middleware resolves tenant by subdomain/header and switches DB connection dynamically.
- **Evidence:** `app/Http/Middleware/DetectTenant.php`, `config/database.php` (`tenant` connection), `routes/api.php` group middleware `detect.tenant`.
- **Confidence:** **CONFIRMED_FROM_CODE**

### Tenant context helpers for non-HTTP flows
- Helper functions to iterate/switch tenant DB context.
- **Evidence:** `app/Helpers/TenantContextHelper.php`, `app/Helpers/TenantHelper.php`.
- **Confidence:** **CONFIRMED_FROM_CODE**

### Tenant provisioning
- Superadmin creates tenant record + tenant database + clones from template DB.
- **Evidence:** `app/admin/controllers/SuperAdminController.php` (`store`, DB clone logic).
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 5) Domain/subdomain handling
- Subdomain extraction and tenant lookup in `DetectTenant`.
- Session domain config supports cross-subdomain behavior (`SESSION_DOMAIN`).
- Tenant-aware frontend URL resolution in admin routes.
- **Evidence:** `app/Http/Middleware/DetectTenant.php`, `config/session.php`, `app/admin/routes.php` (`resolveFrontendUrlForLocation`).
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 6) Payment-related areas

### Payment method/provider orchestration
- Method/provider matrix and compatibility filtering in admin payment controller.
- **Evidence:** `app/admin/controllers/Payments.php`.
- **Confidence:** **CONFIRMED_FROM_CODE**

### Provider integrations (code-level)
- Stripe, PayPal, Worldline, SumUp, Square flows found.
- **Evidence:** `app/admin/routes.php` payment API routes, `app/Services/Payments/Providers/*`, `app/admin/services/Payments/*`.
- **Confidence:** **CONFIRMED_FROM_CODE** (for route-level wiring), **NEEDS_HUMAN_CONFIRMATION** (for production-readiness by tenant)

### Webhooks
- Stripe + PayPal webhook handlers.
- **Evidence:** `app/admin/controllers/WebhooksController.php`.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 7) Ordering-related areas
- API order creation with validation, line items, options, totals, stock decrement.
- Table/cashier/delivery order type handling.
- Waiter-call and guest-service-like API endpoints in admin routes.
- **Evidence:** `app/Http/Controllers/Api/OrderController.php`, `app/admin/routes.php` (`/api/v1/orders`, `/waiter-call`).
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 8) Menu/catalog-related areas
- Menus, categories, options, option values, combos, prices, specials.
- Category/menu linking and media attachments.
- **Evidence:** `app/Http/Controllers/Api/MenuController.php`, `app/admin/models/Menu_*`, `app/admin/controllers/Menus.php`, `Categories.php`, `Combos.php`.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 9) Operations-related areas
- KDS screens with station-level filtering and status update actions.
- POS sync/webhook pathways.
- Cash drawer service drivers + logs.
- Location-aware management.
- **Evidence:** `app/admin/controllers/KitchenDisplay.php`, `KdsStations.php`, `PosWebhookController.php`, `app/admin/services/CashDrawerService/*`, `Locations.php`.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 10) Staff-related areas
- Staff CRUD, roles, groups, assignments.
- Attendance/schedules/latetime/overtime/leaves.
- Biometric and card/fingerprint auth APIs.
- **Evidence:** `app/admin/controllers/Staffs.php`, `StaffRoles.php`, `StaffGroups.php`, `StaffAuthController.php`, `app/admin/models/Staff_*`, biometric migrations in `app/admin/database/migrations/2025_01_*`.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 11) Reporting/analytics-related areas
- Dashboard widgets and chart/statistics widgets in admin.
- Landing pages mention analytics/reporting value props.
- **Evidence:** `app/admin/dashboardwidgets/*`, `app/admin/views/dashboard*`, `var/www/Landingpage/app/features/analytics-reporting/page.tsx`.
- **Confidence:** **LIKELY_FROM_CODE_STRUCTURE** (core dashboard exists), **MENTIONED_BUT_NOT_PROVEN** (depth of analytics claims)

---

## 12) Webhook/integration-related areas
- POS webhook controller and routes.
- Stripe/PayPal webhooks.
- Ready2Order (R2O) webhook route and helper scripts.
- **Evidence:** `app/admin/controllers/PosWebhookController.php`, `app/admin/controllers/WebhooksController.php`, `routes/api_r2o_webhook.php`, `app/Services/R2O/*`.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 13) Compliance-related areas
- Germany-focused fiscalization integration (Fiskaly config + transaction fields + services).
- GDPR-named biometric data services (export/deletion/consent logging).
- **Evidence:** `app/admin/services/Fiskaly/*`, migrations `2026_03_09_19000*.php`, `app/admin/services/BiometricDeviceService/GDPRComplianceService.php`.
- **Confidence:** **CONFIRMED_FROM_CODE** (integration artifacts), **NEEDS_HUMAN_CONFIRMATION** (legal completeness)

---

## 14) Media/image/branding-related areas
- Media routes for attachments with fallback logic.
- Theme activation during tenant creation.
- Branding fields likely in settings and storefront assets.
- **Evidence:** `routes/api.php` (`/images`, `/media/{path}`), `routes/web.php` (`/api/media/{filename}`), `themes/*`, `frontend/public/*`.
- **Confidence:** **CONFIRMED_FROM_CODE**

---

## 15) Architecture risks/special notes for sales/comms
1. Repository includes many backup files and historical patches; not all represent active production flow.  
2. Some flows have hardcoded defaults/tenant IDs in route closures and should be verified before public claims.  
3. Payment capability vs “implemented and safe for all tenants” must be messaged carefully.

**Confidence:** **CONFIRMED_FROM_CODE** (risk observation from repository state)
