## Investigation Summary - Tenant Isolation Audit

### Critical Findings

#### 🔴 CRITICAL VULNERABILITIES

**1. Unprotected Admin Notification API Routes**
- **Location:** `app/admin/routes.php:1078-1083`
- **Routes Affected:**
  - `GET /admin/notifications-api/count`
  - `GET /admin/notifications-api`
  - `PATCH /admin/notifications-api/{id}`
  - `PATCH /admin/notifications-api/mark-all-seen`
- **Issue:** These routes have ONLY `web` middleware, NO `detect.tenant` middleware
- **Impact:** Database queries execute on unpredictable connection:
  - First request: Uses `mysql` connection → queries central `paymydine` database ❌
  - Subsequent requests: Uses whatever tenant connection was set by previous request in same PHP-FPM worker ❌
- **Risk Level:** CRITICAL - Data leakage, wrong tenant data returned
- **Evidence:**
  ```php
  // app/admin/routes.php:1078-1083
  Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
      Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
      Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
      Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
      Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
  });
  ```

**2. Duplicate Route Registration**
- **Issue:** Notification API routes are registered TWICE:
  - Protected version in `routes.php:1047-1052` with `detect.tenant` ✅
  - Unprotected version in `app/admin/routes.php:1078-1083` without `detect.tenant` ❌
- **Impact:** Depending on route matching order, requests may hit the unprotected version
- **Risk Level:** CRITICAL

#### 🟡 MEDIUM RISKS

**1. Dual Middleware Implementation**
- **Issue:** Two tenant middleware exist:
  - `DetectTenant` (modern, correct) - creates separate `tenant` connection
  - `TenantDatabaseMiddleware` (legacy, risky) - modifies shared `mysql` connection
- **Evidence:**
  - `app/Http/Kernel.php:53-54` - both registered
  - `DetectTenant` is used in routes.php ✅
  - `TenantDatabaseMiddleware` is bypassed in admin routes but still present in codebase
- **Impact:** Code confusion, maintenance burden, potential for misconfiguration
- **Recommendation:** Remove `TenantDatabaseMiddleware` entirely

**2. Global Cache Prefix**
- **Config:** `config/cache.php:98`
  ```php
  'prefix' => env('CACHE_PREFIX', 'tenant_default_cache'),
  ```
- **Issue:** Cache prefix is NOT tenant-specific
- **Mitigation:** `TenantHelper::scopedCacheKey()` exists and is used in `TableHelper`
- **Gap:** Not enforced globally - other code may cache without scoping
- **Impact:** Potential cross-tenant cache poisoning
- **Risk:** MEDIUM (limited cache usage in app, but not guaranteed safe)

#### 🔵 LOW RISKS

**1. Shared File Storage**
- **Location:** `storage/app/public/assets/media/attachments/public/`
- **Pattern:** Hash-based directory structure: `{hash1}/{hash2}/{hash3}/{filename}`
- **Issue:** No tenant identifier in path
- **Isolation:** Relies on filename uniqueness (appears to be cryptographic hashes)
- **Risk:** LOW - collision unlikely, but all tenants share same storage tree

**2. Session Storage**
- **Driver:** file-based
- **Location:** `storage/framework/sessions/`
- **Isolation:** By session ID (cookie-based)
- **Risk:** LOW - standard Laravel session isolation, no tenant-specific issue

### What's Working Correctly

#### ✅ Database Connection Switching

**Mechanism:**
1. Request arrives (e.g., `amir.paymydine.com/api/v1/menu`)
2. `DetectTenant` middleware intercepts
3. Extracts subdomain (`amir`)
4. Queries central DB: `SELECT * FROM paymydine.ti_tenants WHERE domain LIKE 'amir.%'`
5. Configures `tenant` connection with tenant's DB name (`amir_db`)
6. **Switches default connection:** `DB::setDefaultConnection('tenant')`
7. All subsequent `DB::table()` and `DB::select()` calls use `amir_db`

**Coverage:**
- ✅ 100% of `/api/v1/*` routes (19 routes) have `detect.tenant` middleware
- ✅ Framework API routes also protected
- ✅ Admin notification routes (protected version) have middleware

#### ✅ Raw SQL Handling

