# PayMyDine Multi-Tenant Cross-Bleed Investigation Report

**Date**: October 9, 2024  
**Investigator**: AI Assistant (Claude)  
**Method**: Read-only analysis (no code changes, no DB writes)  
**Issue**: Actions in tenant A (e.g., amir.paymydine.com) appear in tenant B (e.g., rosana.paymydine.com)

---

## A. Route & Middleware Registration (Primary)

### A.1 Route List Commands Executed

**Command 1**: Full route list with verbose output
```bash
php artisan route:list -v --columns=method,uri,action,middleware
```

**Output**:
```
+----------+------------------------------------------------+--------------------------------------------------------------+------------+
| Method   | URI                                            | Action                                                       | Middleware |
+----------+------------------------------------------------+--------------------------------------------------------------+------------+
| GET|HEAD | admin/notifications-api                        | Admin\Controllers\NotificationsApi@index                     | web        |
| GET|HEAD | admin/notifications-api/count                  | Admin\Controllers\NotificationsApi@count                     | web        |
| PATCH    | admin/notifications-api/mark-all-seen          | Admin\Controllers\NotificationsApi@markAllSeen               | web        |
| PATCH    | admin/notifications-api/{id}                   | Admin\Controllers\NotificationsApi@update                    | web        |
| POST     | admin/statuses/toggle-order-notifications      | Admin\Controllers\Statuses@toggleOrderNotifications          | web        |
|          |                                                |                                                              | admin      |
| GET|HEAD | api/v1/admin/notifications-api                 | Admin\Controllers\NotificationsApi@index                     | web        |
| GET|HEAD | api/v1/admin/notifications-api/count           | Admin\Controllers\NotificationsApi@count                     | web        |
| PATCH    | api/v1/admin/notifications-api/mark-all-seen   | Admin\Controllers\NotificationsApi@markAllSeen               | web        |
| PATCH    | api/v1/admin/notifications-api/{id}            | Admin\Controllers\NotificationsApi@update                    | web        |
| GET|HEAD | api/v1/api/v1/history                          | Admin\Controllers\History@index                              | web        |
| POST     | api/v1/api/v1/table-notes                      | Closure                                                      | web        |
| POST     | api/v1/api/v1/waiter-call                      | Closure                                                      | web        |
| GET|HEAD | api/v1/categories                              | Closure                                                      | web        |
| GET|HEAD | api/v1/current-table                           | Closure                                                      | web        |
| GET|HEAD | api/v1/images                                  | Closure                                                      | web        |
| GET|HEAD | api/v1/menu                                    | Closure                                                      | web        |
| GET|HEAD | api/v1/order-status                            | Closure                                                      | web        |
| POST     | api/v1/order-status                            | Closure                                                      | web        |
| POST     | api/v1/orders                                  | Closure                                                      | web        |
| GET|HEAD | api/v1/payments                                | Closure                                                      | web        |
| GET|HEAD | api/v1/restaurant                              | Closure                                                      | web        |
| GET|HEAD | api/v1/restaurant/{locationId}                 | Admin\Controllers\Api\RestaurantController@getRestaurantInfo | api        |
| GET|HEAD | api/v1/restaurant/{locationId}/menu            | Admin\Controllers\Api\RestaurantController@getMenu           | api        |
| POST     | api/v1/restaurant/{locationId}/order           | Admin\Controllers\Api\OrderController@createOrder            | api        |
| GET|HEAD | api/v1/restaurant/{locationId}/order/{orderId} | Admin\Controllers\Api\OrderController@getOrderStatus         | api        |
| POST     | api/v1/restaurant/{locationId}/waiter          | Admin\Controllers\Api\OrderController@requestWaiter          | api        |
| GET|HEAD | api/v1/settings                                | Closure                                                      | web        |
| GET|HEAD | api/v1/table-info                              | Closure                                                      | web        |
| POST     | api/v1/webhooks/pos                            | Admin\Controllers\Api\PosWebhookController@handle            | api        |
| GET|HEAD | superadmin/index                               | Admin\Controllers\SuperAdminController@showIndex             | web        |
| GET|HEAD | superadmin/new                                 | Admin\Controllers\SuperAdminController@showNewPage           | web        |
| GET|HEAD | superadmin/settings                            | Admin\Controllers\SuperAdminController@settings              | web        |
| POST     | superadmin/sign                                | Admin\Controllers\SuperAdminController@sign                  | web        |
| GET|HEAD | superadmin/signout                             | Admin\Controllers\SuperAdminController@signOut               | web        |
+----------+------------------------------------------------+--------------------------------------------------------------+------------+
```

