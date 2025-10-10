## Duplicate Route Registration Analysis

### Executive Summary

**CONFIRMED:** All API routes are registered TWICE with different middleware.

**Winning Routes:** ❌ UNPROTECTED versions (app/admin/routes.php) win because `App::before()` executes first  
**Losing Routes:** ✅ PROTECTED versions (routes.php) never execute (already matched)  
**Impact:** 🔴 **ALL API REQUESTS EXECUTE WITHOUT TENANT ISOLATION**

---

## Route Registration Order

### How TastyIgniter Loads Routes

```php
// 1. FIRST: App::before() callbacks execute
//    File: app/admin/routes.php, Line 9
App::before(function () {
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::get('/menu', ...);  // ← REGISTERS FIRST (WINS)
    });
});

// 2. SECOND: Standard route files load
//    File: routes.php
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
    Route::get('/menu', ...);  // ← REGISTERS SECOND (IGNORED - duplicate)
});
```

**Laravel Route Matching:**
- Uses first matching route in registration order
- Later duplicates are ignored
- No warning or error is raised

**Result:** Unprotected routes execute for ALL API requests ❌

---

## Duplicate Analysis by Endpoint

### Duplicate 1: GET /api/v1/menu

#### Winner (Unprotected) - app/admin/routes.php:398-458
```php
// Line 380: Group declaration
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ← NO TENANT PROTECTION
], function () {
    // Line 398: Route definition
    Route::get('/menu', function () {
        try {
            $p = DB::connection()->getTablePrefix();
            // ↑ Gets prefix from DEFAULT connection (mysql or random tenant)
            
            $query = "SELECT ... FROM {$p}menus m ...";
            $items = DB::select($query);
            // ↑ Executes on DEFAULT connection (WRONG!)
            
            return response()->json(['success' => true, 'data' => ['items' => $items]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to fetch menu']);
        }
    });
});
```

**Middleware Executed:** `web` group only (EncryptCookies, StartSession, etc.)  
**NO tenant middleware runs**  
**Connection at query time:** `mysql` (central DB) or previous tenant's connection  
**Query targets:** `paymydine.ti_menus` OR `rosana_db.ti_menus` (WRONG)

#### Loser (Protected) - routes.php:394-458
```php
// Line 376: Group declaration  
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ← HAS TENANT PROTECTION
], function () {
    // Line 394: Route definition
    Route::get('/menu', function () {
        try {
            $p = DB::connection()->getTablePrefix();
            // ↑ Would get prefix from TENANT connection
            
            $query = "SELECT ... FROM {$p}menus m ...";
            $items = DB::select($query);
            // ↑ Would execute on TENANT connection
            
            return response()->json(['success' => true, 'data' => ['items' => $items]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to fetch menu']);
        }
    });
});
```

**Middleware Executed:** NEVER (route never matched - duplicate exists)  
**Status:** ✅ CORRECT but UNUSED

**Code Comparison:** IDENTICAL (same logic, different middleware)

---

### Duplicate 2: POST /api/v1/orders

#### Winner (Unprotected) - app/admin/routes.php:587-725

```php
Route::post('/orders', function (Request $request) {
    // NO tenant middleware ran
    DB::beginTransaction();
    // ↑ Transaction on DEFAULT connection (mysql or random)
    
    $orderNumber = DB::table('orders')->max('order_id') + 1;
    // ↑ Query: SELECT MAX(order_id) FROM paymydine.ti_orders (WRONG!)
    // OR: SELECT MAX(order_id) FROM rosana_db.ti_orders (WRONG TENANT!)
    
    $orderId = DB::table('orders')->insertGetId([
        'first_name' => $request->customer_name,
        'order_total' => $request->total_amount,
        // ...
    ]);
    // ↑ INSERT INTO paymydine.ti_orders (WRONG DATABASE!)
    // OR: INSERT INTO rosana_db.ti_orders (WRONG TENANT!)
    
    DB::table('order_menus')->insert([...]);
    // ↑ INSERT INTO wrong database
    
    DB::commit();
    // ↑ Commits to WRONG database
    
    return response()->json(['success' => true, 'order_id' => $orderId]);
});
```

