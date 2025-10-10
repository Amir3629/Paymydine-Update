# Route and Middleware Matrix

This document compares route groups and their middleware stacks between the **current** and **old** versions of the PayMyDine application.

---

## Current Version Analysis

### Route Groups Overview

The current version defines the following major route groups in `routes.php` and `app/admin/routes.php`:

#### 1. Admin Group (Primary)
- **File**: `routes.php:16-201` and `app/admin/routes.php:17-204`
- **Middleware**: `['web']`
- **Prefix**: `config('system.adminUri', 'admin')`
- **Namespace**: None explicitly set
- **Scope**: Administrative backend, runs TastyIgniter's `System\Classes\Controller@runAdmin`

**Key routes in this group**:
- Assets combiner
- Order helper routes (table statuses, cashier URL, storefront URL, QR URLs, table layout)
- All other admin pages via catch-all `{slug}` route

**Tenant Isolation**: ❌ **No tenant middleware** - uses default connection. Admin routes access whatever the default DB connection is at request time.

#### 2. Superadmin Routes (Individual, Outside Groups)
- **File**: `routes.php:205-260` and similar in `app/admin/routes.php:208-263`
- **Examples**:
  - `/redirect/qr` - **WITH** `TenantDatabaseMiddleware` (line 206)
  - `/new`, `/index`, `/settings` - **withoutMiddleware** `TenantDatabaseMiddleware` (lines 212, 217, 222)
  - `/new/store`, `/tenants/update`, `/tenants/delete/{id}` - **withoutMiddleware** `TenantDatabaseMiddleware`
  - `/superadmin/login`, `/superadmin/sign`, `/superadmin/signout` - **withoutMiddleware** `TenantDatabaseMiddleware`
  - `/tenant/update-status` - **withoutMiddleware** + uses `DB::connection('mysql')` explicitly (line 253)

**Tenant Isolation**: Mixed - some routes explicitly bypass tenant middleware to access central DB, one route (`/redirect/qr`) applies tenant middleware.

#### 3. Frontend API Routes (Admin\Controllers\Api namespace)
- **File**: `routes.php:359-371` and `app/admin/routes.php:362-375`
- **Middleware**: `['api']`
- **Prefix**: `api/v1`
- **Namespace**: `Admin\Controllers\Api`
- **Routes**:
  - `GET restaurant/{locationId}`
  - `GET restaurant/{locationId}/menu`
  - `POST restaurant/{locationId}/order`
  - `GET restaurant/{locationId}/order/{orderId}`
  - `POST restaurant/{locationId}/waiter`
  - `POST webhooks/pos` (admin routes only, line 369)

**Tenant Isolation**: ❌ **No explicit tenant middleware** - relies on `api` middleware group only.

#### 4. Custom API Routes for Frontend (TENANT REQUIRED in current, NOT required in old)
- **File (Current)**: `routes.php:374-917` - **middleware `['web', 'detect.tenant']`**
- **File (Admin)**: `app/admin/routes.php:378-921` - **middleware `['web']`** (NO detect.tenant!)
- **Prefix**: `api/v1`

