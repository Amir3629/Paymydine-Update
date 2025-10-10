# TENANCY_OVERVIEW.md

## Executive Summary

This document maps how tenant isolation is implemented in the PayMyDine multi-tenant SaaS application. Evidence shows **two different tenant middleware implementations** coexisting, potentially causing cross-tenant data leakage.

---

## 1. Tenant Resolution

### 1.1 Primary Middleware: DetectTenant

**Location**: `app/Http/Middleware/DetectTenant.php`

**Tenant Resolution Logic** (lines 22-25):
```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

**Subdomain Extraction** (lines 87-109):
- Splits host by `.` and checks for minimum 3 parts (subdomain.domain.tld)
- Returns first part if host is like `amir.paymydine.com`
- Fallback: if 2 parts and not in `['paymydine.com', 'localhost']`, returns first part

**Tenant Lookup** (lines 30-33):
```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```
- Uses **main database connection** (`mysql`) to query `ti_tenants` table
- Matches subdomain against `domain` column with flexible pattern

### 1.2 Secondary Middleware: TenantDatabaseMiddleware

**Location**: `app/Http/Middleware/TenantDatabaseMiddleware.php`

**Tenant Resolution Logic** (lines 46-62):
```php
$hostname = $request->getHost();
$parts = explode('.', $hostname);

if (count($parts) >= 3 && $parts[1] === 'paymydine') {
    return $parts[0];  // e.g., "rosana" from "rosana.paymydine.com"
}
```

**Tenant Lookup** (lines 19-22):
```php
$tenantInfo = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', $tenant . '.paymydine.com')
    ->where('status', 'active')
    ->first();
```

**⚠️ CRITICAL DIFFERENCE**:
- `DetectTenant`: Uses flexible LIKE pattern (`'domain', 'like', $subdomain . '.%'`)
- `TenantDatabaseMiddleware`: Uses exact match (`'domain', $tenant . '.paymydine.com'`)

---

## 2. Database Connection Switching

### 2.1 DetectTenant Implementation

**Location**: `app/Http/Middleware/DetectTenant.php:35-49`

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

**Key Actions**:
1. Configures a **separate `tenant` connection** with tenant-specific database
2. Purges and reconnects the `tenant` connection
3. **Sets `tenant` as the default connection** for the request
4. Stores tenant info in request attributes and app container

### 2.2 TenantDatabaseMiddleware Implementation

**Location**: `app/Http/Middleware/TenantDatabaseMiddleware.php:24-30`

```php
// Switch to tenant database
Config::set('database.connections.mysql.database', $tenantInfo->database);

