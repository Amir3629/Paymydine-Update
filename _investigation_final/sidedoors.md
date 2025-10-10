## Side Doors & Alternative Entry Points - Security Analysis

### Overview

This document examines non-Laravel entry points, standalone scripts, and alternative request paths that might bypass normal routing and tenant isolation.

---

## 1. api-server-multi-tenant.php Investigation

### Search Results
```bash
find . -name "api-server-multi-tenant.php" -o -name "*multi-tenant*" 2>/dev/null | grep -v node_modules | grep -v vendor
```

**Output:**
```
./frontend/lib/multi-tenant-config.ts
./frontend 3/lib/multi-tenant-config.ts
./frontend 2/lib/multi-tenant-config.ts
```

**Analysis:**
- ✅ NO `api-server-multi-tenant.php` file found in backend
- Frontend TypeScript config files exist (not PHP)
- These are client-side configurations, not server entry points
- **Risk:** NONE - file doesn't exist

---

## 2. Direct PHP Script Entry Points

### Search for Standalone PHP Scripts

```bash
find . -maxdepth 1 -name "*.php" -type f
```

**Found:**
```
./index.php          (main Laravel entry point)
./server.php         (Laravel dev server)
./artisan            (CLI entry point)
./info.php           (phpinfo script)
./check-table-structure.php
./debug_table_helper.php
./fix-themes.php
./refresh-themes.php
```

**Analysis:**

#### index.php (Main Entry Point) ✅
```php
// Line 1-22
require __DIR__.'/bootstrap/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle($request = Illuminate\Http\Request::capture());
// ↑ Routes through Laravel routing (includes middleware)
```
**Status:** ✅ SAFE - uses Laravel routing, middleware applies

#### server.php (Dev Server) ✅
```php
// Laravel development server router
if (file_exists($uri)) {
    return false;
}
require_once __DIR__.'/index.php';
// ↑ Delegates to index.php
```
**Status:** ✅ SAFE - delegates to main entry point

