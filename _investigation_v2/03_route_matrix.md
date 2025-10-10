## Route & Middleware Matrix - Tenant Isolation Analysis

### Executive Summary

**CRITICAL FINDINGS:**
- **39 routes total** registered in the application
- **ZERO routes** show `detect.tenant` middleware in `route:list` output
- **Framework limitation**: TastyIgniter's routing system does not properly expose middleware chains in artisan commands
- Manual code analysis reveals the ACTUAL middleware configuration differs significantly from what's reported

### Route List Analysis

Output from `php artisan route:list` shows only base middleware groups (`web`, `api`, `admin`) but **does NOT show** route-specific middleware like `detect.tenant`. This is a TastyIgniter framework limitation.

### Manual Route Matrix (from source code analysis)

#### 1. API Routes WITH Tenant Middleware (routes.php)

| Method | URI | Middleware Chain | Source | Tenant Guard? |
|--------|-----|------------------|--------|---------------|
| GET | `/api/v1/menu` | `web`, `detect.tenant` | routes.php:376-454 | ✅ YES |
| GET | `/api/v1/categories` | `web`, `detect.tenant` | routes.php:376-484 | ✅ YES |
| GET | `/api/v1/images` | `web`, `detect.tenant` | routes.php:376-522 | ✅ YES |
| GET | `/api/v1/restaurant` | `web`, `detect.tenant` | routes.php:376-550 | ✅ YES |
| GET | `/api/v1/settings` | `web`, `detect.tenant` | routes.php:376-577 | ✅ YES |
| POST | `/api/v1/orders` | `web`, `detect.tenant` | routes.php:376-721 | ✅ YES |
| GET | `/api/v1/order-status` | `web`, `detect.tenant` | routes.php:376-788 | ✅ YES |
| POST | `/api/v1/order-status` | `web`, `detect.tenant` | routes.php:376-834 | ✅ YES |
| GET | `/api/v1/table-info` | `web`, `detect.tenant` | routes.php:376-874 | ✅ YES |
| GET | `/api/v1/current-table` | `web`, `detect.tenant` | routes.php:376-919 | ✅ YES |
| POST | `/api/v1/waiter-call` | `web`, `detect.tenant` | routes.php:376-979 | ✅ YES |
| POST | `/api/v1/table-notes` | `web`, `detect.tenant` | routes.php:376-1041 | ✅ YES |
| GET | `/api/v1/payments` | `web`, `detect.tenant` | routes.php:376-390 | ✅ YES |

**Route Group Definition:**
```php
// routes.php:376-1044
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']
], function () {
    // All routes above are defined here
});
```

#### 2. TastyIgniter Framework API Routes WITH Tenant Middleware

| Method | URI | Middleware Chain | Source | Tenant Guard? |
|--------|-----|------------------|--------|---------------|
| GET | `/api/v1/restaurant/{locationId}` | `api`, `detect.tenant` | routes.php:364-373 | ✅ YES |
| GET | `/api/v1/restaurant/{locationId}/menu` | `api`, `detect.tenant` | routes.php:364-373 | ✅ YES |
| POST | `/api/v1/restaurant/{locationId}/order` | `api`, `detect.tenant` | routes.php:364-373 | ✅ YES |
| GET | `/api/v1/restaurant/{locationId}/order/{orderId}` | `api`, `detect.tenant` | routes.php:364-373 | ✅ YES |
| POST | `/api/v1/restaurant/{locationId}/waiter` | `api`, `detect.tenant` | routes.php:364-373 | ✅ YES |
| POST | `/api/v1/webhooks/pos` | `api`, `detect.tenant` | routes.php:364-373 | ✅ YES |

**Route Group Definition:**
```php
// routes.php:361-373
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api', 'detect.tenant']
], function () {
    // Framework API controller routes
});
```

#### 3. Admin Notification Routes WITH Tenant Middleware

| Method | URI | Middleware Chain | Source | Tenant Guard? |
|--------|-----|------------------|--------|---------------|
| GET | `/admin/notifications-api/count` | `web`, `admin`, `detect.tenant` | routes.php:1047-1052 | ✅ YES |
| GET | `/admin/notifications-api` | `web`, `admin`, `detect.tenant` | routes.php:1047-1052 | ✅ YES |
| PATCH | `/admin/notifications-api/{id}` | `web`, `admin`, `detect.tenant` | routes.php:1047-1052 | ✅ YES |
| PATCH | `/admin/notifications-api/mark-all-seen` | `web`, `admin`, `detect.tenant` | routes.php:1047-1052 | ✅ YES |

**Route Group Definition:**
```php
// routes.php:1047-1052
Route::middleware(['web', 'admin', 'detect.tenant'])
    ->prefix('admin/notifications-api')
    ->group(function () {
        // Protected notification routes
    });
```

