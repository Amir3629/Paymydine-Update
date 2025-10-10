# ROUTES_MIDDLEWARE_COVERAGE.md

## Executive Summary

This document maps all tenant-facing routes to their middleware chains. **Critical finding**: Many routes that read/write tenant data lack tenant isolation middleware, potentially causing cross-tenant data leakage.

---

## 1. Tenant Middleware Registration

### 1.1 Available Middleware

**Location**: `app/Http/Kernel.php:42-56`

```php
protected $routeMiddleware = [
    'auth' => \App\Http\Middleware\Authenticate::class,
    'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
    'bindings' => \Illuminate\Routing\Middleware\SubstituteBindings::class,
    'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
    'can' => \Illuminate\Auth\Middleware\Authorize::class,
    'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
    'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
    'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
    'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
    'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,              // ✓ Tenant MW
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class, // ✓ Tenant MW
    'cors' => \App\Http\Middleware\CorsMiddleware::class,
];
```

**Two tenant middlewares registered**:
1. `detect.tenant` → `DetectTenant` (creates separate `tenant` connection, sets as default)
2. `tenant.database` → `TenantDatabaseMiddleware` (reconfigures `mysql` connection)

---

## 2. Routes with Tenant Middleware

### 2.1 API Routes (routes/api.php)

#### ✓ Protected Routes with detect.tenant

**Location**: `routes/api.php:122-408`

```php
Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
```

| Route | Method | Controller/Handler | Middleware Chain | Notes |
|-------|--------|-------------------|------------------|-------|
| `/api/v1/menu` | GET | MenuController@index | `['detect.tenant']` | ✓ Protected |
| `/api/v1/menu/categories` | GET | CategoryController@index | `['detect.tenant']` | ✓ Protected |
| `/api/v1/menu/items` | GET | MenuController@items | `['detect.tenant']` | ✓ Protected |
| `/api/v1/menu/categories/{id}/items` | GET | MenuController@itemsByCategory | `['detect.tenant']` | ✓ Protected |
| `/api/v1/categories` | GET | CategoryController@index | `['detect.tenant']` | ✓ Protected |
| `/api/v1/categories/{id}` | GET | CategoryController@show | `['detect.tenant']` | ✓ Protected |
| `/api/v1/debug/conn` | GET | Closure | `['detect.tenant']` | ✓ Debug endpoint |
| `/api/v1/orders` | POST | OrderController@store | `['detect.tenant']` | ✓ Protected |
| `/api/v1/orders/{id}` | GET | OrderController@show | `['detect.tenant']` | ✓ Protected |
| `/api/v1/orders/{id}` | PATCH | OrderController@update | `['detect.tenant']` | ✓ Protected |
| `/api/v1/orders` | GET | OrderController@index | `['detect.tenant']` | ✓ Protected |
| `/api/v1/order-status` | GET | OrderController@getOrderStatus | `['detect.tenant']` | ✓ Protected |
| `/api/v1/order-status` | POST | OrderController@updateOrderStatus | `['detect.tenant']` | ✓ Protected |
| `/api/v1/tables/{qr}` | GET | TableController@getByQrCode | `['detect.tenant']` | ✓ Protected |
| `/api/v1/tables` | GET | TableController@index | `['detect.tenant']` | ✓ Protected |
| `/api/v1/table-info` | GET | TableController@getTableInfo | `['detect.tenant']` | ✓ Protected |
| `/api/v1/table-menu` | GET | MenuController@getTableMenu | `['detect.tenant']` | ✓ Protected |
| `/api/v1/restaurant` | GET | Closure | `['detect.tenant']` | ✓ Protected |
| `/api/v1/settings` | GET | Closure | `['detect.tenant']` | ✓ Protected |
| `/api/v1/waiter-call` | POST | Closure | `['detect.tenant']` | ✓ Protected |
| `/api/v1/valet-request` | POST | Closure | `['detect.tenant']` | ✓ Protected |
| `/api/v1/table-notes` | POST | Closure | `['detect.tenant']` | ✓ Protected |

**Total**: 23 routes with `detect.tenant` middleware ✓

---

## 3. Routes WITHOUT Tenant Middleware

### 3.1 Unprotected API Routes (routes.php)

**Location**: `routes.php:362-375`

#### ⚠️ CRITICAL: Admin API Routes (No Tenant MW)

```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
```

