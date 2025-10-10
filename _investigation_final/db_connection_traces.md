## Database Connection Traces - Per-Endpoint Lifecycle Analysis

### Methodology

These traces show the ACTUAL execution path based on current route registration (where unprotected duplicates win).

---

## Trace 1: GET /api/v1/menu (Menu Read)

### Current Behavior (BROKEN)

**Request:**
```
GET https://amir.paymydine.com/api/v1/menu
Host: amir.paymydine.com
```

**Step 1: Route Matching**
```
Laravel routes collection:
  [0] GET api/v1/menu → app/admin/routes.php:398 (registered via App::before) ← MATCHES
  [1] GET api/v1/menu → routes.php:394 (registered later) ← IGNORED
  
Winner: app/admin/routes.php:398
```

**Step 2: Middleware Execution**
```
Middleware chain for matched route:
  1. EncryptCookies (web group)
  2. AddQueuedCookiesToResponse (web group)
  3. StartSession (web group)
  4. ShareErrorsFromSession (web group)
  5. VerifyCsrfToken (web group)
  6. SubstituteBindings (web group)
  7. Localization (web group)
  ❌ DetectTenant - NOT IN CHAIN
  
Middleware completes, passes to route handler.
```

**Step 3: Connection State Before Query**
```php
// File: app/admin/routes.php:398
Route::get('/menu', function () {
    // At this point:
    Config::get('database.default')  // "mysql" (boot default, never changed)
    DB::getDefaultConnection()  // "mysql"
    DB::connection()->getDatabaseName()  // "paymydine"
    DB::connection()->getTablePrefix()  // "ti_"
    
    $p = DB::connection()->getTablePrefix();  // Returns: "ti_"
    // ↑ Getting prefix from mysql connection (central DB)
```

**Step 4: Query Execution**
```php
    $query = "
        SELECT 
            m.menu_id as id,
            m.menu_name as name,
            ...
        FROM {$p}menus m
        LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
        LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
        LEFT JOIN {$p}media_attachments ma ON ...
    ";
    // ↑ Resolves to: FROM ti_menus LEFT JOIN ti_menu_categories ...
    
    $items = DB::select($query);
    // Executes:
    //   Connection: mysql
    //   Database: paymydine
    //   Full query: SELECT ... FROM paymydine.ti_menus 
    //               LEFT JOIN paymydine.ti_menu_categories ...
```

**Step 5: Result**
```
Returns menu items from: paymydine.ti_menus (central database)
Expected: menu from amir_db.ti_menus (tenant database)
Impact: ❌ Shows wrong menu (central DB menu or empty)
```

---

## Trace 2: POST /api/v1/orders (Order Create)

### Current Behavior (BROKEN - DATA CORRUPTION)

**Request:**
```
POST https://rosana.paymydine.com/api/v1/orders
Host: rosana.paymydine.com
Content-Type: application/json

{
  "customer_name": "Maria Garcia",
  "items": [{"menu_id": 12, "name": "Pasta", "quantity": 1, "price": 18.50}],
  "total_amount": 18.50,
  "payment_method": "cash",
  "table_id": "5",
  "table_name": "Table 5"
}
```

**Step 1: Route Matching**
```
Winner: app/admin/routes.php:587 (unprotected duplicate)
```

**Step 2: Middleware Execution**
```
Middleware chain:
  1-7: web group middleware
  ❌ NO DetectTenant
```

**Step 3: Connection State Before Query**
```php
// File: app/admin/routes.php:587
Route::post('/orders', function (Request $request) {
    // At entry:
    Config::get('database.default')  // "mysql"
    DB::getDefaultConnection()  // "mysql"
    DB::connection()->getDatabaseName()  // "paymydine"
```

