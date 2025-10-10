## Route & Middleware Matrix - Cross-Tenant Leakage Analysis

### Executive Summary

**CRITICAL FINDINGS:**
- ❌ **4 duplicate notification routes WITHOUT tenant middleware** (app/admin/routes.php:1078-1083)
- ❌ **Admin route group has NO tenant middleware by default** (app/admin/routes.php:17-205)
- ✅ **19 API routes have detect.tenant middleware** (routes.php:376-1044)
- ⚠️ **TenantDatabaseMiddleware bypassed in multiple places** (confusing, creates gaps)

### Route File Analysis

#### File 1: routes.php (Main Application Routes)

##### Group 1: Admin Routes (INSIDE App::before)
```php
// routes.php:16-202
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // Admin routes here
});
```

**Middleware:** `['web']` ONLY  
**Tenant Guard:** ❌ NO  
**Routes Affected:** Admin dashboard, table management, cashier URLs  
**Risk:** HIGH - these routes query DB without tenant context

##### Group 2: TastyIgniter Framework API Routes
```php
// routes.php:361-373
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api', 'detect.tenant']  // ← HAS TENANT MIDDLEWARE
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
    Route::post('webhooks/pos', 'PosWebhookController@handle');
});
```

**Middleware:** `['api', 'detect.tenant']`  
**Tenant Guard:** ✅ YES  
**Routes:** 6 framework API routes  
**Status:** ✅ PROTECTED

##### Group 3: Custom Frontend API Routes
```php
// routes.php:376-1044
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ← HAS TENANT MIDDLEWARE
], function () {
    Route::get('/payments', ...);
    Route::get('/menu', ...);
    Route::get('/categories', ...);
    Route::get('/images', ...);
    Route::get('/restaurant', ...);
    Route::get('/settings', ...);
    Route::post('/orders', ...);
    Route::get('/order-status', ...);
    Route::post('/order-status', ...);
    Route::get('/table-info', ...);
    Route::get('/current-table', ...);
    Route::post('/waiter-call', ...);
    Route::post('/table-notes', ...);
});
```

**Middleware:** `['web', 'detect.tenant']`  
**Tenant Guard:** ✅ YES  
**Routes:** 13 custom API routes  
**Status:** ✅ PROTECTED

##### Group 4: Admin Notifications API (PROTECTED)
```php
// routes.php:1047-1052
Route::middleware(['web', 'admin', 'detect.tenant'])
    ->prefix('admin/notifications-api')
    ->group(function () {
        Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
        Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
        Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
        Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
    });
```

**Middleware:** `['web', 'admin', 'detect.tenant']`  
**Tenant Guard:** ✅ YES  
**Routes:** 4 notification routes  
**Status:** ✅ PROTECTED

#### File 2: app/admin/routes.php (Admin Panel Routes)

##### Group 1: Admin Panel Routes (INSIDE App::before)
```php
// app/admin/routes.php:17-205
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // Cashier table functions: resolveCashierTableId(), buildCashierTableUrl()
    
    Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', ...);
    Route::get('/orders/get-table-statuses', function () {
        $tableStatuses = DB::table('orders')  // ← NO tenant middleware!
            ->join('statuses', ...)
            ->join('tables', ...)
            ->get();
    });
    Route::get('/orders/get-cashier-url', function (Request $request) {
        // Queries DB::table('tables'), DB::table('locationables')
    });
    Route::get('/storefront-url', function (Request $request) {
        // Queries DB::table('locations')
    });
    Route::any('{slug}', 'System\Classes\Controller@runAdmin');
});
```

**Middleware:** `['web']` ONLY  
**Tenant Guard:** ❌ NO  
**Risk:** 🔴 **CRITICAL** - Admin panel routes query tables, orders, locations without tenant context  
**Impact:** Admin from one tenant sees data from default/wrong tenant

##### Specific Admin Routes (Outside main group, WITH bypasses)

```php
// app/admin/routes.php:209-210
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```
**Middleware:** `TenantDatabaseMiddleware` (legacy)  
**Status:** ⚠️ Uses old middleware

```php
// app/admin/routes.php:213-227
Route::get('/new', [SuperAdminController::class, 'showNewPage'])
    ->name('superadmin.new')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```
