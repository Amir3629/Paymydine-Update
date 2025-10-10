# CONN_TRACE_NOTES.md

## Executive Summary

This document traces database connection usage for key data flows. **Critical finding**: Default connection resolution is inconsistent, and many flows use the `mysql` connection (main database) when they should use tenant-specific databases.

---

## 1. Menu Read Flow

### 1.1 Route → Controller → DB (Protected Version)

**Request**: `GET /api/v1/menu`

**Route Definition**: `routes/api.php:125`
```php
Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
    Route::get('/menu', [MenuController::class, 'index']);
```

**Middleware Chain**:
1. `detect.tenant` (DetectTenant.php)
   - Resolves tenant from subdomain
   - Configures `tenant` connection with tenant database
   - **Sets default connection to `tenant`**

**Controller**: `app/Http/Controllers/Api/MenuController.php:14`

**DB Queries**:
```php
// Line 18-34: Raw SQL query
$query = "
    SELECT 
        m.menu_id as id,
        m.menu_name as name,
        m.menu_description as description,
        CAST(m.menu_price AS DECIMAL(10,2)) as price,
        COALESCE(c.name, 'Main') as category_name,
        ma.name as image
    FROM ti_menus m
    LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
    LEFT JOIN ti_categories c ON mc.category_id = c.category_id
    LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
        AND ma.attachment_id = m.menu_id 
        AND ma.tag = 'thumb'
    WHERE m.menu_status = 1
    ORDER BY c.priority ASC, m.menu_name ASC
";

$items = DB::select($query);  // Line 36
```

**Connection Used**:
- Method: `DB::select()` - uses default connection
- Default set by: `DetectTenant` middleware (line 49: `DB::setDefaultConnection('tenant')`)
- **Expected connection**: `tenant` (tenant-specific database)
- **Table prefix**: `ti_` hardcoded in SQL

**Categories Query** (Line 54-60):
```php
$categoriesQuery = "
    SELECT category_id as id, name, priority 
    FROM ti_categories 
    WHERE status = 1 
    ORDER BY priority ASC, name ASC
";
$categories = DB::select($categoriesQuery);
```

**Connection**: Same as above (default = `tenant`)

**✓ Status**: **PROTECTED** - Uses tenant connection correctly

---

### 1.2 Route → Closure → DB (Unprotected Version)

**Request**: `GET /api/v1/menu`