// Reconnect with new database
DB::purge('mysql');
DB::reconnect('mysql');
```

**⚠️ CRITICAL DIFFERENCE**:
- `DetectTenant`: Uses separate `tenant` connection and sets it as default
- `TenantDatabaseMiddleware`: **Reconfigures the `mysql` connection in-place**, does NOT change default

---

## 3. Tenant Context Storage

### 3.1 DetectTenant Storage

**Location**: `app/Http/Middleware/DetectTenant.php:52-53`

```php
$request->attributes->set('tenant', $tenant);
app()->instance('tenant', $tenant);
```

Tenant object stored in:
- Request attributes (accessible via `$request->attributes->get('tenant')`)
- Application container (accessible via `app('tenant')`)

### 3.2 TenantDatabaseMiddleware Storage

**Location**: `app/Http/Middleware/TenantDatabaseMiddleware.php:33`

```php
$request->attributes->set('tenant', $tenantInfo);
```

Only stores in request attributes, **NOT in app container**.

---

## 4. Database Connection Configuration

### 4.1 Default Connection

**Location**: `config/database.php:16`

```php
'default' => env('DB_CONNECTION', 'mysql'),
```

Default is `mysql` connection unless overridden by `DetectTenant` middleware.

### 4.2 MySQL Connection

**Location**: `config/database.php:44-62`

```php
'mysql' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'paymydine'),
    'username' => env('DB_USERNAME', 'paymydine'),
    'password' => env('DB_PASSWORD', 'P@ssw0rd@123'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ... other config
],
```

**Default database**: `paymydine` (main database)
**Table prefix**: `ti_`

### 4.3 Tenant Connection

**Location**: `config/database.php:63-81`

```php
'tenant' => [
    'driver' => 'mysql',
    'host' => env('TENANT_DB_HOST', '127.0.0.1'),
    'port' => env('TENANT_DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'taste'),  // ⚠️ Fallback to 'taste'
    'username' => env('TENANT_DB_USERNAME', 'paymydine'),
    'password' => env('TENANT_DB_PASSWORD', 'P@ssw0rd@123'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ... other config
],
```

**⚠️ ISSUE**: Fallback database is `'taste'` (likely wrong), should be dynamically set by middleware.

---

## 5. Model and Query Connection Usage

### 5.1 Explicit Connection Usage

**Querying main database explicitly**:

| Location | Pattern | Connection |
|----------|---------|------------|
| `app/Http/Middleware/DetectTenant.php:30` | `DB::connection('mysql')->table('ti_tenants')` | `mysql` (main) |
| `app/Http/Middleware/TenantDatabaseMiddleware.php:19` | `DB::connection('mysql')->table('ti_tenants')` | `mysql` (main) |
| `routes.php:256` | `DB::connection('mysql')->table('tenants')` | `mysql` (main) |

### 5.2 Implicit (Default) Connection Usage

**Using default connection** (depends on middleware execution):

| Location | Pattern | Expected Connection |
|----------|---------|---------------------|
| `app/Http/Controllers/Api/MenuController.php:36` | `DB::select($query)` | default (should be `tenant`) |
| `app/Http/Controllers/Api/CategoryController.php:17` | `DB::table('categories')` | default (should be `tenant`) |
| `app/Http/Controllers/Api/TableController.php:17` | `DB::table('tables')` | default (should be `tenant`) |
| `app/Helpers/NotificationHelper.php:137` | `DB::table('notifications')` | default (should be `tenant`) |
| `app/Helpers/SettingsHelper.php:19` | `DB::table('settings')` | default (should be `tenant`) |
| `routes/api.php:167` | `DB::table('locations')` | default (should be `tenant`) |
| `routes/api.php:187` | `DB::table('settings')` | default (should be `tenant`) |
| `routes/api.php:231` | `DB::table('waiter_calls')` | default (should be `tenant`) |
| `routes.php:122` | `DB::table('orders')` | default (depends on route middleware) |
| `routes.php:308` | `DB::table('tables')` | default (depends on route middleware) |
| `routes.php:460` | `DB::table('categories')` | default (depends on route middleware) |
| `routes.php:528` | `DB::table('locations')` | default (depends on route middleware) |
| `routes.php:591` | `DB::table('tables')` | default (depends on route middleware) |

**⚠️ RISK**: If middleware doesn't execute or fails to set default connection, queries hit main database.

---

## 6. Table Name Hardcoding

### 6.1 With `ti_` Prefix (Hardcoded)

Found in raw SQL queries where Laravel's prefix is not applied:

| Location | Table Reference |
|----------|----------------|
| `app/Http/Controllers/Api/MenuController.php:26` | `FROM ti_menus m` |
| `app/Http/Controllers/Api/MenuController.php:27` | `LEFT JOIN ti_menu_categories` |
| `app/Http/Controllers/Api/MenuController.php:28` | `LEFT JOIN ti_categories` |
| `app/Http/Controllers/Api/MenuController.php:29` | `LEFT JOIN ti_media_attachments` |
| `app/Http/Controllers/Api/MenuController.php:55` | `FROM ti_categories` |
| `app/admin/controllers/Api/RestaurantController.php:62` | `FROM ti_menus m` |
| `app/admin/controllers/Api/RestaurantController.php:63` | `LEFT JOIN ti_menu_categories` |
| `app/admin/controllers/Api/RestaurantController.php:64` | `LEFT JOIN ti_categories` |
| `app/admin/controllers/Api/RestaurantController.php:65` | `LEFT JOIN ti_media_attachments` |
| `routes.php:408` | `FROM menus m` (⚠️ missing prefix) |
| `routes.php:409` | `LEFT JOIN ti_menu_categories` |
| `routes.php:410` | `LEFT JOIN categories` (⚠️ missing prefix) |

**⚠️ INCONSISTENCY**: Some queries use `ti_` prefix explicitly, others rely on Laravel's config, some are missing prefix entirely.

### 6.2 Using Laravel Prefix (via Query Builder)

Most query builder calls use table names without prefix, expecting Laravel to add it:

```php
DB::table('tables')       // → ti_tables
DB::table('categories')   // → ti_categories
DB::table('notifications') // → ti_notifications
```

---

## 7. Cache Key Scoping

### 7.1 Global Cache Configuration

**Location**: `config/cache.php:98`

```php
'prefix' => env('CACHE_PREFIX', 'tenant_default_cache'),
```

**⚠️ ISSUE**: Global prefix `tenant_default_cache` is NOT tenant-scoped. All tenants share the same cache prefix.

### 7.2 Tenant-Scoped Cache Keys

**Implementation**: `app/Helpers/TenantHelper.php`

```php
public static function tenantCachePrefix(): string
{
    $request = app('request');
    $tenant = $request->attributes->get('tenant');
    
    if ($tenant && isset($tenant->database)) {
        return "tenant:{$tenant->database}:";
    }
    
    try {
        $database = DB::connection()->getDatabaseName();
        return "db:{$database}:";
    } catch (\Exception $e) {
        return "unknown:";
    }
}

public static function scopedCacheKey(string $key): string
{
    return self::tenantCachePrefix() . $key;
}
```

**Usage**: `app/Helpers/TableHelper.php:20`

```php
$cacheKey = TenantHelper::scopedCacheKey("table_info_{$tableId}");
return Cache::remember($cacheKey, 300, function() use ($tableId) {
    // ...
});
```

**⚠️ ADOPTION**: Only `TableHelper` uses scoped cache keys. Other parts of the codebase may not scope cache keys properly.

---

## 8. QR Code & URL Generation

### 8.1 QR URL Building

**Location**: `routes.php:92-108` (buildCashierTableUrl function)

```php
$frontendUrl = env('FRONTEND_URL', config('app.url'));
$date = date('Y-m-d');
$time = date('H:i');
$tableNumber = ($cashierTable->table_no > 0) ? $cashierTable->table_no : $cashierTableId;

return rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
    'location' => $locationId,
    'guest' => 1,
    'date' => $date,
    'time' => $time,
    'qr' => 'cashier',
    'table' => $tableNumber
]);
```

**Location**: `routes.php:328-339` (get-table-qr-url endpoint)

```php
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