**Total routes**: 34  
**Routes with `detect.tenant`**: 0  
**Routes with `tenant.database`**: 0  
**Routes with ONLY `web` or `api`**: 34 (100%)

---

**Command 2**: API v1 routes specifically
```bash
php artisan route:list --path=api/v1 -v
```

**Output**: Same 24 routes as above (subset filtered by prefix)

**Grep for tenant middleware in output**:
```bash
php artisan route:list | grep -i "tenant"
```
**Result**: No matches found

---

### A.2 Route Loading Mechanism Analysis

#### Question: Is routes/api.php loaded by this app?

**File System Evidence**:
```bash
ls -la routes/
```
**Output**:
```
total 48
drwxr-xr-x@  4 amir  staff    128 Oct  9 07:22 .
drwxr-xr-x@ 80 amir  staff   2560 Oct  9 19:18 ..
-rw-r--r--@  1 amir  staff  18384 Oct  9 07:22 api.php      # EXISTS (18KB)
-rwxr-xr-x@  1 amir  staff   1131 Oct  9 07:22 notifications.txt
```

**File `routes/api.php` EXISTS** (18,384 bytes, last modified Oct 9)

---

**Code Evidence - routes/api.php Header** (Lines 1-19):
```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\CategoryController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/
```

Comment says "loaded by the RouteServiceProvider" but:

---

**RouteServiceProvider Search**:
```bash
find . -name "RouteServiceProvider.php" -not -path "*/vendor/*" -not -path "*/node_modules/*"
```
**Result**: No file found in app/ directory

---

**TastyIgniter Route Loading - routes.php** (Lines 1-10):
```php
<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use App\Admin\Controllers\NotificationsApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

App::before(function () {
    /*
     * Register Admin app routes
```

**Evidence**: TastyIgniter framework uses `App::before()` callback to register routes, NOT standard Laravel RouteServiceProvider.

**Conclusion**: `routes/api.php` is **NOT loaded** by this application. Only `routes.php` is processed.

---

**Proof via Missing Controllers**: Routes in api.php reference:
- `MenuController::class` - Admin route list shows `Closure` for `/api/v1/menu` (not controller)
- `OrderController::class` - Admin route list shows `Closure` for `/api/v1/orders` (not controller)
- `TableController::class` - Not found in route list at all

If api.php were loaded, these controller actions would appear in `route:list`. They don't.

---

### A.3 Route→Middleware Matrix