**Step 4: Order Creation Logic**
```php
    try {
        DB::beginTransaction();
        // ↑ Transaction on: connection=mysql, database=paymydine
        
        $orderNumber = DB::table('orders')->max('order_id') + 1;
        // Query: SELECT MAX(order_id) FROM paymydine.ti_orders
        // Returns: 150 (max order ID from central DB, NOT rosana's DB)
        
        $orderId = DB::table('orders')->insertGetId([
            'order_id' => 151,  // Next order in central DB
            'first_name' => 'Maria Garcia',
            'order_total' => 18.50,
            'location_id' => 1,
            'order_type' => '5',  // table_id
            'status_id' => 1,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        // Query: INSERT INTO paymydine.ti_orders (order_id, first_name, ...) 
        //        VALUES (151, 'Maria Garcia', ...)
        // ↑ SAVED TO CENTRAL DATABASE, NOT ROSANA'S DATABASE!
        
        foreach ($request->items as $item) {
            DB::table('order_menus')->insert([
                'order_id' => $orderId,
                'menu_id' => 12,
                'name' => 'Pasta',
                'quantity' => 1,
                'price' => 18.50,
                'subtotal' => 18.50,
            ]);
            // Query: INSERT INTO paymydine.ti_order_menus ...
            // ↑ Order items saved to CENTRAL DATABASE!
        }
        
        DB::table('order_totals')->insert([
            'order_id' => $orderId,
            'code' => 'payment_method',
            'title' => 'Payment Method',
            'value' => 'cash',
        ]);
        // Query: INSERT INTO paymydine.ti_order_totals ...
        
        DB::commit();
        // ↑ Commits transaction to paymydine (central) database
        
        return response()->json(['success' => true, 'order_id' => $orderId]);
    }
});
```

**Step 5: Database State After Request**
```sql
-- In paymydine (central DB):
SELECT * FROM ti_orders WHERE order_id = 151;
-- Returns: order_id=151, first_name='Maria Garcia', location_id=1 ✓ (WRONG PLACE)

-- In rosana_db (tenant's DB):
SELECT * FROM ti_orders WHERE order_id = 151;
-- Returns: (empty or different order) ❌ ORDER NOT HERE!

-- In amir_db (different tenant's DB):
SELECT * FROM ti_orders WHERE order_id = 151;
-- Returns: (unrelated) ❌
```

**Result:** 🔴🔴🔴 **DATA CORRUPTION**
- Order saved to central database
- Order NOT in tenant's database
- Tenant's admin panel doesn't show the order
- Order fulfillment breaks

---

## Trace 3: GET /api/v1/order-status?order_id=123

### Current Behavior (BROKEN)

**Request:**
```
GET https://amir.paymydine.com/api/v1/order-status?order_id=123
Host: amir.paymydine.com
```

**Route Winner:** app/admin/routes.php:728

**Connection State:**
```php
DB::getDefaultConnection()  // "mysql"
DB::connection()->getDatabaseName()  // "paymydine"
```

**Query:**
```php
$order = DB::table('orders')
    ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
    ->where('orders.order_id', 123)
    ->select(['orders.order_id', 'orders.status_id', 'statuses.status_name', ...])
    ->first();
// Query: SELECT ... FROM paymydine.ti_orders 
//        LEFT JOIN paymydine.ti_statuses
//        WHERE order_id = 123
```

**Possible Results:**
1. Order 123 exists in central DB: Returns wrong order ❌
2. Order 123 doesn't exist in central DB: Returns null (but exists in tenant DB) ❌
3. Order 123 exists in previous tenant's DB (if connection switched): Returns other tenant's order 🔴

---

## Trace 4: POST /api/v1/waiter-call

### Current Behavior (BROKEN - NOTIFICATION TO WRONG TENANT)

**Request:**
```
POST https://amir.paymydine.com/api/v1/waiter-call
Host: amir.paymydine.com
Content-Type: application/json

{
  "table_id": "12",
  "message": "Need water please"
}
```

**Route Winner:** app/admin/routes.php:939

**Connection State:**
```php
DB::getDefaultConnection()  // "mysql" or random tenant
DB::connection()->getDatabaseName()  // "paymydine" or wrong tenant DB
```

