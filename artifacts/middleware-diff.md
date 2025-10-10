# Middleware Comparison: DetectTenant vs TenantDatabaseMiddleware

## Executive Summary

**Two tenant middlewares exist** with **conflicting strategies**:
1. `DetectTenant` - Creates separate `tenant` connection, sets as default ✓ Better approach
2. `TenantDatabaseMiddleware` - Reconfigures `mysql` connection in-place ⚠️ Risky

**CRITICAL**: Neither middleware is currently applied to ANY active route (verified via `php artisan route:list`).

---

## Side-by-Side Comparison

| Aspect | DetectTenant | TenantDatabaseMiddleware |
|--------|--------------|--------------------------|
| **File** | `app/Http/Middleware/DetectTenant.php` | `app/Http/Middleware/TenantDatabaseMiddleware.php` |
| **Registered As** | `detect.tenant` (Kernel.php:53) | `tenant.database` (Kernel.php:54) |
| **Lines of Code** | 110 lines | 63 lines |
| **Subdomain Resolution** | Lines 23-25: Headers + extractSubdomainFromHost() | Lines 46-61: extractTenantFromDomain() |
| **Tenant Lookup** | LIKE pattern: `'domain', 'like', $subdomain . '.%'` | Exact match: `'domain', $tenant . '.paymydine.com'` |
| **Connection Strategy** | Creates separate `tenant` connection | Reconfigures `mysql` connection |
| **Default Connection** | Sets to `tenant` (line 48-49) ✓ | Keeps `mysql` as default ⚠️ |
| **Purge/Reconnect** | Purges `tenant`, reconnects `tenant` | Purges `mysql`, reconnects `mysql` |
| **Tenant Storage** | Request attributes + app container (lines 52-53) | Request attributes only (line 33) |
| **Error Handling** | Returns JSON 404/500 with messages | Returns JSON 404/400 with errors |
| **Status Check** | No status check | Checks `->where('status', 'active')` |
| **Logging** | Yes - logs successful switch (line 55) | No logging |

---

## Detailed Analysis

### 1. Subdomain Resolution

#### DetectTenant (Lines 23-25)
```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

**extractSubdomainFromHost() method (Lines 87-109)**:
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

**Supports**:
- Custom headers (`X-Tenant-Subdomain`, `X-Original-Host`) for proxy setups
- Standard subdomain parsing
- Fallback for 2-part domains (e.g., `amir.localhost`)

**Example**:
- `amir.paymydine.com` → `amir`
- `rosana.paymydine.com` → `rosana`

---

#### TenantDatabaseMiddleware (Lines 46-61)
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

**Supports**:
- Only direct host parsing (no custom header support)
- Hardcoded check for `paymydine` in domain
- Localhost fallback

**Example**:
- `rosana.paymydine.com` → `rosana`
- `amir.localhost` → `amir`

**⚠️ Limitation**: Requires `paymydine` in domain name (less flexible than DetectTenant).

---

### 2. Tenant Database Lookup

#### DetectTenant (Lines 30-33)
```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```

**Query Pattern**: Flexible LIKE pattern
- Matches `amir.paymydine.com`
- Matches `amir.custom-domain.com`
- Matches `amir` (exact)

**Database**: Explicitly uses `mysql` connection (main database)

**Validation**: Checks `if ($tenant && $tenant->database)` (line 35)

---

#### TenantDatabaseMiddleware (Lines 19-22)
```php
$tenantInfo = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', $tenant . '.paymydine.com')
    ->where('status', 'active')
    ->first();
```

**Query Pattern**: Exact match with hardcoded suffix
- Only matches `rosana.paymydine.com` (exact)
- Won't match `rosana.custom-domain.com`
- Won't match just `rosana`

**Database**: Explicitly uses `mysql` connection (main database)

**Validation**: Checks status = 'active' AND tenant exists (line 24)

**⚠️ Limitation**: Less flexible domain matching. Requires exact `.paymydine.com` suffix.

---

### 3. Connection Switching Strategy

#### DetectTenant (Lines 36-49) - ✓ CORRECT APPROACH
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

**Strategy**: Create separate `tenant` connection with tenant-specific config

**Steps**:
1. Configure `tenant` connection with tenant's database name/credentials
2. Purge any existing `tenant` connection
3. Reconnect with new config
4. **Set `tenant` as DEFAULT connection** ✓

**Effect on Queries**:
- `DB::table('orders')` → uses `tenant` connection → tenant-specific database ✓
- `DB::connection('mysql')->table('orders')` → still uses main database (explicit override)
- Models without explicit connection → use `tenant` (default) ✓

**✓ Correct**: All implicit queries use tenant database.

---

#### TenantDatabaseMiddleware (Lines 25-30) - ⚠️ RISKY APPROACH
```php
// Switch to tenant database
Config::set('database.connections.mysql.database', $tenantInfo->database);

