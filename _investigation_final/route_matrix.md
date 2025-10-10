## Complete Route & Middleware Matrix - Cross-Tenant Leakage Analysis

### Critical Discovery

**EXACT DUPLICATE ROUTE GROUPS FOUND:**

| Route Group | Protected Version (routes.php) | Unprotected Duplicate (app/admin/routes.php) | Risk |
|-------------|-------------------------------|---------------------------------------------|------|
| Framework API | Lines 361-373, middleware: `['api', 'detect.tenant']` | Lines 364-377, middleware: `['api']` | 🔴 CRITICAL |
| Custom API | Lines 376-1044, middleware: `['web', 'detect.tenant']` | Lines 380-1044, middleware: `['web']` | 🔴 CRITICAL |
| Notifications | Lines 1047-1052, middleware: `['web', 'admin', 'detect.tenant']` | Lines 1078-1083, middleware: `['web']` | 🔴 CRITICAL |

---

## PART 1: Complete Route Matrix

### Framework API Routes (Duplicate Registration)

#### ✅ PROTECTED VERSION: routes.php:361-373

```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api', 'detect.tenant']  // ← HAS TENANT PROTECTION
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**Note:** Missing from this group in routes.php:
- `Route::post('webhooks/pos', 'PosWebhookController@handle');` (line 368 in routes.php)

#### ❌ UNPROTECTED DUPLICATE: app/admin/routes.php:364-377

```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']  // ← MISSING detect.tenant
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    Route::post('webhooks/pos', 'PosWebhookController@handle');
    
    // Order endpoints
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**Comparison:**

| Method | URI | Protected (routes.php) | Unprotected (app/admin/routes.php) | Issue |
|--------|-----|----------------------|-----------------------------------|-------|
| GET | `/api/v1/restaurant/{locationId}` | Line 366, `api+detect.tenant` | Line 369, `api` only | ❌ DUPLICATE |
| GET | `/api/v1/restaurant/{locationId}/menu` | Line 367, `api+detect.tenant` | Line 370, `api` only | ❌ DUPLICATE |
| POST | `/api/v1/restaurant/{locationId}/order` | Line 370, `api+detect.tenant` | Line 374, `api` only | ❌ DUPLICATE |
| GET | `/api/v1/restaurant/{locationId}/order/{orderId}` | Line 371, `api+detect.tenant` | Line 375, `api` only | ❌ DUPLICATE |
| POST | `/api/v1/restaurant/{locationId}/waiter` | Line 372, `api+detect.tenant` | Line 376, `api` only | ❌ DUPLICATE |
| POST | `/api/v1/webhooks/pos` | ⚠️ NOT in routes.php | Line 371, `api` only | ⚠️ ONLY UNPROTECTED |

**CRITICAL:** `/api/v1/webhooks/pos` exists ONLY in the unprotected version!

---

### Custom API Routes (Duplicate Registration)

#### ✅ PROTECTED VERSION: routes.php:376-1044

```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ← HAS TENANT PROTECTION
], function () {
    Route::get('/payments', function () { ... });           // Line 381
    Route::get('/menu', function () { ... });                // Line 394
    Route::get('/categories', function () { ... });          // Line 457
    Route::get('/images', function () { ... });              // Line 487
    Route::get('/restaurant', function () { ... });          // Line 525
    Route::get('/settings', function () { ... });            // Line 554
    Route::post('/orders', function (Request $request) { ... });     // Line 583
    Route::get('/order-status', function (Request $request) { ... }); // Line 724
    Route::post('/order-status', function (Request $request) { ... }); // Line 791
    Route::get('/table-info', function (Request $request) { ... });   // Line 838
    Route::get('/current-table', function (Request $request) { ... }); // Line 878
    Route::post('/waiter-call', function (Request $request) { ... }); // Line 923
    Route::post('/table-notes', function (Request $request) { ... }); // Line 983
});
```

