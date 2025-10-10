# Side-by-Side Diffs: Key Files

This document provides file-by-file comparisons of key tenant-related code between current and old versions.

---

## 1. routes.php (Main Route File)

### File Locations
- **Current**: `routes.php` (1,077 lines)
- **Old**: `oldversionfiels/routes.php` (522 lines)

### Key Differences

#### Admin Group (Line ~16)
**Both versions**:
```php
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // ...
});
```
**✅ Identical**

#### Superadmin Routes (Lines 205-260 current, 28-83 old)
**Both versions**:
- Use `withoutMiddleware(TenantDatabaseMiddleware)`
- Have `/redirect/qr` with tenant middleware
- Have tenant management routes
- Use `DB::connection('mysql')` for central DB access

**✅ Essentially identical** (same pattern)

#### Frontend API Routes (Lines 359-371 current, 87-99 old)

**Current** (`routes.php:359-371`):
```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**Old** (`oldversionfiels/routes.php:87-99`):
```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**✅ Identical** - no tenant middleware in either version

#### ⚠️ CRITICAL DIFFERENCE: Custom API Routes (Lines 374-917 current, 102-521 old)

**Current** (`routes.php:374-376`):
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ⚠️⚠️⚠️ HAS TENANT MIDDLEWARE
], function () {
    // Payments, menu, categories, restaurant, settings, orders endpoints
    // ...
});
```

**Old** (`oldversionfiels/routes.php:102-104`):
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️⚠️⚠️ NO TENANT MIDDLEWARE
], function () {
    // Menu, categories, restaurant, settings endpoints
    // ...
});
```

**🔴 MAJOR DIFFERENCE**: Current version adds `'detect.tenant'` middleware to custom API routes, old version does not.

**Impact**:
- **Old version**: API routes use default connection (likely central DB if no global middleware)
- **Current version**: API routes should switch to tenant DB based on subdomain/headers

#### Additional Routes in Current Version

**Current** has additional route groups not in old:
1. **Public API Routes** (lines 930-1057): Waiter calls, table notes, nested inside api/v1
2. **Admin Notifications API** (lines 1061-1076): JSON API for notifications

**Old** version ends at line 522, does not have these.

### Summary: routes.php
| Feature | Current | Old | Impact |
|---------|---------|-----|--------|
| Admin group | `['web']` | `['web']` | Same |
| Superadmin routes | `withoutMiddleware()` | `withoutMiddleware()` | Same |
| Frontend API (Admin\Controllers\Api) | `['api']` | `['api']` | Same |
| **Custom API routes** | **`['web', 'detect.tenant']`** | **`['web']`** | **DIFFERENT** 🔴 |
| Public API routes | Present | Absent | Added in current |
| Notifications API | Present | Absent | Added in current |

---

## 2. app/admin/routes.php (Admin Routes File)

### File Locations
- **Current**: `app/admin/routes.php` (1,086 lines)
- **Old**: `oldversionfiels/app/admin/routes.php` (24 lines - minimal!)

### Key Differences

#### Current Version Structure
Has the **same extensive structure as `routes.php`**:
- Admin group with helper routes
- Superadmin routes
- Frontend API routes
- Custom API routes (but **WITHOUT** `detect.tenant`!)
- Public API routes
- Notifications API

#### Old Version Structure
**Extremely minimal**:
```php
<?php
App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');
        Route::any('{slug}', 'System\Classes\Controller@runAdmin')
            ->where('slug', '(.*)?');
    });
    Route::any(config('system.adminUri', 'admin'), 'System\Classes\Controller@runAdmin');
});
```

**Just 24 lines**: Only assets combiner and admin catch-all.

#### ⚠️ CRITICAL DIFFERENCE: Custom API Routes (Line 378-380 current, absent in old)