// Reconnect with new database
DB::purge('mysql');
DB::reconnect('mysql');
```

**Strategy**: Reconfigure the `mysql` connection in-place

**Steps**:
1. Change `mysql` connection's database name to tenant's database
2. Purge `mysql` connection
3. Reconnect `mysql` with new database
4. **Does NOT change default connection** ⚠️

**Effect on Queries**:
- Default connection is still `mysql` (from config/database.php:16)
- `DB::table('orders')` → uses `mysql` connection → now points to tenant database
- But `mysql` connection is **globally shared** across all requests

**⚠️ RISK**: In concurrent requests:
1. Request A (amir): Reconfigures `mysql` to `amir` database
2. Request B (rosana): Reconfigures `mysql` to `rosana` database
3. Request A's queries may now hit `rosana` database (race condition)

**⚠️ RISK**: If middleware doesn't execute on some route, `mysql` connection may be left pointing to tenant database from previous request.

---

### 4. Tenant Context Storage

#### DetectTenant (Lines 52-53)
```php
$request->attributes->set('tenant', $tenant);
app()->instance('tenant', $tenant);
```

**Storage Locations**:
1. Request attributes (accessible via `$request->attributes->get('tenant')`)
2. Application container (accessible via `app('tenant')` or `app()->bound('tenant')`)

**Benefit**: Other code can check tenant context:
```php
$tenant = app('tenant');
if ($tenant) {
    // Tenant context is set
}
```

---

#### TenantDatabaseMiddleware (Line 33)
```php
$request->attributes->set('tenant', $tenantInfo);
```

**Storage Location**:
1. Request attributes only

**⚠️ Limitation**: Not accessible via `app('tenant')`. Some code may rely on container binding.

---

### 5. Error Handling

#### DetectTenant (Lines 56-72)
```php
} else {
    Log::warning("No tenant found for subdomain: {$subdomain}");
    
    return response()->json([
        'error' => 'Tenant not found',
        'message' => 'The requested restaurant domain was not found.'
    ], 404);
}
} catch (\Exception $e) {
    Log::error("Error detecting tenant: " . $e->getMessage());
    
    return response()->json([
        'error' => 'Database Error',
        'message' => 'Unable to connect to tenant database.'
    ], 500);
}
```

**Features**:
- Logs warnings for missing tenants
- Logs errors for exceptions
- Returns descriptive JSON error messages
- Different HTTP codes for different errors (404 vs 500)

---

#### TenantDatabaseMiddleware (Lines 34-41)
```php
} else {
    // Tenant not found or inactive
    return response()->json(['error' => 'Restaurant not found or inactive'], 404);
}
} else {
    // No tenant detected from domain
    return response()->json(['error' => 'Invalid domain'], 400);
}
```

**Features**:
- Returns JSON error messages
- Different HTTP codes (404 vs 400)
- **No logging** ⚠️

**⚠️ Limitation**: Harder to debug issues without logs.

---

## Real-World Database Structure

From `mysql -e "DESCRIBE ti_tenants;"`:

```
Field       | Type          | Null | Key | Default           | Extra
------------|---------------|------|-----|-------------------|--------
id          | int           | NO   | PRI | NULL              | auto_increment
name        | varchar(255)  | NO   |     | NULL              |
domain      | varchar(255)  | NO   | UNI | NULL              |
database    | varchar(255)  | NO   | UNI | NULL              |
email       | varchar(255)  | NO   |     | NULL              |
phone       | varchar(20)   | NO   |     | NULL              |
start       | date          | NO   |     | NULL              |
end         | date          | NO   |     | NULL              |
type        | varchar(255)  | YES  |     | NULL              |
country     | varchar(255)  | NO   |     | NULL              |
description | varchar(1000) | NO   |     | NULL              |
status      | varchar(255)  | NO   |     | NULL              |
created_at  | timestamp     | YES  |     | CURRENT_TIMESTAMP |
updated_at  | timestamp     | YES  |     | CURRENT_TIMESTAMP | on update
```

**Notable**: 
- ❌ **NO `db_host` column** (DetectTenant line 38 tries to read it)
- ❌ **NO `db_port` column** (DetectTenant line 39 tries to read it)
- ❌ **NO `db_user` column** (DetectTenant line 40 tries to read it)
- ❌ **NO `db_pass` column** (DetectTenant line 41 tries to read it)

**Impact**: DetectTenant's per-tenant credential support **doesn't work** (columns don't exist). It falls back to environment variables for all tenants.

---

## Sample Tenant Data

From `mysql -e "SELECT id, name, domain, database, status FROM ti_tenants LIMIT 20;"`:

```
id | name   | domain                | database | status
---|--------|-----------------------|----------|-------
23 | rosana | rosana.paymydine.com  | rosana   | active
```

**Observations**:
1. Only ONE tenant in database (rosana)
2. Domain format: `{subdomain}.paymydine.com` (full domain with suffix)
3. Database name: Simple subdomain without prefix/suffix (`rosana` not `rosana_db`)
4. Status: `active` (string, not boolean)

**Compatibility**:
- DetectTenant's LIKE pattern would match ✓
- TenantDatabaseMiddleware's exact match would match ✓

**But**: If a tenant has custom domain (e.g., `restaurant.custom.com`), only DetectTenant would match.

---

## Current Application State

### Registration
Both middlewares are registered in `app/Http/Kernel.php`:
```php
protected $routeMiddleware = [
    // ... other middleware ...
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,              // Line 53
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class, // Line 54
    // ... other middleware ...
];
```

### Usage in Code
From static analysis:
- `routes/api.php:122` - Uses `detect.tenant` on 23 routes
- `routes.php:376` - Has `detect.tenant` in comment but NOT actually applied
- `app/admin/routes.php:209` - Uses full class path `TenantDatabaseMiddleware::class`

### Actual Active Usage
From `php artisan route:list`:
- **ZERO routes** use either middleware ⚠️⚠️⚠️
- All routes show only `web` or `api` middleware
- Neither `detect.tenant` nor `tenant.database` appears in output

**Conclusion**: Neither middleware is currently protecting ANY route in the running application.

---

## Recommendation: Choose One

### Option A: Use DetectTenant ✓ RECOMMENDED
**Pros**:
- Sets explicit default connection (no race conditions)
- Flexible domain matching (LIKE pattern)
- Supports custom headers (proxy-friendly)
- Stores tenant in app container
- Better logging
- Tries to support per-tenant credentials (even though columns don't exist yet)

**Cons**:
- Tries to read non-existent columns (but gracefully falls back)
- Slightly more complex code

**Fix required**:
- Apply to all tenant-facing routes in `routes.php`
- Add missing columns to `ti_tenants` table OR remove code trying to read them

---

### Option B: Use TenantDatabaseMiddleware
**Pros**:
- Simpler code (63 lines vs 110)
- Checks tenant status = 'active'

**Cons**:
- ⚠️ Race condition risk (reconfigures shared `mysql` connection)
- ⚠️ Doesn't set default connection (may not catch all queries)
- Less flexible domain matching (hardcoded suffix)
- No custom header support
- No logging
- Doesn't store in app container

**Not recommended** due to race condition risk.

---

### Option C: Delete TenantDatabaseMiddleware, Keep DetectTenant ✓ BEST
**Rationale**:
- Resolve confusion (one middleware only)
- DetectTenant is superior approach
- Eliminates conflicting strategies
- Simplifies codebase

**Steps**:
1. Delete `app/Http/Middleware/TenantDatabaseMiddleware.php`
2. Remove from `app/Http/Kernel.php:54`
3. Remove usage in `app/admin/routes.php:209` (if any routes actually use it)
4. Update all routes to use `detect.tenant` middleware

---

## Test Plan (Read-Only)

### Test 1: Verify Neither Middleware Is Active
```bash
php artisan route:list --columns=uri,middleware | grep -E "detect\.tenant|tenant\.database"
# Expected: No output (confirms neither is active)
```

### Test 2: Check Middleware Registration
```bash
php artisan route:list --columns=uri,middleware | head -20
# Expected: Shows web/api only, not tenant middleware
```

### Test 3: Inspect Route File Loading
```bash
ls -la routes/
# Check if api.php exists but isn't being loaded