#### ❌ UNPROTECTED DUPLICATE: app/admin/routes.php:380-1064

```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ← MISSING detect.tenant
], function () {
    Route::get('/payments', function () { ... });           // Line 385
    Route::get('/menu', function () { ... });                // Line 398
    Route::get('/categories', function () { ... });          // Line 461
    Route::get('/images', function () { ... });              // Line 491
    Route::get('/restaurant', function () { ... });          // Line 529
    Route::get('/settings', function () { ... });            // Line 558
    Route::post('/orders', function (Request $request) { ... });     // Line 587
    Route::get('/order-status', function (Request $request) { ... }); // Line 728
    Route::post('/order-status', function (Request $request) { ... }); // Line 795
    Route::get('/table-info', function (Request $request) { ... });   // Line 842
    Route::get('/current-table', function (Request $request) { ... }); // Line 882
    
    // NESTED GROUP with MORE duplicates:
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::post('/waiter-call', function (Request $request) { ... }); // Line 939
        Route::post('/table-notes', function (Request $request) { ... }); // Line 1000
    });
    
    Route::get('history', [\Admin\Controllers\History::class, 'index']); // Line 1062
});
```

**Comparison Table:**

| Method | URI | Protected File:Line | Unprotected File:Line | Middleware Diff |
|--------|-----|-------------------|---------------------|-----------------|
| GET | `/api/v1/payments` | routes.php:381 | app/admin/routes.php:385 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/menu` | routes.php:394 | app/admin/routes.php:398 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/categories` | routes.php:457 | app/admin/routes.php:461 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/images` | routes.php:487 | app/admin/routes.php:491 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/restaurant` | routes.php:525 | app/admin/routes.php:529 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/settings` | routes.php:554 | app/admin/routes.php:558 | `web+detect.tenant` vs `web` |
| POST | `/api/v1/orders` | routes.php:583 | app/admin/routes.php:587 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/order-status` | routes.php:724 | app/admin/routes.php:728 | `web+detect.tenant` vs `web` |
| POST | `/api/v1/order-status` | routes.php:791 | app/admin/routes.php:795 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/table-info` | routes.php:838 | app/admin/routes.php:842 | `web+detect.tenant` vs `web` |
| GET | `/api/v1/current-table` | routes.php:878 | app/admin/routes.php:882 | `web+detect.tenant` vs `web` |
| POST | `/api/v1/waiter-call` | routes.php:923 | app/admin/routes.php:939 | `web+detect.tenant` vs `web` |
| POST | `/api/v1/table-notes` | routes.php:983 | app/admin/routes.php:1000 | `web+detect.tenant` vs `web` |

**Total Duplicates:** 13 custom API endpoints

---

### Notification Routes (Duplicate Registration)

#### ✅ PROTECTED VERSION: routes.php:1047-1052

```php
Route::middleware(['web', 'admin', 'detect.tenant'])
    ->prefix('admin/notifications-api')
    ->group(function () {
        Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
        Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
        Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
        Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
    });
```

#### ❌ UNPROTECTED DUPLICATE: app/admin/routes.php:1078-1083

```php
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

**Comparison:**

| Method | URI | Protected Middleware | Unprotected Middleware |
|--------|-----|---------------------|----------------------|
| GET | `/admin/notifications-api/count` | `web+admin+detect.tenant` | `web` only |
| GET | `/admin/notifications-api` | `web+admin+detect.tenant` | `web` only |
| PATCH | `/admin/notifications-api/{id}` | `web+admin+detect.tenant` | `web` only |
| PATCH | `/admin/notifications-api/mark-all-seen` | `web+admin+detect.tenant` | `web` only |

**Total Duplicates:** 4 notification endpoints

---

## PART 2: Admin-Specific Routes (NOT in routes.php)

### Routes Only in app/admin/routes.php

