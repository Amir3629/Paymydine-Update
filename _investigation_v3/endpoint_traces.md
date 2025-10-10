## Endpoint Connection Traces - Request Lifecycle Analysis

### Trace Methodology

Since we cannot execute code, these traces are **static analysis** showing what connection SHOULD be used based on middleware presence.

---

### Trace 1: GET /api/v1/menu

#### Scenario A: Protected Route (routes.php:394)

**Request:**
```
GET https://amir.paymydine.com/api/v1/menu
Host: amir.paymydine.com
```

**Route Matching:**
```php
// routes.php:376-454
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ← Tenant middleware present
], function () {
    Route::get('/menu', function () {
        $p = DB::connection()->getTablePrefix();
        $items = DB::select($query);
        // ...
    });
});
```

**Middleware Chain Execution:**
1. `EncryptCookies`
2. `AddQueuedCookiesToResponse`
3. `StartSession`
4. `ShareErrorsFromSession`
5. `VerifyCsrfToken`
6. `SubstituteBindings`
7. `Localization`
8. **`DetectTenant`** ← CRITICAL

**DetectTenant Execution:**
```php
// Subdomain extraction
$host = "amir.paymydine.com";
$subdomain = "amir";

// Tenant lookup
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', 'amir.%')->first();
// Returns: { id: 1, domain: 'amir.paymydine.com', database: 'amir_db', ... }

// Connection configuration
Config::set('database.connections.tenant.database', 'amir_db');
DB::purge('tenant');
DB::reconnect('tenant');

// Switch default connection
Config::set('database.default', 'tenant');
DB::setDefaultConnection('tenant');
```

**Connection State Before Query:**
```php
DB::getDefaultConnection()  // Returns: "tenant"
DB::connection()->getDatabaseName()  // Returns: "amir_db"
DB::connection()->getTablePrefix()  // Returns: "ti_"
```

**Query Execution:**
```php
$p = DB::connection()->getTablePrefix();  // "ti_"
$query = "SELECT ... FROM {$p}menus ...";  // Becomes: "FROM ti_menus"
$items = DB::select($query);
// Executes on: connection=tenant, database=amir_db
// Full query: SELECT ... FROM amir_db.ti_menus
```

**Result:** ✅ CORRECT - Menu from amir tenant

---

#### Scenario B: Unprotected Duplicate (app/admin/routes.php:398)

**Request:**
```
GET https://amir.paymydine.com/api/v1/menu
Host: amir.paymydine.com
```

**Route Matching:**
```php
// app/admin/routes.php:380-458
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ← NO tenant middleware
], function () {
    Route::get('/menu', function () {
        $p = DB::connection()->getTablePrefix();
        $items = DB::select($query);
        // ...
    });
});
```

**Middleware Chain Execution:**
1. `EncryptCookies`
2. `AddQueuedCookiesToResponse`
3. `StartSession`
4. `ShareErrorsFromSession`
5. `VerifyCsrfToken`
6. `SubstituteBindings`
7. `Localization`
8. ❌ **NO DetectTenant** - middleware chain ends here

**Connection State Before Query:**
```php
DB::getDefaultConnection()  // Returns: "mysql" (boot default)
DB::connection()->getDatabaseName()  // Returns: "paymydine" (central DB)
DB::connection()->getTablePrefix()  // Returns: "ti_"
```

**Query Execution:**
```php
$p = DB::connection()->getTablePrefix();  // "ti_"
$query = "SELECT ... FROM {$p}menus ...";  // Becomes: "FROM ti_menus"
$items = DB::select($query);
// Executes on: connection=mysql, database=paymydine
// Full query: SELECT ... FROM paymydine.ti_menus
```