**Scenario 1 (First request in PHP-FPM worker):**
- Default connection: `mysql`
- Order saved to: `paymydine.ti_orders` (central DB)
- Impact: Order orphaned or mixed with test data

**Scenario 2 (After tenant B request):**
- Default connection: `tenant` → `rosana_db`
- Order saved to: `rosana_db.ti_orders`
- Impact: Tenant A's order appears in Tenant B's system! 🔴

#### Loser (Protected) - routes.php:583-725

```php
Route::post('/orders', function (Request $request) {
    // detect.tenant middleware would run first
    // Default connection switched to: tenant → amir_db
    
    DB::beginTransaction();
    // Transaction on amir_db
    
    $orderId = DB::table('orders')->insertGetId([...]);
    // INSERT INTO amir_db.ti_orders (CORRECT)
    
    DB::commit();
    // Commits to amir_db
    
    return response()->json(['success' => true, 'order_id' => $orderId]);
});
```

**Status:** ✅ CORRECT but NEVER EXECUTES (duplicate registered first)

---

### Duplicate 3: POST /api/v1/waiter-call

**This route is duplicated THREE times!**

#### Version 1 (Winner): app/admin/routes.php:939-996
```php
// Inside nested group at line 937
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
    Route::post('/waiter-call', function (Request $request) {
        // NO tenant middleware
        return DB::transaction(function() use ($request, $tenantId) {
            $callId = DB::table('waiter_calls')->insertGetId([...]);
            // ↑ INSERT INTO paymydine.ti_waiter_calls (WRONG!)
            // OR: INSERT INTO rosana_db.ti_waiter_calls (WRONG TENANT!)
            
            DB::table('notifications')->insert([...]);
            // ↑ Notification goes to WRONG database
        });
    });
});
```

**Middleware:** `web` only  
**Executes:** ✅ YES (registered first)  
**Impact:** 🔴 Waiter calls go to wrong tenant's database

#### Version 2 (Loser): routes.php:923-980
```php
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
    Route::post('/waiter-call', function (Request $request) {
        // detect.tenant would run
        return DB::transaction(function() use ($request) {
            $callId = DB::table('waiter_calls')->insertGetId([...]);
            // ↑ Would INSERT INTO amir_db.ti_waiter_calls (CORRECT)
        });
    });
});
```

**Middleware:** `web, detect.tenant`  
**Executes:** ❌ NO (duplicate already matched)  
**Status:** ✅ CORRECT but UNUSED

#### Version 3 (Also Loser): app/admin/routes.php inside ANOTHER nested group

**There's actually a THIRD registration in the same file!**

---

### Duplicate 4: GET /admin/notifications-api/count

#### Winner: app/admin/routes.php:1078-1083
```php
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
});
```

**Middleware:** `web` only  
**Executes:** ✅ YES (App::before runs first)  
**Controller:**
```php
class NotificationsApi
{
    public function count()
    {
        $count = DB::table('notifications')->where('status', 'new')->count();
        // ↑ Queries DEFAULT connection (mysql or random tenant)
        // Returns count from WRONG database
        
        return response()->json(['count' => $count]);
    }
}
```

**Impact:** Admin sees notification count from wrong tenant! 🔴

#### Loser: routes.php:1047-1052
```php
Route::middleware(['web', 'admin', 'detect.tenant'])
    ->prefix('admin/notifications-api')
    ->group(function () {
        Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    });
```

**Middleware:** `web, admin, detect.tenant`  
**Executes:** ❌ NO (duplicate already registered)  
**Status:** ✅ CORRECT but UNUSED

---

## Why Protected Routes Don't Execute

### Proof: Route Registration Timing

```php
// FILE: app/admin/routes.php
// Executed FIRST during boot (App::before callback)
App::before(function () {
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::get('/menu', ...);  // REGISTERS: api/v1/menu → middleware: ['web']
    });
}); // ← App::before completes

// FILE: routes.php  
// Executed SECOND (standard route loading)
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
    Route::get('/menu', ...);  // ATTEMPTS TO REGISTER: api/v1/menu
    // Laravel sees: "api/v1/menu already registered, skip"
    // OR: Registers but never matches (first registered route wins)
});
```