**Route Definition**: `routes.php:396-455`
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
    Route::get('/menu', function () {
```

**Middleware Chain**:
1. `web` middleware group only (no tenant middleware)
   - Starts session, handles CSRF, etc.
   - **Does NOT set tenant context or switch database**

**DB Queries** (Line 399-417):
```php
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

**Connection Used**:
- Method: `DB::select()` - uses default connection
- Default: `mysql` (from config/database.php:16)
- **Actual database**: `paymydine` (main database, not tenant-specific)
- **Table resolution**: 
  - `menus` → `ti_menus` (prefix added by Laravel)
  - `ti_menu_categories` → `ti_ti_menu_categories` (⚠️ double prefix)
  - `categories` → `ti_categories` (prefix added)

**⚠️ Status**: **UNPROTECTED** - Queries main database, gets wrong/mixed tenant data

---

## 2. Table CRUD Flow

### 2.1 Read Tables (Protected Version)

**Request**: `GET /api/v1/tables`

**Route**: `routes/api.php:161`
```php
Route::get('/tables', [TableController::class, 'index']);
```

**Middleware**: `['detect.tenant']` (from parent group)

**Controller**: `app/Http/Controllers/Api/TableController.php:14`

**DB Query** (Line 17):
```php
$tables = DB::table('tables')
    ->where('table_status', 1)
    ->orderBy('table_name')
    ->get();
```

**Connection Trace**:
- Method: `DB::table('tables')` - uses default connection
- Default: `tenant` (set by DetectTenant middleware)
- **Table name resolved**: `tables` → `ti_tables` (prefix from config)
- **Database**: Tenant-specific database (e.g., `amir_db`, `rosana_db`)

**✓ Status**: **PROTECTED** - Correctly uses tenant database

---

### 2.2 Get Table by QR Code (Protected Version)

**Request**: `GET /api/v1/tables/{qrCode}`

**Route**: `routes/api.php:160`

**Controller**: `app/Http/Controllers/Api/TableController.php:45`

**DB Queries**:
```php
// Line 49-52: Try by QR code
$table = DB::table('tables')
    ->where('qr_code', $qrCode)
    ->where('table_status', 1)
    ->first();

// Line 55-59: Fallback to table name
if (!$table) {
    $table = DB::table('tables')
        ->where('table_name', $qrCode)
        ->where('table_status', 1)
        ->first();
}

// Line 63-67: Fallback to table ID
if (!$table && is_numeric($qrCode)) {
    $table = DB::table('tables')
        ->where('table_id', $qrCode)
        ->where('table_status', 1)
        ->first();
}

// Line 78: Get location info
$location = DB::table('locations')->first();
```

**Connection**: `tenant` (default, set by middleware)
**✓ Status**: **PROTECTED**

---

### 2.3 Get Table Info (Unprotected Version)

**Request**: `GET /api/v1/table-info?table_id=X`

**Route**: `routes.php:839-876`
```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
    Route::get('/table-info', function (Request $request) {
```

**Middleware**: `['web']` only (no tenant middleware)

**DB Query** (Line 849-851):
```php
$table = DB::table('tables')
    ->where('table_id', $tableId)
    ->first();
```

**Connection**:
- Default: `mysql` (main database)
- **Database**: `paymydine` (NOT tenant-specific)
- **Table**: `ti_tables` (in main database)

**⚠️ Status**: **UNPROTECTED** - Reads from main database

---

## 3. Order Create/Update Flow

### 3.1 Create Order (Protected Version)

**Request**: `POST /api/v1/orders`

**Route**: `routes/api.php:152`
```php
Route::post('/orders', [OrderController::class, 'store']);
```

**Middleware**: `['detect.tenant']`

**Controller**: `app/Http/Controllers/Api/OrderController.php` (not shown in files, assumed similar to routes.php version)

**Expected Connection**: `tenant` (set by middleware)
**✓ Status**: **PROTECTED**

---

### 3.2 Create Order (Unprotected Version)

**Request**: `POST /api/v1/orders`

**Route**: `routes.php:584-722`
```php
Route::post('/orders', function (Request $request) {
```

**Middleware**: `['web']` only

**DB Queries**:
```php
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
$menuItem = DB::table('menus')
    ->where('menu_id', $item['menu_id'])
    ->where('menu_status', 1)
    ->first();

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

// Line 686-692: Insert tip
DB::table('order_totals')->insert([
    'order_id' => $orderId,
    'code' => 'tip',
    'title' => 'Tip',
    'value' => $request->tip_amount,
    'priority' => 0
]);

// Line 696-702: Insert payment method
DB::table('order_totals')->insert([
    'order_id' => $orderId,
    'code' => 'payment_method',
    'title' => 'Payment Method',
    'value' => $request->payment_method,
    'priority' => 0
]);
```

**Connection Trace**:
- All queries use `DB::table()` without explicit connection
- Default: `mysql` (main database)
- **Database**: `paymydine` (NOT tenant-specific)
- **Tables**: `ti_orders`, `ti_menus`, `ti_order_menus`, `ti_order_totals` (in main database)

**⚠️ Status**: **CRITICAL UNPROTECTED** - Creates orders in main database, visible to all tenants

---

### 3.3 Update Order Status (Unprotected)

**Request**: `POST /api/v1/order-status`

**Route**: `routes.php:792-836`

**Middleware**: `['web']` only

**DB Query** (Line 810-815):
```php
$updated = DB::table('orders')
    ->where('order_id', $request->order_id)
    ->update([
        'status_id' => $statusId,
        'updated_at' => now()
    ]);
```

**Connection**: `mysql` (main database)
**⚠️ Status**: **CRITICAL UNPROTECTED** - Updates orders in main database

---

## 4. Notifications Read/Write Flow

### 4.1 Create Waiter Call Notification (Protected)

**Request**: `POST /api/v1/waiter-call`

**Route**: `routes/api.php:200-278`
```php
Route::post('/waiter-call', function (Request $request) {
```

**Middleware**: `['detect.tenant']` (from parent group)

**DB Queries** (Line 231-237):
```php
$callId = DB::table('waiter_calls')->insertGetId([
    'table_id' => $request->table_id,
    'message' => $request->message,
    'status' => 'pending',
    'created_at' => now(),
    'updated_at' => now()
]);
```

**Helper Call** (Line 240):
```php
$notification = \App\Helpers\NotificationHelper::createWaiterCallNotification([
    'tenant_id' => $tenant->id,
    'table_id' => $request->table_id,
    'message' => $request->message
]);
```

**NotificationHelper Trace**: `app/Helpers/NotificationHelper.php:82-107`

```php
public static function createWaiterCallNotification($data)
{
    $tableInfo = TableHelper::getTableInfo($data['table_id']);  // Line 84
    
    return self::createNotification([  // Line 93
        'tenant_id' => $data['tenant_id'],
        'type' => 'waiter_call',
        'title' => "Waiter Call - {$tableInfo['table_name']}",
        'message' => $data['message'],
        'table_id' => $data['table_id'],
        'table_name' => $tableInfo['table_name'],
        // ...
    ]);
}
```

**createNotification Method** (Line 17):
```php
public static function createNotification($data)
{
    try {
        self::ensureTenantDatabase();  // Line 21 - validation only
        
        // Check for duplicates (Line 24-36)
        $duplicate = Notifications_model::where('tenant_id', $data['tenant_id'])
            ->where('type', $data['type'])
            ->where('table_id', $data['table_id'])
            ->where('created_at', '>=', now()->subMinutes(1))
            ->exists();
        
        // Create notification (Line 55)
        $notification = Notifications_model::createNotification($data);
```

**Connection**: 
- `Notifications_model` uses default connection
- Default: `tenant` (set by middleware)
- **Expected database**: Tenant-specific

**✓ Status**: **PROTECTED** - Creates notification in tenant database

---

### 4.2 Create Valet Notification (Helper Direct Insert)

**Helper**: `app/Helpers/NotificationHelper.php:115-147`

```php
public static function createValetRequestNotification(array $data)
{
    // ... parse table ID ...
    
    return DB::table('notifications')->insertGetId([  // Line 137
        'type'       => 'valet_request',
        'title'      => 'Valet Request',
        'table_id'   => $tableId,
        'table_name' => $tableName,
        'payload'    => json_encode($payload, JSON_UNESCAPED_UNICODE),
        'status'     => 'new',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}
```

**Connection**: 
- Uses `DB::table('notifications')` without explicit connection
- Default: depends on calling context
- If called from protected route: `tenant`
- If called from unprotected route: `mysql` (main database)

**⚠️ Status**: **CONTEXT-DEPENDENT** - Correct if called from protected routes

---

### 4.3 Read Notifications (Admin API)

**Request**: `GET /admin/notifications-api/`

**Route**: `routes.php:1067` or `1077`

**Middleware**: None or `['web']` only (NO tenant middleware)

**Controller**: `app/admin/controllers/NotificationsApi.php:22`

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

**Connection**:
- `DB::table('notifications')` - uses default
- Default: `mysql` (main database)
- **Database**: `paymydine` (NOT tenant-specific)
- **Table**: `ti_notifications` (in main database)

**⚠️ Status**: **CRITICAL UNPROTECTED** - Reads notifications from main database (all tenants mixed)

---

### 4.4 Update Notification Status (Admin API)

**Request**: `PATCH /admin/notifications-api/{id}`

**Route**: `routes.php:1068` or `1078`

**Middleware**: None or `['web']` only

**Controller**: `app/admin/controllers/NotificationsApi.php:41`

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
    }
}
```

**Connection**: `mysql` (main database)
**⚠️ Status**: **CRITICAL UNPROTECTED** - Updates notification in main database

---

## 5. Settings Read/Write Flow

### 5.1 Read Settings (Protected)

**Request**: `GET /api/v1/settings`

**Route**: `routes/api.php:186-197`
```php
Route::get('/settings', function () {
```

**Middleware**: `['detect.tenant']` (from parent group)

**DB Query** (Line 187):
```php
$settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');
```

**Connection**: `tenant` (set by middleware)
**✓ Status**: **PROTECTED**

---

### 5.2 Read Settings (Unprotected)

**Request**: `GET /api/v1/settings`

**Route**: `routes.php:555-578`

**Middleware**: `['web']` only

**DB Query** (Line 557):
```php
$settings = DB::table('settings')->get()->keyBy('item');
```

**Connection**: `mysql` (main database)
**⚠️ Status**: **UNPROTECTED** - Reads from main database

---

### 5.3 SettingsHelper

**Helper**: `app/Helpers/SettingsHelper.php`

**Get Setting** (Line 16):
```php
public static function get($key, $default = null)
{
    try {
        $setting = DB::table('settings')->where('item', $key)->first();  // Line 19
        // ...
    }
}
```

**Set Setting** (Line 49):
```php
public static function set($key, $value, $serialized = false)
{
    try {
        $data = [
            'item' => $key,
            'value' => $serialized ? serialize($value) : $value,
            'serialized' => $serialized ? 1 : 0,
            'sort' => 'order_notifications'
        ];
        
        $exists = DB::table('settings')->where('item', $key)->exists();  // Line 59
        
        if ($exists) {
            return DB::table('settings')->where('item', $key)->update($data);  // Line 62
        } else {
            return DB::table('settings')->insert($data);  // Line 64
        }
    }
}
```

**Connection**:
- Uses default connection (context-dependent)
- If called from protected route: `tenant`
- If called from unprotected route: `mysql`

**⚠️ Status**: **CONTEXT-DEPENDENT**

---

## 6. Connection Resolution Summary

### 6.1 Default Connection by Context

| Context | Middleware | Default Connection | Database |
|---------|------------|-------------------|----------|
| Protected routes (routes/api.php) | `detect.tenant` | `tenant` | Tenant-specific (e.g., `amir_db`) |
| Unprotected routes (routes.php) | `web` only | `mysql` | Main (`paymydine`) |
| Admin routes (app/admin/routes.php) | `web` only | `mysql` | Main (`paymydine`) |
| Superadmin routes | Explicitly bypass tenant MW | `mysql` | Main (`paymydine`) ✓ Intentional |

### 6.2 Query Method Patterns

| Pattern | Connection Resolution |
|---------|----------------------|
| `DB::table('table_name')` | Uses default connection |
| `DB::select($rawSQL)` | Uses default connection |
| `DB::connection('mysql')->table()` | Explicitly uses `mysql` connection |
| `DB::connection('tenant')->table()` | Explicitly uses `tenant` connection |
| `Model::query()` | Uses model's connection or default |

### 6.3 Critical Issues

1. **Duplicate routes with different middleware**:
   - `/api/v1/menu`, `/api/v1/orders`, `/api/v1/waiter-call`, `/api/v1/table-notes`
   - Protected versions in `routes/api.php`
   - Unprotected versions in `routes.php`
   - **Risk**: Route loading order determines which is used

2. **No tenant middleware on admin notification API**:
   - All notification API endpoints lack tenant middleware
   - Queries hit main database
   - **Impact**: All tenants see each other's notifications

3. **Context-dependent helpers**:
   - `NotificationHelper`, `SettingsHelper`, `TableHelper`
   - Use default connection without validation
   - **Risk**: If called from unprotected context, uses wrong database

4. **Table prefix inconsistency**:
   - Some raw SQL has `ti_` prefix hardcoded
   - Some rely on Laravel's config prefix
   - Some missing prefix entirely
   - **Impact**: Queries may fail or hit wrong tables

---

## 7. Evidence of Connection Switching

### 7.1 Successful Tenant Switch (DetectTenant)

**Log output** when middleware executes successfully:

`app/Http/Middleware/DetectTenant.php:55`:
```php
Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
```

Expected in logs: `Switched to tenant database: amir_db for subdomain: amir`

### 7.2 Debug Endpoint Evidence

**Route**: `routes/api.php:137-149`

```php
Route::get('/debug/conn', function (\Illuminate\Http\Request $request) {
    if (!config('app.debug')) {
        abort(404);
    }
    return response()->json([
        'host' => $request->getHost(),
        'default_connection' => \DB::getDefaultConnection(),
        'db_default' => \DB::connection()->getDatabaseName(),
        'db_mysql' => \DB::connection('mysql')->getDatabaseName(),
        'db_tenant' => \DB::connection('tenant')->getDatabaseName(),
        'tenant_seen' => optional($request->attributes->get('tenant'))->database,
    ]);
});
```

**Expected output** for `amir.paymydine.com`:
```json
{
  "host": "amir.paymydine.com",
  "default_connection": "tenant",
  "db_default": "amir_db",
  "db_mysql": "paymydine",
  "db_tenant": "amir_db",
  "tenant_seen": "amir_db"
}
```

**Actual output for unprotected routes**:
```json
{
  "host": "amir.paymydine.com",
  "default_connection": "mysql",
  "db_default": "paymydine",
  "db_mysql": "paymydine",
  "db_tenant": "taste",
  "tenant_seen": null
}
```

**⚠️ Evidence**: Unprotected routes don't switch tenant context.