**Result:** ❌ WRONG - Menu from central database (contains all tenants' data mixed or empty)

**Alternative Scenario (if previous request set tenant):**
```php
// If previous request in same PHP-FPM worker was for rosana.paymydine.com
DB::getDefaultConnection()  // Returns: "tenant" (from previous request)
DB::connection()->getDatabaseName()  // Returns: "rosana_db" (wrong tenant!)
```

**Result:** ❌ WRONG - Menu from different tenant (data leakage)

---

### Trace 2: POST /api/v1/orders

#### Scenario A: Protected Route (routes.php:583)

**Request:**
```
POST https://rosana.paymydine.com/api/v1/orders
Host: rosana.paymydine.com
Content-Type: application/json

{
  "customer_name": "John Doe",
  "items": [{"menu_id": 5, "quantity": 2, "price": 15.99}],
  "total_amount": 31.98,
  "payment_method": "cash"
}
```

**Middleware Chain:**
- Includes `detect.tenant` ✅

**DetectTenant Execution:**
```php
$subdomain = "rosana";
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', 'rosana.%')->first();
// Returns: { database: 'rosana_db', ... }

Config::set('database.default', 'tenant');
DB::setDefaultConnection('tenant');
```

**Connection State Before Query:**
```php
DB::getDefaultConnection()  // "tenant"
DB::connection()->getDatabaseName()  // "rosana_db"
```

**Query Execution:**
```php
DB::beginTransaction();  // On tenant connection

$orderNumber = DB::table('orders')->max('order_id') + 1;
// Query: SELECT MAX(order_id) FROM rosana_db.ti_orders

$orderId = DB::table('orders')->insertGetId([...]);
// Query: INSERT INTO rosana_db.ti_orders ...

DB::table('order_menus')->insert([...]);
// Query: INSERT INTO rosana_db.ti_order_menus ...

DB::commit();  // Commit on rosana_db
```

**Result:** ✅ CORRECT - Order saved to rosana tenant's database

---

#### Scenario B: Unprotected Duplicate (app/admin/routes.php:587)

**Request:**
```
POST https://rosana.paymydine.com/api/v1/orders
Host: rosana.paymydine.com
[same payload]
```

**Middleware Chain:**
- NO `detect.tenant` ❌

**Connection State Before Query:**
```php
// Scenario B1: First request in worker
DB::getDefaultConnection()  // "mysql"
DB::connection()->getDatabaseName()  // "paymydine"

// Scenario B2: After amir tenant used this worker
DB::getDefaultConnection()  // "tenant"
DB::connection()->getDatabaseName()  // "amir_db"
```

**Query Execution (Scenario B1 - Central DB):**
```php
DB::beginTransaction();  // On mysql connection (central)

$orderId = DB::table('orders')->insertGetId([...]);
// Query: INSERT INTO paymydine.ti_orders ...
// ❌ Order saved to central database (mixed with all tenants or orphaned)
```

**Query Execution (Scenario B2 - Wrong Tenant):**
```php
DB::beginTransaction();  // On tenant connection (but wrong tenant!)

$orderId = DB::table('orders')->insertGetId([...]);
// Query: INSERT INTO amir_db.ti_orders ...
// ❌ Rosana's order saved to Amir's database!
```

**Result:** ❌ CRITICAL DATA CORRUPTION - Order saved to wrong database

---

### Trace 3: GET /api/v1/order-status?order_id=123

#### Protected Route (routes.php:724)

**Connection State:**
```php
// After detect.tenant middleware
DB::getDefaultConnection()  // "tenant"
DB::connection()->getDatabaseName()  // "amir_db"
```

**Query:**
```php
$order = DB::table('orders')
    ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
    ->where('orders.order_id', 123)
    ->first();
// Query: SELECT ... FROM amir_db.ti_orders LEFT JOIN amir_db.ti_statuses WHERE order_id = 123
```

**Result:** ✅ Returns order 123 from amir tenant

#### Unprotected Duplicate (app/admin/routes.php:728)

**Connection State:**
```php
// NO detect.tenant middleware
DB::getDefaultConnection()  // "mysql" or random tenant
DB::connection()->getDatabaseName()  // "paymydine" or "rosana_db"
```

**Query:**
```php
$order = DB::table('orders')
    ->leftJoin('statuses', ...)
    ->where('orders.order_id', 123)
    ->first();
// Query: SELECT ... FROM paymydine.ti_orders WHERE order_id = 123
// OR: SELECT ... FROM rosana_db.ti_orders WHERE order_id = 123
```

**Result:** ❌ Returns order 123 from WRONG database (could be different tenant's order)

---

### Trace 4: POST /api/v1/waiter-call

#### Protected Route (routes.php:923)

**Connection State:**
```php
// After detect.tenant middleware
DB::getDefaultConnection()  // "tenant"
DB::connection()->getDatabaseName()  // "amir_db"
```

**Query:**
```php
DB::transaction(function() {
    $callId = DB::table('waiter_calls')->insertGetId([
        'table_id' => '12',
        'message' => 'Need water',
        'status' => 'new',
        'created_at' => now(),
    ]);
    // INSERT INTO amir_db.ti_waiter_calls ...
    
    DB::table('notifications')->insert([
        'type' => 'waiter_call',
        'title' => 'Waiter called from Table 12',
        'table_id' => '12',
        'status' => 'new',
        'created_at' => now(),
    ]);
    // INSERT INTO amir_db.ti_notifications ...
});
```

**Result:** ✅ Waiter call and notification saved to amir tenant

#### Unprotected Duplicate (app/admin/routes.php:939)

**Connection State:**
```php
// NO detect.tenant middleware  
DB::getDefaultConnection()  // "mysql" or random tenant
```

**Query:**
```php
DB::transaction(function() {
    $callId = DB::table('waiter_calls')->insertGetId([...]);
    // INSERT INTO paymydine.ti_waiter_calls (WRONG!)
    // OR: INSERT INTO rosana_db.ti_waiter_calls (WRONG TENANT!)
    
    DB::table('notifications')->insert([...]);
    // INSERT INTO paymydine.ti_notifications (WRONG!)
    // OR: INSERT INTO rosana_db.ti_notifications (WRONG TENANT!)
});
```

**Result:** ❌ Waiter call appears in wrong tenant's system

---

### Trace 5: POST /api/v1/table-notes

#### Protected Route (routes.php:983)

**Connection:** `tenant` → `amir_db` ✅  
**Query:** `INSERT INTO amir_db.ti_table_notes` ✅  
**Query:** `INSERT INTO amir_db.ti_notifications` ✅  
**Result:** ✅ Note saved to correct tenant

#### Unprotected Duplicate (app/admin/routes.php:1000)

**Connection:** `mysql` or random tenant ❌  
**Query:** `INSERT INTO paymydine.ti_table_notes` or wrong tenant ❌  
**Result:** ❌ Note saved to wrong database

---

### Trace 6: GET /api/v1/table-info?table_id=5

#### Protected Route (routes.php:838)

**Connection:** `tenant` → `amir_db` ✅  
**Query:** `SELECT * FROM amir_db.ti_tables WHERE table_id = 5` ✅  
**Result:** ✅ Returns table 5 from amir tenant

#### Unprotected Duplicate (app/admin/routes.php:842)

**Connection:** `mysql` or random tenant ❌  
**Query:** `SELECT * FROM paymydine.ti_tables WHERE table_id = 5` ❌  
**Result:** ❌ Returns table 5 from WRONG database (could be different tenant's table)

---

### Admin Route Traces

#### GET /admin/orders/get-table-statuses

**Route:** app/admin/routes.php:121  
**Middleware:** `['web']` only  
**Tenant Guard:** ❌ NO

**Connection State:**
```php
DB::getDefaultConnection()  // "mysql" (or random tenant if set previously)
DB::connection()->getDatabaseName()  // "paymydine" (or wrong tenant DB)
```

**Query:**
```php
$tableStatuses = DB::table('orders')
    ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
    ->join('tables', 'orders.order_type', '=', 'tables.table_id')
    ->select(...)
    ->where('orders.status_id', '!=', 10)
    ->get();
// Query: SELECT ... FROM paymydine.ti_orders 
//        JOIN paymydine.ti_statuses 
//        JOIN paymydine.ti_tables
```

**Result:** ❌ Admin panel shows table statuses from WRONG database

---

### Summary: Connection States by Route

| Endpoint | Protected Version | Unprotected Version |
|----------|------------------|---------------------|
| `/api/v1/menu` | `tenant` → `amir_db` ✅ | `mysql` → `paymydine` ❌ |
| `/api/v1/orders` | `tenant` → `rosana_db` ✅ | Random/central ❌ |
| `/api/v1/order-status` | `tenant` → `amir_db` ✅ | Random/central ❌ |
| `/api/v1/waiter-call` | `tenant` → `amir_db` ✅ | Random/central ❌ |
| `/api/v1/table-notes` | `tenant` → `amir_db` ✅ | Random/central ❌ |
| `/api/v1/table-info` | `tenant` → `amir_db` ✅ | Random/central ❌ |
| `/admin/orders/get-table-statuses` | N/A | Random/central ❌ |

**Key Insight:** The unprotected routes use whatever connection happens to be default:
- First request in worker: `mysql` (central DB)
- After any tenant request: Last tenant's DB (wrong tenant)

This explains why users see mixed data from multiple tenants.