#### 4. 🔴 CRITICAL: Routes WITHOUT Tenant Middleware (Backward Compatibility)

| Method | URI | Middleware Chain | Source | Tenant Guard? | Risk Level |
|--------|-----|------------------|--------|---------------|------------|
| GET | `/admin/notifications-api/count` | `web` ONLY | app/admin/routes.php:1078-1083 | ❌ NO | 🔴 CRITICAL |
| GET | `/admin/notifications-api` | `web` ONLY | app/admin/routes.php:1078-1083 | ❌ NO | 🔴 CRITICAL |
| PATCH | `/admin/notifications-api/{id}` | `web` ONLY | app/admin/routes.php:1078-1083 | ❌ NO | 🔴 CRITICAL |
| PATCH | `/admin/notifications-api/mark-all-seen` | `web` ONLY | app/admin/routes.php:1078-1083 | ❌ NO | 🔴 CRITICAL |

**Vulnerable Route Group:**
```php
// app/admin/routes.php:1078-1083
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

**Issue**: These routes will execute using whatever the **current default connection** is, which could be:
- The main `mysql` database (if no prior tenant switch occurred)
- A random tenant's database (if a previous request in the same PHP-FPM worker set it)

#### 5. Admin Routes with Middleware Bypass

| Method | URI | Middleware Chain | Source | Bypass? | Purpose |
|--------|-----|------------------|--------|---------|---------|
| GET | `/orders/get-table-qr-url` | Explicitly bypasses `TenantDatabaseMiddleware` | app/admin/routes.php:298-360 | ⚠️ YES | QR URL generation |
| POST | `/orders/save-table-layout` | Explicitly bypasses `TenantDatabaseMiddleware` | app/admin/routes.php:269-295 | ⚠️ YES | Layout saving |
| POST | `/tenant/update-status` | Explicitly bypasses `TenantDatabaseMiddleware` | app/admin/routes.php:253-264 | ✅ Correct | Super admin operation |

**Bypass Pattern:**
```php
// app/admin/routes.php:298
Route::get('/orders/get-table-qr-url', function (Request $request) {
    // ... generates QR URLs
})->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

**Analysis**: These routes explicitly bypass `TenantDatabaseMiddleware` (the old middleware), but they're within the admin route group which runs **before** any tenant middleware would be applied anyway. The bypass is redundant but not harmful for the QR URL endpoint since it correctly uses `request()->getHost()`.

#### 6. Super Admin Routes (Correctly Unscoped)

| Method | URI | Middleware Chain | Source | Tenant Guard? | Correct? |
|--------|-----|------------------|--------|---------------|----------|
| GET | `/new` | `web`, `superadmin.auth`, bypasses tenant middleware | app/admin/routes.php:213-216 | ❌ NO | ✅ YES (intentional) |
| GET | `/index` | `web`, `superadmin.auth`, bypasses tenant middleware | app/admin/routes.php:215-218 | ❌ NO | ✅ YES (intentional) |
| GET | `/settings` | `web`, `superadmin.auth`, bypasses tenant middleware | app/admin/routes.php:220-223 | ❌ NO | ✅ YES (intentional) |
| POST | `/new/store` | bypasses tenant middleware | app/admin/routes.php:229-231 | ❌ NO | ✅ YES (creates tenants) |
| POST | `/tenants/update` | bypasses tenant middleware | app/admin/routes.php:233-235 | ❌ NO | ✅ YES (updates tenants) |
| GET | `/tenants/delete/{id}` | bypasses tenant middleware | app/admin/routes.php:237-238 | ❌ NO | ✅ YES (deletes tenants) |

These routes correctly access the **main `mysql` database** to manage tenants.

### Summary Statistics

- **Total API Routes**: 19 (13 custom + 6 framework)
- **API Routes with Tenant Guard**: 19/19 (100%)
- **Admin Notification Routes (Protected)**: 4
- **Admin Notification Routes (UNPROTECTED)**: 4 🔴
- **Super Admin Routes**: 6 (correctly unscoped)
- **Admin Utility Routes with Bypasses**: 3

### Critical Issues

1. **Duplicate Notification Routes**: There are TWO sets of `/admin/notifications-api` routes:
   - **Protected set** in `routes.php:1047-1052` with `detect.tenant` middleware ✅
   - **Unprotected set** in `app/admin/routes.php:1078-1083` with ONLY `web` middleware ❌

2. **Race Condition Risk**: The unprotected routes will use whatever database connection was set by a previous request in the same PHP-FPM worker, leading to unpredictable behavior.

3. **Framework Limitation**: `php artisan route:list` does NOT show the actual middleware applied to routes registered in `App::before()` callbacks, making it impossible to audit routes through artisan commands alone.