### Laravel Route Collection Behavior

```php
// Pseudocode of Laravel's internal route matching:
function matchRoute($request) {
    foreach ($this->routes as $route) {
        if ($route->matches($request)) {
            return $route;  // ← First match wins, stops looking
        }
    }
}

// Routes array order:
// [0] api/v1/menu → middleware: ['web']  (from app/admin/routes.php)
// [1] api/v1/menu → middleware: ['web', 'detect.tenant']  (from routes.php)
//
// Request to /api/v1/menu matches route [0] and returns immediately
// Route [1] is never checked
```

---

## Evidence: Exact Line-by-Line Duplicates

### Menu Route Comparison

**app/admin/routes.php:398-458** vs **routes.php:394-454**

```diff
  Route::get('/menu', function () {
      try {
          // Get menu items with categories (matching old API structure)
          $p = DB::connection()->getTablePrefix();
          $query = "
              SELECT 
                  m.menu_id as id,
                  m.menu_name as name,
                  m.menu_description as description,
                  CAST(m.menu_price AS DECIMAL(10,2)) as price,
                  COALESCE(c.name, 'Main') as category_name,
                  ma.name as image
              FROM {$p}menus m
              LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
              LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
              LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
                  AND ma.attachment_id = m.menu_id 
                  AND ma.tag = 'thumb'
              WHERE m.menu_status = 1
              ORDER BY c.priority ASC, m.menu_name ASC
          ";
          
          $items = DB::select($query);
          
          // Convert prices to float and fix image paths
          foreach ($items as &$item) {
              $item->price = (float)$item->price;
              if ($item->image) {
                  // If image exists, construct the full URL
                  $item->image = "/api/media/" . $item->image;
              } else {
                  // Use default image if none exists
                  $item->image = '/images/pasta.png';
              }
          }
          
          // Get all enabled categories
          $categoriesQuery = "
              SELECT category_id as id, name, priority 
              FROM {$p}categories 
              WHERE status = 1 
              ORDER BY priority ASC, name ASC
          ";
          $categories = DB::select($categoriesQuery);
          
          return response()->json([
              'success' => true,
              'data' => [
                  'items' => $items,
                  'categories' => $categories
              ]
          ]);

      } catch (\Exception $e) {
          return response()->json([
              'success' => false,
              'error' => 'Failed to fetch menu',
              'message' => $e->getMessage()
          ], 500);
      }
  });
```

**Difference:** ZERO - The code is IDENTICAL. Only the middleware differs.

---

## Summary: All Duplicates

### Complete Duplicate List