**Middleware:** `superadmin.auth`, bypasses TenantDatabaseMiddleware  
**Tenant Guard:** ❌ NO (intentional - super admin)  
**Status:** ✅ CORRECT (super admin route)

##### Group 2: Admin API Routes
```php
// app/admin/routes.php:364-377
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']  // ← NO detect.tenant!
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    Route::post('webhooks/pos', 'PosWebhookController@handle');
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**Middleware:** `['api']` ONLY  
**Tenant Guard:** ❌ NO  
**Risk:** 🔴 **CRITICAL** - Framework API routes without tenant middleware  
**Duplicate of:** routes.php:361-373 (which DOES have detect.tenant)

##### Group 3: Custom API Routes (WITHOUT tenant middleware)
```php
// app/admin/routes.php:380-1044
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ← NO detect.tenant!
], function () {
    Route::get('/payments', ...);
    Route::get('/menu', function () {
        $p = DB::connection()->getTablePrefix();
        $items = DB::select($query);  // ← Uses default connection!
    });
    Route::get('/categories', ...);
    Route::get('/images', ...);
    Route::get('/restaurant', ...);
    Route::get('/settings', ...);
    Route::post('/orders', ...);
    // ... etc
});
```

**Middleware:** `['web']` ONLY  
**Tenant Guard:** ❌ NO  
**Risk:** 🔴 **CRITICAL** - All custom API routes without tenant middleware  
**Duplicate of:** routes.php:376-1044 (which DOES have detect.tenant)

##### Group 4: 🔴 CRITICAL - Unprotected Notification Routes
```php
// app/admin/routes.php:1078-1083
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

**Middleware:** `['web']` ONLY  
**Tenant Guard:** ❌ NO  
**Risk:** 🔴 **CRITICAL**  
**Duplicate of:** routes.php:1047-1052 (which DOES have detect.tenant)

#### File 3: routes/api.php

