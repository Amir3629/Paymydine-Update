## Database Connection Trace - Tenant Isolation Analysis

### Connection Flow Overview

#### Boot Configuration (config/database.php)
```php
// Line 16
'default' => env('DB_CONNECTION', 'mysql'),

// Line 44-62: mysql connection (MAIN/CENTRAL DATABASE)
'mysql' => [
    'database' => env('DB_DATABASE', 'paymydine'),
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ... connection to main database with ti_tenants table
],

// Line 63-81: tenant connection (DYNAMIC, CONFIGURED AT RUNTIME)
'tenant' => [
    'database' => env('DB_DATABASE', 'taste'),  // Default, overridden by middleware
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ... dynamically configured by DetectTenant middleware
],
```

**At Application Boot:**
- Default connection: `mysql`
- Default database: `paymydine` (central database)
- Table prefix: `ti_`

### Request Lifecycle Trace

#### Example 1: Menu List Request (`GET /api/v1/menu`)

**Step 1: Request Arrives**
```
GET https://amir.paymydine.com/api/v1/menu
Host: amir.paymydine.com
```

**Step 2: Route Matching**
```php
// routes.php:376-454
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ← Tenant middleware IS applied
], function () {
    Route::get('/menu', function () {
        // ... menu logic
    });
});
```

**Step 3: Middleware Chain Execution**
```
1. EncryptCookies (web group)
2. AddQueuedCookiesToResponse (web group)
3. StartSession (web group)
4. ShareErrorsFromSession (web group)
5. VerifyCsrfToken (web group)
6. SubstituteBindings (web group)
7. Localization (web group)
8. DetectTenant ← CRITICAL FOR ISOLATION
```

**Step 4: DetectTenant Middleware Execution**

**File**: `app/Http/Middleware/DetectTenant.php:20-78`

```php
public function handle(Request $request, Closure $next)
{
    // Extract subdomain from host
    $host = $request->getHost();  // "amir.paymydine.com"
    $subdomain = $this->extractSubdomainFromHost($host);  // "amir"
    
    // Query MAIN database for tenant record
    $tenant = DB::connection('mysql')->table('ti_tenants')
        ->where('domain', 'like', $subdomain . '.%')
        ->orWhere('domain', $subdomain)
        ->first();
    // ↑ This query uses: Connection='mysql', DB='paymydine', Table='ti_tenants'
    
    if ($tenant && $tenant->database) {
        // Configure tenant connection dynamically
        Config::set('database.connections.tenant.database', $tenant->database);
        // e.g., $tenant->database = 'amir_db'
        
        Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
        
        // Reconnect to tenant database
        DB::purge('tenant');
        DB::reconnect('tenant');
        
        // ⚠️ CRITICAL: Switch default connection for this request
        Config::set('database.default', 'tenant');
        DB::setDefaultConnection('tenant');
        
        // Store tenant in container
        app()->instance('tenant', $tenant);
        
        Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
    }
    
    return $next($request);
}
```

**After DetectTenant Completes:**
- Default connection: `tenant` (was `mysql`)
- Active database: `amir_db` (was `paymydine`)
- Table prefix: `ti_` (unchanged)

**Step 5: Route Closure Execution**

```php
// routes.php:394-454
Route::get('/menu', function () {
    // Get prefix for raw SQL
    $p = DB::connection()->getTablePrefix();  
    // ↑ Returns 'ti_' from the TENANT connection
    
    // Build raw SQL query
    $query = "
        SELECT 
            m.menu_id as id,
            m.menu_name as name,
            ...
        FROM {$p}menus m
        LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
        LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
        LEFT JOIN {$p}media_attachments ma ON ...
        WHERE m.menu_status = 1
    ";
    // ↑ Resolves to: FROM ti_menus, LEFT JOIN ti_menu_categories, etc.
    
    $items = DB::select($query);
    // ↑ Uses DEFAULT connection (tenant), DB (amir_db), Query resolves to amir_db.ti_menus
    
    $categoriesQuery = "SELECT category_id as id, name, priority FROM {$p}categories WHERE status = 1";
    $categories = DB::select($categoriesQuery);
    // ↑ Uses DEFAULT connection (tenant), DB (amir_db), Query resolves to amir_db.ti_categories
    
    return response()->json([
        'success' => true,
        'data' => ['items' => $items, 'categories' => $categories]
    ]);
});
```

**Connection State During Execution:**
- `DB::connection()` → returns `tenant` connection
- `DB::connection()->getDatabaseName()` → returns `amir_db`
- `DB::connection()->getTablePrefix()` → returns `ti_`
- All queries target: `amir_db.ti_menus`, `amir_db.ti_categories`, etc.

#### Example 2: Create Order Request (`POST /api/v1/orders`)

**Request**: `POST https://rosana.paymydine.com/api/v1/orders`

**Middleware Chain**: Same as menu request, `detect.tenant` runs and switches to `rosana_db`

**Route Closure Execution** (routes.php:583-721):

```php
Route::post('/orders', function (Request $request) {
    DB::beginTransaction();
    // ↑ Transaction on DEFAULT connection = tenant (rosana_db)
    
    $orderNumber = DB::table('orders')->max('order_id') + 1;
    // ↑ Query: SELECT MAX(order_id) FROM rosana_db.ti_orders
    
    $orderId = DB::table('orders')->insertGetId([...]);
    // ↑ Query: INSERT INTO rosana_db.ti_orders ...
    
    foreach ($request->items as $item) {
        DB::table('order_menus')->insert([...]);
        // ↑ Query: INSERT INTO rosana_db.ti_order_menus ...
    }
    
    DB::table('order_totals')->insert([...]);
    // ↑ Query: INSERT INTO rosana_db.ti_order_totals ...
    
    DB::commit();
    // ↑ Commit transaction on rosana_db
    
    return response()->json(['success' => true, 'order_id' => $orderId]);
});
```

