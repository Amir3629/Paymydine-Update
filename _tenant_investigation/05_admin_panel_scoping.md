# Admin Panel Scoping Analysis

This document analyzes which admin routes require tenant context vs central (superadmin) context, and how authentication/authorization is scoped.

---

## Overview

The PayMyDine system has **three distinct user/access levels**:

1. **Superadmin**: Manages tenants (restaurants), can create/edit/delete tenant databases
2. **Tenant Admin**: Manages their own restaurant's data (menu, orders, staff, etc.)
3. **Frontend User/Customer**: Places orders, no admin access

This analysis focuses on **admin routes** and how they determine which database to use.

---

## Current Version - Admin Route Groups

### 1. Main Admin Group (Tenant Context)

**File**: `routes.php:16-201`, `app/admin/routes.php:17-204`

```php
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // Assets, utility routes
    Route::any('_assets/{asset}', 'System\Classes\Controller@combineAssets');
    
    // Helper routes for orders, tables, cashier
    Route::get('/orders/get-table-statuses', ...);
    Route::get('/orders/get-cashier-url', ...);
    Route::get('/storefront-url', ...);
    Route::post('/orders/save-table-layout', ...);
    Route::get('/orders/get-table-qr-url', ...);
    
    // Catch-all for TastyIgniter admin pages
    Route::any('{slug}', 'System\Classes\Controller@runAdmin')
        ->where('slug', '(.*)?');
});

Route::any('admin', 'System\Classes\Controller@runAdmin');
```

**Middleware**: `['web']` only - NO explicit tenant middleware  
**Database**: Uses whatever the **default connection** is at request time  

**Scoping**:
- ⚠️ **Assumes tenant context is already established**
- If user accesses `https://tenant-a.paymydine.com/admin`, expects tenant-specific data
- If user accesses `https://paymydine.com/admin`, uses central DB

**Tenant Isolation Mechanism**:
- **NOT via route middleware**
- **Must be via**:
  1. Global middleware applied to all routes, OR
  2. Auth system that sets connection before routing, OR
  3. TastyIgniter's `System\Classes\Controller@runAdmin` internally handling connection switching

### 2. Superadmin Routes (Central Context)

**File**: `routes.php:205-260`, `app/admin/routes.php:208-263`

These routes **explicitly bypass tenant middleware**:

#### QR Redirect (WITH tenant middleware)
```php
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```
**Purpose**: Redirects QR code scans to tenant-specific frontend  
**Scoping**: Needs tenant context to determine correct redirect URL

#### Superadmin Management Pages (WITHOUT tenant middleware)
```php
Route::get('/new', [SuperAdminController::class, 'showNewPage'])
    ->name('superadmin.new')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/index', [SuperAdminController::class, 'showIndex'])
    ->name('superadmin.index')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/settings', [SuperAdminController::class, 'settings'])
    ->name('superadmin.settings')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::match(['get', 'post'], '/new/store', [SuperAdminController::class, 'store'])
    ->name('superadmin.store')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::match(['get', 'post'], '/tenants/update', [SuperAdminController::class, 'update'])
    ->name('tenants.update')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/tenants/delete/{id}', [SuperAdminController::class, 'delete'])
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/superadmin/login', [SuperAdminController::class, 'login'])
    ->name('login.new')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::post('/superadmin/sign', [SuperAdminController::class, 'sign'])
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/superadmin/signout', [SuperAdminController::class, 'signOut'])
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::post('/superadmin/settings/update', [SuperAdminController::class, 'updateSettings'])
    ->name('superadmin.update')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

**Middleware**: `'superadmin.auth'` on some routes (custom auth middleware)  
**Scoping**: Central DB access, bypasses tenant isolation  
**Database**: Uses `mysql` connection (central DB)

#### Tenant Status Toggle (WITHOUT tenant middleware + explicit connection)
```php
Route::post('/tenant/update-status', function (Request $request) {
    $id = $request->input('id');
    $status = $request->input('status') === 'activate' ? 'active' : 'disabled';

    $updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);

    if ($updated) {
        return response()->json(['success' => true]);
    } else {
        return response()->json(['success' => false, 'error' => 'Failed to update']);
    }
})->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

**Explicit connection**: `DB::connection('mysql')`  
**Scoping**: Central DB for tenant registry management

