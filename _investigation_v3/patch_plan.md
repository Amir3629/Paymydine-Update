## Patch Plan - Cross-Tenant Data Leakage Fix

### Executive Summary

**Fix Complexity:** SIMPLE - Primarily deletions  
**Estimated Time:** 30 minutes  
**Risk Level:** LOW (removing duplicate code)  
**Testing Required:** HIGH (affects all API endpoints)

---

### Critical Understanding

**ROOT CAUSE:**  
`app/admin/routes.php` contains ~650 lines of DUPLICATE routes from `routes.php`, but without `detect.tenant` middleware. These duplicates must be deleted entirely.

**WHY DUPLICATES EXIST:**  
Historical refactoring left old routes in place when new protected versions were created in `routes.php`.

**THE FIX:**  
Delete the duplicate route groups from `app/admin/routes.php`. Keep only the protected versions in `routes.php`.

---

## Phase 1: Delete Duplicate API Route Groups (CRITICAL)

### Action 1.1: Delete Framework API Routes Duplicate

**File:** `app/admin/routes.php`  
**Lines to DELETE:** 364-377 (entire group)

```php
// DELETE THIS ENTIRE BLOCK:
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    Route::post('webhooks/pos', 'PosWebhookController@handle');
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**Reason:** Duplicate of `routes.php:361-373` which HAS `detect.tenant` middleware  
**Impact:** 6 routes protected  
**Risk:** NONE - exact duplicates exist in routes.php

---

### Action 1.2: Delete Custom API Routes Duplicate

**File:** `app/admin/routes.php`  
**Lines to DELETE:** 380-1044 (entire group - ~665 lines)

```php
// DELETE THIS ENTIRE BLOCK:
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
    // === Payments (read-only) ===
    Route::get('/payments', function () { ... });
    
    // Menu endpoints
    Route::get('/menu', function () { ... });
    Route::get('/categories', function () { ... });
    Route::get('/images', function () { ... });
    Route::get('/restaurant', function () { ... });
    Route::get('/settings', function () { ... });
    
    // Order endpoints
    Route::post('/orders', function (Request $request) { ... });
    Route::get('/order-status', function (Request $request) { ... });
    Route::post('/order-status', function (Request $request) { ... });
    
    // Table endpoints
    Route::get('/table-info', function (Request $request) { ... });
    Route::get('/current-table', function (Request $request) { ... });
    
    // Waiter/Notes endpoints
    Route::post('/waiter-call', function (Request $request) { ... });
    Route::post('/table-notes', function (Request $request) { ... });
    
    // Admin routes (nested within)
    Route::group(['prefix' => 'admin', ...], function () { ... });
    Route::group(['prefix' => 'api/v1', ...], function () { ... });
    Route::get('history', ...);
});
```

**Reason:** Complete duplicate of `routes.php:376-1044` which HAS `detect.tenant` middleware  
**Impact:** 13+ routes protected  
**Risk:** NONE - exact duplicates exist in routes.php

**IMPORTANT:** This block contains:
- Lines 380-925: Main API routes
- Lines 928-1064: Nested admin route groups
- Lines 937-1043: ANOTHER duplicate of waiter-call/table-notes

All must be deleted.

---

### Action 1.3: Delete Notification API Routes Duplicate

**File:** `app/admin/routes.php`  
**Lines to DELETE:** 1078-1083 (entire group)

```php
// DELETE THIS ENTIRE BLOCK:
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

**Reason:** Duplicate of `routes.php:1047-1052` which HAS `detect.tenant` middleware  
**Impact:** 4 routes protected  
**Risk:** NONE - exact duplicates exist in routes.php

---

## Phase 2: Fix Admin Utility Routes (MEDIUM PRIORITY)

These routes are NOT duplicates but need tenant middleware added.

### Action 2.1: Add Tenant Middleware to Admin Route Group

**File:** `app/admin/routes.php`  
**Line:** 17-20

**CURRENT:**
```php
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
```

**CHANGE TO:**
```php
Route::group([
    'middleware' => ['web', 'admin', 'detect.tenant'],  // ← Add detect.tenant
    'prefix' => config('system.adminUri', 'admin'),
], function () {
```

**Impact:** All admin panel routes will run with tenant context  
**Affected Routes:**
- `/admin/orders/get-table-statuses` (line 121)
- `/admin/orders/get-cashier-url` (line 162)
- `/admin/storefront-url` (line 185)