**Current** (`app/admin/routes.php:378-380`):
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️⚠️⚠️ NO TENANT MIDDLEWARE (different from routes.php!)
], function () {
    // Same routes as routes.php
});
```

**Old**: Does not have this route group at all.

**🔴 INCONSISTENCY**: Current `app/admin/routes.php` has api/v1 routes WITHOUT tenant middleware, while `routes.php` has them WITH tenant middleware.

### Summary: app/admin/routes.php
| Feature | Current | Old |
|---------|---------|-----|
| Admin group | Full (matches routes.php) | Minimal (just assets + catch-all) |
| Superadmin routes | Present (matches routes.php) | Absent |
| Frontend API | Present (matches routes.php) | Absent |
| **Custom API routes** | **Present WITHOUT detect.tenant** | **Absent** |
| Public API routes | Present | Absent |
| Notifications API | Present | Absent |

**Question**: **Which file is loaded?** If both are loaded, routes will conflict or override each other.

---

## 3. app/Http/Middleware/DetectTenant.php

### Key Differences

#### Tenant Detection Logic
**Both versions**:
```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```
**✅ Identical**

#### Database Lookup
**Both versions**:
```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```
**✅ Identical**

#### Connection Switching

**Current** (lines 35-49):
```php
if ($tenant && $tenant->database) {
    // Configure tenant connection dynamically
    Config::set('database.connections.tenant.database', $tenant->database);
    Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
    Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
    Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
    Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
    
    // Reconnect to tenant database
    DB::purge('tenant');
    DB::reconnect('tenant');
    
    // Set tenant as default connection for this request
    Config::set('database.default', 'tenant');
    DB::setDefaultConnection('tenant');
    
    // Store tenant info in request and app container
    $request->attributes->set('tenant', $tenant);
    app()->instance('tenant', $tenant);
    
    Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
}
```

**Old** (lines 35-43):
```php
if ($tenant && $tenant->database) {
    // Switch to tenant database
    Config::set('database.connections.tenant.database', $tenant->database);
    DB::setDefaultConnection('tenant');
    
    // Store tenant info in request for later use
    $request->attributes->set('tenant', $tenant);
    
    Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
}
```

**🔴 CRITICAL DIFFERENCES**:

| Feature | Current | Old | Impact |
|---------|---------|-----|--------|
| Set host/port/user/pass | ✅ Yes | ❌ No | Current supports tenants on different servers |
| Purge & reconnect | ✅ Yes | ❌ No | Old may use stale connection |
| Set default connection | ✅ Via Config + DB | ✅ Via DB only | Both set default |
| Store in app container | ✅ Yes | ❌ No | Current makes tenant available globally |

**Old version limitations**:
- Cannot connect to tenants on different DB hosts
- May encounter connection pooling issues without purge
- No global app container access to tenant object

### Summary: DetectTenant.php
**Current version is significantly enhanced** to support multi-server tenancy and better connection management.

---

## 4. app/Http/Middleware/TenantDatabaseMiddleware.php

### Key Differences

**Both versions are IDENTICAL** (63 lines):

```php
class TenantDatabaseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->extractTenantFromDomain($request);
        
        if ($tenant) {
            $tenantInfo = DB::connection('mysql')->table('ti_tenants')
                ->where('domain', $tenant . '.paymydine.com')
                ->where('status', 'active')
                ->first();
            
            if ($tenantInfo) {
                // Switch to tenant database
                Config::set('database.connections.mysql.database', $tenantInfo->database);
                
                // Reconnect with new database
                DB::purge('mysql');
                DB::reconnect('mysql');
                
                $request->attributes->set('tenant', $tenantInfo);
            } else {
                return response()->json(['error' => 'Restaurant not found or inactive'], 404);
            }
        } else {
            return response()->json(['error' => 'Invalid domain'], 400);
        }
        
        return $next($request);
    }
    
    private function extractTenantFromDomain(Request $request) {
        // ... (same in both versions)
    }
}
```

**⚠️ Note**: This middleware **overwrites the `mysql` connection** instead of using a separate `tenant` connection.

### Summary: TenantDatabaseMiddleware.php
**✅ No differences between current and old versions.**

---

## 5. app/Http/Kernel.php

### Middleware Registration

**Both versions**:
```php
protected $routeMiddleware = [
    'auth' => \App\Http\Middleware\Authenticate::class,
    // ... other middleware
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
    'cors' => \App\Http\Middleware\CorsMiddleware::class,
];
```

**✅ Identical** - both versions register the same middleware aliases.

### Summary: Kernel.php
**No differences** in middleware registration.

---

## 6. config/database.php

### Connection Definitions

**Both versions**:
```php
'default' => env('DB_CONNECTION', 'mysql'),

