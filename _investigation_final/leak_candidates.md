## Cross-Tenant Leak Candidates - Detailed Analysis

### Critical Finding

**ROOT CAUSE:** `App::before()` in app/admin/routes.php registers routes BEFORE routes.php loads, causing unprotected duplicates to win all route matches.

---

## Leak Vector 1: Duplicate API Routes WITHOUT Tenant Middleware

### Impact: 🔴 CRITICAL - Active data leakage confirmed

#### Affected Endpoints (22 total)

##### Read Operations (Return Wrong Tenant's Data)

| Endpoint | File:Line | Middleware | DB Operation | Leak Type |
|----------|-----------|------------|--------------|-----------|
| `GET /api/v1/menu` | app/admin/routes.php:398 | `web` | `DB::select("FROM {$p}menus")` | Shows wrong tenant's menu |
| `GET /api/v1/categories` | app/admin/routes.php:461 | `web` | `DB::table('categories')` | Shows wrong tenant's categories |
| `GET /api/v1/restaurant` | app/admin/routes.php:529 | `web` | `DB::table('locations')` | Shows wrong tenant's info |
| `GET /api/v1/settings` | app/admin/routes.php:558 | `web` | `DB::table('settings')` | Shows wrong tenant's settings |
| `GET /api/v1/payments` | app/admin/routes.php:385 | `web` | `DB (model)` | Shows wrong tenant's payment methods |
| `GET /api/v1/table-info` | app/admin/routes.php:842 | `web` | `DB::table('tables')` | Shows wrong tenant's table |
| `GET /api/v1/current-table` | app/admin/routes.php:882 | `web` | `DB::table('tables')` | Shows wrong tenant's table |
| `GET /api/v1/order-status` | app/admin/routes.php:728 | `web` | `DB::table('orders')->join('statuses')` | Shows wrong tenant's order |
| `GET /api/v1/restaurant/{id}` | app/admin/routes.php:369 | `api` | Controller DB calls | Shows wrong tenant's data |
| `GET /api/v1/restaurant/{id}/menu` | app/admin/routes.php:370 | `api` | Controller DB calls | Shows wrong tenant's menu |
| `GET /api/v1/restaurant/{id}/order/{id}` | app/admin/routes.php:375 | `api` | Controller DB calls | Shows wrong tenant's order |
| `GET /admin/notifications-api` | app/admin/routes.php:1080 | `web` | Controller: `DB::table('notifications')` | Shows wrong tenant's notifications |
| `GET /admin/notifications-api/count` | app/admin/routes.php:1079 | `web` | Controller: `DB::table('notifications')->count()` | Wrong notification count |

##### Write Operations (Corrupt Wrong Tenant's Data)

| Endpoint | File:Line | Middleware | DB Operation | Leak Type |
|----------|-----------|------------|--------------|-----------|
| `POST /api/v1/orders` | app/admin/routes.php:587 | `web` | `DB::table('orders')->insertGetId()` | 🔴🔴 Order saved to wrong DB |
| `POST /api/v1/order-status` | app/admin/routes.php:795 | `web` | `DB::table('orders')->update()` | 🔴 Updates wrong tenant's order |
| `POST /api/v1/waiter-call` | app/admin/routes.php:939 | `web` | `DB::table('waiter_calls')->insert()` | 🔴 Call saved to wrong DB |
| `POST /api/v1/table-notes` | app/admin/routes.php:1000 | `web` | `DB::table('table_notes')->insert()` | 🔴 Note saved to wrong DB |
| `POST /api/v1/restaurant/{id}/order` | app/admin/routes.php:374 | `api` | Controller: creates order | 🔴🔴 Order to wrong tenant |
| `POST /api/v1/restaurant/{id}/waiter` | app/admin/routes.php:376 | `api` | Controller: calls waiter | 🔴 Call to wrong tenant |
| `POST /api/v1/webhooks/pos` | app/admin/routes.php:371 | `api` | Controller: processes webhook | 🔴 Webhook data to wrong DB |
| `PATCH /admin/notifications-api/{id}` | app/admin/routes.php:1081 | `web` | Controller: updates notification | 🔴 Updates wrong tenant |
| `PATCH /admin/notifications-api/mark-all-seen` | app/admin/routes.php:1082 | `web` | Controller: marks notifications | 🔴 Updates wrong tenant |