**Risk:** LOW - admin already expects tenant context

---

### Action 2.2: Verify Admin Routes Don't Break

**Routes that should remain UNSCOPED (super admin):**

These routes MUST stay outside the tenant-scoped group or explicitly bypass tenant middleware:

```php
// Lines 210-250 - Super admin routes
Route::get('/new', [SuperAdminController::class, 'showNewPage'])
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/index', [SuperAdminController::class, 'showIndex'])
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
// ... etc
```

**Action:** Move these routes OUTSIDE the main admin route group (before line 17 or after line 205)  
**OR:** Keep bypasses in place (they already bypass TenantDatabaseMiddleware)

**Recommended:** Move to separate group:
```php
// Super admin routes (BEFORE main admin group)
Route::group(['middleware' => ['web', 'superadmin.auth']], function () {
    Route::get('/new', [SuperAdminController::class, 'showNewPage']);
    Route::get('/index', [SuperAdminController::class, 'showIndex']);
    // ... all super admin routes
});

// Regular admin routes (WITH tenant detection)
Route::group([
    'middleware' => ['web', 'admin', 'detect.tenant'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // ... regular admin routes
});
```

---

## Phase 3: Clean Up Legacy Middleware References (LOW PRIORITY)

### Action 3.1: Remove TenantDatabaseMiddleware Bypasses

**File:** `app/admin/routes.php`  
**Multiple locations**

**FIND:**
```php
->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class])
```

**ACTION:** Delete these lines entirely

**Locations:**
- Line 216: `/new` route
- Line 221: `/index` route
- Line 226: `/settings` route
- Line 231: `/new/store` route
- Line 235: `/tenants/update` route
- Line 238: `/tenants/delete/{id}` route
- Line 242: `/superadmin/login` route
- Line 246: `/superadmin/sign` route
- Line 249: `/superadmin/signout` route
- Line 252: `/superadmin/settings/update` route
- Line 264: `/tenant/update-status` route
- Line 295: `/orders/save-table-layout` route
- Line 360: `/orders/get-table-qr-url` route

**Reason:** `TenantDatabaseMiddleware` is not actually applied, so bypasses are NOOPs  
**Risk:** NONE - removing dead code

---

### Action 3.2: Consider Removing TenantDatabaseMiddleware Entirely

**File:** `app/Http/Middleware/TenantDatabaseMiddleware.php`

**ACTION:** Delete file (or keep for backward compat)

**Reason:** Not used anywhere except:
- Bypasses (which are NOOPs)
- One route `/redirect/qr` (line 210) which should use DetectTenant instead

**If keeping file:** Update `/redirect/qr` route to use DetectTenant:
```php
// CURRENT:
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

// CHANGE TO:
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware('detect.tenant');
```

---

## Phase 4: No Changes Required (Already Correct)

### Protected Routes in routes.php

**NO CHANGES NEEDED** - These are already correct:

```php
// routes.php:361-373 - Framework API routes
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api', 'detect.tenant']  // ✅ Has tenant middleware
], function () { ... });

// routes.php:376-1044 - Custom API routes  
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ✅ Has tenant middleware
], function () { ... });

// routes.php:1047-1052 - Notification routes
Route::middleware(['web', 'admin', 'detect.tenant'])  // ✅ Has tenant middleware
    ->prefix('admin/notifications-api')
    ->group(function () { ... });
```

**Action:** NONE - keep as is

---

### Hardcoded Prefix Usage

**NO CHANGES NEEDED** - Already using dynamic prefixes:

```php
// routes.php:397 (and similar locations)
$p = DB::connection()->getTablePrefix();  // ✅ Dynamic
$query = "SELECT ... FROM {$p}menus ...";  // ✅ Correct pattern
```

**Action:** NONE - pattern is correct

---

### Explicit mysql Connection Usage

**NO CHANGES NEEDED** - All legitimate:

```php
// DetectTenant.php:30 - Tenant lookup
$tenant = DB::connection('mysql')->table('ti_tenants')->...;  // ✅ Correct

// SuperAdminController.php - Tenant management
DB::connection('mysql')->table('tenants')->...;  // ✅ Correct (super admin)
```

**Action:** NONE - accessing central DB is correct in these contexts

---

## Implementation Order

### Step 1: Backup
```bash
cp app/admin/routes.php app/admin/routes.php.backup
cp routes.php routes.php.backup
```

