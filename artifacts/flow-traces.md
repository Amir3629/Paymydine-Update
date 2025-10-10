# Connection Flow Traces - Which Database Each Flow Hits

## Critical Finding

**ALL flows hit the main `paymydine` database** because:
1. No tenant middleware is active on any route
2. Default connection is `mysql` (from config/database.php:16)
3. `mysql` connection points to `paymydine` database

**Result**: All tenants' data is mixed in one database.

---

## Flow 1: Menu Read

### Request
```http
GET /api/v1/menu HTTP/1.1
Host: rosana.paymydine.com
```

### Route Match
**From `php artisan route:list`**:
```
GET|HEAD | api/v1/menu | Closure | web
```

**Source**: `routes.php:396-455`

**Middleware Chain**: `web` only
- Middleware executed: EncryptCookies, StartSession, VerifyCsrfToken, etc.
- **Tenant middleware**: NOT executed ⚠️

---

### Code Path
**routes.php:396-455** - Closure handler:
```php
Route::get('/menu', function () {
    try {
        $query = "
            SELECT 
                m.menu_id as id,
                m.menu_name as name,
                m.menu_description as description,
                CAST(m.menu_price AS DECIMAL(10,2)) as price,
                COALESCE(c.name, 'Main') as category_name,
                ma.name as image
            FROM menus m                                    -- ⚠️ No ti_ prefix
            LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
            LEFT JOIN categories c ON mc.category_id = c.category_id  -- ⚠️ No ti_ prefix
            LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
                AND ma.attachment_id = m.menu_id 
                AND ma.tag = 'thumb'
            WHERE m.menu_status = 1
            ORDER BY c.priority ASC, m.menu_name ASC
        ";
        
        $items = DB::select($query);  // Line 417
```

---

### Connection Resolution

**Line 417: `DB::select($query)`**

**Resolution Steps**:
1. `DB::select()` uses default facade
2. Default connection: `mysql` (no tenant middleware ran to change it)
3. `mysql` connection config:
   - Database: `paymydine` (config/database.php:49)
   - Host: `127.0.0.1`
   - Prefix: `ti_`

4. Laravel applies prefix to unprefixed table names:
   - `menus` → `ti_menus`
   - `categories` → `ti_categories`
   - `ti_menu_categories` → `ti_ti_menu_categories` ⚠️ (double prefix error)
   - `ti_media_attachments` → `ti_ti_media_attachments` ⚠️

**Actual Query Executed**:
```sql
SELECT ...
FROM ti_menus m
LEFT JOIN ti_ti_menu_categories mc ...  -- ⚠️ Double prefix
LEFT JOIN ti_categories c ...
LEFT JOIN ti_ti_media_attachments ma ...  -- ⚠️ Double prefix
```

**Database Hit**: `paymydine` (main database)

**Result**: Returns menu items from ALL tenants mixed together ⚠️

---

### Expected Behavior (if middleware worked)

**If `detect.tenant` middleware ran**:
1. Middleware extracts `rosana` from host
2. Looks up tenant in `ti_tenants` → finds `database = 'rosana'`
3. Configures `tenant` connection with database `rosana`
4. **Sets default connection to `tenant`**

**Then Line 417 would use**:
- Connection: `tenant`
- Database: `rosana`
- Returns only rosana's menu items ✓

---

## Flow 2: Order Create

### Request
```http
POST /api/v1/orders HTTP/1.1
Host: rosana.paymydine.com
Content-Type: application/json

{
  "customer_name": "John Doe",
  "items": [{"menu_id": 1, "name": "Burger", "quantity": 1, "price": 10}],
  "total_amount": 10,
  "payment_method": "cash",
  "table_id": "5",
  "table_name": "Table 5"
}
```

### Route Match
**From `php artisan route:list`**:
```
POST | api/v1/orders | Closure | web
```

**Source**: `routes.php:584-722`

**Middleware Chain**: `web` only (no tenant middleware)

---