**⚠️ ISSUE**: URLs use `FRONTEND_URL` from environment, which is likely a **global URL**, not tenant-specific. QR codes may direct to wrong tenant frontend.

### 8.2 FRONTEND_URL Configuration

**From** `example.env` (not in repo):
No `FRONTEND_URL` defined in example.env

**Usage locations**:
- `routes.php:92` - fallback to `config('app.url')`
- `routes.php:165` - fallback to `config('app.url')`
- `routes.php:328` - fallback to `config('app.url')`

**Expected**: Should use current request host to build tenant-specific URLs:
```php
$domain = $request->getHost();  // e.g., amir.paymydine.com
$frontendUrl = "https://{$domain}";
```

---

## 9. Critical Findings Summary

### 9.1 Dual Middleware Problem

**TWO different tenant middlewares exist**:

| Aspect | DetectTenant | TenantDatabaseMiddleware |
|--------|--------------|--------------------------|
| **Registered as** | `detect.tenant` | `tenant.database` |
| **Connection strategy** | Creates separate `tenant` conn, sets as default | Reconfigures `mysql` conn in-place |
| **Domain matching** | Flexible LIKE pattern | Exact match with `.paymydine.com` |
| **App container** | Yes, stores tenant | No |
| **Default connection** | Changes to `tenant` | Keeps `mysql` |

**Route usage**:
- `routes/api.php:122` - Uses `detect.tenant`
- `routes.php:376` - Uses `detect.tenant`
- `app/admin/routes.php:209` - Uses `TenantDatabaseMiddleware` (full class path)
- Superadmin routes explicitly bypass all tenant middleware

### 9.2 Routes Without Tenant Middleware

**Potentially dangerous routes**:

| Route Group | Middleware | Risk |
|-------------|------------|------|
| `routes.php:378-921` (api/v1 routes) | `['web']` only | ⚠️ No tenant middleware, uses default DB |
| `routes.php:362-375` (api/v1 admin) | `['api']` only | ⚠️ No tenant middleware |
| `app/admin/routes.php:17-204` (admin routes) | `['web']` only | ⚠️ Most admin routes lack tenant middleware |

### 9.3 Cache Isolation

**Global cache prefix**: `tenant_default_cache` for all tenants
**Scoped caching**: Only implemented in `TableHelper`, not consistently used

**Risk**: Cached data from tenant A may be served to tenant B.

### 9.4 QR URL Generation

**Uses global `FRONTEND_URL`** instead of current request domain, potentially generating cross-tenant URLs.

---

## 10. Evidence of Recent Tenant Isolation Work

**Git commits** (last 30 days):

| Commit | Date | Changes |
|--------|------|---------|
| `b4fa547` | Recent | "Fix: Tenant isolation for cross-tenant data bleed prevention" - Modified DetectTenant.php and database config |
| `f4d2551` | Recent | "Complete tenant isolation: remove all Builder ti_* hardcodes, enforce detect.tenant" - DetectTenant fixes |
| `8f5a6fd` | Recent | "Fix tenant bleed & ti_ti_ 500 errors: unified middleware" - Database config and routes.php |
| `35beb01` | Recent | "Fix tenant bleed: SSR tenant detection and cache isolation" - Added TenantHelper and TableHelper |

**Evidence**: Multiple recent attempts to fix tenant isolation issues suggest the problem is known and being actively addressed.

