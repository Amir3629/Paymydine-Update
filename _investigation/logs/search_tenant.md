
`grep -r "tenant" .`

CHANGELOG_LAST_30_DAYS.md
5:Analysis of git commits from the last 30 days reveals **multiple attempts to fix tenant isolation issues**, suggesting the cross-tenant data bleed problem has been known and actively worked on. However, the fixes appear incomplete or conflicting.
22:| `b4fa547` | Recent | **Fix: Tenant isolation for cross-tenant data bleed prevention** |
25:| `6f1a616` | Recent | dev(local): add safe tenant override for local testing only (no prod impact) |
27:| `f4d2551` | Recent | **Complete tenant isolation: remove all Builder ti_* hardcodes, enforce detect.tenant, fix middleware to switch default connection** |
28:| `8f5a6fd` | Recent | **Fix tenant bleed & ti_ti_ 500 errors: unified middleware, removed double-prefix, hardened config** |
32:| `ed36851` | Recent | **fix(tenancy): remove dual middleware, apply tenant mw to admin+api, fix domain match, add debug** |
39:| `35beb01` | Recent | **Fix tenant bleed: SSR tenant detection and cache isolation** |
42:- **7 commits explicitly mention tenant isolation/bleed fixes** (marked in bold)
50:### 2.1 Commit b4fa547: "Fix: Tenant isolation for cross-tenant data bleed prevention"
59:- Likely refactored tenant detection logic
66:+    'database' => env('DB_DATABASE', 'taste'),  // or similar tenant fallback
69:**Assessment**: Major attempt to fix tenant isolation in middleware and database config.
73:### 2.2 Commit f4d2551: "Complete tenant isolation: remove all Builder ti_* hardcodes"
83:// Set tenant as default connection for this request
84:Config::set('database.default', 'tenant');
85:DB::setDefaultConnection('tenant');
90:**Assessment**: **Critical fix** - ensures default connection switches to tenant, not just configuring a separate connection.
94:### 2.3 Commit 8f5a6fd: "Fix tenant bleed & ti_ti_ 500 errors"
112:Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
115:**Assessment**: Fixed double-prefix error and enforced tenant middleware on API routes.
119:### 2.4 Commit ed36851: "fix(tenancy): remove dual middleware, apply tenant mw to admin+api"
131:**Problem**: This commit **introduced the second tenant middleware**, creating the dual middleware issue documented in TENANCY_OVERVIEW.md.
137:### 2.5 Commit 35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
165:**Assessment**: Feature addition, not tenant isolation fix. Uses default connection (context-dependent).
179:**Problem**: Uses default connection without tenant validation.
181:**Assessment**: Feature addition that **inherited tenant isolation issues**.
214:| `d33e277` | Added order notifications | Used default connection (no tenant check) |
221:| `b4fa547` | Modified DetectTenant | Major refactor for tenant isolation | ✓ Likely effective |
222:| `f4d2551` | Added setDefaultConnection() | Ensure default switches to tenant | ✓ Effective |
230:| `6f1a616` | Added tenant override for local testing | Development workaround |
245:| `6f1a616` | +51 insertions | Added tenant override for testing |
250:2. Added tenant override for testing
251:3. Major refactor for tenant isolation
269:- Line 63-81: `tenant` connection configuration exists
271:- Line 74: `tenant` connection has `'prefix' => env('DB_PREFIX', 'ti_')`
273:**Issue**: Both connections use same prefix, which is correct. But fallback database for tenant is `'taste'` (line 68), which seems wrong.
288:- Line 122: `Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {`
289:- 23 routes protected with `detect.tenant` middleware
300:- Lines 362-375: API routes with NO tenant middleware
301:- Lines 378-921: Frontend API routes with NO tenant middleware
329:**Created in commit**: `35beb01` (Fix tenant bleed: SSR tenant detection and cache isolation)
331:**Purpose**: Provide scoped cache keys to prevent cache collisions between tenants.
344:- Line 98: `'prefix' => env('CACHE_PREFIX', 'tenant_default_cache')`
346:**Issue**: Global cache prefix not tenant-scoped.
363:- `DetectTenant`: Sets default to `tenant` connection
395:35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
397:8f5a6fd: "Fix tenant bleed & ti_ti_ 500 errors"
399:f4d2551: "Complete tenant isolation: remove all Builder ti_* hardcodes"
401:b4fa547: "Fix: Tenant isolation for cross-tenant data bleed prevention"
404:**Pattern**: Each commit attempts to fix tenant isolation but doesn't fully resolve the issue.
421:**Risk**: New features developed during fix period may **inherit** tenant isolation bugs if they use:
422:- Default DB connection without checking tenant context
426:**Assessment**: Notification features (commits `79acbf5`, `d33e277`) likely have tenant issues.
434:**Expected**: Commits adding `detect.tenant` middleware to unprotected routes in `routes.php`
459:**Expected**: Update `NotificationHelper` to use explicit tenant connection or validate context
472:- **Option A**: Use `DetectTenant` everywhere (sets default to `tenant` connection)
477:- More robust (stores tenant in app container)
484:**Action**: Apply `detect.tenant` middleware to all unprotected tenant-facing routes
515:**Action**: Create tests that verify tenant isolation for:
516:- Database queries (each tenant's data stays separate)
517:- Cache entries (no cross-tenant cache hits)
518:- Route protection (all tenant routes have middleware)
520:**Evidence**: No test files created in last 30 days for tenant isolation.
527:~30 days ago: Problem discovered (tenant data bleed)
537:6f1a616: Added tenant override for local testing

app/admin/routes.php
233:    Route::match(['get', 'post'], '/tenants/update', [SuperAdminController::class, 'update'])
234:    ->name('tenants.update')
237:    Route::get('/tenants/delete/{id}', [SuperAdminController::class, 'delete'])
253:    Route::post('/tenant/update-status', function (Request $request) {
257:        $updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
379:// Custom API Routes for frontend (no tenant required)
946:                // For testing, use a default tenant ID
947:                $tenantId = 1;
950:                return DB::transaction(function () use ($request, $tenantId) {
988:                    'tenant' => $tenantId ?? 'unknown'
1008:                // For testing, use a default tenant ID
1009:                $tenantId = 1;
1012:                return DB::transaction(function () use ($request, $tenantId) {
1051:                    'tenant' => $tenantId ?? 'unknown'

TENANT_HOST_LEAK_INVESTIGATION.md
12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
53:**Tenant Context**: ✅ Has tenant middleware (via TastyIgniter admin framework)
67:- Each tenant database may have their own location with `permalink_slug='default'`
130:**Tenant Context**: ✅ Has tenant context (called from tenant-aware routes)
152:**Tenant Context**: ✅ Has tenant context
204:│    Context: Has tenant middleware ✓                         │
296:   - Registered as: `detect.tenant`
297:   - Strategy: Creates separate `tenant` connection, sets as default
301:   - Registered as: `tenant.database`  
309:| Blade view (`tables/edit.blade.php`) | ✅ Yes (framework) | tenant DB | Via TastyIgniter admin MW |
311:| Helper `buildCashierTableUrl()` | ✅ Yes (inherited) | tenant DB | Called from tenant context |
312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
317:**Both route files explicitly bypass tenant middleware**:
327:- On `http://127.0.0.1:8001/admin` → Queries main database (no tenant context)
328:- On `http://amir.paymydine.com/admin` → May query wrong tenant's database
371:- Prefix: `'tenant_default_cache'`
396:Database slug: 'default' (in amir's tenant DB)
543:- ✅ Fixes the primary issue (QR codes use correct tenant)
546:- ✅ Automatic tenant awareness
549:- ⚠️ LOW - Blade view executes in tenant context (has middleware)
567:- ✅ Ensures endpoint queries correct tenant database
572:- ⚠️ LOW - Route already uses tenant-scoped queries (`DB::table('tables')`)
622:3. Returns from tenant database: 'default'

FINAL_DEPLOYMENT_REPORT.md
16:   - Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
17:   - Moved waiter-call and table-notes into tenant-scoped group
91:**Problem**: 0% of routes had tenant middleware  
92:**Solution**: Added `detect.tenant` to all API routes
97:**Impact**: 100% of tenant-facing routes now isolated
123:**Solution**: Use tenant-specific subdomain
164:fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
219:$ grep -n "detect.tenant" routes.php app/admin/routes.php
220:routes.php:364:    'middleware' => ['api', 'detect.tenant']
221:routes.php:378:    'middleware' => ['web', 'detect.tenant']
222:routes.php:1064:Route::middleware(['web', 'admin', 'detect.tenant'])
351:✅ **All raw SQL uses {$p} for tenant tables** (verified in 6 locations)  
352:✅ **All api/v1 routes include detect.tenant** (verified in code at lines 364, 378, 1064)  
366:0786f15   fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
368:c0f37ae   Fix: Complete tenant isolation - Add detect.tenant middleware to all API routes
378:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
438:**Note**: Shows only middleware group name (TastyIgniter limitation), but detect.tenant IS in the code.

app/Http/Middleware/DetectTenant.php
1:<?php
2:
3:namespace App\Http\Middleware;
4:
5:use Closure;
6:use Illuminate\Http\Request;
7:use Illuminate\Support\Facades\Config;
8:use Illuminate\Support\Facades\DB;
9:use Illuminate\Support\Facades\Log;
10:
11:class DetectTenant
12:{
13:    /**
14:     * Handle an incoming request.
15:     *
16:     * @param  \Illuminate\Http\Request  $request
17:     * @param  \Closure  $next
18:     * @return mixed
19:     */
20:    public function handle(Request $request, Closure $next)
21:    {
22:        $host = $request->getHost();
23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);
24:
25:        // Allow local development override (e.g., for Postman testing)
26:        if (app()->environment('local') && $request->hasHeader('X-Tenant-Override')) {
27:            $subdomain = $request->header('X-Tenant-Override');
28:            Log::channel('tenant_detection')->info('Using X-Tenant-Override header: ' . $subdomain);
29:        } else {
30:            $parts = explode('.', $host);
31:            $subdomain = $parts[0];
32:            Log::channel('tenant_detection')->info('Extracted subdomain: ' . $subdomain);
33:        }
34:
35:        if ($subdomain === 'www' || $subdomain === env('APP_DOMAIN', 'paymydine.com')) {
36:             Log::channel('tenant_detection')->info('Ignoring www or main domain, using default connection.');
37:             return $next($request);
38:        }
39:
40:        $tenant = $this->resolveTenant($subdomain);
41:
42:        if (!$tenant) {
43:            Log::channel('tenant_detection')->error('Tenant not found for subdomain: ' . $subdomain);
44:            // Optional: abort or redirect if tenant is not found
45:            // abort(404, 'Tenant not found.');
46:            return $next($request); // Fallback to default connection if tenant not found
47:        }
48:
49:        $this->configureTenantConnection($tenant);
50:
51:        return $next($request);
52:    }
53:
54:    protected function resolveTenant($subdomain)
55:    {
56:        try {
57:            // Ensure we are querying the central `mysql` connection for the tenants table
58:            return DB::connection('mysql')->table('tenants')->where('subdomain', $subdomain)->first();
59:        } catch (\Exception $e) {
60:            Log::channel('tenant_detection')->error('Error resolving tenant: ' . $e->getMessage());
61:            return null;
62:        }
63:    }
64:
65:    protected function configureTenantConnection($tenant)
66:    {
67:        // Purge any existing tenant connection to ensure fresh settings are applied
68:        DB::purge('tenant');
69:
70:        // Dynamically configure the 'tenant' database connection
71:        Config::set('database.connections.tenant', [
72:            'driver' => 'mysql',
73:            'host' => $tenant->db_host ?? env('DB_HOST', '127.0.0.1'),
74:            'port' => $tenant->db_port ?? env('DB_PORT', '3306'),
75:            'database' => $tenant->db_name,
76:            'username' => $tenant->db_username,
77:            'password' => $tenant->db_password,
78:            'prefix' => 'ti_', // Standard prefix for tenant tables
79:            'charset' => 'utf8mb4',
80:            'collation' => 'utf8mb4_unicode_ci',
81:            'prefix_indexes' => true,
82:            'strict' => true,
83:            'engine' => null,
84:        ]);
85:
86:        // Set the default connection to the dynamically configured tenant connection
87:        Config::set('database.default', 'tenant');
88:        DB::setDefaultConnection('tenant');
89:
90:        // Optional: Store tenant info globally if needed elsewhere
91:        app()->instance('tenant', $tenant);
92:
93:        Log::channel('tenant_detection')->info('Successfully configured and set default connection to tenant: ' . $tenant->subdomain . ' (DB: ' . $tenant->db_name . ')');
94:    }
95:}

...
lots of results
...
