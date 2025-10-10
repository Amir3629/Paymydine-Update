# OPEN_QUESTIONS.md

## Executive Summary

This document lists critical unknowns that block full certainty about the tenant isolation issues. Each question includes specific file/line references where answers may exist.

---

## 1. Tenant Database Naming & Mapping

### Q1: What is the expected naming convention for tenant databases?

**Evidence needed**: 
- Are tenant databases named like `amir_db`, `rosana_db`?
- Or like `tenant_1`, `tenant_2`?
- Or stored in `tenant->database` field from `ti_tenants` table?

**Where to look**:
- **Database inspection**: `SELECT domain, database FROM ti_tenants;` (in main `paymydine` database)
- **SQL schema files**: 
  - `db/paymydine.sql` (lines showing tenant table structure)
  - `db/schema.sql` (lines 1-200 already show basic structure)
  - `db/newtenantdb.sql` (template for new tenant databases?)
- **Migration files**: `database/migrations/` (if any create tenant entries)
- **SuperAdminController**: `app/admin/controllers/SuperAdminController.php` 
  - Method `store()` or `createTenant()` - how it generates database name
  
**Current assumption**: `DetectTenant.php:30` queries `ti_tenants.database` field, suggesting database name is stored there.

**⚠️ Uncertainty**: Is the `database` field:
- Full database name (e.g., `amir_db`)?
- Tenant identifier that gets prefixed (e.g., `amir` → `tenant_amir`)?
- Reference to shared database with tenant_id filtering?

---

### Q2: How does ti_tenants.domain map to subdomains?

**Evidence needed**:
- Are domains stored as `amir.paymydine.com` (full domain)?
- Or as `amir` (subdomain only)?
- What about custom domains?

**Where to look**:
- **Sample data**: `db/sample_rows.sql` or `db/paymydine.sql` 
  - Look for INSERT statements into `ti_tenants` table
  - Example row format
- **Admin tenant creation**: `app/admin/controllers/SuperAdminController.php`
  - How domain is validated and stored
- **Live database**: `SELECT id, domain, database, subdomain FROM ti_tenants LIMIT 10;`

**Current evidence**:
- `DetectTenant.php:31`: Uses `->where('domain', 'like', $subdomain . '.%')`
- `TenantDatabaseMiddleware.php:20`: Uses `->where('domain', $tenant . '.paymydine.com')`

**⚠️ Conflict**: Two different matching strategies suggest inconsistent assumptions about domain format.

---

### Q3: Are tenant databases on same server or separate servers?

**Evidence needed**:
- Do all tenants share one MySQL server?
- Or does each tenant have their own server (fields: `db_host`, `db_port`, `db_user`, `db_pass`)?

**Where to look**:
- **DetectTenant.php:38-41**: 
  ```php
  Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
  Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
  Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
  Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
  ```
- **ti_tenants schema**: Does the table have columns `db_host`, `db_port`, `db_user`, `db_pass`?
- **Database inspection**: `DESCRIBE ti_tenants;` (in main database)
- **SQL files**: `db/schema.sql` (lines 1-10 already show notifications table, need to see tenants table)

**Current assumption**: Code supports per-tenant DB credentials, but likely all tenants on same server using same credentials (fallback to env vars).

---

## 2. Route Loading & Middleware Application

### Q4: In what order are route files loaded?

**Evidence needed**:
- Does `routes/api.php` load before or after `routes.php`?
- Does `app/admin/routes.php` load before or after the others?

**Where to look**:
- **RouteServiceProvider**: `app/Providers/RouteServiceProvider.php`
  - `boot()` or `map()` method
  - Order of `Route::middleware()->group()` calls
- **Bootstrap files**: `bootstrap/app.php`
- **Framework route loading**: `vendor/tastyigniter/flame/` (TastyIgniter framework)
  - May have custom route loading mechanism

**Why it matters**: 
- Duplicate routes (`/api/v1/menu`, `/api/v1/orders`, etc.) exist in both `routes/api.php` (protected) and `routes.php` (unprotected)
- Laravel uses **first matching route**
- If `routes.php` loads first, unprotected versions will be used ⚠️

**Test**: 
- Add unique response to each duplicate route
- Call the route and see which response is returned
- Example:
  ```php
  // routes/api.php
  Route::get('/menu', fn() => response()->json(['source' => 'api.php']));
  
  // routes.php
  Route::get('/menu', fn() => response()->json(['source' => 'routes.php']));
  ```

---

### Q5: Does TastyIgniter framework apply middleware to admin routes automatically?