#### Helper Routes (WITHOUT tenant middleware)
```php
Route::post('/orders/save-table-layout', ...)
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/orders/get-table-qr-url', ...)
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

**⚠️ Unclear**: These routes handle order/table operations but bypass tenant middleware. Why?
- Possibly used by superadmin to manage tenant tables?
- Or: Bugs - should have tenant middleware?

---

## Middleware Bypass Pattern

### `withoutMiddleware()` Usage

The code uses `->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class])` extensively.

**Implication**: There must be a **global middleware** that applies `TenantDatabaseMiddleware` to all routes by default.

**Evidence**:
- From `_tenant_investigation/logs/middleware_current.txt`, TenantDatabaseMiddleware is referenced in many places
- Not found in route group middleware arrays
- Must be in a service provider or HTTP Kernel's global/web middleware stack

### Where is Global Middleware Applied?

**File**: `app/admin/ServiceProvider.php:57` (from logs)
```
app//admin/ServiceProvider.php:57:        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class])
```

**Hypothesis**: Admin ServiceProvider registers admin routes with tenant middleware applied globally, then specific routes opt out.

**File**: `app/Http/Kernel.php`
Does NOT show TenantDatabaseMiddleware in global middleware (only in route middleware aliases):
```php
protected $routeMiddleware = [
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
    // ...
];
```

**Conclusion**: The use of `withoutMiddleware()` suggests TenantDatabaseMiddleware is applied at a higher level (likely in TastyIgniter's core or Admin ServiceProvider).

---

## Admin Authentication & Authorization

### Superadmin Auth Middleware

**Usage**: `->middleware('superadmin.auth')`

**Not defined in** `app/Http/Kernel.php` (from the file we read)

**Hypothesis**: 
- Custom middleware alias registered in TastyIgniter's core or Admin package
- Likely checks for superadmin role/permission
- Probably also handles login redirect

### Tenant Admin Auth

**Not explicitly seen in routes**

**Likely handled by**:
- TastyIgniter's `System\Classes\Controller@runAdmin`
- Internal auth checks within admin controllers
- Session-based auth tied to tenant context

---

## Admin Dashboard & Login Flow

### Tenant Admin Login
1. User visits `https://tenant-a.paymydine.com/admin`
2. Tenant middleware (if global) switches to `tenant-a` database
3. TastyIgniter's admin controller checks authentication against `tenant-a` DB
4. If not authenticated, shows login page
5. Login credentials checked against `tenant-a`'s staff/users table
6. Session created, tied to `tenant-a` context

### Superadmin Login
1. User visits `https://paymydine.com/superadmin/login` or `/index`
2. Route bypasses tenant middleware (`withoutMiddleware()`)
3. Uses central `mysql` connection
4. SuperAdminController checks credentials against central DB (not shown in routes file)
5. Session created, but **not tied to any tenant**
6. Can access tenant management routes (`/new`, `/tenants/update`, etc.)

---

## Order Helper Routes Scoping

### Routes WITH `withoutMiddleware`

These routes bypass tenant middleware but deal with tenant-specific data:

```php
Route::post('/orders/save-table-layout', ...)
    ->withoutMiddleware([TenantDatabaseMiddleware::class]);

Route::get('/orders/get-table-qr-url', ...)
    ->withoutMiddleware([TenantDatabaseMiddleware::class]);
```

**Problem**: How do these access tenant data without tenant middleware?

**Hypothesis 1**: They use explicit `DB::connection('tenant')` or `DB::connection($tenantDb)` internally.

**Hypothesis 2**: They're **buggy** and should have tenant middleware.

**Hypothesis 3**: They're only used in a superadmin context where the admin manually specifies which tenant's data to access.

### Routes WITHOUT `withoutMiddleware`

These routes are in the main admin group and **don't bypass** tenant middleware (assuming global middleware exists):

```php
Route::get('/orders/get-table-statuses', ...);
Route::get('/orders/get-cashier-url', ...);
Route::get('/storefront-url', ...);
```

**These DO access tenant-specific data**:
- Table statuses from orders
- Cashier URL for a location
- Storefront URL

**Expected behavior**: Use tenant database via global middleware or internal connection switching.

---

## Request Flow Diagrams

### Tenant Admin Request Flow

```
User Request: https://tenant-a.paymydine.com/admin/orders
    ↓
[Web Middleware]
    ↓
[Global Tenant Middleware?] ← Switches to tenant-a DB
    ↓
[Route: /admin/{slug}]
    ↓
[System\Classes\Controller@runAdmin]
    ↓
[TastyIgniter Admin Panel]
    ↓
[Queries use default connection = tenant-a]
    ↓
Response
```

### Superadmin Request Flow

