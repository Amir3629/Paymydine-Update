# PayMyDine Feature Inventory (Phase 2)

> Audience: founders + sales first, technical appendix embedded per item.

## Confidence legend
- **CONFIRMED_FROM_CODE**
- **LIKELY_FROM_CODE_STRUCTURE**
- **MENTIONED_BUT_NOT_PROVEN**
- **NEEDS_HUMAN_CONFIRMATION**

---

## 1) Tenant / multi-tenant management

### Feature: Subdomain-based tenant detection
- **Explanation:** Incoming request host/header maps to tenant and switches DB.
- **Why it matters:** Enables many restaurants on one platform with data isolation.
- **Persona:** IT/Admin, Owner
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/app/Http/Middleware/DetectTenant.php`, `var/www/paymydine/config/database.php`, `var/www/paymydine/routes/api.php`
- **Notes:** Verify behavior for custom apex domains and edge DNS scenarios.

### Feature: Tenant context helper utilities
- **Explanation:** Helper methods restore/switch tenant DB context for background/non-HTTP tasks.
- **Why it matters:** Reduces cross-tenant data leakage risk in jobs/scripts.
- **Persona:** IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/app/Helpers/TenantContextHelper.php`, `var/www/paymydine/app/Helpers/TenantHelper.php`

---

## 2) Restaurant onboarding / tenant creation

### Feature: Superadmin tenant provisioning with DB cloning
- **Explanation:** Create tenant row + create tenant DB + clone template DB schema/data.
- **Why it matters:** Faster rollout for new restaurants.
- **Persona:** Owner, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/app/admin/controllers/SuperAdminController.php`
- **Notes:** Onboarding quality depends on template DB quality.

---

## 3) Domain / subdomain / branded storefront

### Feature: Tenant-aware storefront URL generation
- **Explanation:** Admin routes build links based on tenant domain.
- **Why it matters:** Restaurants can send guests to their own branded domain path.
- **Persona:** Owner, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/app/admin/routes.php` (`resolveFrontendUrlForLocation`, cashier/table URL routes)

### Feature: SESSION domain support for subdomains
- **Explanation:** Session cookie domain is configurable for multi-domain behavior.
- **Why it matters:** smoother admin/front interactions across subdomains.
- **Persona:** IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/config/session.php`

---

## 4) Menu management

### Feature: Menu item CRUD with active/inactive and stock behavior
- **Explanation:** Menu controller/model stack supports menu maintenance.
- **Why it matters:** Keep menu current and avoid unavailable item orders.
- **Persona:** Owner, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/app/admin/controllers/Menus.php`, `var/www/paymydine/app/admin/models/Menus_model.php`, `var/www/paymydine/app/Http/Controllers/Api/MenuController.php`

### Feature: Mealtime support
- **Explanation:** Menus can be constrained by mealtime settings.
- **Why it matters:** Breakfast/lunch/dinner operational control.
- **Persona:** Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/app/admin/controllers/Mealtimes.php`, `app/admin/models/Mealtimes_model.php`

---

## 5) Categories / modifiers / options / combos

### Feature: Categories and menu-category relations
- **Why it matters:** Better discoverability and digital menu structure.
- **Persona:** Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Categories.php`, `app/admin/models/Categories_model.php`, `app/admin/models/Menu_categories_model.php`

### Feature: Item options and option values
- **Why it matters:** Customization (sizes/add-ons) raises average order value.
- **Persona:** Owner, Customer/Guest
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/models/Menu_item_options_model.php`, `Menu_item_option_values_model.php`, `Menu_option_values_model.php`, `app/Http/Controllers/Api/OrderController.php`

### Feature: Combos
- **Why it matters:** Bundle-selling increases basket size.
- **Persona:** Owner
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Combos.php`, `app/admin/models/Menu_combos_model.php`, `app/Http/Controllers/Api/MenuController.php`

---

## 6) Pricing / taxes / currencies