**Evidence needed**:
- Does TastyIgniter have a convention where admin routes (`/admin/*`) automatically get tenant middleware?
- Or is it explicit only?

**Where to look**:
- **Admin bootstrap**: `app/admin/ServiceProvider.php`
  - Line 57: `->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class])`
  - Suggests framework may apply this middleware by default
- **TastyIgniter source**: `vendor/tastyigniter/flame/src/Foundation/Http/`
  - Look for default middleware on admin routes
- **System Controller**: `app/system/classes/Controller.php`
  - May apply middleware in `runAdmin()` method (called by `routes.php:199,204`)
- **Documentation**: `docs/ARCHITECTURE.md` or framework docs

**Current assumption**: Framework likely applies tenant middleware to admin routes, but evidence is unclear.

**⚠️ Risk**: If framework doesn't apply middleware, all admin routes are unprotected.

---

### Q6: Are there route caching issues?

**Evidence needed**:
- Is route cache enabled (`php artisan route:cache`)?
- Could cached routes be using old middleware assignments?

**Where to look**:
- **Cache files**: `bootstrap/cache/routes-v7.php` or similar (if exists)
- **Clear cache**: Run `php artisan route:clear` and test
- **Config**: `config/cache.php` (line 18: `'default' => env('CACHE_DRIVER', 'file')`)

**Test**:
- Clear all caches: `php artisan cache:clear && php artisan route:clear && php artisan config:clear`
- Test cross-tenant bleed again
- If issue persists, not a caching problem

---

## 3. Cache Configuration & Isolation

### Q7: What cache driver is actually in use?

**Evidence needed**:
- Is it file cache (default)?
- Redis?
- Memcached?
- Database?

**Where to look**:
- **Environment**: `.env` file (line: `CACHE_DRIVER=?`)
- **Config**: `config/cache.php:18` (default is `file`)
- **Redis config**: `config/database.php:137-162`
  - Line 143: `'prefix' => env('REDIS_PREFIX', str_slug(env('APP_NAME', 'tastyigniter'), '_').'_database_'),`
- **Runtime check**: Add debug endpoint:
  ```php
  Route::get('/debug/cache', fn() => response()->json([
      'driver' => config('cache.default'),
      'prefix' => config('cache.prefix'),
  ]));
  ```

**Why it matters**:
- File cache: Each tenant needs file path scoping
- Redis: Needs key prefix scoping (currently has global prefix)
- Database: Needs tenant_id in cache table
- Memcached: Needs key prefix scoping

**Current config**: `config/cache.php:98` shows `'prefix' => env('CACHE_PREFIX', 'tenant_default_cache')`

**⚠️ Issue**: Prefix is **global**, not tenant-specific.

---

### Q8: Is cache being used at all in affected flows?

**Evidence needed**:
- Do menu/table/order/notification queries use caching?
- Or are they always fresh DB queries?

**Where to look**:
- **Menu caching**: Search for `Cache::remember` or `cache()->remember` in:
  - `app/Http/Controllers/Api/MenuController.php`
  - `app/admin/controllers/Api/RestaurantController.php`
- **Table caching**: 
  - `app/Helpers/TableHelper.php:20` - **YES, uses caching with scoped keys**
- **Settings caching**: `app/Helpers/SettingsHelper.php` - No caching found
- **Notification caching**: `app/Helpers/NotificationHelper.php` - No caching found

**Current evidence**: Only `TableHelper` uses caching, and it uses scoped keys correctly.

**Assessment**: Cache bleed may not be the primary issue since most queries don't cache.

---

### Q9: Does session storage need tenant scoping?

**Evidence needed**:
- Are sessions stored per-tenant or globally?
- Could admin sessions bleed between tenants?

**Where to look**:
- **Session config**: `config/session.php`
  - Session driver (file, database, redis?)
  - Session lifetime
  - Cookie name
- **Database sessions**: If driver is `database`, check `sessions` table
  - Does it have tenant_id column?
- **CSRF token issues**: `app/Http/Kernel.php:24` shows CSRF middleware enabled
  - Could CSRF tokens be tenant-scoped?

**Test**:
- Log in to admin at `amir.paymydine.com/admin`
- In another browser, try to access `rosana.paymydine.com/admin`
- Are you logged in as amir admin (session bleed)?

**⚠️ Potential issue**: If sessions are globally stored without tenant context, admin actions could bleed.

---

## 4. Shared vs Isolated Data Design

### Q10: Is there intentional shared data between tenants?

**Evidence needed**:
- Are some tables meant to be shared (e.g., `ti_settings`, `ti_menus`)?
- Or should everything be isolated?

