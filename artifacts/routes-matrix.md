# Routes Matrix - Middleware Coverage Analysis

## CRITICAL FINDING: routes/api.php IS NOT LOADED

**Evidence**: Running `php artisan route:list` shows ZERO routes from `routes/api.php`
- File exists: `/routes/api.php` (18,384 bytes, last modified Oct 9)
- Contains 23 routes with `detect.tenant` middleware
- **BUT Laravel/TastyIgniter is NOT loading this file**

**Impact**: All "protected" routes documented in code analysis **do not exist** in the running application. Only routes from `routes.php` are active, and they lack tenant middleware.

---

## Route Loading Discovery

### Files Found
```bash
routes/:
- api.php          (18,384 bytes) - EXISTS but NOT LOADED ⚠️
- notifications.txt (1,131 bytes)  - Text file, not routes
```

### No RouteServiceProvider Found
```bash
# Standard Laravel location
app/Providers/RouteServiceProvider.php - NOT FOUND

# TastyIgniter framework handles routing differently
# Routes are loaded via App::before() in routes.php
```

### Conclusion
TastyIgniter framework only loads `routes.php`. The `routes/api.php` file was created during fix attempts but never integrated into the application's route loading mechanism.

---

## Active Routes Matrix (from php artisan route:list -v)

### Notation
- ⚠️ = NO tenant middleware
- ✓ = Has tenant middleware  
- 🔴 = CRITICAL (writes data without tenant context)
- 🟡 = HIGH (reads data without tenant context)
- ⚙️ = Admin only

| # | Method | URI | Middleware | Action | Risk | Source |
|---|--------|-----|------------|--------|------|--------|
| **ADMIN NOTIFICATION API** |
| 1 | GET | `/admin/notifications-api` | `web` only | NotificationsApi@index | 🟡 ⚠️ | routes.php:1075 |
| 2 | GET | `/admin/notifications-api/count` | `web` only | NotificationsApi@count | 🟡 ⚠️ | routes.php:1076 |
| 3 | PATCH | `/admin/notifications-api/mark-all-seen` | `web` only | NotificationsApi@markAllSeen | 🔴 ⚠️ | routes.php:1079 |
| 4 | PATCH | `/admin/notifications-api/{id}` | `web` only | NotificationsApi@update | 🔴 ⚠️ | routes.php:1078 |
| 5 | POST | `/admin/statuses/toggle-order-notifications` | `web`, `admin` | Statuses@toggleOrderNotifications | 🔴 ⚙️ | routes.php:1083 |
| **DUPLICATE NOTIFICATION API (nested /api/v1)** |
| 6 | GET | `/api/v1/admin/notifications-api` | `web` only | NotificationsApi@index | 🟡 ⚠️ | routes.php:925 |
| 7 | GET | `/api/v1/admin/notifications-api/count` | `web` only | NotificationsApi@count | 🟡 ⚠️ | routes.php:926 |
| 8 | PATCH | `/api/v1/admin/notifications-api/mark-all-seen` | `web` only | NotificationsApi@markAllSeen | 🔴 ⚠️ | routes.php:929 |
| 9 | PATCH | `/api/v1/admin/notifications-api/{id}` | `web` only | NotificationsApi@update | 🔴 ⚠️ | routes.php:928 |
| **NESTED /api/v1/api/v1 ROUTES (routing error?)** |
| 10 | GET | `/api/v1/api/v1/history` | `web` only | History@index | 🟡 ⚠️ | routes.php:1059 |
| 11 | POST | `/api/v1/api/v1/table-notes` | `web` only | Closure | 🔴 ⚠️ | routes.php:997 |
| 12 | POST | `/api/v1/api/v1/waiter-call` | `web` only | Closure | 🔴 ⚠️ | routes.php:936 |
| **TENANT-FACING API ROUTES** |
| 13 | GET | `/api/v1/categories` | `web` only | Closure | 🟡 ⚠️ | routes.php:458 |
| 14 | GET | `/api/v1/current-table` | `web` only | Closure | 🟡 ⚠️ | routes.php:879 |
| 15 | GET | `/api/v1/images` | `web` only | Closure | 🟡 ⚠️ | routes.php:488 |
| 16 | GET | `/api/v1/menu` | `web` only | Closure | 🟡 ⚠️ | routes.php:396 |
| 17 | GET | `/api/v1/order-status` | `web` only | Closure | 🟡 ⚠️ | routes.php:725 |
| 18 | POST | `/api/v1/order-status` | `web` only | Closure | 🔴 ⚠️ | routes.php:792 |
| 19 | POST | `/api/v1/orders` | `web` only | Closure | 🔴 ⚠️ | routes.php:584 |
| 20 | GET | `/api/v1/payments` | `web` only | Closure | 🟡 ⚠️ | routes.php:383 |
| 21 | GET | `/api/v1/restaurant` | `web` only | Closure | 🟡 ⚠️ | routes.php:526 |
| 22 | GET | `/api/v1/settings` | `web` only | Closure | 🟡 ⚠️ | routes.php:555 |
| 23 | GET | `/api/v1/table-info` | `web` only | Closure | 🟡 ⚠️ | routes.php:839 |
| **ADMIN CONTROLLER ROUTES (no tenant detection)** |
| 24 | GET | `/api/v1/restaurant/{locationId}` | `api` only | RestaurantController@getRestaurantInfo | 🟡 ⚠️ | routes.php:367 |
| 25 | GET | `/api/v1/restaurant/{locationId}/menu` | `api` only | RestaurantController@getMenu | 🟡 ⚠️ | routes.php:368 |
| 26 | POST | `/api/v1/restaurant/{locationId}/order` | `api` only | OrderController@createOrder | 🔴 ⚠️ | routes.php:372 |
| 27 | GET | `/api/v1/restaurant/{locationId}/order/{orderId}` | `api` only | OrderController@getOrderStatus | 🟡 ⚠️ | routes.php:373 |
| 28 | POST | `/api/v1/restaurant/{locationId}/waiter` | `api` only | OrderController@requestWaiter | 🔴 ⚠️ | routes.php:374 |
| 29 | POST | `/api/v1/webhooks/pos` | `api` only | PosWebhookController@handle | 🔴 ⚠️ | routes.php:369 |
| **SUPERADMIN ROUTES** |
| 30 | GET | `/superadmin/index` | `web` only | SuperAdminController@showIndex | ⚙️ | routes.php:217 |
| 31 | GET | `/superadmin/new` | `web` only | SuperAdminController@showNewPage | ⚙️ | routes.php:212 |
| 32 | GET | `/superadmin/settings` | `web` only | SuperAdminController@settings | ⚙️ | routes.php:222 |
| 33 | POST | `/superadmin/sign` | `web` only | SuperAdminController@sign | ⚙️ | routes.php:244 |
| 34 | GET | `/superadmin/signout` | `web` only | SuperAdminController@signOut | ⚙️ | routes.php:247 |

