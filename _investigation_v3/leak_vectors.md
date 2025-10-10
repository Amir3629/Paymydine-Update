## Cross-Tenant Data Leakage Vectors - Detailed Analysis

### Executive Summary

**ROOT CAUSE IDENTIFIED:**
The entire `app/admin/routes.php` file (1089 lines) contains DUPLICATE routes from `routes.php` but **WITHOUT tenant middleware**. This creates ~26 unprotected duplicates of critical API endpoints.

**Confirmed Leakage Paths:**
1. ❌ **Duplicate API routes** without detect.tenant (app/admin/routes.php:364-1083)
2. ❌ **Admin utility routes** without detect.tenant (app/admin/routes.php:121-201)
3. ⚠️ **Hardcoded ti_ prefixes** in app/main/routes.php (inactive/legacy file)
4. ✅ **Explicit mysql connections** - all are SAFE (super admin only)

---

### Leakage Vector 1: Duplicate API Routes Without Tenant Middleware

#### Impact: CRITICAL - All customer-facing endpoints vulnerable

##### Example 1: Menu Endpoint Duplicate

**SAFE VERSION (routes.php:394-454):**
```php
// routes.php:376-454
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ← HAS PROTECTION
], function () {
    Route::get('/menu', function () {
        $p = DB::connection()->getTablePrefix();
        $query = "SELECT ... FROM {$p}menus ...";
        $items = DB::select($query);  // Uses TENANT connection
        return response()->json(['success' => true, 'data' => ['items' => $items]]);
    });
});
```
**Connection at query time:** `tenant` → `amir_db.ti_menus` ✅

**VULNERABLE DUPLICATE (app/admin/routes.php:398-458):**
```php
// app/admin/routes.php:380-458
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ← NO TENANT PROTECTION
], function () {
    Route::get('/menu', function () {
        $p = DB::connection()->getTablePrefix();
        $query = "SELECT ... FROM {$p}menus ...";
        $items = DB::select($query);  // Uses DEFAULT connection (WRONG!)
        return response()->json(['success' => true, 'data' => ['items' => $items]]);
    });
});
```
**Connection at query time:** `mysql` → `paymydine.ti_menus` ❌ **CENTRAL DB!**  
OR: `tenant` → last tenant from previous request in PHP-FPM worker ❌ **WRONG TENANT!**

##### Example 2: Order Creation Duplicate

**SAFE VERSION (routes.php:583-721):**
```php
Route::post('/orders', function (Request $request) {
    // With detect.tenant middleware
    DB::beginTransaction();
    $orderId = DB::table('orders')->insertGetId([...]);  // tenant connection
    DB::table('order_menus')->insert([...]);  // tenant connection
    DB::commit();
    return response()->json(['success' => true, 'order_id' => $orderId]);
});
```
**Connection:** `tenant` → Order saved to `amir_db.ti_orders` ✅

**VULNERABLE DUPLICATE (app/admin/routes.php:587-725):**
```php
Route::post('/orders', function (Request $request) {
    // NO tenant middleware
    DB::beginTransaction();
    $orderId = DB::table('orders')->insertGetId([...]);  // DEFAULT connection!
    DB::table('order_menus')->insert([...]);  // DEFAULT connection!
    DB::commit();
    return response()->json(['success' => true, 'order_id' => $orderId]);
});
```
**Connection:** `mysql` or random tenant → Order saved to WRONG database ❌

##### Example 3: Waiter Call Duplicate

**SAFE VERSION (routes.php:923-979):**
```php
Route::post('/waiter-call', function (Request $request) {
    // With detect.tenant middleware
    return DB::transaction(function() use ($request) {
        $callId = DB::table('waiter_calls')->insertGetId([...]);
        DB::table('notifications')->insert([...]);
        return response()->json(['ok' => true, 'id' => $callId]);
    });
});
```
**Connection:** `tenant` → Notification saved to `amir_db.ti_notifications` ✅

**VULNERABLE DUPLICATE (app/admin/routes.php:939-996):**
```php
Route::post('/waiter-call', function (Request $request) {
    // NO tenant middleware
    return DB::transaction(function() use ($request) {
        $callId = DB::table('waiter_calls')->insertGetId([...]);
        DB::table('notifications')->insert([...]);
        return response()->json(['ok' => true, 'id' => $callId]);
    });
});
```
**Connection:** Default → Notification saved to WRONG database ❌

#### Complete List of Vulnerable Duplicates