| # | Method | URI | Action | Middleware | Source | Writes DB? | Tenant Scoped? |
|---|--------|-----|--------|------------|--------|------------|----------------|
| **ADMIN NOTIFICATION API** |
| 1 | GET | `/admin/notifications-api` | NotificationsApi@index | `web` | routes.php:1075 | Read | ❌ NO |
| 2 | GET | `/admin/notifications-api/count` | NotificationsApi@count | `web` | routes.php:1076 | Read | ❌ NO |
| 3 | PATCH | `/admin/notifications-api/mark-all-seen` | NotificationsApi@markAllSeen | `web` | routes.php:1079 | **WRITE** | ❌ NO |
| 4 | PATCH | `/admin/notifications-api/{id}` | NotificationsApi@update | `web` | routes.php:1078 | **WRITE** | ❌ NO |
| 5 | POST | `/admin/statuses/toggle-order-notifications` | Statuses@toggleOrderNotifications | `web`, `admin` | routes.php:1083 | **WRITE** | ❌ NO |
| **DUPLICATE NOTIFICATION API (nested prefix)** |
| 6 | GET | `/api/v1/admin/notifications-api` | NotificationsApi@index | `web` | routes.php:925 | Read | ❌ NO |
| 7 | GET | `/api/v1/admin/notifications-api/count` | NotificationsApi@count | `web` | routes.php:926 | Read | ❌ NO |
| 8 | PATCH | `/api/v1/admin/notifications-api/mark-all-seen` | NotificationsApi@markAllSeen | `web` | routes.php:929 | **WRITE** | ❌ NO |
| 9 | PATCH | `/api/v1/admin/notifications-api/{id}` | NotificationsApi@update | `web` | routes.php:928 | **WRITE** | ❌ NO |
| **MALFORMED ROUTES (double prefix /api/v1/api/v1)** |
| 10 | GET | `/api/v1/api/v1/history` | History@index | `web` | routes.php:1059 | Read | ❌ NO |
| 11 | POST | `/api/v1/api/v1/table-notes` | Closure | `web` | routes.php:997 | **WRITE** | ❌ NO |
| 12 | POST | `/api/v1/api/v1/waiter-call` | Closure | `web` | routes.php:936 | **WRITE** | ❌ NO |
| **TENANT-FACING API ROUTES** |
| 13 | GET | `/api/v1/categories` | Closure | `web` | routes.php:458 | Read | ❌ NO |
| 14 | GET | `/api/v1/current-table` | Closure | `web` | routes.php:879 | Read | ❌ NO |
| 15 | GET | `/api/v1/images` | Closure | `web` | routes.php:488 | Read | ❌ NO |
| 16 | GET | `/api/v1/menu` | Closure | `web` | routes.php:396 | Read | ❌ NO |
| 17 | GET | `/api/v1/order-status` | Closure | `web` | routes.php:725 | Read | ❌ NO |
| 18 | POST | `/api/v1/order-status` | Closure | `web` | routes.php:792 | **WRITE** | ❌ NO |
| 19 | POST | `/api/v1/orders` | Closure | `web` | routes.php:584 | **WRITE** | ❌ NO |
| 20 | GET | `/api/v1/payments` | Closure | `web` | routes.php:383 | Read | ❌ NO |
| 21 | GET | `/api/v1/restaurant` | Closure | `web` | routes.php:526 | Read | ❌ NO |
| 22 | GET | `/api/v1/settings` | Closure | `web` | routes.php:555 | Read | ❌ NO |
| 23 | GET | `/api/v1/table-info` | Closure | `web` | routes.php:839 | Read | ❌ NO |
| **ADMIN CONTROLLER ROUTES** |
| 24 | GET | `/api/v1/restaurant/{locationId}` | RestaurantController@getRestaurantInfo | `api` | routes.php:367 | Read | ❌ NO |
| 25 | GET | `/api/v1/restaurant/{locationId}/menu` | RestaurantController@getMenu | `api` | routes.php:368 | Read | ❌ NO |
| 26 | POST | `/api/v1/restaurant/{locationId}/order` | OrderController@createOrder | `api` | routes.php:372 | **WRITE** | ❌ NO |
| 27 | GET | `/api/v1/restaurant/{locationId}/order/{orderId}` | OrderController@getOrderStatus | `api` | routes.php:373 | Read | ❌ NO |
| 28 | POST | `/api/v1/restaurant/{locationId}/waiter` | OrderController@requestWaiter | `api` | routes.php:374 | **WRITE** | ❌ NO |
| 29 | POST | `/api/v1/webhooks/pos` | PosWebhookController@handle | `api` | routes.php:369 | **WRITE** | ❌ NO |
| **SUPERADMIN ROUTES** |
| 30 | GET | `/superadmin/index` | SuperAdminController@showIndex | `web` | routes.php:217 | Read | ⚠️ Main DB (intentional) |
| 31 | GET | `/superadmin/new` | SuperAdminController@showNewPage | `web` | routes.php:212 | Read | ⚠️ Main DB (intentional) |
| 32 | GET | `/superadmin/settings` | SuperAdminController@settings | `web` | routes.php:222 | Read | ⚠️ Main DB (intentional) |
| 33 | POST | `/superadmin/sign` | SuperAdminController@sign | `web` | routes.php:244 | **WRITE** | ⚠️ Main DB (intentional) |
| 34 | GET | `/superadmin/signout` | SuperAdminController@signOut | `web` | routes.php:247 | Read | ⚠️ Main DB (intentional) |