php artisan tinker --execute="dd(app()->getLoadedProviders());"
# Check which service providers are loaded (may show route loading mechanism)
```

### Test 4: Database Query Without Middleware
```bash
# Temporarily add test endpoint (if allowed):
# GET /test/db-check returns current DB name
curl -i https://rosana.paymydine.com/test/db-check

# Expected: Returns 'paymydine' (main DB) not 'rosana' (tenant DB)
# Proves middleware isn't running
```

---

## Summary Table

| Criteria | DetectTenant | TenantDatabaseMiddleware | Winner |
|----------|--------------|--------------------------|--------|
| Connection Safety | Separate connection ✓ | Shared connection ⚠️ | DetectTenant |
| Default Connection | Sets explicitly ✓ | Doesn't set ⚠️ | DetectTenant |
| Domain Flexibility | LIKE pattern ✓ | Exact match only | DetectTenant |
| Header Support | Yes ✓ | No | DetectTenant |
| Logging | Yes ✓ | No | DetectTenant |
| App Container | Yes ✓ | No | DetectTenant |
| Status Check | No | Yes ✓ | TenantDatabaseMiddleware |
| Code Simplicity | 110 lines | 63 lines ✓ | TenantDatabaseMiddleware |
| **Currently Active** | No ⚠️ | No ⚠️ | Neither (CRITICAL) |

**Recommendation**: Use `DetectTenant` exclusively. Delete `TenantDatabaseMiddleware` to avoid confusion.