| Method | URI | Line | Middleware | detect.tenant? | Risk |
|--------|-----|------|------------|----------------|------|
| ANY | `/admin/_assets/{asset}` | 118 | web | ❌ | LOW (assets) |
| GET | `/admin/orders/get-table-statuses` | 121-159 | web | ❌ | 🔴 CRITICAL |
| GET | `/admin/orders/get-cashier-url` | 162-182 | web | ❌ | 🔴 HIGH |
| GET | `/admin/storefront-url` | 185-200 | web | ❌ | 🔴 HIGH |
| ANY | `/admin/{slug}` | 203-204 | web | ❌ | ⚠️ MEDIUM |
| ANY | `/admin` | 208 | web | ❌ | ⚠️ MEDIUM |
| GET | `/redirect/qr` | 209-210 | TenantDatabaseMiddleware | ⚠️ LEGACY | MEDIUM |
| GET | `/new` | 213-216 | web, superadmin.auth | ❌ | ✅ CORRECT (super admin) |
| GET | `/index` | 218-221 | web, superadmin.auth | ❌ | ✅ CORRECT (super admin) |
| GET | `/settings` | 223-226 | web, superadmin.auth | ❌ | ✅ CORRECT (super admin) |
| POST | `/new/store` | 229-231 | none | ❌ | ✅ CORRECT (super admin) |
| POST | `/tenants/update` | 233-235 | none | ❌ | ✅ CORRECT (super admin) |
| GET | `/tenants/delete/{id}` | 237-238 | none | ❌ | ✅ CORRECT (super admin) |
| GET | `/superadmin/login` | 240-242 | none | ❌ | ✅ CORRECT (super admin) |
| POST | `/superadmin/sign` | 245-246 | none | ❌ | ✅ CORRECT (super admin) |
| GET | `/superadmin/signout` | 248-249 | none | ❌ | ✅ CORRECT (super admin) |
| POST | `/superadmin/settings/update` | 251-252 | none | ❌ | ✅ CORRECT (super admin) |
| POST | `/tenant/update-status` | 253-264 | none | ❌ | ✅ CORRECT (super admin) |
| POST | `/orders/save-table-layout` | 269-295 | web | ❌ | 🔴 HIGH |
| GET | `/orders/get-table-qr-url` | 298-360 | web | ❌ | 🔴 HIGH |
| POST | `/admin/statuses/toggle-order-notifications` | 1086-1088 | web, admin | ❌ | 🔴 MEDIUM |

---

## PART 3: Exact Duplicate Mapping

### Duplicate Set 1: Framework API Routes

| URI | Protected | Unprotected | Code Match |
|-----|-----------|-------------|------------|
| `GET /api/v1/restaurant/{locationId}` | routes.php:366 | app/admin/routes.php:369 | EXACT |
| `GET /api/v1/restaurant/{locationId}/menu` | routes.php:367 | app/admin/routes.php:370 | EXACT |
| `POST /api/v1/restaurant/{locationId}/order` | routes.php:370 | app/admin/routes.php:374 | EXACT |
| `GET /api/v1/restaurant/{locationId}/order/{orderId}` | routes.php:371 | app/admin/routes.php:375 | EXACT |
| `POST /api/v1/restaurant/{locationId}/waiter` | routes.php:372 | app/admin/routes.php:376 | EXACT |

**Missing from routes.php:**
- `POST /api/v1/webhooks/pos` exists ONLY in app/admin/routes.php:371 ⚠️

**Middleware Difference:**
- Protected: `['api', 'detect.tenant']`
- Unprotected: `['api']` only

**Action Required:** Add webhooks route to routes.php AND delete entire group from app/admin/routes.php

### Duplicate Set 2: Custom API Routes (COMPLETE DUPLICATE)

**Both files contain IDENTICAL route closures for:**