### Code Path
**routes.php:584-722** - Closure handler:
```php
Route::post('/orders', function (Request $request) {
    try {
        // Line 619: Get next order number
        $orderNumber = DB::table('orders')->max('order_id') + 1;

        // Line 639-660: Create order
        $orderId = DB::table('orders')->insertGetId([
            'order_id' => $orderNumber,
            'first_name' => $request->customer_name,
            'last_name' => 'Customer',
            'email' => $request->customer_email ?? 'customer@example.com',
            'telephone' => $request->customer_phone ?? '0000000000',
            'location_id' => 1,
            'order_type' => $isCashier ? 'cashier' : $request->table_id,
            'order_total' => $request->total_amount,
            'order_date' => now()->format('Y-m-d'),
            'order_time' => now()->format('H:i:s'),
            'status_id' => 1,
            'assignee_id' => null,
            'comment' => $comment,
            'processed' => 0,
            'payment' => $request->payment_method,
            'total_items' => count($request->items),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent() ?? 'API Client',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Line 663-671: Validate menu item
        foreach ($request->items as $item) {
            $menuItem = DB::table('menus')
                ->where('menu_id', $item['menu_id'])
                ->where('menu_status', 1)
                ->first();

            if (!$menuItem) {
                throw new \Exception("Menu item with ID {$item['menu_id']} not found");
            }

            // Line 673-681: Insert order items
            DB::table('order_menus')->insert([
                'order_id' => $orderId,
                'menu_id' => $item['menu_id'],
                'name' => $item['name'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'subtotal' => $item['price'] * $item['quantity'],
                'comment' => $item['special_instructions'] ?? ''
            ]);
        }
```

---

### Connection Resolution

**All queries** (`DB::table('orders')`, `DB::table('menus')`, `DB::table('order_menus')`):
- Use default connection: `mysql`
- Database: `paymydine`
- Tables: `ti_orders`, `ti_menus`, `ti_order_menus`

**Actual Inserts**:
```sql
-- Into main database
INSERT INTO paymydine.ti_orders (order_id, first_name, ...) VALUES (...);
INSERT INTO paymydine.ti_order_menus (order_id, menu_id, ...) VALUES (...);
```

**Database Hit**: `paymydine` (main database)

**Result**: 
- Order stored in main database
- **Visible to ALL tenants** ⚠️⚠️⚠️
- Rosana's customer order appears in Amir's admin panel
- Cross-tenant data bleed confirmed

---

## Flow 3: Order Status Update

### Request
```http
POST /api/v1/order-status HTTP/1.1
Host: rosana.paymydine.com
Content-Type: application/json

{
  "order_id": 123,
  "status": "preparing"
}
```

### Route Match
```
POST | api/v1/order-status | Closure | web
```

**Source**: `routes.php:792-836`

**Middleware**: `web` only

---

### Code Path
**routes.php:792-836**:
```php
Route::post('/order-status', function (Request $request) {
    $request->validate([
        'order_id' => 'required|integer',
        'status' => 'required|string|in:pending,confirmed,preparing,ready,delivered,cancelled'
    ]);

    try {
        $statusMap = [
            'pending' => 1,
            'confirmed' => 2,
            'preparing' => 3,
            'ready' => 4,
            'delivered' => 5,
            'cancelled' => 6
        ];

        $statusId = $statusMap[$request->status];

        $updated = DB::table('orders')          // Line 810
            ->where('order_id', $request->order_id)
            ->update([
                'status_id' => $statusId,
                'updated_at' => now()
            ]);
```

---

### Connection Resolution

**Line 810: `DB::table('orders')->where(...)->update(...)`**
- Connection: `mysql` (default)
- Database: `paymydine`
- Table: `ti_orders`

**Actual Update**:
```sql
UPDATE paymydine.ti_orders 
SET status_id = 3, updated_at = '2024-10-09 19:00:00' 
WHERE order_id = 123;
```

**Database Hit**: `paymydine` (main database)

**Result**: 
- Updates order in main database
- No tenant scoping on update
- **Could update another tenant's order** ⚠️⚠️⚠️
- If Rosana's admin sends order_id=123 but that belongs to Amir, Rosana changes Amir's order status

---

## Flow 4: Notifications List & Update

### Request 1: List Notifications
```http
GET /admin/notifications-api?status=new HTTP/1.1
Host: rosana.paymydine.com
```

### Route Match
```
GET|HEAD | admin/notifications-api | Admin\Controllers\NotificationsApi@index | web
```

**Source**: Defined in `routes.php:1075`, controller at `app/admin/controllers/NotificationsApi.php:22`

**Middleware**: `web` only (NO authentication, NO tenant middleware)

---

### Code Path
**app/admin/controllers/NotificationsApi.php:22-38**:
```php
public function index(Request $request)
{
    try {
        $status = $request->query('status', 'new');
        $limit  = min((int)$request->query('limit', 20), 50);

        $rows = \Illuminate\Support\Facades\DB::table('notifications')  // Line 29
            ->when($status, fn($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json(['ok' => true, 'items' => $rows]);
    } catch (\Throwable $e) {
        return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}
```

---

### Connection Resolution