| Endpoint | Protected Location | Unprotected Location | Winner | Impact |
|----------|------------------|---------------------|--------|--------|
| `GET /api/v1/restaurant/{id}` | routes.php:366 | app/admin/routes.php:369 | Unprotected | 🔴 Wrong tenant |
| `GET /api/v1/restaurant/{id}/menu` | routes.php:367 | app/admin/routes.php:370 | Unprotected | 🔴 Wrong tenant |
| `POST /api/v1/restaurant/{id}/order` | routes.php:370 | app/admin/routes.php:374 | Unprotected | 🔴 Order to wrong DB |
| `GET /api/v1/restaurant/{id}/order/{id}` | routes.php:371 | app/admin/routes.php:375 | Unprotected | 🔴 Wrong tenant |
| `POST /api/v1/restaurant/{id}/waiter` | routes.php:372 | app/admin/routes.php:376 | Unprotected | 🔴 Wrong tenant |
| `POST /api/v1/webhooks/pos` | ❌ NOT IN routes.php | app/admin/routes.php:371 | Unprotected | 🔴 Only unprotected! |
| `GET /api/v1/payments` | routes.php:381 | app/admin/routes.php:385 | Unprotected | 🔴 Wrong tenant |
| `GET /api/v1/menu` | routes.php:394 | app/admin/routes.php:398 | Unprotected | 🔴 Wrong menu |
| `GET /api/v1/categories` | routes.php:457 | app/admin/routes.php:461 | Unprotected | 🔴 Wrong categories |
| `GET /api/v1/images` | routes.php:487 | app/admin/routes.php:491 | Unprotected | 🔴 Wrong images |
| `GET /api/v1/restaurant` | routes.php:525 | app/admin/routes.php:529 | Unprotected | 🔴 Wrong restaurant |
| `GET /api/v1/settings` | routes.php:554 | app/admin/routes.php:558 | Unprotected | 🔴 Wrong settings |
| `POST /api/v1/orders` | routes.php:583 | app/admin/routes.php:587 | Unprotected | 🔴 Order to wrong DB |
| `GET /api/v1/order-status` | routes.php:724 | app/admin/routes.php:728 | Unprotected | 🔴 Wrong order |
| `POST /api/v1/order-status` | routes.php:791 | app/admin/routes.php:795 | Unprotected | 🔴 Update wrong DB |
| `GET /api/v1/table-info` | routes.php:838 | app/admin/routes.php:842 | Unprotected | 🔴 Wrong table |
| `GET /api/v1/current-table` | routes.php:878 | app/admin/routes.php:882 | Unprotected | 🔴 Wrong table |
| `POST /api/v1/waiter-call` | routes.php:923 | app/admin/routes.php:939 | Unprotected | 🔴 Call to wrong DB |
| `POST /api/v1/table-notes` | routes.php:983 | app/admin/routes.php:1000 | Unprotected | 🔴 Note to wrong DB |
| `GET /admin/notifications-api/count` | routes.php:1048 | app/admin/routes.php:1079 | Unprotected | 🔴 Wrong count |
| `GET /admin/notifications-api` | routes.php:1049 | app/admin/routes.php:1080 | Unprotected | 🔴 Wrong notifications |
| `PATCH /admin/notifications-api/{id}` | routes.php:1050 | app/admin/routes.php:1081 | Unprotected | 🔴 Update wrong DB |
| `PATCH /admin/notifications-api/mark-all-seen` | routes.php:1051 | app/admin/routes.php:1082 | Unprotected | 🔴 Update wrong DB |

**Total:** 22 duplicates (21 exact duplicates + 1 missing from protected)

---

## Why This Causes Cross-Tenant Data Visibility

### Example User Flow

**User in Tenant A (amir.paymydine.com):**

1. Admin opens order creation page
2. Page loads in browser: `https://amir.paymydine.com/admin/orders/create`
3. Admin is authenticated (session exists)

**Request 1: Load Menu**
```
GET https://amir.paymydine.com/api/v1/menu
Host: amir.paymydine.com
Cookie: tastyigniter_session=xyz123
```

**Route Matching:**
- Laravel checks routes in registration order
- Finds: `api/v1/menu` registered in app/admin/routes.php:398 (FIRST)
- Executes: Unprotected version
- Middleware: `web` only (NO tenant detection)
- Default connection: `mysql` (not switched)
- Query: `SELECT * FROM paymydine.ti_menus`
- **Result:** Returns menu from central DB (empty or mixed) ❌

**Request 2: Create Order**
```
POST https://amir.paymydine.com/api/v1/orders
Host: amir.paymydine.com
{"customer_name": "John", "items": [...], "total_amount": 50.00}
```

**Route Matching:**
- Finds: `api/v1/orders` registered in app/admin/routes.php:587 (FIRST)
- Executes: Unprotected version
- Middleware: `web` only (NO tenant detection)
- Default connection: `mysql`
- Query: `INSERT INTO paymydine.ti_orders VALUES (...)`
- **Result:** Order saved to central database ❌

**Request 3: Check Notifications**
```
GET https://amir.paymydine.com/admin/notifications-api/count
Host: amir.paymydine.com
```