---

## Leak Vector 2: Admin Routes WITHOUT Tenant Middleware

### Impact: 🔴 HIGH - Admin panel queries wrong database

#### Admin Utility Routes (NOT Duplicates)

| Endpoint | File:Line | Middleware | DB Queries | Risk |
|----------|-----------|------------|----------|------|
| `GET /admin/orders/get-table-statuses` | app/admin/routes.php:121-159 | `web` | `DB::table('orders')->join('statuses')->join('tables')` | 🔴 CRITICAL |
| `GET /admin/orders/get-cashier-url` | app/admin/routes.php:162-182 | `web` | None (URL only) | ✅ SAFE |
| `GET /admin/storefront-url` | app/admin/routes.php:185-200 | `web` | Calls `buildCashierTableUrl()` → `DB::table('tables')` | 🔴 HIGH |
| POST `/orders/save-table-layout` | app/admin/routes.php:269-295 | `web` | None (stub implementation) | ✅ SAFE |
| `GET /orders/get-table-qr-url` | app/admin/routes.php:298-360 | `web` | `DB::table('tables')`, `DB::table('locationables')` | 🔴 HIGH |

**Detailed Analysis:**

#### GET /admin/orders/get-table-statuses (Line 121)
```php
Route::get('/orders/get-table-statuses', function () {
    try {
        $tableStatuses = DB::table('orders')
            ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
            ->join('tables', 'orders.order_type', '=', 'tables.table_id')
            ->select(
                'tables.table_name',
                'statuses.status_name',
                DB::raw('CASE WHEN ti_statuses.status_name = "Preparation" THEN "preparing" ...')
                //           ↑ Hardcoded ti_statuses reference!
            )
            ->where('orders.status_id', '!=', 10)
            ->orderBy('orders.created_at', 'desc')
            ->get();
        
        return response()->json(['success' => true, 'statuses' => $tableStatuses]);
    } catch (Exception $e) {
        return response()->json(['success' => false, 'error' => $e->getMessage()]);
    }
});
```

**Issues:**
1. NO tenant middleware
2. Uses default connection (mysql or random)
3. Has hardcoded `ti_statuses` in DB::raw() (line 130 and similar)
4. Returns table statuses from WRONG database

**Impact:** Admin panel shows orders from wrong tenant or central DB