**Summary Statistics**:
- **Total Routes**: 34
- **Routes with Tenant Middleware**: 0 (0%)
- **Routes WITHOUT Tenant Middleware**: 34 (100%)
- **Routes Writing to DB**: 11
- **Write Routes WITHOUT Tenant MW**: 11 (100%)

**Critical Write Endpoints Without Tenant Middleware**:
1. `POST /api/v1/orders` (Line 19) - Creates orders in main DB
2. `POST /api/v1/order-status` (Line 18) - Updates orders in main DB
3. `PATCH /admin/notifications-api/{id}` (Lines 4, 9) - Updates notifications
4. `POST /api/v1/restaurant/{locationId}/order` (Line 26) - Creates orders
5. `POST /api/v1/api/v1/waiter-call` (Line 12) - Creates waiter calls
6. `POST /api/v1/api/v1/table-notes` (Line 11) - Creates table notes

---

### A.4 Middleware Group Definitions

**File**: `app/Http/Kernel.php:18-33`

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

**Neither `web` nor `api` groups include tenant middleware.**

---

### A.5 Duplicate & Malformed Routes

**Issue 1: Double Prefix Routes**
- `/api/v1/api/v1/history`
- `/api/v1/api/v1/table-notes`
- `/api/v1/api/v1/waiter-call`

**Cause**: `routes.php:934` - Nested route group with duplicate prefix:
```php
// Line 378: First api/v1 prefix
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
    // ...
    
    // Line 934: Second api/v1 prefix INSIDE first group
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::post('/waiter-call', function (Request $request) {
            // Results in /api/v1/api/v1/waiter-call
```

**Issue 2: Duplicate Notification API Routes**
- Lines 1065-1070: First definition (NO middleware)
- Lines 1075-1080: Second definition (`web` middleware)

Same routes registered twice with different middleware.

---

## B. Tenant Middleware Implementations (Secondary)

### B.1 DetectTenant Middleware

**File**: `app/Http/Middleware/DetectTenant.php`

#### Registration
**File**: `app/Http/Kernel.php:53`
```php
'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
```

#### Tenant Resolution (Lines 23-25)
```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

**Method**: 
1. Check custom headers (proxy support)
2. Extract from host (e.g., `rosana.paymydine.com` → `rosana`)

**extractSubdomainFromHost()** (Lines 87-109):
```php
private function extractSubdomainFromHost($host)
{
    if (!$host) {
        return null;
    }

    $parts = explode('.', $host);
    
    // If we have at least 3 parts (subdomain.domain.tld), return the first part
    if (count($parts) >= 3) {
        return $parts[0];
    }

    // If we have 2 parts, check if it's not the main domain
    if (count($parts) === 2) {
        $mainDomains = ['paymydine.com', 'localhost'];
        if (!in_array($host, $mainDomains)) {
            return $parts[0];
        }
    }

    return null;
}
```

#### Tenant Lookup (Lines 30-33)
```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```

**Query**: Uses LIKE pattern for flexible domain matching

#### Connection Configuration (Lines 36-49)
```php
// Configure tenant connection
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
```

**Strategy**: 
- Creates/configures separate `tenant` connection
- **Sets `tenant` as DEFAULT connection** ✓
- Purges and reconnects

**Tenant Context Storage** (Lines 52-53):
```php
$request->attributes->set('tenant', $tenant);
app()->instance('tenant', $tenant);
```

Stores in request attributes AND app container.

#### Is This Middleware Active?
**From `php artisan route:list`**: NO - Not found on any route

---

### B.2 TenantDatabaseMiddleware

**File**: `app/Http/Middleware/TenantDatabaseMiddleware.php`

#### Registration
**File**: `app/Http/Kernel.php:54`
```php
'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
```

#### Tenant Resolution (Lines 46-61)
```php
private function extractTenantFromDomain(Request $request)
{
    $hostname = $request->getHost();
    $parts = explode('.', $hostname);
    
    // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
    if (count($parts) >= 3 && $parts[1] === 'paymydine') {
        return $parts[0];
    }
    
    // For development/testing, also check for localhost patterns
    if (count($parts) >= 2 && $parts[0] !== 'www') {
        return $parts[0];
    }
    
    return null;
}
```

**Method**: Direct host parsing (no header support)

#### Tenant Lookup (Lines 19-22)
```php
$tenantInfo = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', $tenant . '.paymydine.com')
    ->where('status', 'active')
    ->first();