**Query Execution:**
```php
return DB::transaction(function() use ($request, $tenantId) {
    // Transaction on DEFAULT connection
    
    $callId = DB::table('waiter_calls')->insertGetId([
        'table_id' => '12',
        'message' => 'Need water please',
        'status' => 'new',
        'created_at' => now(),
        'updated_at' => now()
    ]);
    // INSERT INTO paymydine.ti_waiter_calls (WRONG!)
    // OR: INSERT INTO rosana_db.ti_waiter_calls (WRONG TENANT!)
    
    $tableInfo = \App\Helpers\TableHelper::getTableInfo('12');
    // ↓ Inside TableHelper:
    //   DB::table('tables')->where('table_id', '12')->first();
    //   ↑ Queries DEFAULT connection
    //   Returns table from paymydine or wrong tenant
    
    DB::table('notifications')->insert([
        'type' => 'waiter_call',
        'title' => 'Waiter called from Table 12',
        'table_id' => '12',
        'table_name' => 'Table 12',  // ← Wrong table name if TableHelper returned wrong data
        'payload' => json_encode(['message' => 'Need water please']),
        'status' => 'new',
        'created_at' => now(),
    ]);
    // INSERT INTO paymydine.ti_notifications (WRONG!)
    // OR: INSERT INTO rosana_db.ti_notifications (WRONG TENANT!)
    
    return response()->json(['ok' => true, 'id' => $callId]);
});
```

**Impact:**
- Waiter call saved to central DB or wrong tenant
- Notification appears in wrong tenant's admin panel
- Correct tenant's admin never sees the call
- Waiter never responds (wrong restaurant)

---

## Trace 5: GET /api/v1/table-info?table_id=8

### Current Behavior (BROKEN)

**Request:**
```
GET https://rosana.paymydine.com/api/v1/table-info?table_id=8
Host: rosana.paymydine.com
```

**Route Winner:** app/admin/routes.php:842

**Connection State:**
```php
DB::getDefaultConnection()  // "mysql"
DB::connection()->getDatabaseName()  // "paymydine"
```

**Query:**
```php
$table = DB::table('tables')
    ->where('table_id', 8)
    ->first();
// Query: SELECT * FROM paymydine.ti_tables WHERE table_id = 8

if (!$table) {
    return response()->json(['error' => 'Table not found'], 404);
}

return response()->json([
    'success' => true,
    'data' => [
        'table_id' => $table->table_id,
        'table_name' => $table->table_name,
        'location_id' => $table->location_id,
        'status' => $table->status ?? 'available'
    ]
]);
```

**Possible Results:**
1. Table 8 exists in central DB: Returns wrong table ❌
2. Table 8 doesn't exist in central DB: 404 error (but exists in tenant DB) ❌
3. Table 8 exists in previous tenant's DB: Returns other tenant's table 🔴

---

## Trace 6: GET /admin/notifications-api/count

### Current Behavior (BROKEN - ADMIN PANEL ISSUE)

**Request:**
```
GET https://amir.paymydine.com/admin/notifications-api/count
Host: amir.paymydine.com
Cookie: admin_session=abc456
```

**Route Winner:** app/admin/routes.php:1079

**Middleware Chain:**
```
1-7: web group
❌ NO admin middleware check
❌ NO detect.tenant
```

**Connection State:**
```php
// Before controller execution
DB::getDefaultConnection()  // "mysql"
DB::connection()->getDatabaseName()  // "paymydine"
```

**Controller Execution:**
```php
// File: app/admin/controllers/NotificationsApi.php (inferred)
class NotificationsApi extends Controller
{
    public function count()
    {
        // Connection state:
        // DB::getDefaultConnection() = "mysql"
        // DB::connection()->getDatabaseName() = "paymydine"
        
        $count = DB::table('notifications')
            ->where('status', 'new')
            ->count();
        // Query: SELECT COUNT(*) FROM paymydine.ti_notifications WHERE status = 'new'
        
        return response()->json(['count' => $count]);
    }
}
```