### Feature: Menu pricing and menu_prices model
- **Why it matters:** Per-item pricing control.
- **Persona:** Owner
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/models/Menu_prices_model.php`, migration `2025_01_15_000001_create_menu_prices_table.php`

### Feature: Order-level tax/tip/coupon math fields
- **Why it matters:** Bill accuracy and checkout transparency.
- **Persona:** Finance/Compliance, Customer/Guest
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/Http/Controllers/Api/OrderController.php`, `app/admin/routes.php` (active order route tax/tip/coupon calculations)

### Feature: Multi-currency readiness
- **Why it matters:** EU expansion preparedness.
- **Persona:** Owner, Finance/Compliance
- **Confidence:** LIKELY_FROM_CODE_STRUCTURE
- **Evidence:** `app/system/views/currencies/*`, `frontend/lib/currency.ts`, payment configs with currency fields in `app/admin/routes.php`
- **Notes:** Need runtime proof per tenant/country.

---

## 7) QR ordering / table ordering / dine-in flows

### Feature: Table lookup and QR-aware table APIs
- **Why it matters:** Guests can self-start ordering at table.
- **Persona:** Customer/Guest, Waiter
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/Http/Controllers/Api/TableController.php`, `app/admin/routes.php` (`/orders/get-table-qr-url`, `QrRedirectController`)

### Feature: Table route in frontend
- **Why it matters:** Mobile table ordering UI.
- **Persona:** Customer/Guest
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/frontend/app/table/[table_id]/page.tsx`, `app/menu/table-[table_id]/page.tsx`

---

## 8) Online ordering / pickup / delivery / takeaway

### Feature: API order capture with table/cashier/delivery type logic
- **Why it matters:** Supports both in-venue and non-table orders.
- **Persona:** Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/Http/Controllers/Api/OrderController.php`

### Feature: Delivery area signals
- **Why it matters:** Address-based service boundaries.
- **Persona:** Operations Manager
- **Confidence:** LIKELY_FROM_CODE_STRUCTURE
- **Evidence:** `app/admin/traits/HasDeliveryAreas.php`, location language strings in `app/admin/language/en/lang.php`

---

## 9) Reservations / tables / seating

### Feature: Reservation list/calendar/form + table linkage
- **Why it matters:** Table turnover and guest planning.
- **Persona:** Operations Manager, Waiter
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Reservations.php`, `app/admin/models/Reservations_model.php`, reservation migrations.

### Feature: Table management with capacities
- **Why it matters:** Better seating and demand planning.
- **Persona:** Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Tables.php`, `app/admin/models/Tables_model.php`

---

## 10) Waiter call / valet / table notes / guest service

### Feature: Waiter calls API/table
- **Why it matters:** Faster in-service response.
- **Persona:** Waiter/Service Staff, Customer/Guest
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/routes.php` (`/waiter-call`), `app/admin/models/Waiter_calls_model.php`, migration `2024_01_15_000002_create_waiter_calls_table.php`

### Feature: Valet requests + table notes models
- **Why it matters:** Service personalization and task coordination.
- **Persona:** Waiter/Service Staff
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/models/Valet_requests_model.php`, `Table_notes_model.php`, related migrations
- **Notes:** Need demo proof of full UI usage.

---

## 11) Kitchen display / KDS / kitchen workflows

### Feature: KDS station-based kitchen display
- **Why it matters:** Faster prep with station filtering and status changes.
- **Persona:** Kitchen, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/KitchenDisplay.php`, `app/admin/controllers/KdsStations.php`, `app/admin/models/Kds_stations_model.php`

---

## 12) POS / cash drawer / devices / peripherals

### Feature: POS device/config + inbound POS order webhook
- **Why it matters:** Central order visibility from external POS channels.
- **Persona:** Operations Manager, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/PosDevices.php`, `PosConfigs.php`, `PosWebhookController.php`, models `Pos_*`

### Feature: Cash drawer drivers and logs
- **Why it matters:** Better cash handling control and reconciliation.
- **Persona:** Cashier, Finance/Compliance
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/CashDrawers.php`, `app/admin/services/CashDrawerService/*`, models `Cash_drawers_model.php`, `Cash_drawer_logs_model.php`