```

**Query**: Exact match with hardcoded `.paymydine.com` suffix

#### Connection Configuration (Lines 25-30)
```php
// Switch to tenant database
Config::set('database.connections.mysql.database', $tenantInfo->database);

// Reconnect with new database
DB::purge('mysql');
DB::reconnect('mysql');
```

**Strategy**: 
- Reconfigures `mysql` connection in-place
- **Does NOT set default connection** ⚠️
- Race condition risk (shared connection mutated)

**Tenant Context Storage** (Line 33):
```php
$request->attributes->set('tenant', $tenantInfo);
```

Only in request attributes (not app container).

#### Is This Middleware Active?
**From `php artisan route:list`**: NO - Not found on any route

---

### B.3 Middleware Comparison Summary

| Aspect | DetectTenant | TenantDatabaseMiddleware |
|--------|--------------|--------------------------|
| **Registered As** | `detect.tenant` | `tenant.database` |
| **Active on Routes?** | ❌ NO | ❌ NO |
| **Subdomain Parsing** | Headers + host | Host only |
| **Domain Matching** | LIKE pattern | Exact match |
| **Connection Strategy** | Separate `tenant` conn | Mutates `mysql` conn |
| **Sets Default Conn** | ✓ YES (line 48-49) | ❌ NO |
| **Purge/Reconnect** | `tenant` conn (line 44-45) | `mysql` conn (line 29-30) |
| **Storage** | Request + container | Request only |
| **Race Condition Risk** | ✓ Safe | ⚠️ Risky |

**Conclusion**: Neither middleware is actually applied to any route in the running application.

---

## C. Database Inspection (Read-Only)

### C.1 Tenant Table Structure

**Command**:
```bash
mysql -u paymydine -p'P@ssw0rd@123' paymydine -e "DESCRIBE ti_tenants;"
```

**Output**:
```
Field       Type          Null  Key  Default             Extra
id          int           NO    PRI  NULL                auto_increment
name        varchar(255)  NO         NULL                
domain      varchar(255)  NO    UNI  NULL                
database    varchar(255)  NO    UNI  NULL                
email       varchar(255)  NO         NULL                
phone       varchar(20)   NO         NULL                
start       date          NO         NULL                
end         date          NO         NULL                
type        varchar(255)  YES        NULL                
country     varchar(255)  NO         NULL                
description varchar(1000) NO         NULL                
status      varchar(255)  NO         NULL                
created_at  timestamp     YES        CURRENT_TIMESTAMP   DEFAULT_GENERATED
updated_at  timestamp     YES        CURRENT_TIMESTAMP   DEFAULT_GENERATED on update CURRENT_TIMESTAMP
```

**Analysis**:
- ❌ **NO `db_host` column** - DetectTenant line 38 tries to read this
- ❌ **NO `db_port` column** - DetectTenant line 39 tries to read this
- ❌ **NO `db_user` column** - DetectTenant line 40 tries to read this
- ❌ **NO `db_pass` column** - DetectTenant line 41 tries to read this

**Conclusion**: DetectTenant's per-tenant credential support cannot work. Falls back to environment variables for all tenants. All tenants share same MySQL server.

---

### C.2 Tenant Data Sample

**Command**:
```bash
mysql -u paymydine -p'P@ssw0rd@123' paymydine -e "SELECT id, name, domain, \`database\`, status FROM ti_tenants LIMIT 50;"
```

**Output**:
```
id  name    domain                 database  status
23  rosana  rosana.paymydine.com   rosana    active
```

**Analysis**:
- Only **1 tenant** exists in database
- Domain format: `{subdomain}.paymydine.com`
- Database naming: Simple subdomain (`rosana`, not `rosana_db` or `tenant_rosana`)
- Status: String value `active` (not boolean)

---

### C.3 Database Configuration

**File**: `config/database.php:44-62` (mysql connection)
```php
'mysql' => [
    'driver' => 'mysql',
    'url' => env('DATABASE_URL'),
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'paymydine'),
    'username' => env('DB_USERNAME', 'paymydine'),
    'password' => env('DB_PASSWORD', 'P@ssw0rd@123'),
    'unix_socket' => env('DB_SOCKET', ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],