**Result:**
- Returns: Count from `paymydine.ti_notifications` (central DB)
- Expected: Count from `amir_db.ti_notifications` (tenant DB)
- Impact: Admin sees wrong notification count (could be 0, could be other tenant's count)

---

## Trace 7: POST /api/v1/table-notes

### Current Behavior (BROKEN - CROSS-TENANT CORRUPTION)

**Request:**
```
POST https://amir.paymydine.com/api/v1/table-notes
Host: amir.paymydine.com
Content-Type: application/json

{
  "table_id": "7",
  "note": "Customer allergic to peanuts",
  "timestamp": "2025-10-09T15:30:00Z"
}
```

**Route Winner:** app/admin/routes.php:1000

**Connection State:**
```php
DB::getDefaultConnection()  // "mysql" or random tenant
DB::connection()->getDatabaseName()  // "paymydine" or wrong tenant DB
```

**Query Execution:**
```php
return DB::transaction(function() use ($request, $tenantId) {
    // Transaction on DEFAULT connection
    
    $noteId = DB::table('table_notes')->insertGetId([
        'table_id' => '7',
        'note' => 'Customer allergic to peanuts',
        'timestamp' => '2025-10-09T15:30:00Z',
        'status' => 'new',
        'created_at' => now(),
    ]);
    // INSERT INTO paymydine.ti_table_notes (WRONG!)
    // OR: INSERT INTO rosana_db.ti_table_notes (WRONG TENANT!)
    
    $tableInfo = \App\Helpers\TableHelper::getTableInfo('7');
    // Queries: DB::table('tables')->where('table_id', '7')->first()
    // From: paymydine.ti_tables or wrong tenant
    // Returns: Wrong table info or null
    
    DB::table('notifications')->insert([
        'type' => 'table_note',
        'title' => 'Note from Table 7',  // ← Wrong table name if lookup failed
        'table_id' => '7',
        'payload' => json_encode(['note' => 'Customer allergic to peanuts']),
        'status' => 'new',
    ]);
    // INSERT INTO paymydine.ti_notifications (WRONG!)
    // OR: INSERT INTO rosana_db.ti_notifications (WRONG TENANT!)
});
```

**Impact:**
- Allergy note saved to central DB or Rosana's database
- Notification appears in wrong admin panel
- Amir's staff never see the note
- **CRITICAL SAFETY RISK** - allergies not communicated to correct kitchen

---

## Admin Panel Traces

### Trace 8: GET /admin/orders/get-table-statuses

**Request:**
```
GET https://amir.paymydine.com/admin/orders/get-table-statuses
Host: amir.paymydine.com
Cookie: admin_session=xyz789
```

**Route:** app/admin/routes.php:121  
**Middleware:** `['web']` only (within admin group)

**Connection State:**
```php
DB::getDefaultConnection()  // "mysql"
DB::connection()->getDatabaseName()  // "paymydine"
```

**Query:**
```php
$tableStatuses = DB::table('orders')
    ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
    ->join('tables', 'orders.order_type', '=', 'tables.table_id')
    ->select(
        'tables.table_name',
        'statuses.status_name',
        DB::raw('CASE 
            WHEN ti_statuses.status_name = "Preparation" THEN "preparing"
            ...
        END as status_class')
        //   ↑ Hardcoded ti_statuses reference
    )
    ->where('orders.status_id', '!=', 10)
    ->get();

// Generated SQL:
SELECT 
    tables.table_name,
    statuses.status_name,
    CASE WHEN ti_statuses.status_name = "Preparation" THEN "preparing" ... END
FROM paymydine.ti_orders
JOIN paymydine.ti_statuses ON orders.status_id = statuses.status_id
JOIN paymydine.ti_tables ON orders.order_type = tables.table_id
WHERE orders.status_id != 10
```

**Issues:**
1. Queries central `paymydine` database
2. Hardcoded `ti_statuses` in CASE statement
3. Returns orders from ALL tenants (if any exist in central DB)
4. OR returns empty (if central DB has no orders)

**Impact:** Admin panel "Active Orders" board shows wrong data

---

## Summary: Connection State by Endpoint

### Table: Default Connection During Query Execution

| Endpoint | Route Winner | Middleware | Default Conn | Database | Isolation |
|----------|-------------|------------|--------------|----------|-----------|
| `GET /api/v1/menu` | app/admin/routes.php:398 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `POST /api/v1/orders` | app/admin/routes.php:587 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `GET /api/v1/order-status` | app/admin/routes.php:728 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `POST /api/v1/waiter-call` | app/admin/routes.php:939 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `POST /api/v1/table-notes` | app/admin/routes.php:1000 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `GET /api/v1/table-info` | app/admin/routes.php:842 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `GET /admin/notifications-api/count` | app/admin/routes.php:1079 | `web` | `mysql` | `paymydine` | ❌ BROKEN |
| `GET /admin/orders/get-table-statuses` | app/admin/routes.php:121 | `web` | `mysql` | `paymydine` | ❌ BROKEN |

**NONE of these endpoints establish tenant context.**  
**ALL queries target central database or random tenant.**

---

## Expected Behavior (After Fix)

### Trace: GET /api/v1/menu (After Deleting Duplicates)

**Request:**
```
GET https://amir.paymydine.com/api/v1/menu
```

**Route Winner:** routes.php:394 (only version remaining)

**Middleware Chain:**
```
1-7: web group
8: DetectTenant ← RUNS
```

**DetectTenant Execution:**
```php
$subdomain = "amir";
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', 'amir.%')->first();
// Returns: { database: 'amir_db', ... }

Config::set('database.connections.tenant.database', 'amir_db');
DB::setDefaultConnection('tenant');
```

**Connection State:**
```php
DB::getDefaultConnection()  // "tenant" ✓
DB::connection()->getDatabaseName()  // "amir_db" ✓
```

**Query:**
```php
$items = DB::select($query);
// Query: SELECT ... FROM amir_db.ti_menus ✓
```

**Result:** ✅ CORRECT - Menu from amir tenant only

---

## Real-World Impact Examples

### Example 1: Order Mix-Up

**Tenant A (Amir's Restaurant):**
- Customer orders burger via app
- POST /api/v1/orders hits unprotected route
- Order saved to central DB or Tenant B's DB
- Amir's kitchen never receives order
- Customer complains

**Tenant B (Rosana's Restaurant):**
- Admin checks orders
- Sees Amir's burger order
- Kitchen prepares wrong order
- Confusion and waste

### Example 2: Waiter Call to Wrong Restaurant

**Tenant A:**
- Customer calls waiter (table 5)
- POST /api/v1/waiter-call hits unprotected route
- Notification saved to Tenant B's database
- Tenant A's waiters never notified

**Tenant B:**
- Admin sees notification "Waiter called from Table 5"
- But Tenant B has no Table 5 active
- Confusion

### Example 3: Menu Items Mixed

**Tenant A (Pizza Place):**
- GET /api/v1/menu returns items from central DB or Tenant B
- Shows sushi menu instead of pizza
- Customers confused
- Orders fail

---

## Verification: Proving Current Broken State

### Test 1: Check Default Connection
```php
// Add temporary logging to app/admin/routes.php:398
Route::get('/menu', function () {
    \Log::info('MENU ROUTE', [
        'default_conn' => DB::getDefaultConnection(),
        'db_name' => DB::connection()->getDatabaseName(),
        'host' => request()->getHost(),
    ]);
    
    $p = DB::connection()->getTablePrefix();
    // ...
});
```

**Expected Log:**
```
MENU ROUTE: {
  "default_conn": "mysql",
  "db_name": "paymydine",
  "host": "amir.paymydine.com"
}
```

**Proves:** Wrong database is queried (should be amir_db, not paymydine)

### Test 2: Check Route Winner
```bash
php artisan route:list | grep "api/v1/menu"
# Should show ONE route
# If shows multiple, duplicates exist
```

### Test 3: Test Cross-Tenant Visibility
```bash
# From Tenant A
curl -H "Host: amir.paymydine.com" http://localhost:8000/api/v1/menu

# From Tenant B
curl -H "Host: rosana.paymydine.com" http://localhost:8000/api/v1/menu

# If both return the same data → LEAK CONFIRMED
# If both return empty → Querying central DB (which is empty)
# If different → One or both are getting wrong tenant's data
```

---

## Conclusion

**CONFIRMED:** All API endpoints currently execute WITHOUT tenant isolation.

**Connection State:** `mysql` (central DB) for most requests  
**Impact:** Cross-tenant data visibility and corruption  
**Fix:** Delete unprotected duplicates from app/admin/routes.php  
**Result:** Protected routes will execute, tenant isolation will work