| Route | Method | Controller | Middleware Chain | ⚠️ Risk |
|-------|--------|-----------|------------------|---------|
| `/api/v1/restaurant/{locationId}` | GET | RestaurantController@getRestaurantInfo | `['api']` only | ⚠️ HIGH - Reads locations from default DB |
| `/api/v1/restaurant/{locationId}/menu` | GET | RestaurantController@getMenu | `['api']` only | ⚠️ HIGH - Reads menu from default DB |
| `/api/v1/webhooks/pos` | POST | PosWebhookController@handle | `['api']` only | ⚠️ HIGH - Writes data to default DB |
| `/api/v1/restaurant/{locationId}/order` | POST | OrderController@createOrder | `['api']` only | ⚠️ CRITICAL - Creates orders in default DB |
| `/api/v1/restaurant/{locationId}/order/{orderId}` | GET | OrderController@getOrderStatus | `['api']` only | ⚠️ HIGH - Reads orders from default DB |
| `/api/v1/restaurant/{locationId}/waiter` | POST | OrderController@requestWaiter | `['api']` only | ⚠️ HIGH - Creates requests in default DB |

**Impact**: These routes will use the default `mysql` connection pointing to the main `paymydine` database, not tenant-specific databases.

---

### 3.2 Unprotected Frontend API Routes (routes.php)

**Location**: `routes.php:378-921`

#### ⚠️ CRITICAL: Menu, Orders, Settings Routes (No Tenant MW)

```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
```

| Route | Method | Handler | DB Queries | ⚠️ Risk |
|-------|--------|---------|-----------|---------|
| `/api/v1/payments` | GET | Closure | `Payments_model::isEnabled()` | ⚠️ May use wrong DB |
| `/api/v1/menu` | GET | Closure | `DB::select()` from ti_menus | ⚠️ HIGH - Reads from default DB |
| `/api/v1/categories` | GET | Closure | `DB::table('categories')` | ⚠️ HIGH - Reads from default DB |
| `/api/v1/images` | GET | Closure | File system access | ⚠️ LOW - File paths not scoped |
| `/api/v1/restaurant` | GET | Closure | `DB::table('locations')` | ⚠️ HIGH - Reads from default DB |
| `/api/v1/settings` | GET | Closure | `DB::table('settings')` | ⚠️ HIGH - Reads from default DB |
| `/api/v1/orders` | POST | Closure | `DB::table('orders')->insertGetId()` | ⚠️ CRITICAL - Writes to default DB |
| `/api/v1/order-status` | GET | Closure | `DB::table('orders')->leftJoin()` | ⚠️ HIGH - Reads from default DB |
| `/api/v1/order-status` | POST | Closure | `DB::table('orders')->update()` | ⚠️ CRITICAL - Updates default DB |
| `/api/v1/table-info` | GET | Closure | `DB::table('tables')` | ⚠️ HIGH - Reads from default DB |
| `/api/v1/current-table` | GET | Closure | `DB::table('tables')` | ⚠️ HIGH - Reads from default DB |
| `/api/v1/waiter-call` | POST | Closure (nested) | `DB::table('waiter_calls')` | ⚠️ CRITICAL - Writes to default DB |
| `/api/v1/table-notes` | POST | Closure (nested) | `DB::table('table_notes')` | ⚠️ CRITICAL - Writes to default DB |
| `/api/v1/history` | GET | History::index | Unknown | ⚠️ Unknown risk |

**Note**: There's a nested route group at `routes.php:934` with same `/api/v1` prefix and `['web']` middleware, duplicating waiter-call and table-notes endpoints.

---

### 3.3 Admin Routes (app/admin/routes.php)

**Location**: `app/admin/routes.php:17-204`

#### Admin Routes with ['web'] Middleware Only

```php
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
```

| Route | Method | Handler | DB Queries | Middleware | ⚠️ Risk |
|-------|--------|---------|-----------|------------|---------|
| `/admin/orders/get-table-statuses` | GET | Closure | `DB::table('orders')->join()` | `['web']` | ⚠️ HIGH - May query wrong tenant |
| `/admin/orders/get-cashier-url` | GET | Closure | None | `['web']` | ⚠️ LOW |
| `/admin/storefront-url` | GET | Closure | `DB::table('tables')` (via helper) | `['web']` | ⚠️ MEDIUM |
| `/admin/orders/save-table-layout` | POST | Closure | None (returns success only) | `['web']` | ⚠️ LOW |
| `/admin/orders/get-table-qr-url` | GET | Closure | `DB::table('tables')`, `DB::table('locationables')` | `['web']` | ⚠️ HIGH |
| `/admin/{slug}` | ANY | System\Classes\Controller@runAdmin | Framework routing | `['web']` | ⚠️ UNKNOWN - Framework handles |
| `/admin` | ANY | System\Classes\Controller@runAdmin | Framework routing | None | ⚠️ UNKNOWN |