### Step 2: Delete Duplicates (CRITICAL - Do First)
1. Delete lines 364-377 from `app/admin/routes.php`
2. Delete lines 380-1044 from `app/admin/routes.php` (~665 lines)
3. Delete lines 1078-1083 from `app/admin/routes.php`

**After deletions, file should be ~420 lines instead of 1089**

### Step 3: Add Tenant Middleware to Admin Group
1. Edit line 17 in `app/admin/routes.php`
2. Change middleware from `['web']` to `['web', 'admin', 'detect.tenant']`

### Step 4: Move Super Admin Routes (Optional but Recommended)
1. Extract lines 210-264 (super admin routes)
2. Move OUTSIDE the main admin route group
3. Remove bypass decorators

### Step 5: Clean Up Bypasses (Optional)
1. Remove all `->withoutMiddleware(...)` calls
2. Update `/redirect/qr` route to use `detect.tenant`

### Step 6: Test
```bash
# Clear route cache
php artisan route:clear

# Verify route list
php artisan route:list | grep "api/v1"

# Should show ONLY routes from routes.php, NOT duplicates
```

---

## Verification Checklist

After applying patches:

- [ ] `app/admin/routes.php` is ~420 lines (was 1089)
- [ ] No duplicate route groups for `/api/v1/*`
- [ ] No duplicate notification routes
- [ ] Admin route group has `detect.tenant` middleware
- [ ] Super admin routes are outside tenant-scoped group
- [ ] `php artisan route:list` shows each endpoint only once
- [ ] Test request to `/api/v1/menu` hits protected route
- [ ] Test request to `/api/v1/orders` creates order in correct tenant DB
- [ ] Admin panel shows correct tenant's data

---

## Testing Commands

```bash
# 1. Check route count (should decrease)
php artisan route:list | wc -l

# 2. Verify no duplicate api/v1 routes
php artisan route:list | grep "api/v1" | sort | uniq -d
# Should return NOTHING (no duplicates)

# 3. Check detect.tenant is applied
grep -A 5 "Route::group" routes.php | grep detect.tenant
# Should show 3 route groups with detect.tenant

# 4. Verify app/admin/routes.php has no api/v1 groups
grep -n "prefix.*api/v1" app/admin/routes.php
# Should return NOTHING or very few results
```

---

## Rollback Plan

If issues occur:

```bash
# Restore backups
cp app/admin/routes.php.backup app/admin/routes.php
cp routes.php.backup routes.php

# Clear caches
php artisan route:clear
php artisan config:clear
php artisan cache:clear

# Restart PHP-FPM
sudo systemctl restart php-fpm
```

---

## Risk Assessment

| Action | Risk Level | Impact if Wrong | Mitigation |
|--------|-----------|-----------------|------------|
| Delete duplicate API routes | LOW | Routes not found | Exact duplicates exist in routes.php |
| Add tenant middleware to admin | MEDIUM | Admin breaks | Keep super admin routes separate |
| Remove middleware bypasses | LOW | NOOPs anyway | Bypasses do nothing currently |
| Delete TenantDatabaseMiddleware | LOW | Not used | Only 1 route references it |

---

## Expected Outcomes

**Before Fix:**
- 26 API endpoints × 2 (duplicates) = 52 route registrations
- Some requests hit protected routes ✅
- Some requests hit unprotected routes ❌
- Cross-tenant data leakage ❌

**After Fix:**
- 26 API endpoints × 1 = 26 route registrations
- ALL requests hit protected routes ✅
- NO unprotected routes exist ✅
- Complete tenant isolation ✅

**File Size Change:**
- `app/admin/routes.php`: 1089 lines → ~420 lines (-669 lines)
- `routes.php`: No change (1053 lines)

**Code Removed:**
- ~665 lines of duplicate API route definitions
- ~15 lines of duplicate notification routes
- ~13 lines of middleware bypasses (optional)

**Total Deletions:** ~690 lines  
**Total Additions:** 0 lines (only middleware string edit)

---

## Summary

**THE FIX IS SIMPLE:**  
Delete ~690 lines of duplicate code from `app/admin/routes.php`.

All API endpoints are already properly defined with tenant middleware in `routes.php`. The duplicates in `app/admin/routes.php` are causing the leakage and must be removed.

**This is not a refactoring. This is removing dead/harmful code.**