**Pattern:**
```php
$p = DB::connection()->getTablePrefix();  // Gets 'ti_' from tenant connection
$query = "SELECT * FROM {$p}menus WHERE menu_status = 1";
$items = DB::select($query);  // Executes on tenant connection
```

**Findings:**
- ✅ NO hardcoded `ti_` prefixes in active code
- ✅ All raw SQL uses dynamic prefix fetching
- ✅ Prefix is obtained from the CORRECT connection (tenant)

#### ✅ Query Builder Operations

**Pattern:**
```php
DB::table('orders')->insertGetId([...]);  // Laravel adds 'ti_' prefix automatically
```

**Findings:**
- ✅ All `DB::table()` calls use unprefixed table names
- ✅ Laravel automatically prepends prefix from active connection config
- ✅ ~80% of DB operations use Query Builder (safest pattern)

#### ✅ Central Database Operations

**Pattern:**
```php
DB::connection('mysql')->table('ti_tenants')->where(...)->first();
```

**Findings:**
- ✅ Middleware correctly uses explicit `mysql` connection to query tenant directory
- ✅ Super admin routes correctly access central database
- ✅ No mixing of tenant and central data

#### ✅ URL Generation

**Pattern:**
```php
$frontendUrl = $request->getScheme() . '://' . $request->getHost();
$qrUrl = rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?...';
```

**Findings:**
- ✅ QR code URLs use current request host (not stored slug)
- ✅ Cashier URLs use request host
- ✅ All tenant-facing URLs correctly scoped to subdomain

### Statistics

**Route Coverage:**
- Total routes: 39
- API routes with tenant middleware: 19/19 (100%)
- Admin routes with tenant middleware: 4/4 protected version
- Admin routes WITHOUT tenant middleware: 4/4 unprotected version ❌
- Super admin routes (correctly unscoped): 6

**Database Operations:**
- Total DB calls in main routes: ~40
- Using default (tenant) connection: ~38 (95%)
- Using explicit mysql connection: 1 (super admin)
- Unscoped (vulnerable): Unknown count in NotificationsApi controller

**SQL Safety:**
- Hardcoded ti_ prefixes: 0 ✅
- Raw SQL with dynamic prefix: 100% ✅
- Query Builder usage: ~80% ✅

### Recommendations

#### Immediate (Fix Today)

1. **Remove duplicate notification routes**
   - Delete unprotected routes in `app/admin/routes.php:1078-1083`
   - Keep only protected version in `routes.php:1047-1052`

2. **Verify no admin widgets depend on unprotected routes**
   - Check if any admin panel JavaScript calls `/admin/notifications-api`
   - Update to use protected endpoints

#### Short-term (This Week)

3. **Remove legacy middleware**
   - Delete `TenantDatabaseMiddleware.php`
   - Remove from `app/Http/Kernel.php`
   - Remove all `->withoutMiddleware()` references to it

4. **Enforce cache scoping**
   - Create a custom cache wrapper that auto-applies `TenantHelper::scopedCacheKey()`
   - Or use Redis with per-tenant prefixes

5. **Add integration tests**
   - Test that queries on protected routes use correct tenant DB
   - Test that unprotected routes are truly inaccessible

#### Long-term (This Month)

6. **Implement tenant-specific storage paths**
   - Add tenant identifier to media upload paths
   - Migrate existing media to tenant-specific directories

7. **Add monitoring**
   - Log all DB queries with connection name
   - Alert on queries to wrong database

8. **Framework route list fix**
   - Document that `php artisan route:list` doesn't show middleware from `App::before()`
   - Create custom artisan command to show actual middleware chains

### Conclusion

**Overall Assessment:** The tenant isolation architecture is **fundamentally sound** with one **critical gap**.

**Core Mechanism:** ✅ Works correctly
- Subdomain-based tenant detection
- Dynamic database connection switching
- Proper prefix handling
- Clean URL generation

**Critical Gap:** ❌ One set of unprotected API routes
- Duplicate notification API without middleware
- High risk of data leakage
- Easy to fix (delete 6 lines)

**Recommended Action:** Delete lines 1078-1083 from `app/admin/routes.php` immediately.