**Current version** (`routes.php:374-376`):
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ⚠️ TENANT MIDDLEWARE HERE
], function () {
```

**Admin version** (`app/admin/routes.php:378-380`):
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️ NO TENANT MIDDLEWARE
], function () {
```

**Routes in this group**:
- `GET /payments`
- `GET /menu`
- `GET /categories`
- `GET /images`
- `GET /restaurant`
- `GET /settings`
- `POST /orders`
- `GET /order-status`
- `POST /order-status`
- `GET /table-info`
- `GET /current-table`

**Tenant Isolation (Current `routes.php`)**: ✅ **Has `detect.tenant` middleware** - should switch to tenant DB before handling requests.

**Tenant Isolation (Admin `app/admin/routes.php`)**: ❌ **NO tenant middleware** - uses default connection.

#### 5. Public API Routes (Nested Group within #4)
- **File**: `routes.php:930-1057` and `app/admin/routes.php:934-1061`
- **Middleware**: `['web']` (nested inside api/v1 group above)
- **Prefix**: `api/v1` (inherited from parent)
- **Routes**:
  - `POST /waiter-call`
  - `POST /table-notes`
  - `GET history`

**Tenant Isolation**: Inherits from parent group. In `routes.php`, inherits `detect.tenant`. In `app/admin/routes.php`, no tenant middleware.

#### 6. Admin Notifications API
- **File**: `routes.php:1061-1066` and `app/admin/routes.php:1065-1070`
- **Middleware**: None specified in group
- **Prefix**: `admin/notifications-api`
- **Routes**:
  - `GET count`
  - `GET /`
  - `PATCH {id}`
  - `PATCH mark-all-seen`

**Tenant Isolation**: ❌ No tenant middleware - uses default connection.

#### 7. Back-compat Notifications API
- **File**: `routes.php:1071-1076` and `app/admin/routes.php:1075-1080`
- **Middleware**: `['web']`
- **Prefix**: `admin/notifications-api`

**Tenant Isolation**: ❌ No tenant middleware.

#### 8. Order Notifications Toggle (Admin routes only)
- **File**: `app/admin/routes.php:1083-1085`
- **Middleware**: `['web', 'admin']`
- **Route**: `POST /admin/statuses/toggle-order-notifications`

**Tenant Isolation**: ❌ No tenant middleware.

---

## Old Version Analysis

### Route Groups Overview

The old version is significantly **simpler** with fewer route groups:

#### 1. Admin Group
- **File**: `oldversionfiels/routes.php:14-24` and `oldversionfiels/app/admin/routes.php:9-19`
- **Middleware**: `['web']`
- **Prefix**: `config('system.adminUri', 'admin')`
- **Routes**: Assets combiner and catch-all admin slug

**Tenant Isolation**: ❌ No tenant middleware.

#### 2. Superadmin Routes
- **File**: `oldversionfiels/routes.php:28-83`
- **Similar structure to current**: Routes with `withoutMiddleware(TenantDatabaseMiddleware)`, `/tenant/update-status` uses `DB::connection('mysql')`

**Tenant Isolation**: Mixed - bypasses tenant middleware.

#### 3. Frontend API Routes
- **File**: `oldversionfiels/routes.php:87-99`
- **Middleware**: `['api']`
- **Prefix**: `api/v1`
- **Namespace**: `Admin\Controllers\Api`

**Tenant Isolation**: ❌ No tenant middleware.

#### 4. Custom API Routes (NO TENANT MIDDLEWARE)
- **File**: `oldversionfiels/routes.php:102-521`
- **Middleware**: `['web']` - **NO `detect.tenant`!**
- **Prefix**: `api/v1`
- **Routes**: Same menu, categories, restaurant, settings, orders, etc. routes as current version

**Tenant Isolation**: ❌ **No tenant middleware** - uses default connection.

#### 5. Image Serving Route
- **File**: `oldversionfiels/routes.php:486-521`
- **Route**: `GET /api/images`
- **Middleware**: None

**Tenant Isolation**: ❌ No tenant middleware.

---

## Side-by-Side Comparison Table

| Route Group | Current (`routes.php`) | Current (`app/admin/routes.php`) | Old (`routes.php`) | Tenant-Scoped? |
|-------------|------------------------|----------------------------------|-------------------|----------------|
| Admin Group (`/admin/*`) | `['web']` | `['web']` | `['web']` | ❌ No |
| Superadmin routes | Some with, some without `TenantDatabaseMiddleware` | Same | Same | Mixed |
| API v1 - Controllers namespace | `['api']` | `['api']` | `['api']` | ❌ No |
| **API v1 - Custom routes** | **`['web', 'detect.tenant']`** ✅ | **`['web']`** ❌ | **`['web']`** ❌ | **DIFFERENT!** |
| Public API (nested) | Inherits `detect.tenant` ✅ | No tenant middleware ❌ | N/A (not present) | Mixed |
| Admin Notifications API | None | None | N/A | ❌ No |

---

## Critical Differences

### 1. **Tenant Middleware on Custom API Routes**

**Current `routes.php:374-376`**:
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ⚠️ TENANT MIDDLEWARE PRESENT
], function () {
```

**Current `app/admin/routes.php:378-380`**:
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️ NO TENANT MIDDLEWARE
], function () {
```

**Old `oldversionfiels/routes.php:102-104`**:
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️ NO TENANT MIDDLEWARE
], function () {
```

### 2. **Middleware Registration**

Both versions register the same middleware aliases in `app/Http/Kernel.php`:
- `'detect.tenant' => \App\Http\Middleware\DetectTenant::class`
- `'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class`

However, **usage differs**:
- **Current `routes.php`**: Uses `detect.tenant` on api/v1 custom routes
- **Current `app/admin/routes.php`**: Does NOT use tenant middleware on same routes
- **Old version**: Does NOT use tenant middleware on api/v1 routes

### 3. **File Duplication**

The current version has **TWO nearly identical route files**:
- `routes.php` (at repo root)
- `app/admin/routes.php`

The key difference is the `detect.tenant` middleware on the api/v1 custom routes group.

### 4. **Explicit `withoutMiddleware()` Calls**

Both versions use `->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class])` on superadmin routes, but:
- **Implication**: There must be a **global middleware** applying `TenantDatabaseMiddleware` somewhere (likely in a service provider or global middleware stack) that these routes need to bypass.

---

## Route List Snapshots

### Current Version
Stored in: `_tenant_investigation/logs/route_list_current.txt`
(File may be empty if `php artisan route:list` is not available in this Laravel-based TastyIgniter setup)

### Old Version  
Stored in: `_tenant_investigation/logs/route_list_old.txt`
(File may be empty if `php artisan route:list` is not available)

---

## Evidence Files

- Route groups: `_tenant_investigation/logs/route_groups_current.txt`, `_tenant_investigation/logs/route_groups_old.txt`
- Middleware usage: `_tenant_investigation/logs/middleware_current.txt`, `_tenant_investigation/logs/middleware_old.txt`

---

## Summary

### Current Version
- **Main routes file** (`routes.php`): Applies `detect.tenant` middleware to api/v1 custom routes ✅
- **Admin routes file** (`app/admin/routes.php`): Does NOT apply tenant middleware to api/v1 routes ❌
- Admin panel routes have no tenant middleware
- Superadmin routes explicitly bypass tenant middleware

### Old Version
- **Single routes file**: Does NOT apply tenant middleware to api/v1 routes ❌
- Admin panel routes have no tenant middleware
- Superadmin routes explicitly bypass tenant middleware

### Key Question
**Which file is actually loaded?** If both are loaded, there could be route conflicts. If only one is loaded, which one determines tenant isolation behavior?