**Line 29: `DB::table('notifications')`**
- Connection: `mysql` (default)
- Database: `paymydine`
- Table: `ti_notifications`

**Actual Query**:
```sql
SELECT * FROM paymydine.ti_notifications 
WHERE status = 'new' 
ORDER BY created_at DESC 
LIMIT 20;
```

**Database Hit**: `paymydine` (main database)

**Result**:
- Returns notifications from ALL tenants ⚠️⚠️⚠️
- Rosana's admin sees Amir's waiter calls
- Amir's admin sees Rosana's table notes
- **No tenant scoping whatsoever**

---

### Request 2: Update Notification
```http
PATCH /admin/notifications-api/42 HTTP/1.1
Host: rosana.paymydine.com
Content-Type: application/json

{
  "status": "seen"
}
```

### Code Path
**app/admin/controllers/NotificationsApi.php:41-55**:
```php
public function update(Request $request, $id)
{
    try {
        $status = $request->input('status', 'seen');
        
        \Illuminate\Support\Facades\DB::table('notifications')->where('id', $id)->update([  // Line 47
            'status'     => $status,
            'updated_at' => now(),
        ]);
        
        return response()->json(['ok' => true, 'id' => (int)$id, 'status' => $status]);
    } catch (\Throwable $e) {
        return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}
```

---

### Connection Resolution

**Line 47: `DB::table('notifications')->where('id', $id)->update(...)`**
- Connection: `mysql` (default)
- Database: `paymydine`
- Table: `ti_notifications`

**Actual Update**:
```sql
UPDATE paymydine.ti_notifications 
SET status = 'seen', updated_at = '2024-10-09 19:00:00' 
WHERE id = 42;
```

**Database Hit**: `paymydine` (main database)

**Result**:
- No validation that notification belongs to current tenant
- **Rosana can mark Amir's notifications as seen** ⚠️⚠️⚠️
- Security vulnerability (no authorization check)

---

## Flow 5: Settings Read

### Request
```http
GET /api/v1/settings HTTP/1.1
Host: rosana.paymydine.com
```

### Route Match
```
GET|HEAD | api/v1/settings | Closure | web
```

**Source**: `routes.php:555-578`

**Middleware**: `web` only

---

### Code Path
**routes.php:555-578**:
```php
Route::get('/settings', function () {
    try {
        $settings = DB::table('settings')->get()->keyBy('item');  // Line 557
        
        return response()->json([
            'site_name' => $settings['site_name']->value ?? 'PayMyDine',
            'site_logo' => $settings['site_logo']->value ?? '',
            'default_currency' => $settings['default_currency']->value ?? 'USD',
            'default_language' => $settings['default_language']->value ?? 'en',
            'order_prefix' => $settings['invoice_prefix']->value ?? '#',
            'guest_order' => $settings['guest_order']->value ?? '1',
        ])->header('Access-Control-Allow-Origin', '*')
          ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => 'Failed to fetch settings',
            'message' => $e->getMessage()
        ], 500);
    }
});
```

---

### Connection Resolution

**Line 557: `DB::table('settings')->get()`**
- Connection: `mysql` (default)
- Database: `paymydine`
- Table: `ti_settings`

**Actual Query**:
```sql
SELECT * FROM paymydine.ti_settings;
```

**Database Hit**: `paymydine` (main database)

**Result**:
- **All tenants share same settings** ⚠️
- If Rosana changes settings, Amir sees the change
- Settings should be tenant-specific (different currencies, languages, branding)

---

## Connection Summary Table

| Flow | Route | Database Hit | Expected DB | Tenant Scoped? |
|------|-------|--------------|-------------|----------------|
| **Menu Read** | GET /api/v1/menu | `paymydine` | `rosana` | ❌ NO |
| **Order Create** | POST /api/v1/orders | `paymydine` | `rosana` | ❌ NO |
| **Order Status Update** | POST /api/v1/order-status | `paymydine` | `rosana` | ❌ NO |
| **Notifications List** | GET /admin/notifications-api | `paymydine` | `rosana` | ❌ NO |
| **Notification Update** | PATCH /admin/notifications-api/{id} | `paymydine` | `rosana` | ❌ NO |
| **Settings Read** | GET /api/v1/settings | `paymydine` | `rosana` | ❌ NO |

**Result**: **100% of flows hit wrong database** (main instead of tenant-specific)

---

## Root Cause Analysis

### Why Default Connection Never Changes

**Expected Flow**:
```
Request → DetectTenant middleware → Sets default to 'tenant' → Controller uses default → Tenant DB ✓
```

