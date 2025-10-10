# PayMyDine API Inventory

**Last Updated:** 2025-10-09  
**Version:** 1.0  

---

## Overview

This document catalogs all API endpoints in the PayMyDine system, analyzing:
- **Authentication requirements**
- **Input validation**
- **Rate limiting**
- **Tenant scoping**
- **PII handling**
- **Security gaps**

---

## Summary Statistics

| Category | Count | Auth Required | Rate Limited | Validated |
|----------|-------|---------------|--------------|-----------|
| **Public API (v1)** | 20 | ❌ 0/20 | ❌ 0/20 | ⚠️ 12/20 |
| **Admin API** | 8 | ✅ 8/8 | ❌ 0/8 | ⚠️ 6/8 |
| **Superadmin API** | 7 | ✅ 7/7 | ❌ 0/7 | ❌ 2/7 |
| **Payment API (Next.js)** | 8 | ❌ 0/8 | ❌ 0/8 | ⚠️ 5/8 |
| **TOTAL** | 43 | 15/43 (35%) | 0/43 (0%) | 25/43 (58%) |

**Legend:**
- ✅ Implemented
- ⚠️ Partial/Inline
- ❌ Missing

---

## Public API (v1) - `/api/v1/*`

**Base Middleware:** `['cors', 'detect.tenant']`  
**Evidence:** `routes/api.php:122-408`

---

### 1. Health Check

**Endpoint:** `GET /api/health`  
**Evidence:** `routes/api.php:24-31`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ❌ No (global endpoint) |
| **Input Validation** | N/A (no input) |
| **PII Touched** | None |
| **Response Example** | `{"status":"ok","timestamp":"2025-10-09T12:00:00.000000Z","version":"1.0.0"}` |

**Security Gaps:** None (safe endpoint)

---

### 2. Menu Listing

**Endpoint:** `GET /api/v1/menu`  
**Evidence:** `app/Http/Controllers/Api/MenuController.php:14-77`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes (via `detect.tenant`) |
| **Input Validation** | N/A (no input) |
| **PII Touched** | None |
| **DB Access** | `ti_menus`, `ti_categories`, `ti_menu_categories`, `ti_media_attachments` |
| **Response Size** | ⚠️ Unbounded (no pagination) |

**Security Gaps:**
- ❌ **No pagination:** Could return 10,000+ items
- ⚠️ **Raw SQL:** Lines 18-34 (safe but prefer query builder)
- ⚠️ **N+1 query:** Menu options fetched in loop (lines 273-322)

**Recommended Fixes:**
```php
// Add pagination
Route::get('/menu', [MenuController::class, 'index'])->middleware('throttle:60,1');

// In controller
public function index(Request $request) {
    $perPage = $request->get('per_page', 20);
    $items = DB::table('menus')->where('menu_status', 1)->paginate($perPage);
    // ...
}
```

---

### 3. Menu Items

**Endpoint:** `GET /api/v1/menu/items`  
**Evidence:** `app/Http/Controllers/Api/MenuController.php:82-143`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Inline (`category_id`, `search`) |
| **PII Touched** | None |
| **DB Access** | `ti_menus`, `ti_menu_categories`, `ti_categories` |

**Security Gaps:**
- ❌ **SQL Injection risk:** `search` parameter not escaped (line 111)
- ❌ **No pagination**

**Recommended Fixes:**
```php
// Add validation
$request->validate([
    'category_id' => 'nullable|integer|exists:categories,category_id',
    'search' => 'nullable|string|max:100',
]);

// Escape search
$query->where('menus.menu_name', 'like', '%'.DB::connection()->getPdo()->quote($search).'%');
```

---

### 4. Items by Category

**Endpoint:** `GET /api/v1/menu/categories/{categoryId}/items`  
**Evidence:** `app/Http/Controllers/Api/MenuController.php:148-211`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ✅ Yes (route parameter) |
| **PII Touched** | None |
| **DB Access** | `ti_menus`, `ti_menu_categories`, `ti_categories` |

**Security Gaps:**
- ❌ **No pagination**