**Status**: Most admin routes lack explicit tenant middleware. May rely on TastyIgniter framework's tenant handling.

---

### 3.4 QR Redirect Route

**Location**: `app/admin/routes.php:208-209`

```php
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

| Route | Method | Controller | Middleware | ✓ Status |
|-------|--------|-----------|------------|----------|
| `/redirect/qr` | GET | QrRedirectController@handleRedirect | `[TenantDatabaseMiddleware::class]` | ✓ Protected (uses full class path) |

**Note**: Uses full class path instead of alias `tenant.database`.

---

### 3.5 Superadmin Routes (Explicitly Bypass Tenant MW)

**Location**: `app/admin/routes.php:212-263`

#### Routes with withoutMiddleware(TenantDatabaseMiddleware)

| Route | Method | Controller | Middleware | Intentional? |
|-------|--------|-----------|------------|--------------|
| `/new` | GET | SuperAdminController@showNewPage | `superadmin.auth`, `-TenantDatabaseMiddleware` | ✓ YES |
| `/index` | GET | SuperAdminController@showIndex | `superadmin.auth`, `-TenantDatabaseMiddleware` | ✓ YES |
| `/settings` | GET | SuperAdminController@settings | `superadmin.auth`, `-TenantDatabaseMiddleware` | ✓ YES |
| `/new/store` | GET/POST | SuperAdminController@store | `-TenantDatabaseMiddleware` | ✓ YES |
| `/tenants/update` | GET/POST | SuperAdminController@update | `-TenantDatabaseMiddleware` | ✓ YES |
| `/tenants/delete/{id}` | GET | SuperAdminController@delete | `-TenantDatabaseMiddleware` | ✓ YES |
| `/superadmin/login` | GET | SuperAdminController@login | `-TenantDatabaseMiddleware` | ✓ YES |
| `/superadmin/sign` | POST | SuperAdminController@sign | `-TenantDatabaseMiddleware` | ✓ YES |
| `/superadmin/signout` | GET | SuperAdminController@signOut | `-TenantDatabaseMiddleware` | ✓ YES |
| `/superadmin/settings/update` | POST | SuperAdminController@updateSettings | `-TenantDatabaseMiddleware` | ✓ YES |
| `/tenant/update-status` | POST | Closure | `-TenantDatabaseMiddleware` | ✓ YES |
| `/orders/save-table-layout` | POST | Closure | `-TenantDatabaseMiddleware` | ⚠️ UNCLEAR |
| `/orders/get-table-qr-url` | GET | Closure | `-TenantDatabaseMiddleware` | ⚠️ UNCLEAR |

**Evidence**: Lines 215, 220, 225, 230, 234, 237, 241, 245, 247, 251, 263, 294, 358

**Analysis**: Superadmin routes intentionally access main database to manage tenants. However, routes at lines 294 and 358 (`save-table-layout`, `get-table-qr-url`) are unclear whether they should bypass tenant middleware.

---

### 3.6 Notification API Routes

**Location**: `routes.php:1065-1080`

#### Admin Notifications API

```php
Route::group(['prefix' => 'admin/notifications-api'], function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/',     [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}',[\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

| Route | Method | Controller | Middleware | ⚠️ Risk |
|-------|--------|-----------|------------|---------|
| `/admin/notifications-api/count` | GET | NotificationsApi@count | **NONE** | ⚠️ CRITICAL - No middleware at all |
| `/admin/notifications-api/` | GET | NotificationsApi@index | **NONE** | ⚠️ CRITICAL |
| `/admin/notifications-api/{id}` | PATCH | NotificationsApi@update | **NONE** | ⚠️ CRITICAL |
| `/admin/notifications-api/mark-all-seen` | PATCH | NotificationsApi@markAllSeen | **NONE** | ⚠️ CRITICAL |

**Duplicate definition** at `routes.php:1075-1080` with `['web']` middleware:

```php
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    // Same routes as above
});
```

**Status**: First definition has NO middleware. Second has only `['web']`. Neither has tenant middleware.

**Controller queries** (`app/admin/controllers/NotificationsApi.php`):
- Line 15: `DB::table('notifications')->where('status', 'new')->count()`
- Line 29: `DB::table('notifications')->when(...)->get()`
- Line 47: `DB::table('notifications')->where('id', $id)->update()`
- Line 62: `DB::table('notifications')->where('status', 'new')->update()`

All use default connection without tenant isolation.

---

## 4. Route Coverage Summary

### 4.1 Statistics

| Category | Count | Tenant MW | No Tenant MW | Status |
|----------|-------|-----------|--------------|--------|
| **API v1 routes (routes/api.php)** | 23 | 23 | 0 | ✓ All protected |
| **API v1 routes (routes.php, admin controllers)** | 6 | 0 | 6 | ⚠️ CRITICAL - Unprotected |
| **API v1 routes (routes.php, closures)** | 14 | 0 | 14 | ⚠️ CRITICAL - Unprotected |
| **Admin routes** | ~7 | 1 | ~6 | ⚠️ HIGH - Mostly unprotected |
| **Superadmin routes** | 13 | 0 | 13 | ✓ Intentional (manages tenants) |
| **Notification API routes** | 4 | 0 | 4 | ⚠️ CRITICAL - No MW at all |
| **TOTAL TENANT-FACING** | ~50 | 24 | ~26 | ⚠️ ~52% unprotected |

### 4.2 Critical Unprotected Routes

**Highest risk routes** (write operations without tenant middleware):

1. **POST /api/v1/orders** (routes.php:584-722)
   - Creates orders in default DB
   - Missing: tenant middleware

2. **POST /api/v1/restaurant/{locationId}/order** (routes.php:372)
   - Creates orders via OrderController
   - Missing: tenant middleware

3. **POST /api/v1/order-status** (routes.php:792-836)
   - Updates order status in default DB
   - Missing: tenant middleware

4. **POST /api/v1/waiter-call** (routes.php:936-993, also routes/api.php:200-278)
   - Creates waiter call in default DB
   - Missing: tenant middleware (routes.php version)
   - Protected: routes/api.php version has `detect.tenant`

5. **POST /api/v1/table-notes** (routes.php:997-1056, also routes/api.php:347-407)
   - Creates table note in default DB
   - Missing: tenant middleware (routes.php version)
   - Protected: routes/api.php version has `detect.tenant`

6. **PATCH /admin/notifications-api/{id}** (routes.php:1064, 1078)
   - Updates notification status
   - Missing: tenant middleware AND auth middleware

---

## 5. Middleware Application Issues

### 5.1 Route Conflicts

**Duplicate route definitions** with different middleware:

| Route | File | Middleware | Effect |
|-------|------|------------|--------|
| `/api/v1/waiter-call` | routes/api.php:200 | `['detect.tenant']` | ✓ Protected |
| `/api/v1/waiter-call` | routes.php:936 | `['web']` | ⚠️ Unprotected |
| `/api/v1/table-notes` | routes/api.php:347 | `['detect.tenant']` | ✓ Protected |
| `/api/v1/table-notes` | routes.php:997 | `['web']` | ⚠️ Unprotected |

**Risk**: Laravel uses first matching route. If `routes.php` loads before `routes/api.php`, unprotected versions will be used.

### 5.2 Middleware Group Definitions

**Location**: `app/Http/Kernel.php:18-33`

```php
protected $middlewareGroups = [
    'web' => [
        \Igniter\Flame\Foundation\Http\Middleware\EncryptCookies::class,
        \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
        \Igniter\Flame\Translation\Middleware\Localization::class,
    ],

    'api' => [
        'throttle:api',
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
];
```

**Finding**: Neither `web` nor `api` middleware groups include tenant middleware.

---

## 6. Recommendations for Route Protection

### 6.1 Routes That MUST Have Tenant Middleware

All routes that query tenant-specific data:

- `/api/v1/restaurant/{locationId}` and sub-routes
- `/api/v1/menu`, `/api/v1/categories`, `/api/v1/orders` (routes.php versions)
- `/api/v1/settings`, `/api/v1/restaurant`, `/api/v1/table-info`
- `/admin/notifications-api/*`
- `/admin/orders/*` (except superadmin routes)

### 6.2 Routes That Should NOT Have Tenant Middleware

Routes that manage the multi-tenant system itself:

- `/superadmin/*`
- `/tenants/*`
- Main domain routes (non-subdomain)

---

## 7. Evidence of Route Loading Order

**Laravel loads routes in this order** (typically):
1. `routes/api.php`
2. `routes.php`

**Source**: Standard Laravel setup, but needs verification in `app/Providers/RouteServiceProvider.php` or bootstrap files.

**Risk**: If `routes.php` loads first, its unprotected `/api/v1/*` routes will shadow the protected ones in `routes/api.php`.