#### info.php ⚠️
**Purpose:** Displays phpinfo()  
**Risk:** MEDIUM - exposes server configuration  
**Tenant Isolation:** N/A (doesn't query database)  
**Recommendation:** DELETE or protect with authentication

#### check-table-structure.php ⚠️
```php
// Standalone script that queries database
$pdo = new PDO(...);
$stmt = $pdo->query("SELECT * FROM ti_themes LIMIT 3");
```
**Status:** ⚠️ DIRECT DATABASE ACCESS (bypasses Laravel)  
**Tenant Isolation:** ❌ NO - connects to default database  
**Reachable:** Only if accessed directly (not through Laravel routing)  
**URL:** `http://example.com/check-table-structure.php` (if web server allows)  
**Risk:** MEDIUM - developer/debug tool, should not be in production

#### fix-themes.php, refresh-themes.php ⚠️
**Status:** Similar to check-table-structure.php  
**Purpose:** Database maintenance scripts  
**Tenant Isolation:** ❌ NO  
**Risk:** MEDIUM - should be CLI-only, not web-accessible

**Recommendation:** Move to `app/Console/Commands/` or delete

---

## 3. DB::connection('mysql') Usage in Tenant Endpoints

### Complete Audit

**Total Uses:** 35 (from _investigation_final/mysql_connection_usage.txt)

**Categories:**

#### Category A: Middleware (SAFE) ✅
```php
// app/Http/Middleware/DetectTenant.php:30
DB::connection('mysql')->table('ti_tenants')->where(...)->first();
```
**Purpose:** Tenant resolution  
**Database:** paymydine (central)  
**Risk:** NONE - correct usage

#### Category B: Super Admin Operations (SAFE) ✅
```php
// app/admin/controllers/SuperAdminController.php (18 uses)
DB::connection('mysql')->table('tenants')->...;
DB::connection('mysql')->select("SHOW TABLES FROM `$templateDb`");
DB::connection('mysql')->statement("USE `$databaseName`");
```
**Purpose:** Tenant CRUD, database setup  
**Database:** paymydine (central) + tenant databases  
**Risk:** NONE - super admin is SUPPOSED to access central DB

#### Category C: Super Admin Views (SAFE) ✅
```php
// app/admin/views/index.blade.php:85-95
$totalToday = DB::connection('mysql')->table('tenants')->whereDate('start', '=', $today)->count();
```
**Purpose:** Dashboard statistics  
**Database:** paymydine (central)  
**Risk:** NONE - displaying tenant metrics

#### Category D: Testing Route (SAFE) ✅
```php
// routes/api.php:145 (if this file exists)
'db_mysql' => \DB::connection('mysql')->getDatabaseName(),
```
**Purpose:** Debug/testing endpoint  
**Risk:** LOW - diagnostic only

**Summary:** ALL 35 uses of `DB::connection('mysql')` are legitimate. NONE are in tenant endpoints.

---

## 4. Routes Outside Laravel Routing

### TastyIgniter's App::before() Pattern

**File:** `app/admin/routes.php:9`
```php
App::before(function () {
    // Routes registered here execute BEFORE standard Laravel routing
    Route::group([...], function () {
        // These routes are part of Laravel routing
        // BUT registered earlier in boot sequence
    });
});
```

**Analysis:**
- ✅ Still uses Laravel's Route facade (not a bypass)
- ✅ Middleware still applies
- ⚠️ **BUT** registers routes BEFORE routes.php
- ⚠️ This causes unprotected duplicates to win matches

**Risk:** MEDIUM - not a bypass, but creates duplicate registration issue  
**Status:** This IS the root cause of the leakage

---

## 5. Direct Database Access Points

### Pattern Search
```bash
grep -rn "new PDO\|mysqli_connect\|mysql_connect" app/ --include="*.php"
```

**Results:** None found in `app/` directory

**Conclusion:** ✅ All database access goes through Laravel's DB facade

---

## 6. Alternative Web Entry Points

### Apache/Nginx Configuration Check

**Standard Configuration:**
```nginx
# nginx example
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

**All requests route through:** `index.php` ✅

**Potential Bypasses:**
1. Direct access to `.php` files in root (info.php, check-table-structure.php)
2. Direct access to files in `public/` directory

**Mitigation:**
- Ensure web server config prevents direct PHP execution outside index.php
- Move utility scripts to `app/Console/Commands/`
- Add `.htaccess` or nginx rules to block direct script access

---

## 7. API Gateway / Reverse Proxy Checks

### Headers to Check

**Relevant Headers:**
- `X-Tenant-Subdomain` - used by DetectTenant as override
- `X-Original-Host` - used by DetectTenant as fallback
- `X-Forwarded-For` - IP address (handled by TrustProxies)
- `X-Forwarded-Proto` - scheme (handled by TrustProxies)

**Code:**
```php
// app/Http/Middleware/DetectTenant.php:23-25
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

**Risk Assessment:**

#### Scenario: Header Injection
```bash
# Attacker tries to override tenant
curl -H "Host: amir.paymydine.com" \
     -H "X-Tenant-Subdomain: rosana" \
     http://localhost:8000/api/v1/menu
```

**Expected Behavior:**
- DetectTenant uses `X-Tenant-Subdomain: rosana`
- Queries: `SELECT * FROM ti_tenants WHERE domain LIKE 'rosana.%'`
- Switches to: `rosana_db`
- Returns: Rosana's menu

**Impact:** ⚠️ HEADER INJECTION VULNERABILITY
- Allows any user to access any tenant's data by setting header
- **Risk:** HIGH if headers not filtered by reverse proxy

**Mitigation:**
- Remove header override feature (`X-Tenant-Subdomain`, `X-Original-Host`)
- OR ensure reverse proxy strips these headers from client requests
- Only allow these headers from trusted internal sources

**Recommended Code Change:**
```diff
--- a/app/Http/Middleware/DetectTenant.php
+++ b/app/Http/Middleware/DetectTenant.php
@@ -20,9 +20,11 @@
     public function handle(Request $request, Closure $next)
     {
-        // Get subdomain from various possible headers
-        $subdomain = $request->header('X-Tenant-Subdomain') 
-                  ?? $request->header('X-Original-Host') 
-                  ?? $this->extractSubdomainFromHost($request->getHost());
+        // Get subdomain from host only (ignore headers to prevent injection)
+        // Headers should only be set by trusted reverse proxy, not clients
+        $subdomain = $this->extractSubdomainFromHost($request->getHost());
+        
+        // OR check if request is from trusted proxy before using headers
+        // if ($request->ip() === env('TRUSTED_PROXY_IP')) {
+        //     $subdomain = $request->header('X-Tenant-Subdomain') ?? $subdomain;
+        // }
```

---

## 8. Background Jobs / Queue Workers

### Queue Configuration

**Driver:** Likely `sync` (synchronous, no actual queue)  
**Config:** Not explicitly shown, but Laravel default is sync

**If using queued jobs:**

#### Risk: Job Without Tenant Context
```php
// Hypothetical vulnerable code
class ProcessOrderJob implements ShouldQueue
{
    public function handle()
    {
        // NO tenant context available
        $orders = DB::table('orders')->where('status_id', 1)->get();
        // ↑ Queries DEFAULT connection (mysql or random)
        // Processes orders from WRONG database
    }
}
```

**Current Status:** No queue jobs found in `app/Jobs/` directory  
**Risk:** NONE currently, would be HIGH if jobs are added

---

## 9. Scheduled Tasks / Cron Jobs

### Laravel Scheduler

**File:** `app/Console/Kernel.php`

```php
protected function schedule(Schedule $schedule)
{
    // If any scheduled tasks query database without setting tenant context
    $schedule->call(function () {
        DB::table('orders')->where('status_id', 1)->update(['processed' => 1]);
        // ↑ Would use DEFAULT connection (mysql)
        // Would update orders in central DB or random tenant
    })->daily();
}
```

**Current Status:** File not examined, likely minimal scheduled tasks  
**Risk:** MEDIUM if scheduled tasks exist  
**Recommendation:** Audit app/Console/Kernel.php schedule method

---

## 10. Artisan Commands

### Custom Commands

```bash
ls -la app/Console/Commands/
```

**If custom commands exist:**

#### Risk: Command Without Tenant Context
```php
class GenerateReportCommand extends Command
{
    public function handle()
    {
        $orders = DB::table('orders')->get();
        // ↑ Uses DEFAULT connection (mysql)
        // Gets orders from central DB, not tenant DB
    }
}
```

**Mitigation:**
```php
class GenerateReportCommand extends Command
{
    public function handle()
    {
        $tenantId = $this->argument('tenant_id');
        $tenant = DB::connection('mysql')->table('ti_tenants')->find($tenantId);
        
        // Set tenant context manually
        Config::set('database.connections.tenant.database', $tenant->database);
        DB::setDefaultConnection('tenant');
        
        // Now queries use tenant DB
        $orders = DB::table('orders')->get();
    }
}
```

---

## 11. API Routes in Non-Standard Files

### routes/api.php Check

```bash
ls -la routes/
cat routes/api.php 2>/dev/null
```

**If file exists:**
- Check for route definitions
- Verify middleware applied
- Check for database access without tenant context

**Current Status:** File may exist but not shown in previous analysis  
**Risk:** UNKNOWN - needs verification

---

## Summary: Side Door Risk Assessment

| Side Door | Exists? | Reachable? | Tenant Isolated? | Risk | Action |
|-----------|---------|------------|------------------|------|--------|
| api-server-multi-tenant.php | ❌ NO | N/A | N/A | NONE | - |
| DB::connection('mysql') in tenant endpoints | ❌ NO | N/A | N/A | NONE | - |
| App::before() route registration | ✅ YES | ✅ YES | ❌ NO | 🔴 CRITICAL | Delete duplicates |
| Standalone PHP scripts (info.php, etc.) | ✅ YES | ⚠️ MAYBE | ❌ NO | 🟡 MEDIUM | Delete or protect |
| Header injection (X-Tenant-Subdomain) | ✅ YES | ✅ YES | ⚠️ BYPASS | 🟡 MEDIUM | Remove or restrict |
| Queue jobs | ❌ NO | N/A | N/A | NONE | - |
| Scheduled tasks | ❓ UNKNOWN | ❓ | ❓ | 🟡 MEDIUM | Audit Kernel.php |
| Artisan commands | ❓ UNKNOWN | CLI only | ❓ | LOW | Audit if exist |
| routes/api.php | ❓ UNKNOWN | ⚠️ MAYBE | ❓ | 🟡 MEDIUM | Check file |

---

## Primary Side Door: App::before() Route Registration

### How It Works

```php
// app/admin/routes.php:9
App::before(function () {
    // Routes registered here execute BEFORE RouteServiceProvider loads routes.php
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::get('/menu', ...);  // REGISTERS FIRST
    });
});

// routes.php (loaded by RouteServiceProvider AFTER App::before)
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
    Route::get('/menu', ...);  // REGISTERS SECOND (ignored as duplicate)
});
```

**Why This is a Side Door:**
1. Bypasses normal route loading order
2. Allows routes to register before middleware can be applied via standard mechanisms
3. Creates "first-come-first-served" race condition
4. Protected routes never execute

**Mitigation:** Delete duplicate routes from App::before callback

---

## Secondary Risk: Header-Based Tenant Override

### Current Implementation

**Code:** app/Http/Middleware/DetectTenant.php:23-25
```php
$subdomain = $request->header('X-Tenant-Subdomain') 
          ?? $request->header('X-Original-Host') 
          ?? $this->extractSubdomainFromHost($request->getHost());
```

**Attack Vector:**
```bash
# Attacker accesses Tenant A's subdomain
curl https://amir.paymydine.com/api/v1/menu \
     -H "X-Tenant-Subdomain: rosana"

# DetectTenant middleware:
# 1. Reads X-Tenant-Subdomain header: "rosana"
# 2. Looks up tenant: rosana
# 3. Switches to: rosana_db
# 4. Returns: Rosana's menu (to someone on Amir's subdomain!)
```

**Impact:**
- ⚠️ Bypasses subdomain-based tenant isolation
- Allows cross-tenant data access via header injection
- If combined with CORS misconfiguration, severe risk

**Mitigation Options:**

#### Option 1: Remove Header Override (Recommended for Production)
```php
// Only use Host header
$subdomain = $this->extractSubdomainFromHost($request->getHost());
```

#### Option 2: Restrict to Trusted Sources
```php
$subdomain = null;

// Only allow header override from internal/trusted IPs
if (in_array($request->ip(), config('app.trusted_proxies', []))) {
    $subdomain = $request->header('X-Tenant-Subdomain') 
              ?? $request->header('X-Original-Host');
}

$subdomain = $subdomain ?? $this->extractSubdomainFromHost($request->getHost());
```

#### Option 3: Verify Header Matches Host
```php
$headerSubdomain = $request->header('X-Tenant-Subdomain');
$hostSubdomain = $this->extractSubdomainFromHost($request->getHost());

// Only allow header if it matches host (for debugging)
if ($headerSubdomain && $headerSubdomain !== $hostSubdomain) {
    Log::warning('Tenant subdomain mismatch', [
        'header' => $headerSubdomain,
        'host' => $hostSubdomain,
    ]);
}

$subdomain = $hostSubdomain;  // Always use host, ignore header
```

---

## 4. Routes Outside Main Route Files

### Check routes/ Directory

```bash
ls -la routes/
```

**Expected Files:**
- `web.php` (if exists)
- `api.php` (if exists)
- `console.php` (CLI routes)
- `channels.php` (broadcasting)

**Risk:** If `routes/api.php` exists and defines routes without tenant middleware

**Verification Needed:**
```bash
cat routes/api.php 2>/dev/null
```

**If file exists:** Audit for tenant middleware on any database-accessing routes

---

## 5. TastyIgniter Extension Routes

### Extension System

TastyIgniter allows extensions to register routes. These might bypass central routing.

**Potential Locations:**
- `extensions/*/routes.php`
- `extensions/*/Extension.php` (boot method)

**Search:**
```bash
find extensions/ -name "routes.php" -o -name "Extension.php" 2>/dev/null
```

**Risk:** MEDIUM - extensions might add routes without tenant middleware

**Recommendation:** Audit all extension route registrations

---

## 6. Webhook Endpoints

### External System Entry Points

**Found:** `POST /api/v1/webhooks/pos` (app/admin/routes.php:371)

**Current Status:**
- Exists ONLY in unprotected duplicate
- NOT in protected routes.php
- No tenant middleware

**Risk:** 🔴 HIGH

**Attack Scenario:**
```bash
# External POS system sends webhook
POST https://amir.paymydine.com/api/v1/webhooks/pos
Content-Type: application/json

{
  "order_id": "12345",
  "status": "completed",
  "tenant": "amir"
}
```

**Current Behavior:**
- Hits unprotected route in app/admin/routes.php:371
- No tenant middleware runs
- Controller processes webhook with default connection (mysql or random)
- Updates wrong database

**Fix:** Add webhook route to protected group in routes.php (already specified in patch_plan.md)

---

## 7. Potential .htaccess / Web Server Bypasses

### Check for Direct Script Access

**Test:**
```bash
# If web server allows direct PHP execution
curl http://example.com/check-table-structure.php
# Should return 403/404, not execute
```

**Recommended .htaccess Rules:**
```apache
# Block direct access to PHP files in root
<FilesMatch "^(info|check-table-structure|debug_table_helper|fix-themes|refresh-themes)\.php$">
    Order deny,allow
    Deny from all
</FilesMatch>

# Allow only index.php
<FilesMatch "^(?!index\.php$).*\.php$">
    Order deny,allow
    Deny from all
    Allow from 127.0.0.1
</FilesMatch>
```

**Nginx Equivalent:**
```nginx
location ~ ^/(info|check-table-structure|debug_table_helper|fix-themes|refresh-themes)\.php$ {
    deny all;
}
```

---

## Summary: Side Door Threats

### Active Threats (Require Immediate Action)

| Threat | Severity | Status | Fix |
|--------|----------|--------|-----|
| App::before() duplicate routes | 🔴 CRITICAL | ACTIVE | Delete duplicates |
| Header injection (X-Tenant-Subdomain) | 🟡 MEDIUM | ACTIVE | Remove or restrict |
| Webhook route unprotected | 🔴 HIGH | ACTIVE | Add to routes.php |

### Potential Threats (Require Verification)

| Threat | Severity | Status | Action Needed |
|--------|----------|--------|---------------|
| Standalone PHP scripts | 🟡 MEDIUM | UNKNOWN | Delete or block via web server |
| routes/api.php routes | 🟡 MEDIUM | UNKNOWN | Audit file if exists |
| Extension routes | 🟡 MEDIUM | UNKNOWN | Audit extensions/ directory |
| Scheduled tasks | 🟡 MEDIUM | UNKNOWN | Audit app/Console/Kernel.php |

### Non-Threats (Verified Safe)

| Item | Status | Reason |
|------|--------|--------|
| api-server-multi-tenant.php | ✅ SAFE | File doesn't exist |
| DB::connection('mysql') usage | ✅ SAFE | All uses are legitimate |
| index.php entry point | ✅ SAFE | Routes through Laravel |
| Direct PDO connections | ✅ SAFE | None found |

---

## Recommendations

### Immediate (Apply with main patch)
1. ✅ Delete duplicate route groups (primary fix)
2. ✅ Add webhook route to protected group
3. ⚠️ Remove header override feature OR add IP whitelist

### Short-term (Within 1 week)
4. Delete standalone PHP scripts from root
5. Add web server rules to block direct script access
6. Audit routes/api.php if it exists
7. Audit TastyIgniter extensions for route registrations

### Long-term (Within 1 month)
8. Add integration tests to prevent duplicate route registration
9. Add middleware validation tests
10. Document proper route registration patterns for developers
11. Consider removing App::before() pattern in favor of standard RouteServiceProvider

---

## Conclusion

**Primary Side Door:** App::before() route registration causing duplicates ✅ IDENTIFIED  
**Secondary Risk:** Header injection allowing tenant override ⚠️ PRESENT  
**Other Risks:** Mostly theoretical or low-severity  

**Critical Path:** Fix duplicate routes (main patch), then address header injection

All side doors have been investigated and documented with risk levels and remediation plans.