---

### 5. Table Menu

**Endpoint:** `GET /api/v1/table-menu?table_id=X`  
**Evidence:** `app/Http/Controllers/Api/MenuController.php:216-268`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Inline (line 219) |
| **PII Touched** | None |
| **DB Access** | `ti_tables`, `ti_menus`, `ti_categories` |

**Security Gaps:**
- ❌ **No validation:** `table_id` could be SQL injection attempt
- ⚠️ **IDOR:** Any client can access any table's menu

**Recommended Fixes:**
```php
$request->validate(['table_id' => 'required|integer|exists:tables,table_id']);
```

---

### 6. Create Order

**Endpoint:** `POST /api/v1/orders`  
**Evidence:** `app/Http/Controllers/Api/OrderController.php:16-164`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ✅ Yes (lines 18-34) |
| **PII Touched** | ✅ `customer_name`, `customer_email`, `customer_phone` |
| **DB Access** | `ti_orders`, `ti_order_menus`, `ti_order_totals`, `ti_menus` |
| **Transaction** | ✅ Yes (lines 44, 125) |

**Security Gaps:**
- 🔴 **CRITICAL: Race condition** (line 47) - `generateOrderNumber()` uses `max('order_id') + 1`
- ❌ **No rate limiting:** Could spam fake orders
- ⚠️ **No CAPTCHA:** Bots can place orders
- ⚠️ **No email verification:** Fake emails accepted
- ⚠️ **PII logged:** Customer info may be in logs (line 161)
- ⚠️ **Weak validation:** `customer_email` nullable (line 20)

**Recommended Fixes:**
```diff
--- a/app/Http/Controllers/Api/OrderController.php
+++ b/app/Http/Controllers/Api/OrderController.php
@@ -16,7 +16,7 @@ class OrderController extends Controller
     public function store(Request $request)
     {
         $validator = Validator::make($request->all(), [
-            'customer_name' => 'required|string|max:255',
+            'customer_name' => 'required|string|max:255|regex:/^[a-zA-Z\s]+$/',
-            'customer_email' => 'nullable|email',
+            'customer_email' => 'required|email|max:255',
-            'customer_phone' => 'nullable|string|max:20',
+            'customer_phone' => 'required|string|regex:/^\+?[0-9]{10,15}$/',
@@ -44,7 +44,8 @@ class OrderController extends Controller
             DB::beginTransaction();
 
             // Generate order number
-            $orderNumber = $this->generateOrderNumber();
+            // Use UUID to avoid race conditions
+            $orderNumber = (string) Str::uuid();
 
@@ -329,8 +330,7 @@ class OrderController extends Controller
     private function generateOrderNumber()
     {
         $prefix = config('app.order_prefix', '#');
-        $number = DB::table('orders')->max('order_id') + 1;
-        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
+        return $prefix . time() . '-' . mt_rand(1000, 9999);
     }
```

**Additional Hardening:**
```php
// Add rate limiting
Route::post('/orders', [OrderController::class, 'store'])
    ->middleware('throttle:5,1'); // 5 orders per minute per IP

// Add CAPTCHA verification (Google reCAPTCHA)
$validator->after(function ($validator) use ($request) {
    if (!$this->verifyCaptcha($request->input('captcha_token'))) {
        $validator->errors()->add('captcha', 'CAPTCHA verification failed');
    }
});
```

---

### 7. Get Order

**Endpoint:** `GET /api/v1/orders/{orderId}`  
**Evidence:** `app/Http/Controllers/Api/OrderController.php:169-238`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Route parameter only |
| **PII Touched** | ✅ Returns customer email, phone, name |
| **DB Access** | `ti_orders`, `ti_order_menus`, `ti_tables`, `ti_statuses` |

**Security Gaps:**
- 🔴 **CRITICAL: IDOR (Insecure Direct Object Reference)** - Any user can view any order's PII
- ❌ **No authorization:** Should verify customer owns order (via session or token)