| Endpoint | Safe Location | Vulnerable Location | Risk |
|----------|---------------|---------------------|------|
| `GET /api/v1/menu` | routes.php:394 | app/admin/routes.php:398 | ❌ Menu from wrong tenant |
| `POST /api/v1/orders` | routes.php:583 | app/admin/routes.php:587 | ❌ Order to wrong tenant |
| `GET /api/v1/order-status` | routes.php:724 | app/admin/routes.php:728 | ❌ Status from wrong tenant |
| `POST /api/v1/waiter-call` | routes.php:923 | app/admin/routes.php:939 | ❌ Call to wrong tenant |
| `POST /api/v1/table-notes` | routes.php:983 | app/admin/routes.php:1000 | ❌ Note to wrong tenant |
| `GET /api/v1/settings` | routes.php:554 | app/admin/routes.php:558 | ❌ Settings from wrong tenant |
| `GET /api/v1/restaurant` | routes.php:525 | app/admin/routes.php:529 | ❌ Info from wrong tenant |
| `GET /api/v1/categories` | routes.php:457 | app/admin/routes.php:461 | ❌ Categories from wrong tenant |
| `GET /api/v1/table-info` | routes.php:838 | app/admin/routes.php:842 | ❌ Table from wrong tenant |
| `GET /api/v1/current-table` | routes.php:878 | app/admin/routes.php:882 | ❌ Table from wrong tenant |
| `POST /api/v1/order-status` | routes.php:791 | app/admin/routes.php:795 | ❌ Update wrong tenant |
| `GET /api/v1/payments` | routes.php:381 | app/admin/routes.php:385 | ❌ Payments from wrong tenant |
| `GET /api/v1/images` | routes.php:487 | app/admin/routes.php:491 | ❌ Images from wrong tenant |

---

### Leakage Vector 2: Admin Utility Routes Without Tenant Middleware

#### Impact: HIGH - Admin panel shows wrong tenant's data

##### Route 1: Table Statuses
```php
// app/admin/routes.php:121-159
Route::get('/orders/get-table-statuses', function () {
    $tableStatuses = DB::table('orders')
        ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->join('tables', 'orders.order_type', '=', 'tables.table_id')
        ->select(...)
        ->where('orders.status_id', '!=', 10)
        ->orderBy('orders.created_at', 'desc')
        ->get();
        
    return response()->json(['success' => true, 'statuses' => $tableStatuses]);
});
```

**Middleware:** `['web']` only  
**Connection:** Default (mysql or previous tenant)  
**Impact:** Admin from tenant A sees orders from default DB or tenant B ❌

##### Route 2: Cashier URL Generation
```php
// app/admin/routes.php:162-182
Route::get('/orders/get-cashier-url', function (Request $request) {
    $locationId = (int) $request->get('location_id', 1);
    $frontendUrl = $request->getScheme() . '://' . $request->getHost();
    $url = rtrim($frontendUrl, '/').'/cashier?'.http_build_query([...]);
    
    return response()->json(['success' => true, 'url' => $url]);
});
```

**Middleware:** `['web']` only  
**Connection:** Not used in this route (URL generation only)  
**Impact:** URL is correct (uses request host) ✅  
**But:** If this called any DB::table(), would use wrong connection ⚠️

##### Route 3: Storefront URL
```php
// app/admin/routes.php:185-200
Route::get('/storefront-url', function (Request $request) {
    $locationId = (int) $request->get('location_id', 1);
    $url = buildCashierTableUrl($locationId);  // ← Queries DB!
    
    if ($url) {
        return redirect($url);
    } else {
        return redirect(root_url());
    }
});
```

**Helper called:**
```php
// app/admin/routes.php:81-114
function buildCashierTableUrl($locationId = 1) {
    $cashierTableId = resolveCashierTableId($locationId);
    $cashierTable = DB::table('tables')->where('table_id', $cashierTableId)->first();  // ← NO TENANT!
    // ...
}
```

**Middleware:** `['web']` only  
**Connection:** Default → queries wrong tenant's tables  
**Impact:** Admin from tenant A gets cashier URL for tenant B's table ❌

---

### Leakage Vector 3: Hardcoded `ti_` Prefixes in SQL

#### Location: app/main/routes.php (INACTIVE FILE)

**Status:** ⚠️ **LOW RISK** - This file appears to be legacy/unused

```php
// app/main/routes.php:145-148
$query = "
    FROM ti_menus m
    LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
    LEFT JOIN ti_categories c ON mc.category_id = c.category_id
    LEFT JOIN ti_media_attachments ma ON ...
";
```

**Analysis:**
- File: `app/main/routes.php` (not `routes.php`)
- Not registered in main route files
- Contains old/duplicate route definitions
- **Verdict:** INACTIVE, but should be deleted to avoid confusion

**Active Files Use Dynamic Prefix:**
```php
// routes.php:397 (CORRECT)
$p = DB::connection()->getTablePrefix();
$query = "FROM {$p}menus m LEFT JOIN {$p}categories c ...";
```

---

### Leakage Vector 4: Explicit `DB::connection('mysql')` Usage

#### All Uses Audited - ALL SAFE ✅

##### Category 1: Super Admin Operations (SAFE)
```php
// app/admin/controllers/SuperAdminController.php:88
$tenants = DB::connection('mysql')
    ->table('tenants')
    ->where('status', '!=', 'deleted')
    ->orderBy('start', 'desc')
    ->paginate(10);
```
**Purpose:** Super admin viewing tenant list  
**Database:** Central `paymydine` database  
**Status:** ✅ CORRECT - super admin should see all tenants