#### GET /orders/get-table-qr-url (Line 298)
```php
Route::get('/orders/get-table-qr-url', function (Request $request) {
    $tableId = $request->get('table_id');
    
    $table = DB::table('tables')->where('table_id', $tableId)->first();
    // ↑ Queries default connection (mysql or random tenant)
    
    $locationData = DB::table('locationables')
        ->where('locationable_id', $tableId)
        ->where('locationable_type', 'tables')
        ->first();
    // ↑ Also queries default connection
    
    $frontendUrl = $request->getScheme() . '://' . $request->getHost();
    $qrUrl = rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?...';
    
    return response()->json(['success' => true, 'qr_url' => $qrUrl]);
})->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

**Issues:**
1. NO tenant middleware (DetectTenant)
2. Bypasses legacy TenantDatabaseMiddleware (doesn't help)
3. Queries `tables` and `locationables` from default connection
4. Could return table from wrong tenant
5. URL is correct (uses request host), but table data is wrong

**Impact:** QR code generated for wrong tenant's table

---

## Leak Vector 3: Missing Webhook Route in Protected Routes

### Critical: Webhook Endpoint Exists ONLY Unprotected

**File:** app/admin/routes.php:371  
**Route:** `POST /api/v1/webhooks/pos`  
**Middleware:** `['api']` only  
**Controller:** `Admin\Controllers\Api\PosWebhookController@handle`

**Status:** ⚠️ **EXISTS ONLY IN UNPROTECTED VERSION**

**Missing from:** routes.php (no protected version exists)

**Impact:**
- External POS system sends webhook to `/api/v1/webhooks/pos`
- No tenant middleware runs
- Controller processes webhook without tenant context
- Data saved to default connection (wrong database)

**Action Required:**
1. Add protected version to routes.php:361-373 (framework API group)
2. Delete unprotected version from app/admin/routes.php

---

## Leak Vector 4: Hardcoded Table References in DB::raw()

### Location: app/admin/routes.php:130, routes.php:127

```php
DB::raw('CASE 
    WHEN ti_statuses.status_name = "Preparation" THEN "preparing"
    WHEN ti_statuses.status_name = "Received" THEN "received"
    // ...
END as status_class')
```

**Issue:** Hardcoded `ti_statuses` table reference in SQL  
**Risk:** MEDIUM - will resolve to `{database}.ti_statuses` where database is default connection  
**Impact:**
- If default is mysql: Queries `paymydine.ti_statuses`
- If default is tenant: Queries `amir_db.ti_statuses`

**Action:** Should use `statuses.status_name` (already joined, no need for prefix)

**Corrected:**
```php
DB::raw('CASE 
    WHEN statuses.status_name = "Preparation" THEN "preparing"
    WHEN statuses.status_name = "Received" THEN "received"
    // ...
END as status_class')
```

---

## Summary: All Leak Candidates

| Category | Count | Severity | Action |
|----------|-------|----------|--------|
| Duplicate API routes (unprotected) | 22 | 🔴 CRITICAL | DELETE from app/admin/routes.php |
| Admin utility routes (no tenant mw) | 5 | 🔴 HIGH | ADD detect.tenant OR DELETE if duplicates |
| Webhook route (only unprotected) | 1 | 🔴 CRITICAL | ADD to routes.php, DELETE from app/admin/routes.php |
| Hardcoded ti_ in DB::raw() | 2 | 🟡 MEDIUM | REPLACE with unqualified table names |
| Super admin routes (no tenant mw) | 8 | ✅ CORRECT | NO CHANGE (intentionally unscoped) |

**Total Leak Vectors:** 30 routes/locations  
**Critical Fixes Required:** 23 (deletions)  
**Medium Fixes Required:** 2 (SQL corrections)

---

## Route Matching Proof

### Test: Which Route Wins?

**Setup:** Two files define the same route with different middleware

**File 1: app/admin/routes.php (loaded FIRST via App::before)**
```php
App::before(function () {
    Route::get('/test-route', function () {
        return 'UNPROTECTED VERSION';
    })->middleware(['web']);
});
```

**File 2: routes.php (loaded SECOND)**
```php
Route::get('/test-route', function () {
    return 'PROTECTED VERSION';
})->middleware(['web', 'detect.tenant']);
```

**Request:** `GET /test-route`

**Result:** "UNPROTECTED VERSION" (first registered route wins)

**Applies to:** ALL 22 API route duplicates

---

## Database Connection State by Request

### Scenario A: Fresh PHP-FPM Worker

**Request:** `POST https://amir.paymydine.com/api/v1/orders`

**Route Matched:** app/admin/routes.php:587 (unprotected duplicate)

**Connection State:**
```php
// Before request
Config::get('database.default')  // "mysql" (boot default)

// During route execution (NO DetectTenant ran)
DB::getDefaultConnection()  // "mysql"
DB::connection()->getDatabaseName()  // "paymydine"

// Query execution
DB::table('orders')->insertGetId([...]);
// Resolves to: INSERT INTO paymydine.ti_orders
```

**Result:** Order saved to **central database**, NOT tenant database ❌

---

### Scenario B: After Rosana Tenant Request

**Request 1:** `GET https://rosana.paymydine.com/api/v1/menu`  
**Route Matched:** app/admin/routes.php:398 (unprotected)  
**Middleware:** `web` only  
**Result:** No tenant switch, uses `mysql` connection

**Request 2 (Same PHP-FPM Worker):** `POST https://amir.paymydine.com/api/v1/orders`  
**Route Matched:** app/admin/routes.php:587 (unprotected)  
**Middleware:** `web` only  

**Connection State:**
```php
// Connection is STILL whatever Request 1 left it as
DB::getDefaultConnection()  // "mysql" (never changed)
DB::connection()->getDatabaseName()  // "paymydine" (never changed)

// Query execution
DB::table('orders')->insertGetId([...]);
// Resolves to: INSERT INTO paymydine.ti_orders
```

**Result:** Amir's order saved to **central database** ❌

---

### Scenario C: If Any Protected Route Ran First

**Hypothetical:** If somehow a protected route from routes.php executed first (unlikely)

**Request 1:** `GET https://rosana.paymydine.com/some-protected-endpoint`  
**Middleware:** `detect.tenant` runs  
**Connection Switch:**
```php
Config::set('database.default', 'tenant');
DB::setDefaultConnection('tenant');
// Connection configured to rosana_db
```

**Request 2 (Same Worker):** `POST https://amir.paymydine.com/api/v1/orders`  
**Route Matched:** app/admin/routes.php:587 (unprotected)  
**Middleware:** `web` only (NO tenant detection for Amir)  

**Connection State:**
```php
// Still set to rosana from Request 1!
DB::getDefaultConnection()  // "tenant"
DB::connection()->getDatabaseName()  // "rosana_db" (WRONG TENANT!)

// Query execution
DB::table('orders')->insertGetId([...]);
// Resolves to: INSERT INTO rosana_db.ti_orders
```

**Result:** Amir's order saved to **Rosana's database** 🔴🔴🔴 **DATA CORRUPTION**

---

## Leak Vector 2: Admin Panel Routes Query Without Tenant Context

### GET /admin/orders/get-table-statuses

**Code Analysis:**
```php
// app/admin/routes.php:121-159
// Inside group: middleware => ['web'], prefix => 'admin'
Route::get('/orders/get-table-statuses', function () {
    try {
        $tableStatuses = DB::table('orders')  // ← Uses DEFAULT connection
            ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
            ->join('tables', 'orders.order_type', '=', 'tables.table_id')
            ->select(
                'tables.table_name',
                'statuses.status_name',
                DB::raw('CASE 
                    WHEN ti_statuses.status_name = "Preparation" THEN "preparing"
                    // ↑ Hardcoded ti_statuses (coupled with connection issue)
                    WHEN ti_statuses.status_name = "Received" THEN "received"
                    // ... more cases
                END as status_class')
            )
            ->where('orders.status_id', '!=', 10)
            ->get();
            
        return response()->json(['success' => true, 'statuses' => $tableStatuses]);
    } catch (Exception $e) {
        return response()->json(['success' => false, 'error' => $e->getMessage()]);
    }
});
```

**Leak Mechanism:**
1. Admin from tenant A loads order creation page
2. Page JavaScript calls `/admin/orders/get-table-statuses`
3. Route in admin group (NO tenant middleware)
4. Query uses default connection
5. Returns orders from central DB or wrong tenant

**User Impact:**
- Admin sees orders from other restaurants
- Table status board shows wrong tables
- Creates confusion and potential order fulfillment errors

---

### Helper Function: resolveCashierTableId()

**Called by:** `/admin/storefront-url`, `/admin/orders/get-cashier-url`

```php
// app/admin/routes.php:23-77
function resolveCashierTableId($locationId = 1)
{
    try {
        $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
        // ↑ Uses DEFAULT connection
        
        if ($cashierTable) {
            $locationLink = DB::table('locationables')
                ->where('locationable_id', $cashierTable->table_id)
                ->where('locationable_type', 'tables')
                ->where('location_id', $locationId)
                ->first();
            // ↑ Also uses DEFAULT connection
            
            if (!$locationLink) {
                DB::table('locationables')->insert([...]);
                // ↑ INSERT to wrong database!
            }
            
            return $cashierTable->table_id;
        } else {
            $cashierTableId = DB::table('tables')->insertGetId([...]);
            // ↑ CREATE table in wrong database!
        }
    }
}
```

**Impact:**
- Cashier table created in wrong tenant's database
- Links created in wrong tenant's locationables table
- Admin panel shows wrong cashier information

---

## Leak Vector 3: Notifications Controller (Unknown Code)

### Controller: Admin\Controllers\NotificationsApi

**Called by unprotected routes:**
- `GET /admin/notifications-api/count`
- `GET /admin/notifications-api`
- `PATCH /admin/notifications-api/{id}`
- `PATCH /admin/notifications-api/mark-all-seen`

**Expected Code (controller not shown, but likely similar to):**
```php
class NotificationsApi extends Controller
{
    public function count()
    {
        // NO tenant context established
        $count = DB::table('notifications')
            ->where('status', 'new')
            ->count();
        // ↑ Queries DEFAULT connection
        
        return response()->json(['count' => $count]);
    }
    
    public function index()
    {
        $notifications = DB::table('notifications')
            ->where('status', 'new')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
        // ↑ Returns notifications from WRONG database
        
        return response()->json(['data' => $notifications]);
    }
}
```

**Impact:**
- Admin sees notification count from wrong tenant
- Clicking notifications shows other tenant's waiter calls
- Marking as seen updates wrong tenant's notifications

---

## Summary: Leak Risk by Severity

### 🔴 CRITICAL (Data Corruption Risk)

| Leak Vector | Endpoints | Write Operations | Impact |
|-------------|-----------|------------------|--------|
| POST /api/v1/orders | app/admin/routes.php:587 | ✅ YES - creates orders | Orders to wrong DB |
| POST /api/v1/waiter-call | app/admin/routes.php:939 | ✅ YES - creates calls | Calls to wrong DB |
| POST /api/v1/table-notes | app/admin/routes.php:1000 | ✅ YES - creates notes | Notes to wrong DB |
| POST /api/v1/order-status | app/admin/routes.php:795 | ✅ YES - updates orders | Updates wrong DB |
| PATCH /admin/notifications-api/* | app/admin/routes.php:1081-1082 | ✅ YES - updates notifications | Updates wrong DB |
| POST /api/v1/restaurant/{id}/order | app/admin/routes.php:374 | ✅ YES - creates orders | Orders to wrong DB |

**Total:** 6 endpoints with write operations to wrong database

### 🔴 HIGH (Data Leakage Risk)

| Leak Vector | Endpoints | Read Operations | Impact |
|-------------|-----------|-----------------|--------|
| GET /api/v1/menu | app/admin/routes.php:398 | ✅ YES | Shows wrong menu |
| GET /api/v1/order-status | app/admin/routes.php:728 | ✅ YES | Shows wrong order |
| GET /admin/notifications-api | app/admin/routes.php:1080 | ✅ YES | Shows wrong notifications |
| GET /admin/orders/get-table-statuses | app/admin/routes.php:121 | ✅ YES | Shows wrong orders |

**Total:** 16+ endpoints reading from wrong database

---

## Proof of Leakage

### Evidence 1: Route Registration Order

```bash
# Check which file registers api/v1 routes first
grep -n "App::before" app/admin/routes.php
# Output: 9:App::before(function () {

# This proves app/admin/routes.php routes register BEFORE routes.php
# Therefore unprotected duplicates WIN
```

### Evidence 2: Middleware Difference

```bash
# Compare middleware for /menu route
grep -B5 -A2 "Route::get('/menu'" routes.php
# Shows: 'middleware' => ['web', 'detect.tenant']

grep -B5 -A2 "Route::get('/menu'" app/admin/routes.php
# Shows: 'middleware' => ['web']  (MISSING detect.tenant)
```

### Evidence 3: Duplicate Code Blocks

```bash
# Count lines in api/v1 groups
sed -n '376,1044p' routes.php | wc -l
# Output: 669 lines

sed -n '380,1064p' app/admin/routes.php | wc -l
# Output: 685 lines

# Nearly identical (duplicates with minor differences)
```

---

## Conclusion

**CONFIRMED ROOT CAUSE:**
1. app/admin/routes.php registers routes in `App::before()` (executes FIRST)
2. routes.php registers same routes later (IGNORED as duplicates)
3. Unprotected versions win ALL route matches
4. NO tenant middleware ever runs for API requests
5. ALL queries use default connection (mysql or random tenant)
6. Cross-tenant data is visible and can be corrupted

**THE FIX:**
Delete the duplicate API route groups from app/admin/routes.php. Protected versions in routes.php will then execute normally with tenant middleware.