---

## 13) Payment methods / providers / orchestration

### Feature: Method/provider compatibility matrix
- **Why it matters:** Prevents impossible combinations in admin setup.
- **Persona:** IT/Admin, Finance/Compliance
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Payments.php`

### Feature: Provider flows (Stripe, PayPal, Worldline, SumUp, Square)
- **Why it matters:** Payment flexibility per restaurant market and contract.
- **Persona:** Owner, Finance/Compliance
- **Confidence:** CONFIRMED_FROM_CODE (code paths exist) / NEEDS_HUMAN_CONFIRMATION (tenant-level go-live status)
- **Evidence:** `app/admin/routes.php` payment endpoints, `app/Services/Payments/Providers/*`, `app/admin/controllers/WebhooksController.php`

---

## 14) Gift cards / tips / wallets / loyalty / coupons

### Feature: Coupons
- **Why it matters:** Promo campaigns and conversion.
- **Persona:** Owner, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Coupons.php`, `app/admin/models/Coupons_model.php`

### Feature: Tips shifts
- **Why it matters:** Shift-level tip handling.
- **Persona:** Finance/Compliance, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Tips.php`, `app/admin/models/Tips_shifts_model.php`

### Feature: Gift cards
- **Why it matters:** Prepaid revenue channel.
- **Persona:** Owner
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/models/GiftCardDesign_model.php`, `GiftCardTransaction_model.php`, migration `2024_12_07_000001_add_gift_card_support.php`
- **Notes:** Need UI/runtime verification before broad sales claims.

### Feature: Wallet payments (Apple/Google)
- **Why it matters:** Faster checkout on mobile.
- **Persona:** Customer/Guest
- **Confidence:** LIKELY_FROM_CODE_STRUCTURE
- **Evidence:** `frontend/app/menu/page.tsx`, `app/admin/controllers/Payments.php`, payment matrix sections in `app/admin/routes.php`

### Feature: Loyalty wallets/points
- **Confidence:** MENTIONED_BUT_NOT_PROVEN
- **Evidence:** No clear dedicated loyalty model/service found.

---

## 15) Customer accounts / groups / CRM-like capabilities

### Feature: Customer records + groups + addresses
- **Why it matters:** Segmenting guests and improving repeat business operations.
- **Persona:** Owner, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Customers.php`, `CustomerGroups.php`, models `Customers_model.php`, `Customer_groups_model.php`, `Addresses_model.php`

---

## 16) Staff / roles / permissions

### Feature: Staff CRUD + roles/groups + permissions framework
- **Why it matters:** Operational control and least-privilege access.
- **Persona:** Owner, Operations Manager, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Staffs.php`, `StaffRoles.php`, `StaffGroups.php`, `app/admin/language/en/lang.php` permissions block

---

## 17) Biometric / attendance / scheduling

### Feature: Biometric device integration + staff auth (card/fingerprint)
- **Why it matters:** Faster staff check-in and secure authentication.
- **Persona:** Operations Manager, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Biometricdevices.php`, `BiometricDevicesAPI.php`, `StaffAuthController.php`, device drivers under `app/admin/services/BiometricDeviceService/Drivers/*`

### Feature: Attendance and schedule models
- **Why it matters:** Workforce planning and payroll inputs.
- **Persona:** Operations Manager, Finance/Compliance
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/models/Staff_attendance_model.php`, `Staff_schedules_model.php`, `Staff_latetimes_model.php`, `Staff_overtimes_model.php`, `Staff_leaves_model.php`

---

## 18) Notifications / messaging / alerts

### Feature: Notifications module + recipients + API endpoints
- **Why it matters:** Faster internal response and task awareness.
- **Persona:** Operations Manager, Waiter, Kitchen
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/Notifications.php`, `NotificationsApiController.php`, `app/admin/models/Notifications_model.php`, `Notification_recipients_model.php`

---

## 19) Reports / dashboard / analytics

### Feature: Admin dashboard widgets/charts/statistics
- **Why it matters:** Quick performance snapshots.
- **Persona:** Owner, Operations Manager
- **Confidence:** LIKELY_FROM_CODE_STRUCTURE
- **Evidence:** `app/admin/dashboardwidgets/statistics`, `app/admin/dashboardwidgets/charts`, `app/admin/controllers/Dashboard.php`

---

## 20) Media / branding / theme / images

### Feature: Media attachment serving + fallback image logic
- **Why it matters:** Menu visuals and brand consistency.
- **Persona:** Customer/Guest, Owner
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `routes/api.php` media/image endpoints, `routes/web.php` `/api/media/{filename}`

### Feature: Theme activation per tenant
- **Why it matters:** Brand-specific storefront presentation.
- **Persona:** Owner
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/SuperAdminController.php`, `themes/*`

---

## 21) API / webhook / integration layer

### Feature: API v1 menu/category/order/table endpoints
- **Why it matters:** Frontend and partner-system integration.
- **Persona:** IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `routes/api.php`, `app/Http/Controllers/Api/*`

### Feature: Stripe/PayPal webhooks
- **Why it matters:** Reliable payment lifecycle updates.
- **Persona:** Finance/Compliance, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/WebhooksController.php`

### Feature: POS and Ready2Order integration hooks
- **Why it matters:** Connects external ordering/payment ops.
- **Persona:** IT/Admin, Operations Manager
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/PosWebhookController.php`, `routes/api_r2o_webhook.php`, `app/Services/R2O/*`

---

## 22) Compliance / tax / receipt / TSE-related items

### Feature: Fiskaly (German fiscalization) config + transaction data fields
- **Why it matters:** Germany compliance pathway.
- **Persona:** Finance/Compliance
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/services/Fiskaly/*`, migrations `2026_03_09_190001_create_fiskaly_configs_table.php`, `2026_03_09_190003_add_fiskaly_columns_to_orders_table.php`

### Feature: Biometric GDPR-oriented services
- **Why it matters:** Data protection posture for sensitive staff data.
- **Persona:** Finance/Compliance, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/services/BiometricDeviceService/GDPRComplianceService.php`
- **Notes:** Legal sufficiency requires legal review.

---

## 23) Superadmin / owner control / cross-tenant management

### Feature: Superadmin login + tenant list/update/delete/status routes
- **Why it matters:** Central management for multi-location/multi-brand rollout.
- **Persona:** Owner, IT/Admin
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `app/admin/controllers/SuperAdminController.php`, `app/admin/routes.php` (`/superadmin/*`, `/tenants/*`)

---

## 24) Localization / multi-language capabilities

### Feature: System language infrastructure in backend
- **Why it matters:** Needed for EU market expansion.
- **Persona:** Owner, IT/Admin
- **Confidence:** LIKELY_FROM_CODE_STRUCTURE
- **Evidence:** `app/system/language/en/*`, language migrations, language views

### Feature: Frontend i18n setup
- **Why it matters:** Guest/admin UX by language.
- **Persona:** Customer/Guest
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/frontend/lib/i18n.ts`, `app/clientLayout.tsx`, `var/www/Landingpage/lib/i18n.ts`

---

## 25) Mobile-readiness / app-like storefront behavior

### Feature: PWA manifest + mobile-focused table/checkout flows
- **Why it matters:** Guests mostly order from phones.
- **Persona:** Customer/Guest
- **Confidence:** CONFIRMED_FROM_CODE
- **Evidence:** `var/www/paymydine/frontend/public/manifest.json`, `frontend/app/layout.tsx` (manifest link), `frontend/app/table/[table_id]/page.tsx`, `frontend/app/menu/page.tsx`

---

## Inventory-level open questions
1. Which payment flows are contractually enabled per launch tenant? (**NEEDS_HUMAN_CONFIRMATION**)  
2. Which compliance mode is in production for each German client (test vs live Fiskaly)? (**NEEDS_HUMAN_CONFIRMATION**)  
3. Which “feature page” claims on Landingpage are marketing-only vs currently live product? (**NEEDS_HUMAN_CONFIRMATION**)