##### Category 2: Tenant Creation (SAFE)
```php
// app/admin/controllers/SuperAdminController.php:129
DB::connection('mysql')->table('tenants')->insert([
    'name' => $validatedData['name'],
    'domain' => $validatedData['domain'],
    'database' => $databaseName,
    // ...
]);
```
**Purpose:** Creating new tenant record  
**Database:** Central `paymydine` database  
**Status:** ✅ CORRECT - tenant directory is in central DB

##### Category 3: Tenant Resolution in Middleware (SAFE)
```php
// app/Http/Middleware/DetectTenant.php:30
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```
**Purpose:** Finding tenant by subdomain  
**Database:** Central `paymydine` database  
**Status:** ✅ CORRECT - tenant lookup happens in central DB

##### Category 4: Super Admin Views (SAFE)
```php
// app/admin/views/index.blade.php:180
$tns = DB::connection('mysql')
    ->table('tenants')
    ->where('status', '!=', 'deleted')
    ->orderBy('start', 'desc')
    ->get();
```
**Purpose:** Super admin dashboard statistics  
**Database:** Central `paymydine` database  
**Status:** ✅ CORRECT - dashboard shows all tenants

**Summary:** All 35 uses of `DB::connection('mysql')` are legitimate access to central database.

---

### Leakage Vector 5: TenantDatabaseMiddleware vs DetectTenant

#### Middleware Confusion Analysis

##### DetectTenant (CORRECT Implementation)
```php
// app/Http/Middleware/DetectTenant.php
class DetectTenant
{
    public function handle(Request $request, Closure $next)
    {
        $subdomain = $this->extractSubdomainFromHost($request->getHost());
        
        $tenant = DB::connection('mysql')->table('ti_tenants')
            ->where('domain', 'like', $subdomain . '.%')
            ->first();
            
        if ($tenant && $tenant->database) {
            // Create tenant connection
            Config::set('database.connections.tenant.database', $tenant->database);
            DB::purge('tenant');
            DB::reconnect('tenant');
            
            // Switch default
            Config::set('database.default', 'tenant');
            DB::setDefaultConnection('tenant');
        }
        
        return $next($request);
    }
}
```
**Strategy:** Create `tenant` connection, switch default  
**Used in:** routes.php (all protected routes)  
**Status:** ✅ CORRECT

##### TenantDatabaseMiddleware (LEGACY/RISKY)
```php
// app/Http/Middleware/TenantDatabaseMiddleware.php
class TenantDatabaseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->extractTenantFromDomain($request);
        
        $tenantInfo = DB::connection('mysql')->table('ti_tenants')
            ->where('domain', $tenant . '.paymydine.com')
            ->first();
            
        if ($tenantInfo) {
            // Modify mysql connection directly
            Config::set('database.connections.mysql.database', $tenantInfo->database);
            DB::purge('mysql');
            DB::reconnect('mysql');
        }
        
        return $next($request);
    }
}
```
**Strategy:** Modify `mysql` connection directly (risky)  
**Used in:** Only 1 route: `/redirect/qr` (app/admin/routes.php:210)  
**Status:** ⚠️ LEGACY - should use DetectTenant instead

##### Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware
**Status:** Referenced in bypasses but actual implementation not found  
**Bypasses:** Multiple routes use `->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class])`  
**Impact:** These bypasses are NOOPs if middleware doesn't actually run

---

### api-server-multi-tenant.php Investigation

**Search Results:**
```
./frontend/lib/multi-tenant-config.ts
./frontend 3/lib/multi-tenant-config.ts
./frontend 2/lib/multi-tenant-config.ts
```

**Analysis:** No `api-server-multi-tenant.php` file found in backend. The references are in frontend TypeScript config files, likely for frontend multi-tenant routing, not related to backend isolation.

---

### Root Cause Summary

**The Problem:**
`app/admin/routes.php` contains a complete copy of the API routes from `routes.php` but without `detect.tenant` middleware. This was likely created during a refactoring where:

1. Original routes were in `app/admin/routes.php` (no middleware)
2. Routes were copied to `routes.php` and `detect.tenant` was added
3. Original unprotected routes in `app/admin/routes.php` were never deleted
4. Result: Every API endpoint exists twice - protected and unprotected

**Why Cross-Tenant Data is Visible:**

When a request hits an unprotected route:
1. No `DetectTenant` middleware runs
2. Default connection stays `mysql` (central DB)
3. OR default connection is whatever previous request set (wrong tenant)
4. Query executes: `DB::table('orders')->get()`
5. Laravel adds prefix: `ti_orders`
6. Query runs on: `paymydine.ti_orders` (central DB) or `rosana_db.ti_orders` (wrong tenant)
7. User from tenant A sees data from central DB or tenant B

**Confirmed Symptoms:**
- ✅ Orders from other tenants visible
- ✅ Notifications from other tenants visible
- ✅ Table statuses from other tenants visible
- ✅ Menu items from other tenants visible

All because requests are hitting the unprotected route duplicates.