**Status:** File does not exist or is empty (TastyIgniter doesn't use this file)

### Complete Route Matrix

| URI Pattern | Method | File | Line | Middleware | detect.tenant? | Status |
|-------------|--------|------|------|------------|----------------|--------|
| **PROTECTED ROUTES (✅)** |
| `/api/v1/payments` | GET | routes.php | 381 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/menu` | GET | routes.php | 394 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/categories` | GET | routes.php | 457 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/images` | GET | routes.php | 487 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/restaurant` | GET | routes.php | 525 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/settings` | GET | routes.php | 554 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/orders` | POST | routes.php | 583 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/order-status` | GET | routes.php | 724 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/order-status` | POST | routes.php | 791 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/table-info` | GET | routes.php | 838 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/current-table` | GET | routes.php | 878 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/waiter-call` | POST | routes.php | 923 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/table-notes` | POST | routes.php | 983 | web, detect.tenant | ✅ | SAFE |
| `/api/v1/restaurant/{id}` | GET | routes.php | 366 | api, detect.tenant | ✅ | SAFE |
| `/api/v1/restaurant/{id}/menu` | GET | routes.php | 367 | api, detect.tenant | ✅ | SAFE |
| `/api/v1/restaurant/{id}/order` | POST | routes.php | 370 | api, detect.tenant | ✅ | SAFE |
| `/api/v1/restaurant/{id}/order/{id}` | GET | routes.php | 371 | api, detect.tenant | ✅ | SAFE |
| `/api/v1/restaurant/{id}/waiter` | POST | routes.php | 372 | api, detect.tenant | ✅ | SAFE |
| `/api/v1/webhooks/pos` | POST | routes.php | 368 | api, detect.tenant | ✅ | SAFE |
| `/admin/notifications-api/count` | GET | routes.php | 1048 | web, admin, detect.tenant | ✅ | SAFE |
| `/admin/notifications-api` | GET | routes.php | 1049 | web, admin, detect.tenant | ✅ | SAFE |
| `/admin/notifications-api/{id}` | PATCH | routes.php | 1050 | web, admin, detect.tenant | ✅ | SAFE |
| `/admin/notifications-api/mark-all-seen` | PATCH | routes.php | 1051 | web, admin, detect.tenant | ✅ | SAFE |
| **VULNERABLE ROUTES (❌)** |
| `/admin/orders/get-table-statuses` | GET | app/admin/routes.php | 121 | web | ❌ | 🔴 LEAK |
| `/admin/orders/get-cashier-url` | GET | app/admin/routes.php | 162 | web | ❌ | 🔴 LEAK |
| `/admin/storefront-url` | GET | app/admin/routes.php | 185 | web | ❌ | 🔴 LEAK |
| `/api/v1/payments` | GET | app/admin/routes.php | 385 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/menu` | GET | app/admin/routes.php | 398 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/categories` | GET | app/admin/routes.php | 461 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/images` | GET | app/admin/routes.php | 491 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/restaurant` | GET | app/admin/routes.php | 529 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/settings` | GET | app/admin/routes.php | 558 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/orders` | POST | app/admin/routes.php | 587 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/order-status` | GET | app/admin/routes.php | 728 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/order-status` | POST | app/admin/routes.php | 795 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/table-info` | GET | app/admin/routes.php | 842 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/current-table` | GET | app/admin/routes.php | 882 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/waiter-call` | POST | app/admin/routes.php | 939 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/table-notes` | POST | app/admin/routes.php | 1000 | web | ❌ | 🔴 DUPLICATE |
| `/api/v1/restaurant/{id}` | GET | app/admin/routes.php | 369 | api | ❌ | 🔴 DUPLICATE |
| `/api/v1/restaurant/{id}/menu` | GET | app/admin/routes.php | 370 | api | ❌ | 🔴 DUPLICATE |
| `/api/v1/restaurant/{id}/order` | POST | app/admin/routes.php | 373 | api | ❌ | 🔴 DUPLICATE |
| `/api/v1/restaurant/{id}/order/{id}` | GET | app/admin/routes.php | 374 | api | ❌ | 🔴 DUPLICATE |
| `/api/v1/restaurant/{id}/waiter` | POST | app/admin/routes.php | 375 | api | ❌ | 🔴 DUPLICATE |
| `/api/v1/webhooks/pos` | POST | app/admin/routes.php | 371 | api | ❌ | 🔴 DUPLICATE |
| `/admin/notifications-api/count` | GET | app/admin/routes.php | 1079 | web | ❌ | 🔴 DUPLICATE |
| `/admin/notifications-api` | GET | app/admin/routes.php | 1080 | web | ❌ | 🔴 DUPLICATE |
| `/admin/notifications-api/{id}` | PATCH | app/admin/routes.php | 1081 | web | ❌ | 🔴 DUPLICATE |
| `/admin/notifications-api/mark-all-seen` | PATCH | app/admin/routes.php | 1082 | web | ❌ | 🔴 DUPLICATE |

### Duplicate Route Analysis

#### Duplicate Set 1: Framework API Routes
- **Protected:** routes.php:361-373 with `['api', 'detect.tenant']`
- **Vulnerable:** app/admin/routes.php:364-377 with `['api']` only
- **Impact:** 6 routes, requests may hit either version

#### Duplicate Set 2: Custom API Routes
- **Protected:** routes.php:376-1044 with `['web', 'detect.tenant']`
- **Vulnerable:** app/admin/routes.php:380-1044 with `['web']` only
- **Impact:** 13 routes, requests may hit either version

#### Duplicate Set 3: Notification Routes
- **Protected:** routes.php:1047-1052 with `['web', 'admin', 'detect.tenant']`
- **Vulnerable:** app/admin/routes.php:1078-1083 with `['web']` only
- **Impact:** 4 routes, requests may hit either version

### Summary Statistics

- **Total unique endpoints:** 26 (19 API + 3 admin + 4 notification)
- **Protected versions:** 26 (in routes.php)
- **Vulnerable duplicates:** 26 (in app/admin/routes.php)
- **Admin routes without tenant middleware:** 3
- **Risk level:** 🔴 **CRITICAL** - Every API endpoint has an unprotected duplicate

### Root Cause

**app/admin/routes.php contains a complete copy of routes.php WITHOUT tenant middleware.**

This appears to be from a refactoring where:
1. Original routes were in app/admin/routes.php
2. Routes were copied to routes.php with detect.tenant added
3. Original unprotected routes were never deleted from app/admin/routes.php

**Result:** Laravel route matching may hit either the protected or unprotected version depending on route registration order.