**Route Matching:**
- Finds: `admin/notifications-api/count` in app/admin/routes.php:1079 (FIRST)
- Executes: Unprotected version
- Middleware: `web` only
- Controller queries: `DB::table('notifications')->count()`
- Default connection: Still `mysql` from previous requests
- Query: `SELECT COUNT(*) FROM paymydine.ti_notifications`
- **Result:** Count from central DB ❌

---

**User in Tenant B (rosana.paymydine.com) - Later, Same PHP-FPM Worker:**

**Request 1: Load Menu**
```
GET https://rosana.paymydine.com/api/v1/menu
```

**Route Matching:**
- Finds: `api/v1/menu` in app/admin/routes.php:398
- Executes: Unprotected version
- Middleware: `web` only
- Default connection: Still `mysql` (OR `tenant` if previous request set it)
- **Scenario A:** Query: `SELECT * FROM paymydine.ti_menus`
- **Scenario B:** Query: `SELECT * FROM amir_db.ti_menus` (WRONG TENANT!)
- **Result:** Returns wrong tenant's menu ❌

---

## Cross-Contamination Scenarios

### Scenario 1: All Requests Use Central DB
**When:** Fresh PHP-FPM worker, no tenant context ever set  
**Impact:**
- All tenants query `paymydine.ti_*` tables
- If central DB has data: All tenants see the same data
- If central DB is empty: All tenants see empty results
- Orders/notifications saved to central DB

### Scenario 2: Random Tenant Bleed
**When:** Multiple tenants using same PHP-FPM worker  
**Impact:**
- Request 1 (Tenant A): Sets connection to `amir_db`
- Request 2 (Tenant B): Connection still `amir_db` (not reset!)
- Tenant B sees Tenant A's data
- Tenant B's actions modify Tenant A's database

**Example Timeline:**
```
10:00:00 - GET amir.paymydine.com/api/v1/menu
           → No middleware, but connection is mysql (central)
           → Returns empty/mixed menu

10:00:01 - Some OTHER request (admin panel) triggers tenant switch to amir_db
           → Connection now: tenant → amir_db

10:00:02 - GET rosana.paymydine.com/api/v1/menu
           → No middleware, connection STILL amir_db
           → Returns AMIR's menu to ROSANA! 🔴

10:00:03 - POST rosana.paymydine.com/api/v1/orders
           → No middleware, connection STILL amir_db
           → Saves ROSANA's order to AMIR's database! 🔴🔴🔴
```

---

## Verification Commands

### Command 1: Prove Duplicates Exist
```bash
# Count /menu route definitions
grep -c "Route::get('/menu'" routes.php app/admin/routes.php
# Expected output:
# routes.php:1
# app/admin/routes.php:1
# (2 total - DUPLICATE!)
```

### Command 2: Prove Middleware Difference
```bash
# Show context around menu route in both files
grep -A1 -B3 "Route::get('/menu'" routes.php
# Output shows: middleware => ['web', 'detect.tenant']

grep -A1 -B3 "Route::get('/menu'" app/admin/routes.php  
# Output shows: middleware => ['web']  (MISSING detect.tenant!)
```

### Command 3: Count All api/v1 Duplicates
```bash
# Extract all api/v1 route URIs from both files
grep "Route::" routes.php | grep "api/v1" | wc -l
# ~19 routes

grep "Route::" app/admin/routes.php | grep "api/v1" | wc -l
# ~19 routes

# Total: ~38 routes registered, but only ~19 unique URIs (DUPLICATES!)
```

---

## Conclusion

**ALL PROTECTED ROUTES IN routes.php ARE DEAD CODE.**

The unprotected duplicates in `app/admin/routes.php` register first and win all matches. This explains EXACTLY why cross-tenant data is visible:

1. ✅ Protected routes exist and are correct
2. ❌ Protected routes never execute (duplicates win)
3. ❌ Unprotected routes execute for ALL API requests
4. ❌ No tenant middleware runs
5. ❌ Queries use central DB or wrong tenant's DB
6. ❌ Data visible across tenants

**The fix:** Delete the duplicate blocks from `app/admin/routes.php`. The protected versions will then execute.