```

**From `.env`**:
```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=paymydine
DB_USERNAME=paymydine
DB_PASSWORD="P@ssw0rd@123"
DB_PREFIX=ti_
```

**Default Connection** (Line 16):
```php
'default' => env('DB_CONNECTION', 'mysql'),
```

**Result**: Without middleware, all queries hit `mysql` connection → `paymydine` database.

---

## D. QR and Cache Scoping (Observational)

### D.1 QR URL Construction

**Location 1**: `routes.php:328` (get-table-qr-url endpoint)
```php
// Build QR code URL (same logic as in tables/edit.blade.php)
$frontendUrl = env('FRONTEND_URL', config('app.url'));
    
$tableNumber = ($table->table_no > 0) ? $table->table_no : $tableId;
    
$qrUrl = rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
    'location' => $locationId,
    'guest' => $maxCapacity,
    'date' => $date,
    'time' => $time,
    'qr' => $table->qr_code,
    'table' => $tableNumber
]);
```

**Issue**: Uses global `env('FRONTEND_URL')` not `$request->getHost()`

**From `.env`**: `FRONTEND_URL` is NOT defined  
**Fallback**: `config('app.url')` = `env('APP_URL')` = `http://127.0.0.1:8000`

**Result**: QR URLs point to localhost, not tenant subdomain.

---

**Location 2**: `routes.php:95` (buildCashierTableUrl function)
```php
$frontendUrl = env('FRONTEND_URL', config('app.url'));
```

**Same issue**: Global URL, not request host.

---

**Location 3**: `routes.php:165` (get-cashier-url endpoint)
```php
$frontendUrl = env('FRONTEND_URL', config('app.url'));
```

**Same issue**: Global URL, not request host.

---

**Summary**: All 3 QR URL generators use:
```php
env('FRONTEND_URL', config('app.url'))  // ❌ Global (localhost)
```

**Should use**:
```php
$request->getScheme() . '://' . $request->getHost()  // ✓ Tenant-specific
```

---

### D.2 Cache Scoping

**File**: `config/cache.php:18`
```php
'default' => env('CACHE_DRIVER', 'file'),
```

**From `.env`**: `CACHE_DRIVER` not explicitly set  
**Active Driver**: `file`

**Cache Prefix** (Line 98):
```php
'prefix' => env('CACHE_PREFIX', 'tenant_default_cache'),
```

**Issue**: Prefix is **global**, not tenant-scoped (e.g., not `{tenant_id}:`)

---

**Cache Usage Search**:

**Found**: `app/Helpers/TableHelper.php:20` (GOOD - Uses scoped keys)
```php
// Use tenant-scoped cache key to avoid cross-tenant cache collisions
$cacheKey = TenantHelper::scopedCacheKey("table_info_{$tableId}");
return Cache::remember($cacheKey, 300, function() use ($tableId) {
```

**TenantHelper** (`app/Helpers/TenantHelper.php:40-43`):
```php
public static function scopedCacheKey(string $key): string
{
    return self::tenantCachePrefix() . $key;
}
```

Generates keys like: `tenant:rosana:table_info_5`

**Not Found**: Menu, Order, Notification, Settings caching  
**Conclusion**: Cache bleed is not primary issue (minimal caching used).

---

## E. Evidence Pack (Raw Outputs)

### E.1 Full Route List Output

See Section A.1 above (complete output included).

---

### E.2 Route→Middleware Matrix

See Section A.3 above (complete table with 34 routes).

---

### E.3 Tenant Middleware Application Evidence

**File**: `routes.php` - Search for `detect.tenant` usage:

```bash
grep -n "detect.tenant" routes.php
```
**Result**: No matches

```bash
grep -n "tenant.database" routes.php
```
**Result**: No matches

**File**: `routes/api.php:122` - Route group with tenant middleware:
```php
Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
    // 23 routes with proper middleware
```