**Database Operations:**
- All `DB::table()` calls use the default connection (`tenant`)
- All operations target `rosana_db` database
- Isolation: ✅ COMPLETE

#### Example 3: Waiter Call Request (`POST /api/v1/waiter-call`)

**Request**: `POST https://amir.paymydine.com/api/v1/waiter-call`

**Route Closure Execution** (routes.php:923-979):

```php
Route::post('/waiter-call', function (Request $request) {
    return DB::transaction(function() use ($request, $tenantId) {
        // Store waiter call
        $callId = DB::table('waiter_calls')->insertGetId([...]);
        // ↑ Query: INSERT INTO amir_db.ti_waiter_calls ...
        
        // Get table info with SCOPED cache key
        $tableInfo = \App\Helpers\TableHelper::getTableInfo($request->table_id);
        // ↓ Inside TableHelper:
        //   $cacheKey = TenantHelper::scopedCacheKey("table_info_{$tableId}");
        //   → "tenant:amir_db:table_info_123"
        //   Cache::remember($cacheKey, 300, function() use ($tableId) {
        //       return DB::table('tables')->where('table_id', $tableId)->first();
        //       ↑ Query: SELECT * FROM amir_db.ti_tables WHERE table_id = ?
        //   });
        
        // Create notification
        DB::table('notifications')->insert([...]);
        // ↑ Query: INSERT INTO amir_db.ti_notifications ...
        
        return response()->json(['ok' => true, 'id' => $callId]);
    });
});
```

**Database Operations:**
- All queries target `amir_db`
- Cache keys are tenant-scoped
- Isolation: ✅ COMPLETE

#### Example 4: 🔴 VULNERABLE - Admin Notifications (Unprotected Route)

**Request**: `GET https://amir.paymydine.com/admin/notifications-api/count`

**Route Definition** (app/admin/routes.php:1078-1083):

```php
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
});
```

**Middleware Chain**:
```
1. EncryptCookies (web group)
2. AddQueuedCookiesToResponse (web group)
3. StartSession (web group)
4. ShareErrorsFromSession (web group)
5. VerifyCsrfToken (web group)
6. SubstituteBindings (web group)
7. Localization (web group)
❌ NO DetectTenant middleware
```

**Controller Execution** (hypothetical, controller code not shown):

```php
class NotificationsApi extends Controller
{
    public function count()
    {
        // What connection is used here?
        $count = DB::table('notifications')->where('status', 'new')->count();
        // ↑ Uses DEFAULT connection, but which one?
        
        return response()->json(['count' => $count]);
    }
}
```

**Connection State at Execution Time:**
- If this is the FIRST request in the PHP-FPM worker: `DB::connection()` → `mysql`, `DB::getDatabaseName()` → `paymydine` ❌
- If a PREVIOUS request set tenant context: `DB::connection()` → `tenant`, `DB::getDatabaseName()` → last tenant's DB (e.g., `rosana_db`) ❌
- **Result**: UNPREDICTABLE, DATA LEAKAGE RISK

### Connection Switching Verification

#### Pattern 1: Default Connection Usage (CORRECT)

```php
// After detect.tenant middleware runs:
DB::table('menus')->get();
// ↑ Implicitly uses: connection='tenant', db='amir_db', table='ti_menus'

DB::select("SELECT * FROM {$p}orders");
// ↑ Uses: connection='tenant' (default), db='amir_db', resolves to 'ti_orders'
```

#### Pattern 2: Explicit mysql Connection (CORRECT for central DB operations)

```php
// In DetectTenant middleware:
DB::connection('mysql')->table('ti_tenants')->where(...)->first();
// ↑ Explicitly uses: connection='mysql', db='paymydine', table='ti_tenants'

// In super admin routes:
DB::connection('mysql')->table('tenants')->where('id', $id)->update([...]);
// ↑ Explicitly uses: connection='mysql', db='paymydine', table='ti_tenants'
```

#### Pattern 3: Dynamic Prefix with Default Connection (CORRECT)

```php
$p = DB::connection()->getTablePrefix();
// ↑ Gets 'ti_' from the current default connection (tenant)

$query = "SELECT * FROM {$p}menus WHERE menu_status = 1";
DB::select($query);
// ↑ Uses default connection (tenant), resolves to 'amir_db.ti_menus'
```

### Summary: Connection State by Route Type

| Route Type | Middleware | Default Connection | Database Name | Isolation |
|------------|------------|-------------------|---------------|-----------|
| `/api/v1/menu` | `detect.tenant` | `tenant` | `amir_db` | ✅ ISOLATED |
| `/api/v1/orders` | `detect.tenant` | `tenant` | `amir_db` | ✅ ISOLATED |
| `/api/v1/waiter-call` | `detect.tenant` | `tenant` | `amir_db` | ✅ ISOLATED |
| `/admin/notifications-api` (protected) | `detect.tenant` | `tenant` | `amir_db` | ✅ ISOLATED |
| `/admin/notifications-api` (unprotected) | NONE | `mysql` OR random tenant | UNPREDICTABLE | ❌ VULNERABLE |
| Super admin routes | NONE (intentional) | `mysql` | `paymydine` | ✅ CORRECT |