**Total Routes**: 34  
**With tenant middleware**: 0 (0%)  
**Without tenant middleware**: 34 (100%)  

---

## Critical Issues

### Issue 1: routes/api.php Not Loaded ⚠️⚠️⚠️
**Severity**: CRITICAL

The file `routes/api.php` contains 23 routes with proper `detect.tenant` middleware:
```php
Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
    Route::get('/menu', [MenuController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    // ... 21 more routes
```

**But these routes are NOT registered** in the Laravel application. Only routes defined in `routes.php` are active.

**Why**: TastyIgniter framework doesn't use standard Laravel `RouteServiceProvider`. Routes must be defined within `App::before()` callback in `routes.php`.

**Impact**: 
- All development work on `routes/api.php` is ineffective
- Protected routes don't exist
- Only unprotected routes are serving traffic

---

### Issue 2: 100% of Active Routes Lack Tenant Middleware
**Severity**: CRITICAL

Every single active route uses only `web` or `api` middleware groups:
- `web` group: Session, CSRF, cookies (NO tenant detection)
- `api` group: Throttling, bindings (NO tenant detection)

**Neither group includes tenant middleware**.

**Routes writing to database without tenant context**:
1. `POST /api/v1/orders` - Creates orders in main DB
2. `POST /api/v1/order-status` - Updates orders in main DB
3. `POST /api/v1/restaurant/{locationId}/order` - Creates orders in main DB
4. `PATCH /admin/notifications-api/{id}` - Updates notifications
5. `PATCH /admin/notifications-api/mark-all-seen` - Bulk update
6. `POST /api/v1/api/v1/waiter-call` - Creates waiter calls
7. `POST /api/v1/api/v1/table-notes` - Creates table notes

**All queries hit main `paymydine` database**, mixing all tenants' data.

---

### Issue 3: Duplicate/Malformed Routes
**Severity**: HIGH

Routes under `/api/v1/api/v1/*` suggest routing error:
```
/api/v1/api/v1/history
/api/v1/api/v1/table-notes
/api/v1/api/v1/waiter-call
```

**Cause**: Nested `Route::group(['prefix' => 'api/v1'])` in `routes.php:934` inside another group that already has `prefix => 'api/v1'` (line 378).

**Source**:
```php
// routes.php:378
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
    // ...
    
    // routes.php:934 (nested, causes double prefix)
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::post('/waiter-call', function (Request $request) {
```

---

### Issue 4: Notification API Has No Auth/Tenant Middleware
**Severity**: CRITICAL