**Where to look**:
- **Architecture docs**: `docs/ARCHITECTURE.md`
  - Line 77 mentions tenant middleware but not data isolation strategy
- **Data model docs**: `docs/DATA_MODEL.md`
  - May specify which tables are shared vs isolated
- **Database naming**: 
  - If tenant DBs have different names (e.g., `amir_db`, `rosana_db`), everything should be isolated
  - If all tenants share one DB with `tenant_id` foreign key, some tables could be intentionally shared

**Scenarios**:
1. **Full isolation**: Each tenant has separate database, no shared tables
2. **Hybrid**: Shared database, most tables have `tenant_id` column, some tables (e.g., system config) are global
3. **Catalog sharing**: Tenants share menu catalog, but have separate orders/customers

**Current assumption**: Scenario 1 (full isolation) based on `DetectTenant` switching entire database connection.

**⚠️ Uncertainty**: Some code patterns (like notification helpers using `DB::table()` directly) suggest developers may assume scenario 2.

---

### Q11: Should notifications be tenant-scoped or system-wide?

**Evidence needed**:
- Are notifications meant to be per-tenant (amir sees only amir's notifications)?
- Or system-wide (admin sees all tenant notifications)?

**Where to look**:
- **Notification table schema**: `db/schema.sql:1-2`
  - Shows: `ti_notifications` table has `table_id`, `table_name`, but NO `tenant_id` column
- **Admin UI**: Does admin notification bell show notifications from:
  - Only current subdomain's tenant?
  - All tenants?
- **Business logic**: `app/Helpers/NotificationHelper.php:24`
  - `createNotification()` checks `tenant_id` in data array
  - But `ti_notifications` table may not have `tenant_id` column

**⚠️ Conflict**: 
- Code tries to filter by `tenant_id` (line 24)
- Table schema doesn't have `tenant_id` column (line 2 of schema.sql)
- This suggests **incomplete implementation**

---

### Q12: Are there any tables that legitimately live in main database?

**Evidence needed**:
- Which tables should be in `paymydine` (main DB)?
- Which should be in tenant-specific DBs?

**Where to look**:
- **Main DB schema**: `db/paymydine.sql`
  - Should contain: `ti_tenants`, system admin users, billing, etc.
- **Tenant DB schema**: `db/newtenantdb.sql`
  - Should contain: `ti_menus`, `ti_orders`, `ti_tables`, `ti_notifications`, etc.
- **Schema comparison**: 
  - `db/old_newtenantdb.sql` vs `db/newtenantdb.sql`
  - `db/old_paymydine.sql` vs `db/paymydine.sql`
  - What changed?

**Expected tables in main DB**:
- `ti_tenants` (tenant registry)
- `ti_admins` or `ti_users` (system administrators)
- `ti_system_settings` (global system config)

**Expected tables in tenant DBs**:
- `ti_menus`, `ti_categories`, `ti_menu_items`
- `ti_orders`, `ti_order_menus`, `ti_order_totals`
- `ti_tables`, `ti_locations`
- `ti_notifications`, `ti_waiter_calls`, `ti_table_notes`, `ti_valet_requests`
- `ti_settings` (tenant-specific settings)
- `ti_customers` (tenant's customers)

**⚠️ Verification needed**: Inspect actual database structure to confirm.

---

## 5. Frontend & QR Code Generation

### Q13: How should QR codes be scoped to tenants?

**Evidence needed**:
- Should QR codes contain tenant identifier?
- Should they redirect to tenant-specific URL?

**Where to look**:
- **QR generation**: `routes.php:328-339` (get-table-qr-url endpoint)
  - Currently builds URL with `env('FRONTEND_URL')` (global)
  - Should use current request host
- **QR redirect**: `app/admin/controllers/QrRedirectController.php`
  - How it resolves tenant from QR code
- **Table structure**: Does `ti_tables.qr_code` contain tenant info?
  - Or is it just table identifier (e.g., `"table-5"`)?

**Expected flow**:
1. Admin at `amir.paymydine.com/admin` generates QR for Table 5
2. QR should encode URL: `https://amir.paymydine.com/table/5?qr=table-5`
3. Customer scans QR, goes to amir's subdomain
4. Frontend calls API at `amir.paymydine.com/api/v1/menu`
5. Middleware ensures queries hit `amir_db`

**Current issue** (from `routes.php:328`):
```php
$frontendUrl = env('FRONTEND_URL', config('app.url'));
```

**Problem**: `FRONTEND_URL` is likely `https://paymydine.com` (global), not `https://amir.paymydine.com` (tenant-specific).

**⚠️ Impact**: QR codes may direct customers to wrong tenant's menu.

---

### Q14: Does frontend (Next.js) enforce tenant isolation?

**Evidence needed**:
- Does frontend make API calls to tenant-specific subdomain?
- Or does it call a global API endpoint?

**Where to look**:
- **Frontend config**: `frontend/lib/api-client.ts:6`
  - `const FRONTEND_URL = envConfig.getFrontendUrl();`
- **Environment config**: `frontend/lib/environment-config.ts`
  - How it determines which API to call
- **API base URL**: 
  - Should be `https://${currentSubdomain}.paymydine.com/api/v1`
  - Not `https://api.paymydine.com/v1` (if such a thing exists)
- **SSR tenant detection**: Commit `35beb01` mentions "SSR tenant detection"
  - `frontend/` code that extracts tenant from request hostname

**Test**:
- Open frontend at `amir.paymydine.com`
- Check browser Network tab
- Verify API calls go to `amir.paymydine.com/api/v1/menu` (not different subdomain)

**⚠️ Risk**: If frontend calls wrong subdomain, it will get wrong tenant's data even if backend is fixed.

---

### Q15: Are there any reverse proxy or load balancer considerations?

**Evidence needed**:
- Is there nginx/Apache/Cloudflare in front of Laravel?
- Could it be stripping or modifying subdomain headers?

**Where to look**:
- **Middleware headers**: `DetectTenant.php:23-24`
  ```php
  $subdomain = $request->header('X-Tenant-Subdomain') 
            ?? $request->header('X-Original-Host') 
            ?? $this->extractSubdomainFromHost($request->getHost());
  ```
- **Server config**: `.htaccess` or nginx config files
- **Deployment docs**: `docs/DEPLOYMENT.md`
  - May specify proxy setup
- **Vercel config**: `frontend/vercel.json`
  - If frontend is on Vercel, how does it handle subdomains?

**Test**:
- Add logging in `DetectTenant.php:23-25`:
  ```php
  Log::info('Tenant detection', [
      'X-Tenant-Subdomain' => $request->header('X-Tenant-Subdomain'),
      'X-Original-Host' => $request->header('X-Original-Host'),
      'getHost()' => $request->getHost(),
      'resolved' => $subdomain,
  ]);
  ```
- Make request to `amir.paymydine.com/api/v1/menu`
- Check logs to see which header/method provided subdomain

---

## 6. Testing & Verification

### Q16: Are there any existing tests for tenant isolation?

**Evidence needed**:
- Do tests verify data doesn't leak between tenants?
- Are there integration tests for multi-tenancy?

**Where to look**:
- **Test files**: `tests/Feature/`
  - `tests/Feature/AdminSessionPersistenceTest.php` exists
  - Are there `tests/Feature/TenantIsolationTest.php` or similar?
- **Unit tests**: `tests/Unit/`
- **Test database config**: `phpunit.xml` or `phpunit.dusk.xml`
  - How tests handle multiple tenants

**Test scenarios needed**:
1. Create data in tenant A, verify not visible in tenant B
2. Update data in tenant A, verify tenant B unchanged
3. Delete data in tenant A, verify tenant B unaffected
4. Cache in tenant A, verify tenant B gets different cache

**⚠️ Gap**: No evidence of tenant isolation tests in repository.

---

### Q17: How to reproduce the cross-tenant bleed?

**Evidence needed**:
- Exact steps to reproduce the issue
- Which routes/actions cause bleed
- Expected vs actual behavior

**Steps to test**:
1. Set up two tenants: `amir.paymydine.com`, `rosana.paymydine.com`
2. Log in to `amir.paymydine.com/admin`
3. Create a menu item "Amir's Burger"
4. Check `rosana.paymydine.com/admin` - does "Amir's Burger" appear?
5. If yes, check database:
   ```sql
   -- In amir_db
   SELECT * FROM ti_menus WHERE menu_name = "Amir's Burger";
   
   -- In rosana_db
   SELECT * FROM ti_menus WHERE menu_name = "Amir's Burger";
   
   -- In paymydine (main DB)
   SELECT * FROM ti_menus WHERE menu_name = "Amir's Burger";
   ```
6. Determine which database contains the record

**Where to log**: `storage/logs/laravel.log`
- Line 55 of `DetectTenant.php`: "Switched to tenant database: {database} for subdomain: {subdomain}"
- Check if this log appears for both requests

---

### Q18: When did it stop working?

**Evidence needed**:
- User said "It worked last month; broke recently"
- What changed?

**Where to look**:
- **Git log**: Already analyzed in CHANGELOG_LAST_30_DAYS.md
  - Multiple tenant fix commits in last 30 days
  - Suggests it broke around that time
- **Deployment log**: When was last deployment?
- **Server changes**: Any server/infrastructure changes?
- **Database migrations**: Any recent schema changes?

**Timeline correlation**:
- Commit `ed36851` added second middleware (may have introduced conflict)
- Commit `45c1048` started removing `ti_` prefixes (incomplete)
- Either could have broken working system

**⚠️ Hypothesis**: System was working with one middleware, then:
1. Second middleware added (conflict)
2. OR prefix removal incomplete (queries failing/hitting wrong tables)
3. OR new features added without proper tenant context (notifications)

---

## 7. Priority Questions for Immediate Investigation

### Tier 1 (Critical - Block all fixes)

| # | Question | Where to Look | Why Critical |
|---|----------|---------------|--------------|
| Q1 | Tenant DB naming convention | `SELECT * FROM ti_tenants;` | Can't fix if don't know how DBs are named |
| Q4 | Route loading order | Test with unique responses | Determines which routes are actually used |
| Q17 | Exact reproduction steps | Manual testing | Need to confirm issue exists and measure fixes |

### Tier 2 (High Priority - Inform fix strategy)

| # | Question | Where to Look | Why Important |
|---|----------|---------------|---------------|
| Q10 | Shared vs isolated data | Architecture docs + DB inspection | Design intent unclear |
| Q11 | Notification scoping | Check if `ti_notifications` has `tenant_id` column | Current code conflicts with schema |
| Q13 | QR code scoping | Test actual QR codes | May be causing customer-facing bleed |

### Tier 3 (Medium Priority - Optimization)

| # | Question | Where to Look | Why Useful |
|---|----------|---------------|------------|
| Q5 | Framework auto-middleware | TastyIgniter source | May explain missing middleware |
| Q7 | Active cache driver | Check `.env` and `config/cache.php` | Inform cache isolation approach |
| Q14 | Frontend tenant isolation | Frontend code + Network tab | Verify end-to-end flow |

### Tier 4 (Low Priority - Nice to have)

| # | Question | Where to Look | Why Optional |
|---|----------|---------------|--------------|
| Q8 | Cache usage extent | Search for `Cache::` calls | May not be primary issue |
| Q16 | Existing tests | `tests/` directory | Would help but not blocking |

---

## 8. Information Collection Commands

### Database Inspection

```bash
# Connect to main database
mysql -u paymydine -p paymydine

# Show tenant table structure
DESCRIBE ti_tenants;

# Show sample tenants
SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

# Check if notifications table has tenant_id
DESCRIBE ti_notifications;

# Count records in main vs tenant databases
SELECT COUNT(*) FROM ti_menus;  -- In main DB
# Then connect to tenant DB and run same query
```

### Route Testing

```php
// Add to routes/api.php temporarily
Route::get('/test/source', fn() => response()->json(['source' => 'api.php']));

// Add to routes.php temporarily
Route::get('/test/source', fn() => response()->json(['source' => 'routes.php']));

// Call: curl https://amir.paymydine.com/api/v1/test/source
// Result shows which file loaded first
```

### Middleware Testing

```php
// Add to routes/api.php
Route::get('/test/middleware', function(Request $request) {
    return response()->json([
        'middleware_executed' => 'detect.tenant',
        'default_connection' => DB::getDefaultConnection(),
        'current_db' => DB::connection()->getDatabaseName(),
        'tenant_from_request' => optional($request->attributes->get('tenant'))->database,
        'tenant_from_container' => optional(app('tenant'))->database,
    ]);
})->middleware(['detect.tenant']);
```

### Cache Testing

```php
// Set cache in tenant A
cache()->put('test_key', 'from_amir', 60);

// Check cache in tenant B (same key)
$value = cache()->get('test_key');
// If $value === 'from_amir', cache is NOT isolated

// With scoped keys
use App\Helpers\TenantHelper;
cache()->put(TenantHelper::scopedCacheKey('test_key'), 'from_amir', 60);
// Tenant B won't see this
```

---

## 9. Next Steps After Answering Questions

1. **Database inspection** → Confirms tenant naming and table distribution
2. **Route testing** → Identifies which routes are actually in use
3. **Middleware testing** → Verifies tenant context is set correctly
4. **Reproduction testing** → Confirms issue and baseline for fixes

**After collecting this evidence**:
- Update TENANCY_OVERVIEW.md with facts
- Revise fix strategy based on actual system design
- Prioritize fixes based on root causes found