```
User Request: https://paymydine.com/new
    ↓
[Web Middleware]
    ↓
[Global Tenant Middleware?] → withoutMiddleware() bypasses ← Uses mysql (central) DB
    ↓
[Route: /new]
    ↓
[SuperAdminController@showNewPage]
    ↓
[superadmin.auth middleware check]
    ↓
[Queries use mysql connection (explicit DB::connection('mysql'))]
    ↓
Response
```

---

## Old Version Comparison

### Routes Structure

**File**: `oldversionfiels/routes.php`

**Same pattern**:
- Main admin group with `['web']` middleware
- Superadmin routes with `withoutMiddleware(TenantDatabaseMiddleware)`
- `/redirect/qr` with `TenantDatabaseMiddleware`

**No significant differences in admin scoping between current and old versions**.

---

## Evidence Summary

### From Route Files

**Current** (`routes.php:206-260`, `app/admin/routes.php:208-263`):
- 1 route **with** `TenantDatabaseMiddleware`: `/redirect/qr`
- 15+ routes **without** `TenantDatabaseMiddleware` (superadmin routes, helpers)

**Old** (`oldversionfiels/routes.php:28-83`):
- Same pattern

### From Middleware Logs

**File**: `_tenant_investigation/logs/middleware_current.txt`

Shows extensive use of `withoutMiddleware(TenantDatabaseMiddleware)` but:
- **No route groups have `tenant.database` or `TenantDatabaseMiddleware` in middleware arrays**
- Implies global application with selective bypass

---

## Analysis: Admin Isolation

### What IS Isolated

✅ **Tenant admin panels** (assuming global middleware):
- Each tenant's admin only sees their own data
- Login credentials checked against tenant DB
- Queries scoped to tenant DB

✅ **Superadmin routes**:
- Explicitly bypass tenant middleware
- Use central DB for tenant management
- Auth checked against central DB or separate superadmin table

### What is NOT Isolated

❌ **Admin sessions** (see `04_storage_cache_session_queue.md`):
- Session cookie not scoped by subdomain
- Session data not validated against tenant ID
- Potential for session confusion across tenants

❌ **Admin cache** (see `04_storage_cache_session_queue.md`):
- Cache prefix shared across all tenants
- Admin-cached data (menu lists, settings, etc.) can collide

❌ **Admin file uploads** (see `04_storage_cache_session_queue.md`):
- All tenants share `storage/app` and `assets/media`
- Menu images, logos, documents not isolated by filesystem

### Unclear / Needs Investigation

⚠️ **Order helper routes without tenant middleware**:
- `/orders/save-table-layout`
- `/orders/get-table-qr-url`
- Why do these bypass tenant middleware?
- Do they access tenant data? If so, how?

⚠️ **Global middleware application**:
- Where is `TenantDatabaseMiddleware` applied globally?
- ServiceProvider? HTTP Kernel? TastyIgniter core?
- Need to confirm this exists

---

## Recommendations

### 1. Document Global Middleware Registration
- Locate where `TenantDatabaseMiddleware` is registered globally
- Add comment explaining the pattern: "Global middleware with selective bypass for superadmin"

### 2. Audit Helper Routes
- Determine if `/orders/save-table-layout` and `/orders/get-table-qr-url` should have tenant middleware
- If they need tenant context, remove `withoutMiddleware()`
- If they're superadmin-only, add `superadmin.auth` middleware

### 3. Scope Admin Sessions
- Add tenant ID validation to session (see recommendations in `04_storage_cache_session_queue.md`)
- Scope session cookie to subdomain

### 4. Add Tenant Context to Admin UI
- Show current tenant info in admin header (e.g., "Logged in as: Tenant A Admin")
- Visual indicator if user is in superadmin mode vs tenant admin mode

### 5. Separate Superadmin from Tenant Admin
- Consider separate URL path for superadmin (`/superadmin/*` vs `/admin/*`)
- Different login pages, different sessions
- Clearer separation of concerns

---

## Summary

### Current Version
- **Tenant admin routes**: Rely on global middleware (assumed) for database switching
- **Superadmin routes**: Explicitly bypass tenant middleware, use central DB
- **Scoping mechanism**: `withoutMiddleware()` pattern suggests global middleware
- **Auth**: Separate `superadmin.auth` middleware for superadmin routes

### Old Version
- **Identical pattern to current version**
- No differences in admin scoping approach

### Key Insight
The admin scoping **relies on global middleware that is not visible in the routes files**. This is likely handled by TastyIgniter's core or a ServiceProvider. The use of `withoutMiddleware()` confirms this pattern.

**Critical question**: Where is the global middleware registered, and does it apply to ALL routes or just admin routes?