'mysql' => [
    'database' => env('DB_DATABASE', 'paymydine'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],

'tenant' => [
    'database' => env('DB_DATABASE', 'taste'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],
```

**✅ Identical** - same connection configurations.

### Summary: database.php
**No differences** in database configuration.

---

## 7. config/cache.php

**Both versions** (line 98):
```php
'prefix' => env('CACHE_PREFIX', 'tenant_default_cache'),
```

**✅ Identical** - same static cache prefix (not tenant-aware).

### Summary: cache.php
**No differences** in cache configuration.

---

## 8. config/session.php

**Both versions**:
```php
'driver' => env('SESSION_DRIVER', 'file'),
'files' => storage_path('framework/sessions'),
'cookie' => env('SESSION_COOKIE', str_slug(env('APP_NAME', 'tastyigniter'), '_').'_session'),
'domain' => env('SESSION_DOMAIN', null),
```

**✅ Identical** - same session configuration (not tenant-aware).

### Summary: session.php
**No differences** in session configuration.

---

## 9. config/filesystems.php

**Both versions**:
```php
'default' => env('FILESYSTEM_DRIVER', 'local'),

'local' => [
    'root' => storage_path('app'),
],

'media' => [
    'root' => assets_path('media'),
],
```

**✅ Identical** - same filesystem configuration (shared across tenants).

### Summary: filesystems.php
**No differences** in filesystem configuration.

---

## Summary of All Differences

### 🔴 Critical Differences

1. **routes.php - Custom API Routes**
   - **Current**: `['web', 'detect.tenant']` middleware
   - **Old**: `['web']` middleware only
   - **Impact**: Current version should isolate API routes by tenant, old does not

2. **DetectTenant.php - Connection Switching**
   - **Current**: Sets host/port/user/pass, purges connection, stores in app container
   - **Old**: Only sets database name, no purge, no app container
   - **Impact**: Current supports multi-server tenancy, old does not

3. **app/admin/routes.php - File Structure**
   - **Current**: Extensive (1,086 lines), duplicates routes.php but WITHOUT `detect.tenant` on API routes
   - **Old**: Minimal (24 lines), only admin catch-all
   - **Impact**: Unclear which file loads, potential route conflicts

### ✅ No Differences

4. **TenantDatabaseMiddleware.php** - Identical in both versions
5. **Kernel.php** - Identical middleware registration
6. **config/database.php** - Identical connection configs
7. **config/cache.php** - Identical (both not tenant-aware)
8. **config/session.php** - Identical (both not tenant-aware)
9. **config/filesystems.php** - Identical (both share storage)

### ⚠️ Added in Current Version (Not in Old)

10. **Additional Route Groups**:
    - Public API routes (waiter calls, table notes)
    - Admin Notifications API

---

## Impact Assessment

### Migration Path (Old → Current)

**What changed**:
1. ✅ **Improved** tenant detection (better connection handling)
2. ⚠️ **Changed** API route middleware (added tenant detection)
3. ⚠️ **Expanded** route file (app/admin/routes.php)

**Potential breaking changes**:
- API routes that worked on central DB in old version will now use tenant DB in current version
- May break integrations or admin tools that expect central DB access via API

**Recommendations**:
1. Verify which route file (`routes.php` or `app/admin/routes.php`) is actually loaded
2. If both load, resolve the conflict (likely last one wins)
3. Audit API clients - ensure they send proper tenant headers/subdomain
4. Test admin panel - ensure it still accesses correct tenant database

---

## File-by-File Evidence

### routes.php
- **Current**: 1,077 lines, has `detect.tenant` on api/v1 routes
- **Old**: 522 lines, no tenant middleware on api/v1 routes
- **Diff**: Lines 374-376 (middleware array)

### app/admin/routes.php
- **Current**: 1,086 lines, duplicates routes.php but api/v1 WITHOUT `detect.tenant`
- **Old**: 24 lines, minimal admin-only routes
- **Diff**: Entire file structure

### DetectTenant.php
- **Current**: 110 lines, full connection config + purge
- **Old**: 98 lines, database name only
- **Diff**: Lines 35-55 (connection switching logic)

### TenantDatabaseMiddleware.php
- **Current**: 63 lines
- **Old**: 63 lines
- **Diff**: None (identical)

### All config files
- **Diff**: None (all identical)

---

## Visualization: Middleware Flow

### Old Version
```
API Request → [web middleware] → [NO tenant middleware] → Controller → Central/Default DB
```

### Current Version (routes.php)
```
API Request → [web middleware] → [detect.tenant middleware] → Tenant DB Switch → Controller → Tenant DB
```

### Current Version (app/admin/routes.php - if loaded)
```
API Request → [web middleware] → [NO tenant middleware] → Controller → Central/Default DB (?)
```

**⚠️ Conflict**: Two route files define same routes with different middleware!

