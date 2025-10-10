# Tenant Detection and Database Switching

This document analyzes how tenant detection and database connection switching is implemented in both versions.

---

## Current Version Analysis

### 1. DetectTenant Middleware

**File**: `app/Http/Middleware/DetectTenant.php`

#### Tenant Detection Logic (lines 22-25)

```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

**Sources (in priority order)**:
1. `X-Tenant-Subdomain` header
2. `X-Original-Host` header
3. Parsed from host via `extractSubdomainFromHost()` method

#### Host Parsing (lines 87-109)

```php
private function extractSubdomainFromHost($host)
{
    if (!$host) return null;
    
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

#### Database Lookup (lines 29-33)

```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```

**Connection used**: `mysql` (central database)  
**Table**: `ti_tenants` (with `ti_` prefix)  
**Matching logic**: Tries `subdomain.%` (wildcard) first, then exact match on `subdomain`

#### Database Connection Switch (lines 35-49)

```php
if ($tenant && $tenant->database) {
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
    
    // Store tenant info in request and app container
    $request->attributes->set('tenant', $tenant);
    app()->instance('tenant', $tenant);
    
    Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
}
```

**Key steps**:
1. ✅ Configures `tenant` connection dynamically from DB row
2. ✅ Purges and reconnects the `tenant` connection
3. ✅ **Sets `tenant` as the default connection** via `Config::set('database.default', 'tenant')` and `DB::setDefaultConnection('tenant')`
4. ✅ Stores tenant object in request attributes and app container

#### Fallback (lines 56-64)

If no tenant found:
```php
return response()->json([
    'error' => 'Tenant not found',
    'message' => 'The requested restaurant domain was not found.'
], 404);
```

If no subdomain:
```php
Log::info("No subdomain detected, using default connection");
// Continues with request (uses default connection)
```

---

### 2. TenantDatabaseMiddleware

**File**: `app/Http/Middleware/TenantDatabaseMiddleware.php`

#### Tenant Detection (lines 14-15)

```php
$tenant = $this->extractTenantFromDomain($request);
```

#### Database Lookup (lines 18-22)

```php
$tenantInfo = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', $tenant . '.paymydine.com')
    ->where('status', 'active')
    ->first();
```

**Connection used**: `mysql` (central database)  
**Table**: `ti_tenants`  
**Matching logic**: Exact match on `subdomain.paymydine.com` format, must be `status = 'active'`

#### Database Connection Switch (lines 24-30)

```php
if ($tenantInfo) {
    // Switch to tenant database
    Config::set('database.connections.mysql.database', $tenantInfo->database);
    
    // Reconnect with new database
    DB::purge('mysql');
    DB::reconnect('mysql');
    
    // Store tenant info in request for later use
    $request->attributes->set('tenant', $tenantInfo);
}
```

**⚠️ CRITICAL DIFFERENCE from DetectTenant**:
- ❌ **Modifies the `mysql` connection itself** instead of using a separate `tenant` connection
- ❌ **Does NOT change the default connection** - keeps using `mysql`
- ✅ Purges and reconnects the connection
- ✅ Stores tenant info in request

#### Host Parsing (lines 46-62)

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

**Hardcoded**: Expects `paymydine` as the second-level domain (line 52).

#### Fallback (lines 34-41)

If no tenant found or inactive:
```php
return response()->json(['error' => 'Restaurant not found or inactive'], 404);
```

If no subdomain:
```php
return response()->json(['error' => 'Invalid domain'], 400);
```

---

## Old Version Analysis

### 1. DetectTenant Middleware (Old)

**File**: `oldversionfiels/app/Http/Middleware/DetectTenant.php`

#### Tenant Detection Logic (lines 22-25)

**IDENTICAL to current version**:
```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

#### Database Lookup (lines 29-33)

**IDENTICAL to current version**:
```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```

#### Database Connection Switch (lines 35-43)

**⚠️ CRITICAL DIFFERENCE from current version**:
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

**Key differences from current**:
- ✅ Sets `tenant` connection database
- ✅ Sets default connection to `tenant`
- ❌ **Does NOT set host, port, username, password** (assumes they're the same as defaults)
- ❌ **Does NOT purge or reconnect** the tenant connection
- ✅ Stores tenant info in request

### 2. TenantDatabaseMiddleware (Old)

**File**: `oldversionfiels/app/Http/Middleware/TenantDatabaseMiddleware.php`

**IDENTICAL to current version** - modifies `mysql` connection directly.

---

## Side-by-Side Comparison

| Aspect | Current `DetectTenant` | Old `DetectTenant` | Current & Old `TenantDatabaseMiddleware` |
|--------|------------------------|--------------------|-----------------------------------------|
| **Subdomain parsing** | ✅ Flexible, headers + host | ✅ Flexible, headers + host | ⚠️ Hardcoded `paymydine`, localhost fallback |
| **Central DB connection** | `mysql` | `mysql` | `mysql` |
| **Tenant lookup** | `ti_tenants` where `domain LIKE` or `=` | Same | `ti_tenants` where `domain =` and `status = 'active'` |
| **Target connection** | `tenant` (separate) | `tenant` (separate) | **`mysql` (overwrites!)** |
| **Sets default connection** | ✅ Yes, to `tenant` | ✅ Yes, to `tenant` | ❌ No, keeps `mysql` |
| **Configures host/port/user/pass** | ✅ Yes | ❌ No | ❌ N/A |
| **Purge & reconnect** | ✅ Yes | ❌ No | ✅ Yes (on `mysql`) |
| **App container storage** | ✅ Yes | ❌ No (only request attr) | ❌ No (only request attr) |
| **Logging** | ✅ Info on switch | ✅ Info on switch | ❌ None |
| **Fallback for no subdomain** | Continue (default DB) | Continue (default DB) | 400 error |
| **Fallback for not found** | 404 JSON | 404 JSON | 404 JSON |

---

## Database Configuration

### Current Version (`config/database.php`)

**Default connection** (line 16):
```php
'default' => env('DB_CONNECTION', 'mysql'),
```

**mysql connection** (lines 44-62):
```php
'mysql' => [
    'driver' => 'mysql',
    'database' => env('DB_DATABASE', 'paymydine'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],
```

**tenant connection** (lines 63-81):
```php
'tenant' => [
    'driver' => 'mysql',
    'host' => env('TENANT_DB_HOST', '127.0.0.1'),
    'port' => env('TENANT_DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'taste'),
    'username' => env('TENANT_DB_USERNAME', 'paymydine'),
    'password' => env('TENANT_DB_PASSWORD', 'P@ssw0rd@123'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],
```

**Key points**:
- Both connections have the same `ti_` prefix
- `tenant` connection defaults are separate from `mysql`
- `DetectTenant` middleware **overrides** these tenant connection settings dynamically

### Old Version (`config/database.php`)

**IDENTICAL to current version** - same `mysql` and `tenant` connections defined.

---

## Explicit DB Connection Usage

### Central DB Access (Current Version)

From `_tenant_investigation/logs/current_db_calls.txt`, explicit `DB::connection('mysql')` calls:

```
routes.php:30:$tenant = DB::connection('mysql')->table('ti_tenants')
routes.php:253:$updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
app/admin/routes.php:256:$updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
app/Http/Middleware/DetectTenant.php:30:$tenant = DB::connection('mysql')->table('ti_tenants')
app/Http/Middleware/TenantDatabaseMiddleware.php:19:$tenantInfo = DB::connection('mysql')->table('ti_tenants')
```

**Usage**:
- Tenant lookup in middleware
- Superadmin tenant status updates

All other DB calls use the **default connection** (no explicit `connection()` call), which means they will use whichever connection is set as default by the middleware.

### Old Version

Similar pattern - middleware uses `DB::connection('mysql')` for tenant lookup, superadmin routes use it for central DB access.

---

## Invariants & Assumptions

### Invariants That Must Hold for Isolation

1. **Before tenant middleware runs**: Default connection = `mysql` (central DB)
2. **After tenant middleware runs (if tenant detected)**: Default connection = `tenant` (tenant-specific DB)
3. **Routes that need central DB access**: Must either:
   - Run before/without tenant middleware, OR
   - Use explicit `DB::connection('mysql')` calls
4. **Table prefix**: Both `mysql` and `tenant` connections use `ti_` prefix

### Current Version Assumptions

- `DetectTenant` middleware:
  - ✅ Creates a separate `tenant` connection
  - ✅ Sets it as default
  - ✅ All subsequent DB queries use tenant DB unless explicitly using `DB::connection('mysql')`
  
- `TenantDatabaseMiddleware` middleware:
  - ⚠️ **Destructively modifies `mysql` connection**
  - ⚠️ If used, central DB is no longer accessible via `mysql` connection name
  - ⚠️ Does NOT change default connection, but the `mysql` connection now points to tenant DB

### Old Version Assumptions

- `DetectTenant` middleware:
  - ⚠️ Sets `tenant` connection database name only
  - ⚠️ **Does NOT purge/reconnect** - may use stale connection
  - ⚠️ **Does NOT set host/port/credentials** - assumes same as defaults
  - ✅ Sets default connection to `tenant`

---

## Critical Differences Summary

### DetectTenant: Current vs Old

| Feature | Current | Old | Impact |
|---------|---------|-----|--------|
| Dynamic host/port/user/pass | ✅ Yes | ❌ No | Current can connect to different DB servers per tenant |
| Purge & reconnect | ✅ Yes | ❌ No | Old may use stale connection pool |
| App container storage | ✅ Yes | ❌ No | Current makes tenant available globally via `app('tenant')` |

### DetectTenant vs TenantDatabaseMiddleware

| Feature | DetectTenant | TenantDatabaseMiddleware | Impact |
|---------|--------------|--------------------------|--------|
| Target connection | `tenant` (separate) | `mysql` (overwrites) | TenantDatabaseMiddleware **destroys** central DB access |
| Sets default | ✅ Yes | ❌ No | DetectTenant properly isolates, TenantDatabaseMiddleware requires all code to use modified `mysql` |
| Status check | ❌ No | ✅ Yes (active only) | TenantDatabaseMiddleware more restrictive |
| Domain pattern | Flexible | Hardcoded `paymydine` | DetectTenant more portable |

---

## Evidence Logs

- Current DB calls: `_tenant_investigation/logs/current_db_calls.txt`
- Old DB calls: `_tenant_investigation/logs/old_db_calls.txt`
- Middleware usage: `_tenant_investigation/logs/middleware_current.txt`, `_tenant_investigation/logs/middleware_old.txt`

---

## Questions for Investigation

1. **Which middleware is actually used on which routes?**
   - `detect.tenant` → `DetectTenant.php`
   - `TenantDatabaseMiddleware` → Used via `withoutMiddleware()` bypasses, but where is it applied globally?

2. **Why do both middleware exist?**
   - Different isolation strategies (separate connection vs overwrite)
   - Migration path from old to new?

3. **Why does old version skip purge/reconnect?**
   - Performance optimization?
   - Assumes all tenants on same DB host?
   - Bug that was fixed in current version?

4. **What happens if both middleware are applied to a request?**
   - Order matters
   - Potential for connection state conflicts