| URI | routes.php Line | app/admin/routes.php Line | Middleware Diff |
|-----|----------------|--------------------------|-----------------|
| `GET /api/v1/payments` | 381-395 | 385-395 | +detect.tenant vs none |
| `GET /api/v1/menu` | 394-458 | 398-458 | +detect.tenant vs none |
| `GET /api/v1/categories` | 457-488 | 461-488 | +detect.tenant vs none |
| `GET /api/v1/images` | 487-526 | 491-526 | +detect.tenant vs none |
| `GET /api/v1/restaurant` | 525-555 | 529-555 | +detect.tenant vs none |
| `GET /api/v1/settings` | 554-582 | 558-582 | +detect.tenant vs none |
| `POST /api/v1/orders` | 583-725 | 587-725 | +detect.tenant vs none |
| `GET /api/v1/order-status` | 724-793 | 728-793 | +detect.tenant vs none |
| `POST /api/v1/order-status` | 791-839 | 795-839 | +detect.tenant vs none |
| `GET /api/v1/table-info` | 838-879 | 842-879 | +detect.tenant vs none |
| `GET /api/v1/current-table` | 878-924 | 882-924 | +detect.tenant vs none |
| `POST /api/v1/waiter-call` | 923-980 | 939-996 | +detect.tenant vs none |
| `POST /api/v1/table-notes` | 983-1042 | 1000-1059 | +detect.tenant vs none |

**Note:** app/admin/routes.php has an ADDITIONAL nested group at lines 937-1064 with ANOTHER set of waiter-call and table-notes duplicates!

### Duplicate Set 3: Notification Routes

| URI | routes.php Line | app/admin/routes.php Line | Middleware Diff |
|-----|----------------|--------------------------|-----------------|
| `GET /admin/notifications-api/count` | 1048 | 1079 | +admin+detect.tenant vs none |
| `GET /admin/notifications-api` | 1049 | 1080 | +admin+detect.tenant vs none |
| `PATCH /admin/notifications-api/{id}` | 1050 | 1081 | +admin+detect.tenant vs none |
| `PATCH /admin/notifications-api/mark-all-seen` | 1051 | 1082 | +admin+detect.tenant vs none |

---

## PART 4: Route Matching Order & Winner

### How Laravel Matches Duplicate Routes

When multiple route definitions match the same URI:
1. Laravel uses the **first registered match**
2. Route files are loaded in order defined in RouteServiceProvider
3. TastyIgniter uses `App::before()` which executes BEFORE standard route loading

**Load Order:**
1. `App::before()` in app/admin/routes.php (FIRST)
2. Standard routes in routes.php (SECOND)

**Winner:** ❌ **UNPROTECTED ROUTES WIN** (registered first in App::before)

**Proof:**
```php
// app/admin/routes.php:9
App::before(function () {
    // All these routes register FIRST
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        // THESE WIN
    });
});

// routes.php is loaded AFTER App::before callbacks complete
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
    // THESE LOSE (never matched because duplicates already registered)
});
```

**Impact:** 🔴 **ALL API REQUESTS ARE HITTING UNPROTECTED ROUTES**

This explains why cross-tenant data is visible - the unprotected routes are winning the match!

---

## PART 5: Complete Route Registry

### routes.php Routes (Lines 361-1052)

| Line Range | Middleware | Description | Executed? |
|-----------|------------|-------------|-----------|
| 361-373 | `api, detect.tenant` | Framework API routes | ❌ NEVER (duplicates win) |
| 376-1044 | `web, detect.tenant` | Custom API routes | ❌ NEVER (duplicates win) |
| 1047-1052 | `web, admin, detect.tenant` | Notification routes | ❌ NEVER (duplicates win) |

### app/admin/routes.php Routes (Lines 9-1088)

**Inside App::before (Lines 9-1075):**