**But**: This file is not loaded (proven in Section A.2).

---

### E.4 Database Structure & Sample

See Section C above (DESCRIBE + SELECT outputs included).

---

### E.5 Duplicate/Nested Route Groups

**Duplicate Prefix Issue** - `routes.php:378 + 934`:

**Line 378**:
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
    // ... 500+ lines ...
    
    // Line 934: NESTED group with SAME prefix
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::post('/waiter-call', function (Request $request) {
```

**Result**: Creates `/api/v1/api/v1/waiter-call` (malformed URL).

---

**Duplicate Notification Routes** - `routes.php:1065 + 1075`:

**Lines 1065-1070** (NO middleware):
```php
Route::group(['prefix' => 'admin/notifications-api'], function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

**Lines 1075-1080** (with `web` middleware):
```php
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

Same 4 routes defined twice with different middleware.

---

## F. Conclusions — Explicit Answers

### F.1 Is routes/api.php loaded by this app?

**Answer**: **NO**

**Proof**:
1. `php artisan route:list` shows 34 routes, NONE from api.php controllers
2. Routes in api.php reference `MenuController::class`, but route:list shows `Closure` for `/api/v1/menu`
3. No `RouteServiceProvider` exists in app/ directory
4. TastyIgniter uses `App::before()` callback in `routes.php` only
5. File exists (18KB) but is never included/loaded

**Impact**: All 23 "protected" routes with `detect.tenant` middleware don't exist in running application.

---

### F.2 What % of active routes have tenant middleware?

**Answer**: **0%** (0 out of 34 routes)

**Breakdown**:
- Routes with `detect.tenant`: 0
- Routes with `tenant.database`: 0
- Routes with only `web` or `api`: 34 (100%)

**Evidence**: `php artisan route:list` output (Section A.1)

---

### F.3 Which write endpoints run without tenant middleware?

**Answer**: **All 11 write endpoints** (100%)

**List with Source Lines**:
1. `POST /api/v1/orders` - `routes.php:584` - Creates orders
2. `POST /api/v1/order-status` - `routes.php:792` - Updates order status
3. `PATCH /admin/notifications-api/{id}` - `routes.php:1078` - Updates notification
4. `PATCH /admin/notifications-api/mark-all-seen` - `routes.php:1079` - Bulk update notifications
5. `POST /admin/statuses/toggle-order-notifications` - `routes.php:1083` - Updates settings
6. `PATCH /api/v1/admin/notifications-api/{id}` - `routes.php:928` - Updates notification (duplicate)
7. `PATCH /api/v1/admin/notifications-api/mark-all-seen` - `routes.php:929` - Bulk update (duplicate)
8. `POST /api/v1/api/v1/table-notes` - `routes.php:997` - Creates table notes
9. `POST /api/v1/api/v1/waiter-call` - `routes.php:936` - Creates waiter calls
10. `POST /api/v1/restaurant/{locationId}/order` - `routes.php:372` - Creates orders
11. `POST /api/v1/webhooks/pos` - `routes.php:369` - POS webhook writes

**All use default `mysql` connection → `paymydine` database**.

---

### F.4 Why do requests hit the shared DB?

**Root Cause Chain**:

1. **routes/api.php not loaded** → Protected routes with `detect.tenant` don't exist
2. **No middleware on active routes** → `routes.php` groups use only `web`/`api` middleware
3. **Default connection never changes** → Stays as `mysql` (config/database.php:16)
4. **mysql connection points to main DB** → `database: 'paymydine'` (config/database.php:49)
5. **All queries use default** → `DB::table('orders')` uses `mysql` → `paymydine`

**Flow**:
```
Request → Route (no tenant MW) → Default conn = mysql → paymydine DB → All tenants mixed
```

**Specific Example** - `POST /api/v1/orders`:
```php
// routes.php:639
$orderId = DB::table('orders')->insertGetId([...]);

// Resolves to:
// Connection: mysql (default)
// Database: paymydine
// Table: ti_orders
// SQL: INSERT INTO paymydine.ti_orders (...)
```

**Result**: Order stored in main database, visible to all tenants.

---

### F.5 Minimal changes to attach tenant middleware

**Changes Required** (do NOT implement, only specify):

#### Change 1: Admin API Routes Group
**File**: `routes.php:362-375`  
**Current**:
```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
```

**Change to**:
```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api', 'detect.tenant']  // ADD detect.tenant
], function () {
```

**Lines Affected**: 1 line (line 365)  
**Routes Protected**: 6 (restaurant, order, waiter, webhook)

---

#### Change 2: Frontend API Routes Group
**File**: `routes.php:378-921`  
**Current**:
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
```

**Change to**:
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ADD detect.tenant
], function () {
```

**Lines Affected**: 1 line (line 379)  
**Routes Protected**: ~14 (menu, orders, settings, tables, etc.)

---

#### Change 3: Notification API Routes
**File**: `routes.php:1075-1080`  
**Current**:
```php
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
```

**Change to**:
```php
Route::middleware(['web', 'admin', 'detect.tenant'])->prefix('admin/notifications-api')->group(function () {
```

**Lines Affected**: 1 line (line 1075)  
**Routes Protected**: 4 (notification read/update)  
**Note**: Also adds `admin` middleware for authentication

---

#### Change 4: Remove Duplicate Notification Routes
**File**: `routes.php:1065-1070`  
**Action**: Delete entire group (6 lines)  
**Reason**: Duplicate of lines 1075-1080

---

#### Change 5: Fix Nested Route Group
**File**: `routes.php:934`  
**Current**:
```php
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
```

**Change to**:
```php
Route::group(['middleware' => ['web']], function () {  // REMOVE duplicate prefix
```

**Lines Affected**: 1 line (line 934)  
**Effect**: Fixes malformed `/api/v1/api/v1/*` routes

---

#### Summary of Changes

| Change # | File | Line(s) | Action | Routes Fixed |
|----------|------|---------|--------|--------------|
| 1 | routes.php | 365 | Add `'detect.tenant'` to middleware array | 6 |
| 2 | routes.php | 379 | Add `'detect.tenant'` to middleware array | ~14 |
| 3 | routes.php | 1075 | Add `'admin', 'detect.tenant'` to middleware | 4 |
| 4 | routes.php | 1065-1070 | Delete duplicate group | 4 (cleanup) |
| 5 | routes.php | 934 | Remove `'prefix' => 'api/v1'` | 3 (fix paths) |

**Total Lines Changed**: 5 lines modified + 6 lines deleted = 11 lines  
**Total Routes Protected**: 24+ routes gain tenant middleware  
**Estimated Time**: < 5 minutes to implement

---

## Appendix: Additional Raw Command Outputs

### Environment Variables
```bash
cat .env | grep -E "^DB_|^APP_|^CACHE_"
```
**Output**:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=paymydine
DB_USERNAME=paymydine
DB_PASSWORD="P@ssw0rd@123"
DB_PREFIX=ti_
APP_NAME="PaymyDine"
APP_ENV=production
APP_KEY=base64:pVKXhEa9Of4Sa6pQ2eGx7FLyKwwWXJOlWIDfIQiY8C0=
APP_DEBUG=false
APP_URL=http://127.0.0.1:8000
CACHE_DRIVER=file
```

---

### File System Check
```bash
ls -la routes/
```
**Output**:
```
total 48
drwxr-xr-x@  4 amir  staff    128 Oct  9 07:22 .
drwxr-xr-x@ 80 amir  staff   2560 Oct  9 19:18 ..
-rw-r--r--@  1 amir  staff  18384 Oct  9 07:22 api.php
-rwxr-xr-x@  1 amir  staff   1131 Oct  9 07:22 notifications.txt
```

---

### Middleware Registration Check
**File**: `app/Http/Kernel.php:42-56`
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
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,              // ✓ Registered
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class, // ✓ Registered
    'cors' => \App\Http\Middleware\CorsMiddleware::class,
];
```

**Both middlewares registered but neither applied to routes.**

---

## END OF REPORT

**Investigation Status**: ✅ COMPLETE  
**Evidence Type**: Read-only commands + source code analysis  
**Artifacts Location**: `/Users/amir/Downloads/paymydine-main-22/artifacts/`  
**Next Step**: Remediation (awaiting approval to implement changes from Section F.5)