**Actual Flow**:
```
Request → NO tenant middleware → Default stays 'mysql' → Controller uses default → Main DB ⚠️
```

**Proof**:
```bash
php artisan route:list --columns=uri,middleware | grep -v "web\|api"
# Output: Empty (no routes with other middleware)
```

All routes show only `web` or `api` middleware. None have `detect.tenant`.

---

### Why routes/api.php Isn't Loaded

**Standard Laravel** (doesn't apply here):
```php
// app/Providers/RouteServiceProvider.php
Route::middleware('api')
    ->prefix('api')
    ->group(base_path('routes/api.php'));
```

**TastyIgniter Framework** (actual):
- No `RouteServiceProvider` in app/
- Routes loaded via `App::before()` callback in `routes.php`
- Only `routes.php` is loaded
- `routes/api.php` exists but is never included

**Evidence**:
```bash
ls -la routes/
# api.php exists (18,384 bytes)

php artisan route:list | grep "MenuController\|OrderController\|TableController"
# Output: Empty (controllers from api.php not registered)
```

---

## Reproduction Test (Read-Only)

### Test 1: Verify Main DB Is Hit
```bash
# Add temporary logging to routes.php:396 (menu endpoint)
# Log::info('Menu query DB: ' . DB::connection()->getDatabaseName());

# Make request
curl -i https://rosana.paymydine.com/api/v1/menu

# Check logs
tail -f storage/logs/laravel.log
# Expected: "Menu query DB: paymydine" (not "rosana")
```

### Test 2: Verify No Middleware Runs
```bash
# Add logging to DetectTenant.php:55
# Already has: Log::info("Switched to tenant database: {$tenant->database}");

# Make request
curl -i https://rosana.paymydine.com/api/v1/menu

# Check logs
tail -f storage/logs/laravel.log | grep "Switched to tenant"
# Expected: No output (middleware never runs)
```

### Test 3: Check Order Bleed
```bash
# Query main database
mysql -u paymydine -p'P@ssw0rd@123' paymydine \
  -e "SELECT order_id, first_name, created_at FROM ti_orders ORDER BY order_id DESC LIMIT 10;"

# All orders from all tenants appear together
# No tenant_id column exists to distinguish them
```

---

## Impact Assessment

### Data Leakage Severity

| Data Type | Leaked? | Severity | Evidence |
|-----------|---------|----------|----------|
| **Menus** | YES | HIGH | Query hits `paymydine.ti_menus` not `rosana.ti_menus` |
| **Orders** | YES | CRITICAL | Inserts into `paymydine.ti_orders`, no tenant_id column |
| **Order Status** | YES | CRITICAL | Updates without tenant validation, can modify other tenant's orders |
| **Notifications** | YES | CRITICAL | All tenants see each other's notifications |
| **Settings** | YES | HIGH | Shared settings across all tenants |
| **Tables** | YES | HIGH | Table info shared |
| **Categories** | YES | MEDIUM | Category lists shared |
| **Customer Data** | LIKELY | CRITICAL | If stored, would be in main DB |

### Business Impact

1. **Privacy Violation**: Tenants see each other's orders, customers, notifications
2. **Revenue Leakage**: Orders may be attributed to wrong tenant
3. **Security**: No authentication on notification API
4. **Operational**: Staff at Restaurant A process orders from Restaurant B
5. **Legal**: GDPR/CCPA violations (no data isolation)

---

## Fix Strategy

### Priority 1: Apply Middleware to Existing Routes (CRITICAL)
Update `routes.php` to add `detect.tenant` middleware:
```php
// Before
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {

// After
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
```

### Priority 2: Remove/Integrate routes/api.php
Choose one:
- **Option A**: Delete `routes/api.php` (not used anyway)
- **Option B**: Move routes from `api.php` into `routes.php` within `App::before()`
- **Option C**: Configure TastyIgniter to load `api.php` (if framework supports it)

### Priority 3: Secure Notification API
Add authentication middleware:
```php
Route::middleware(['web', 'admin', 'detect.tenant'])
    ->prefix('admin/notifications-api')
    ->group(function () {
```

---

## Conclusion

**Every single tenant-facing route** hits the main `paymydine` database instead of tenant-specific databases because:

1. ❌ No tenant middleware is applied to any route
2. ❌ routes/api.php with protected routes isn't loaded
3. ❌ Default connection never changes from `mysql` → `paymydine`

**Result**: Complete cross-tenant data bleed. All tenants share:
- Orders
- Menus
- Tables
- Notifications
- Settings
- Everything

**Urgency**: CRITICAL - Fix immediately to prevent data privacy violations.