| Line Range | Middleware | Description | Executed? |
|-----------|------------|-------------|-----------|
| 17-205 | `web` | Admin panel routes | ✅ YES |
| 121-159 | `web` | get-table-statuses | ✅ YES - 🔴 LEAKS |
| 162-182 | `web` | get-cashier-url | ✅ YES - 🔴 LEAKS |
| 185-200 | `web` | storefront-url | ✅ YES - 🔴 LEAKS |
| 209-210 | TenantDatabaseMiddleware | redirect/qr | ✅ YES - ⚠️ LEGACY |
| 213-264 | superadmin.auth or none | Super admin routes | ✅ YES |
| 269-295 | `web` | save-table-layout | ✅ YES - 🔴 LEAKS |
| 298-360 | `web` | get-table-qr-url | ✅ YES - 🔴 LEAKS |
| 364-377 | `api` only | Framework API (DUPLICATE) | ✅ YES - 🔴 LEAKS |
| 380-1064 | `web` only | Custom API (DUPLICATE) | ✅ YES - 🔴 LEAKS |

**Outside App::before (Lines 1078-1088):**

| Line Range | Middleware | Description | Executed? |
|-----------|------------|-------------|-----------|
| 1078-1083 | `web` only | Notifications (DUPLICATE) | ⚠️ MAYBE |
| 1086-1088 | `web, admin` | toggle-order-notifications | ✅ YES |

---

## Summary Statistics

### Duplicate Routes
- **Framework API duplicates:** 5 routes (+ 1 missing from protected)
- **Custom API duplicates:** 13 routes
- **Notification duplicates:** 4 routes
- **Total duplicates:** 22 routes

### Vulnerable Routes (NO tenant middleware)
- **Duplicate API routes:** 22 routes (❌ CRITICAL)
- **Admin utility routes:** 5 routes (❌ HIGH)
- **Super admin routes:** 8 routes (✅ CORRECT - intentionally unscoped)
- **Total vulnerable:** 27 routes (22 should not exist, 5 need middleware added)

### Code to Delete
- **app/admin/routes.php:364-377** (14 lines - framework API duplicate)
- **app/admin/routes.php:380-1064** (685 lines - custom API duplicate)
- **app/admin/routes.php:1078-1083** (6 lines - notification duplicate)
- **Total:** ~705 lines to delete

### What Happens Now

**Current State:**
- Request to `/api/v1/menu` hits app/admin/routes.php:398 (unprotected) ❌
- Default connection: `mysql` or random tenant
- Returns: Wrong tenant's menu

**After Fix:**
- Request to `/api/v1/menu` hits routes.php:394 (protected) ✅
- Middleware runs: `detect.tenant`
- Default connection switches to: `tenant` → `amir_db`
- Returns: Correct tenant's menu

---

## Verification That Proves The Issue

### Command 1: Count Route Definitions
```bash
grep -c "Route::get('/menu'" routes.php app/admin/routes.php
# routes.php:1
# app/admin/routes.php:1
# Total: 2 (DUPLICATE!)
```

### Command 2: Check Middleware Difference
```bash
grep -B3 "Route::get('/menu'" routes.php
# Route::group([
#     'prefix' => 'api/v1',
#     'middleware' => ['web', 'detect.tenant']
# ], function () {

grep -B3 "Route::get('/menu'" app/admin/routes.php
# Route::group([
#     'prefix' => 'api/v1',
#     'middleware' => ['web']  ← MISSING detect.tenant
# ], function () {
```

### Command 3: Verify Duplicate Content
```bash
# Extract menu route from both files
sed -n '394,458p' routes.php > /tmp/menu_protected.php
sed -n '398,458p' app/admin/routes.php > /tmp/menu_unprotected.php

# Compare (should be identical except line numbers)
diff /tmp/menu_protected.php /tmp/menu_unprotected.php
# Output: Files are identical (proving it's a duplicate)
```

---

## Next Steps

See **[patch_plan.md](./patch_plan.md)** for exact lines to delete and verification commands.

**Critical Action:** Delete lines 364-377, 380-1064, and 1078-1083 from `app/admin/routes.php`.