**Recommended Fixes:**
```php
// Add order token validation
public function show(Request $request, $orderId)
{
    $orderToken = $request->get('token') ?? $request->bearerToken();
    
    $order = DB::table('orders')
        ->where('order_id', $orderId)
        ->where('order_token', $orderToken) // Add token column
        ->first();
    
    if (!$order) {
        return response()->json(['error' => 'Order not found or invalid token'], 404);
    }
    // ...
}
```

---

### 8. Update Order

**Endpoint:** `PATCH /api/v1/orders/{orderId}`  
**Evidence:** `app/Http/Controllers/Api/OrderController.php:243-278`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ✅ Yes (lines 245-247) |
| **PII Touched** | None (only updates status) |
| **DB Access** | `ti_orders` |

**Security Gaps:**
- 🔴 **CRITICAL: Unauthorized status changes** - Anyone can mark orders as delivered/cancelled
- ❌ **No audit log:** Status changes not logged
- ❌ **No state machine:** Can set invalid transitions (e.g., delivered → pending)

**Recommended Fixes:**
```php
// Add authentication
Route::patch('/orders/{orderId}', [OrderController::class, 'update'])
    ->middleware('auth:sanctum'); // Laravel Sanctum for API tokens

// Add state machine validation
private $allowedTransitions = [
    1 => [2, 6], // pending → confirmed, cancelled
    2 => [3, 6], // confirmed → preparing, cancelled
    3 => [4],    // preparing → ready
    4 => [5],    // ready → delivered
];

public function update(Request $request, $orderId) {
    $currentStatus = DB::table('orders')->where('order_id', $orderId)->value('status_id');
    $newStatus = $request->status_id;
    
    if (!in_array($newStatus, $this->allowedTransitions[$currentStatus] ?? [])) {
        return response()->json(['error' => 'Invalid status transition'], 400);
    }
    // ...
}
```

---

### 9. List Orders

**Endpoint:** `GET /api/v1/orders`  
**Evidence:** `app/Http/Controllers/Api/OrderController.php:283-325`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Inline (`status_id`, `date`) |
| **PII Touched** | ✅ Returns all customers' PII |
| **DB Access** | `ti_orders`, `ti_tables`, `ti_statuses` |
| **Pagination** | ✅ Yes (20 per page) |

**Security Gaps:**
- 🔴 **CRITICAL: Mass PII exposure** - Anyone can list all orders
- ❌ **Should be admin-only endpoint**

**Recommended Fixes:**
```php
Route::get('/orders', [OrderController::class, 'index'])
    ->middleware('auth:sanctum', 'role:admin,manager');
```

---

### 10. Get Order Status

**Endpoint:** `GET /api/v1/order-status?order_id=X`  
**Evidence:** `app/Http/Controllers/Api/OrderController.php:340-393`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Inline (line 342) |
| **PII Touched** | None (returns status only) |
| **DB Access** | `ti_orders`, `ti_statuses` |