The notification endpoints allow ANY request to:
- Read all notifications (cross-tenant)
- Update notification status
- Mark all as seen

**No authentication check**. No tenant scoping.

```php
// routes.php:1075-1080
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

`web` middleware provides session/CSRF but **no admin authentication or tenant isolation**.

---

## Middleware Group Definitions

From `app/Http/Kernel.php`:

```php
protected $middlewareGroups = [
    'web' => [
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        ShareErrorsFromSession::class,
        VerifyCsrfToken::class,          // ✓ CSRF protection
        SubstituteBindings::class,
        Localization::class,
    ],
    'api' => [
        'throttle:api',                  // ✓ Rate limiting
        SubstituteBindings::class,
    ],
];
```

**Neither includes**:
- `detect.tenant` (DetectTenant middleware)
- `tenant.database` (TenantDatabaseMiddleware)
- Admin authentication

---

## Route Source File Analysis

### routes.php Structure

```php
<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

App::before(function () {
    // Lines 16-204: Admin routes with ['web'] middleware
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        // Admin dashboard, table management, etc.
    });
    
    // Lines 208-263: Superadmin routes (explicitly bypass tenant middleware)
    
    // Lines 362-375: Admin API routes with ['api'] middleware
    Route::group([
        'prefix' => 'api/v1',
        'namespace' => 'Admin\Controllers\Api',
        'middleware' => ['api']
    ], function () {
        Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
        Route::post('restaurant/{locationId}/order', 'OrderController@createOrder'); // ⚠️
    });
    
    // Lines 378-921: Frontend API routes with ['web'] middleware
    Route::group([
        'prefix' => 'api/v1',
        'middleware' => ['web']
    ], function () {
        Route::get('/menu', function () { /* queries DB::table('menus') */ });
        Route::post('/orders', function () { /* inserts into DB::table('orders') */ }); // ⚠️
        Route::get('/settings', function () { /* queries DB::table('settings') */ });
        // ... etc
    });
    
    // Lines 925-932: Admin nested routes
    Route::group([
        'prefix' => 'admin',
        'middleware' => ['web', 'AdminAuthenticate'],
    ], function () {
        // Empty group, but sets up prefix
    });
    
    // Lines 934-1061: Public API routes (NESTED inside api/v1 group above, causes /api/v1/api/v1)
    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
        Route::post('/waiter-call', function (Request $request) { /* ... */ });
        Route::post('/table-notes', function (Request $request) { /* ... */ });
    });
    
    // Lines 1065-1080: Notification API routes (duplicate definitions)
    Route::group(['prefix' => 'admin/notifications-api'], function () {
        // NO middleware at all! ⚠️⚠️⚠️
    });
    
    Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
        // Same routes again with 'web' middleware
    });
});
```

---

## Recommendations

### 1. Integrate routes/api.php into Application (CRITICAL)
**Option A**: Move protected routes from `routes/api.php` into `routes.php` within `App::before()`:
```php
App::before(function () {
    Route::group([
        'prefix' => 'api/v1',
        'middleware' => ['web', 'detect.tenant']  // Add tenant middleware
    ], function () {
        Route::get('/menu', [MenuController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        // ... rest of routes
    });
});
```

**Option B**: Configure TastyIgniter to load `routes/api.php` (if possible with framework).

**Option C**: Delete `routes/api.php` to avoid confusion (routes aren't used anyway).

---

### 2. Add Tenant Middleware to All Tenant-Facing Routes (CRITICAL)
Update all API route groups:
```php
// Before
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {

// After
Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
```

---

### 3. Fix Nested Route Groups (HIGH)
Remove duplicate prefix at line 934:
```php
// Before (causes /api/v1/api/v1)
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
    // Inside another api/v1 group

// After (correct)
Route::group(['middleware' => ['web']], function () {
    // Remove duplicate prefix
```

---

### 4. Secure Notification API (CRITICAL)
Add authentication and tenant middleware:
```php
Route::middleware(['web', 'admin', 'detect.tenant'])
    ->prefix('admin/notifications-api')
    ->group(function () {
        // Notification routes
    });
```

---

### 5. Remove Duplicate Route Definitions
Remove one of the two notification API definitions (lines 1065 vs 1075).

---

## Verification Commands

```bash
# Confirm routes/api.php is not loaded
php artisan route:list --path=api/v1 | grep -i "detect.tenant"
# Expected: No results (confirms not loaded)

# Check for duplicate routes
php artisan route:list --path=api/v1 | sort | uniq -c | grep -v "1 "
# Expected: Shows /api/v1/api/v1/* routes (malformed)

# Verify NO tenant middleware on any route
php artisan route:list --columns=uri,middleware | grep -i tenant
# Expected: No results (confirms no tenant middleware active)
```