**Security Gaps:**
- ⚠️ **IDOR:** Can check status of any order (less critical than #7)
- ❌ **No validation:** `order_id` not validated as integer

**Recommended Fixes:**
```php
$request->validate(['order_id' => 'required|integer|exists:orders,order_id']);
```

---

### 11. Update Order Status (Duplicate?)

**Endpoint:** `POST /api/v1/order-status`  
**Evidence:** `routes.php:788-832`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ✅ Yes (lines 789-792) |
| **PII Touched** | None |
| **DB Access** | `ti_orders` |

**⚠️ DUPLICATE:** Same functionality as `PATCH /api/v1/orders/{orderId}` (#8)

**Security Gaps:**
- Same as #8
- ❌ **Should be removed** (use PATCH endpoint instead)

---

### 12. Tables List

**Endpoint:** `GET /api/v1/tables`  
**Evidence:** `app/Http/Controllers/Api/TableController.php:14-40`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | N/A |
| **PII Touched** | None |
| **DB Access** | `ti_tables` |

**Security Gaps:** None (public info)

---

### 13. Get Table by QR Code

**Endpoint:** `GET /api/v1/tables/{qrCode}`  
**Evidence:** `app/Http/Controllers/Api/TableController.php:45-104`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Route parameter (no sanitization) |
| **PII Touched** | None |
| **DB Access** | `ti_tables`, `ti_locations` |

**Security Gaps:**
- ⚠️ **SQL Injection risk:** QR code not validated (lines 50-67)
- ⚠️ **IDOR:** Can enumerate all tables

**Recommended Fixes:**
```php
// Validate QR code format
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $qrCode)) {
    return response()->json(['error' => 'Invalid QR code format'], 400);
}
```

---

### 14. Get Table Info

**Endpoint:** `GET /api/v1/table-info?table_id=X`  
**Evidence:** `app/Http/Controllers/Api/TableController.php:144-204`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Inline (line 150) |
| **PII Touched** | None |
| **DB Access** | `ti_tables`, `ti_locations` |

**Security Gaps:**
- ❌ **Raw SQL:** `whereRaw($whereClause, [$param])` (line 170)
- ⚠️ **Accepts multiple input types:** Confusing API design

**Recommended Fixes:**
```php
$request->validate([
    'table_id' => 'required_without:table_no,qr_code|integer',
    'table_no' => 'required_without:table_id,qr_code|integer',
    'qr_code' => 'required_without:table_id,table_no|string|max:50',
]);
```

---

### 15-17. Waiter Call, Valet Request, Table Notes

**Endpoints:**
- `POST /api/v1/waiter-call`
- `POST /api/v1/valet-request`
- `POST /api/v1/table-notes`

**Evidence:** `routes/api.php:199-407`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ✅ Built-in (5/hour per table, line 40-52 in NotificationHelper) |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ✅ Yes (inline) |
| **PII Touched** | ⚠️ Customer name, license plate (valet) |
| **DB Access** | `ti_waiter_calls`, `ti_valet_requests`, `ti_table_notes`, `ti_notifications` |
| **Transaction** | ✅ Yes |

**Security Gaps:**
- ❌ **No CAPTCHA:** Bots can spam notifications
- ⚠️ **PII in notifications:** License plates stored (valet)
- ⚠️ **No validation:** Table existence checked but not validated (line 224)

**Recommended Fixes:**
```php
// Add CAPTCHA
Route::post('/waiter-call', function(Request $request) {
    if (!verifyCaptcha($request->captcha_token)) {
        return response()->json(['error' => 'CAPTCHA failed'], 400);
    }
    // ...
})->middleware('throttle:10,1'); // 10 per minute per IP
```

---

### 18. Restaurant Info

**Endpoint:** `GET /api/v1/restaurant`  
**Evidence:** `routes/api.php:166-183`, `routes.php:522-548`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | N/A |
| **PII Touched** | ⚠️ Restaurant email, phone |
| **DB Access** | `ti_locations` |

**Security Gaps:** None (public business info)

---

### 19. Settings

**Endpoint:** `GET /api/v1/settings`  
**Evidence:** `routes/api.php:186-197`, `routes.php:551-575`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | N/A |
| **PII Touched** | None |
| **DB Access** | `ti_settings` |

**Security Gaps:**
- ⚠️ **Information disclosure:** Exposes internal settings (order prefix, guest settings)

---

### 20. Categories

**Endpoint:** `GET /api/v1/categories`  
**Evidence:** `routes.php:454-481`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | N/A |
| **PII Touched** | None |
| **DB Access** | `ti_categories` |

**Security Gaps:** None

---

## Admin API - `/admin/*`

**Base Middleware:** `['web', 'AdminAuthenticate']`  
**Evidence:** `routes.php:922-927`

---

### 21. Notifications Count

**Endpoint:** `GET /admin/notifications-api/count`  
**Evidence:** `routes.php:1062`

| Property | Value |
|----------|-------|
| **Authentication** | ✅ Yes (AdminAuthenticate) |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | N/A |
| **PII Touched** | None |
| **Controller** | `Admin\Controllers\NotificationsApi::count` |

**Security Gaps:**
- ⚠️ **Polling-based:** Should use WebSockets or SSE

---

### 22. Notifications List

**Endpoint:** `GET /admin/notifications-api/`  
**Evidence:** `routes.php:1063`

| Property | Value |
|----------|-------|
| **Authentication** | ✅ Yes |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | N/A |
| **PII Touched** | ⚠️ Customer names, table info |

**Security Gaps:** None (admin-only)

---

### 23. Update Notification

**Endpoint:** `PATCH /admin/notifications-api/{id}`  
**Evidence:** `routes.php:1064`

| Property | Value |
|----------|-------|
| **Authentication** | ✅ Yes |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **Input Validation** | ⚠️ Unknown (controller not read) |

---

### 24. Mark All Seen

**Endpoint:** `PATCH /admin/notifications-api/mark-all-seen`  
**Evidence:** `routes.php:1065`

| Property | Value |
|----------|-------|
| **Authentication** | ✅ Yes |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |

---

### 25. Get Table Statuses

**Endpoint:** `GET /admin/orders/get-table-statuses`  
**Evidence:** `routes.php:117-155`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ No (should have!) |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ✅ Yes |
| **DB Access** | `ti_orders`, `ti_statuses`, `ti_tables` |

**⚠️ SECURITY ISSUE:** Admin endpoint without authentication middleware!

---

### 26. Get Cashier URL

**Endpoint:** `GET /admin/orders/get-cashier-url`  
**Evidence:** `routes.php:158-178`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ No (should have!) |
| **Rate Limiting** | ❌ None |

**⚠️ SECURITY ISSUE:** Admin endpoint without authentication middleware!

---

### 27. Storefront URL (Redirect)

**Endpoint:** `GET /admin/storefront-url`  
**Evidence:** `routes.php:181-196`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ No (should have!) |

**⚠️ SECURITY ISSUE:** Admin endpoint without authentication middleware!

---

### 28. Save Table Layout

**Endpoint:** `POST /admin/orders/save-table-layout`  
**Evidence:** `routes.php:265-291`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ No (should have!) |
| **Rate Limiting** | ❌ None |
| **Input Validation** | ⚠️ Inline (lines 267-273) |

**⚠️ SECURITY ISSUE:** Admin endpoint without authentication middleware!

---

## Superadmin API - `/superadmin/*`, `/new/*`, `/tenants/*`

**Base Middleware:** `['superadmin.auth']` (some routes)  
**Evidence:** `routes.php:209-260`

---

### 29. Superadmin Login

**Endpoint:** `GET /superadmin/login`  
**Evidence:** `routes.php:236-238`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None (login page) |
| **Rate Limiting** | ❌ None ⚠️ BRUTE FORCE RISK |

**Security Gaps:**
- 🔴 **CRITICAL: No rate limiting** - Vulnerable to brute force
- ❌ **No CAPTCHA**

---

### 30. Superadmin Sign In

**Endpoint:** `POST /superadmin/sign`  
**Evidence:** `routes.php:241-242`

| Property | Value |
|----------|-------|
| **Authentication** | N/A (authenticates user) |
| **Rate Limiting** | ❌ None ⚠️ BRUTE FORCE RISK |
| **Input Validation** | ⚠️ Unknown (controller not read) |

**Security Gaps:**
- 🔴 **CRITICAL: No rate limiting**
- ❌ **No CAPTCHA**
- ❌ **No account lockout**

**Recommended Fixes:**
```php
Route::post('/superadmin/sign', [SuperAdminController::class, 'sign'])
    ->middleware('throttle:5,1'); // 5 attempts per minute

// In controller
if (RateLimiter::tooManyAttempts('login:' . $request->ip(), 5)) {
    return back()->withErrors(['Too many login attempts. Try again in 5 minutes.']);
}
```

---

### 31. Create Tenant

**Endpoint:** `POST /new/store`  
**Evidence:** `routes.php:225-227`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ Should have (bypasses TenantDatabaseMiddleware) |
| **Rate Limiting** | ❌ None |
| **Input Validation** | ⚠️ Unknown |
| **PII Touched** | ✅ Business info, DB credentials |

**Security Gaps:**
- 🔴 **CRITICAL: Accepts raw DB credentials** - Tenant could specify malicious host
- ❌ **No validation:** Tenant could point to existing tenant's DB

**Recommended Fixes:**
```php
// Don't accept DB credentials from user
// Generate secure credentials and create DB via internal process
public function store(Request $request) {
    $request->validate([
        'name' => 'required|string|max:255',
        'domain' => 'required|string|regex:/^[a-z0-9-]+$/|unique:tenants,domain',
    ]);
    
    // Generate secure credentials
    $dbName = 'tenant_' . Str::random(16);
    $dbUser = 'user_' . Str::random(16);
    $dbPass = Str::random(32);
    
    // Create database (via privileged connection)
    DB::connection('root')->statement("CREATE DATABASE `{$dbName}`");
    DB::connection('root')->statement("CREATE USER '{$dbUser}'@'localhost' IDENTIFIED BY '{$dbPass}'");
    DB::connection('root')->statement("GRANT ALL ON `{$dbName}`.* TO '{$dbUser}'@'localhost'");
    
    // Store tenant
    DB::connection('mysql')->table('tenants')->insert([
        'domain' => $request->domain . '.paymydine.com',
        'database' => $dbName,
        'db_user' => $dbUser,
        'db_pass' => encrypt($dbPass), // Encrypt credentials
        'status' => 'active',
    ]);
}
```

---

### 32-34. Update/Delete Tenant

**Endpoints:**
- `POST /tenants/update`
- `GET /tenants/delete/{id}`
- `POST /tenant/update-status`

**Evidence:** `routes.php:229-260`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ Should have (bypasses TenantDatabaseMiddleware) |
| **Rate Limiting** | ❌ None |
| **Input Validation** | ⚠️ Unknown |

**Security Gaps:**
- 🔴 **CRITICAL: Tenant deletion uses GET** - CSRF vulnerable
- ❌ **No confirmation:** Accidental deletion possible
- ⚠️ **No audit log:** Tenant changes not logged

---

### 35. Superadmin Settings

**Endpoint:** `GET /superadmin/settings`  
**Evidence:** `routes.php:219-222`

| Property | Value |
|----------|-------|
| **Authentication** | ✅ Yes (`superadmin.auth`) |

---

### 36. Update Settings

**Endpoint:** `POST /superadmin/settings/update`  
**Evidence:** `routes.php:247-248`

| Property | Value |
|----------|-------|
| **Authentication** | ⚠️ Bypasses TenantDatabaseMiddleware |
| **Input Validation** | ⚠️ Unknown |

---

## Payment API (Next.js) - `/api/payments/*`

**Framework:** Next.js Route Handlers  
**Evidence:** `frontend/app/api/payments/`

---

### 37. Create Stripe Intent

**Endpoint:** `POST /api/payments/create-intent`  
**Evidence:** `frontend/app/api/payments/create-intent/route.ts:12-96`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Tenant Scoping** | ⚠️ Via `restaurantId` parameter (not enforced) |
| **Input Validation** | ⚠️ Minimal (lines 23-37) |
| **PII Touched** | ✅ Customer email, name |
| **External API** | Stripe API |

**Security Gaps:**
- 🔴 **CRITICAL: No idempotency key** - Duplicate charges possible
- ❌ **No webhook signature verification** - Fake payment events possible
- ⚠️ **Hardcoded platform fee:** 3% (line 49) - should be configurable
- ❌ **No amount validation:** Client controls amount (could charge $0.01)
- ⚠️ **Mock restaurant account:** Line 89-96 (hardcoded)

**Recommended Fixes:**
```typescript
export async function POST(request: NextRequest) {
    // Add idempotency key
    const idempotencyKey = request.headers.get('Idempotency-Key') 
        || `${Date.now()}-${Math.random()}`;
    
    // Validate amount on backend (don't trust client)
    const calculatedAmount = await calculateOrderTotal(body.items, body.restaurantId);
    if (Math.abs(calculatedAmount - body.amount) > 0.01) {
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }
    
    // Create payment intent with idempotency
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(calculatedAmount * 100),
        // ...
    }, {
        idempotencyKey,
    });
    // ...
}
```

---

### 38. Process Cash Payment

**Endpoint:** `POST /api/payments/process-cash`  
**Evidence:** `frontend/lib/payment-service.ts:441-464`

| Property | Value |
|----------|-------|
| **Authentication** | ❌ None |
| **Rate Limiting** | ❌ None |
| **Input Validation** | ⚠️ Client-side only |

**Security Gaps:**
- ⚠️ **No verification:** Anyone can mark order as "paid by cash"
- ❌ **No staff confirmation:** Should require waiter approval

---

### 39-42. Apple Pay, Google Pay, PayPal

**Endpoints:**
- `POST /api/payments/validate-apple-pay`
- `POST /api/payments/process-apple-pay`
- `POST /api/payments/process-google-pay`
- `POST /api/payments/create-paypal-order`
- `POST /api/payments/capture-paypal-order`

**Evidence:** `frontend/app/api/payments/` (files exist, content not read)

| Property | Value |
|----------|-------|
| **Authentication** | ❌ Likely none |
| **Rate Limiting** | ❌ None |
| **Input Validation** | ⚠️ Unknown |

**Assumed Security Gaps:**
- Same issues as Stripe endpoint (#37)

---

### 43. Process Payment (Generic)

**Endpoint:** `POST /api/process-payment`  
**Evidence:** `frontend/app/api/process-payment/route.ts` (file exists, content not read)

| Property | Value |
|----------|-------|
| **Authentication** | ❌ Likely none |

---

## Summary of Critical Issues

### 🔴 CRITICAL (Fix Immediately)

1. **Order ID Race Condition** (#6)
   - **Impact:** Data corruption, order overwrites
   - **Fix:** Use UUID or database sequence
   - **Files:** `app/Http/Controllers/Api/OrderController.php:333`

2. **IDOR: View Any Order** (#7)
   - **Impact:** PII exposure (email, phone, name)
   - **Fix:** Add order token validation
   - **Files:** `app/Http/Controllers/Api/OrderController.php:169-238`

3. **IDOR: Update Any Order** (#8)
   - **Impact:** Unauthorized status changes, order cancellation
   - **Fix:** Add authentication + state machine
   - **Files:** `app/Http/Controllers/Api/OrderController.php:243-278`

4. **Mass PII Exposure** (#9)
   - **Impact:** All customers' PII accessible to anyone
   - **Fix:** Require admin authentication
   - **Files:** `app/Http/Controllers/Api/OrderController.php:283-325`

5. **Tenant Creation Accepts Raw DB Credentials** (#31)
   - **Impact:** Cross-tenant data access, privilege escalation
   - **Fix:** Generate credentials server-side
   - **Files:** `routes.php:225-227`

6. **No Webhook Signature Verification** (#37)
   - **Impact:** Fake payment confirmations, fraud
   - **Fix:** Verify Stripe webhook signatures
   - **Files:** `frontend/app/api/payments/create-intent/route.ts`

7. **No Idempotency for Payments** (#37)
   - **Impact:** Duplicate charges
   - **Fix:** Add idempotency keys
   - **Files:** `frontend/app/api/payments/create-intent/route.ts:52`

8. **Admin Endpoints Without Auth** (#25-28)
   - **Impact:** Unauthorized access to admin functions
   - **Fix:** Add `AdminAuthenticate` middleware
   - **Files:** `routes.php:117-355`

---

### 🟠 HIGH (Fix Soon)

9. **No Rate Limiting Anywhere** (All endpoints)
   - **Impact:** DDoS, API abuse, brute force
   - **Fix:** Add throttle middleware (60/min for reads, 10/min for writes)

10. **CORS Allows All Origins** (All endpoints)
    - **Impact:** CSRF attacks
    - **Fix:** Restrict to frontend domain
    - **Files:** `app/Http/Middleware/CorsMiddleware.php:22`

11. **Superadmin Login No Rate Limit** (#29-30)
    - **Impact:** Brute force attacks
    - **Fix:** Add throttle + CAPTCHA
    - **Files:** `routes.php:236-242`

12. **Tenant Deletion via GET** (#33)
    - **Impact:** CSRF-based tenant deletion
    - **Fix:** Use DELETE method + CSRF token
    - **Files:** `routes.php:233-234`

---

### 🟡 MEDIUM (Fix When Possible)

13. **No Input Sanitization** (Multiple endpoints)
    - **Impact:** SQL injection, XSS
    - **Fix:** Use Laravel Form Requests

14. **No Pagination** (#2-5)
    - **Impact:** Memory exhaustion, slow responses
    - **Fix:** Add pagination (20-100 per page)

15. **N+1 Queries** (#2)
    - **Impact:** Slow responses
    - **Fix:** Eager load menu options

16. **No CSRF Protection** (All POST endpoints)
    - **Impact:** CSRF attacks (mitigated by token auth if added)
    - **Fix:** Enable CSRF middleware for session-based routes

---

## Recommended Middleware Stack

```php
// routes/api.php
Route::group([
    'prefix' => 'v1',
    'middleware' => ['cors', 'detect.tenant', 'throttle:60,1', 'sanitize']
], function () {
    
    // Public endpoints (read-only)
    Route::get('/menu', [MenuController::class, 'index']);
    Route::get('/tables', [TableController::class, 'index']);
    Route::get('/restaurant', [RestaurantController::class, 'info']);
    
    // Write endpoints (require token or CAPTCHA)
    Route::middleware(['captcha'])->group(function () {
        Route::post('/orders', [OrderController::class, 'store'])
            ->middleware('throttle:5,1'); // Stricter limit
        Route::post('/waiter-call', [NotificationController::class, 'waiterCall']);
    });
    
    // Admin endpoints (require authentication)
    Route::middleware(['auth:sanctum', 'role:admin,manager'])->group(function () {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::patch('/orders/{id}', [OrderController::class, 'update']);
    });
});
```

---

## Testing Checklist

### Authentication Tests
- [ ] Access protected endpoints without token → 401
- [ ] Access with expired token → 401
- [ ] Access with invalid token → 401
- [ ] Access with token from different tenant → 403

### Rate Limiting Tests
- [ ] 61 requests in 1 minute → 429
- [ ] 6 orders in 1 minute → 429
- [ ] Rate limit resets after 1 minute

### Tenant Isolation Tests
- [ ] Tenant A cannot access Tenant B's orders
- [ ] Tenant A cannot access Tenant B's menu
- [ ] Subdomain switching correctly routes to tenant DB

### Input Validation Tests
- [ ] SQL injection attempts → 400/422
- [ ] XSS attempts → Escaped in response
- [ ] Invalid email format → 422
- [ ] Missing required fields → 422

### Payment Tests
- [ ] Duplicate payment intent requests with same idempotency key → Same response
- [ ] Webhook with invalid signature → 401
- [ ] Payment amount mismatch (client vs server) → 400
- [ ] Expired payment intent → Error

---

## Monitoring Recommendations

1. **API Rate Limiting:**
   - Alert on 429 errors > 100/min (potential DDoS)

2. **Authentication Failures:**
   - Alert on 401 errors > 50/min (brute force attempt)

3. **Payment Failures:**
   - Alert on payment_intent.failed > 5% of total
   - Alert on webhook signature failures

4. **Tenant Isolation:**
   - Log all tenant switches
   - Alert on unexpected DB connections

5. **PII Access:**
   - Log all order retrievals
   - Alert on bulk order exports

---

## Next Steps

1. **Apply patches** in `patches/` directory
2. **Add authentication** (Laravel Sanctum)
3. **Add rate limiting** (Laravel throttle middleware)
4. **Restrict CORS** (Whitelist frontend domain)
5. **Add webhook handlers** (Stripe signatures)
6. **Write tests** (PHPUnit + Pest)
7. **Set up monitoring** (Sentry, Datadog)

---

**End of API_INVENTORY.md**

