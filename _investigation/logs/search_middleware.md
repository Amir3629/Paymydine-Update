`grep -r "middleware" .`

<file_content>
_investigation/logs/search_from_ti.md
54:artifacts/middleware-diff.md

_investigation/logs/search_db_table.md
172:artifacts/middleware-diff.md

_investigation/logs/search_tenant.md
8:27:| `f4d2551` | Recent | **Complete tenant isolation: remove all Builder ti_* hardcodes, enforce detect.tenant, fix middleware to switch default connection** |
9:28:| `8f5a6fd` | Recent | **Fix tenant bleed & ti_ti_ 500 errors: unified middleware, removed double-prefix, hardened config** |
10:32:| `ed36851` | Recent | **fix(tenancy): remove dual middleware, apply tenant mw to admin+api, fix domain match, add debug** |
16:69:**Assessment**: Major attempt to fix tenant isolation in middleware and database config.
23:112:Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
24:115:**Assessment**: Fixed double-prefix error and enforced tenant middleware on API routes.
25:119:### 2.4 Commit ed36851: "fix(tenancy): remove dual middleware, apply tenant mw to admin+api"
26:131:**Problem**: This commit **introduced the second tenant middleware**, creating the dual middleware issue documented in TENANCY_OVERVIEW.md.
41:288:- Line 122: `Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {`
42:289:- 23 routes protected with `detect.tenant` middleware
43:300:- Lines 362-375: API routes with NO tenant middleware
44:301:- Lines 378-921: Frontend API routes with NO tenant middleware
58:434:**Expected**: Commits adding `detect.tenant` middleware to unprotected routes in `routes.php`
62:484:**Action**: Apply `detect.tenant` middleware to all unprotected tenant-facing routes
66:518:- Route protection (all tenant routes have middleware)
89:14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
90:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
91:53:**Tenant Context**: ✅ Has tenant middleware (via TastyIgniter admin framework)
95:204:│    Context: Has tenant middleware ✓                         │
101:312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
102:313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
103:317:**Both route files explicitly bypass tenant middleware**:
110:549:- ⚠️ LOW - Blade view executes in tenant context (has middleware)
116:16:   - Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
118:91:**Problem**: 0% of routes had tenant middleware  
122:164:fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
124:220:routes.php:364:    'middleware' => ['api', 'detect.tenant']
125:221:routes.php:378:    'middleware' => ['web', 'detect.tenant']
126:222:routes.php:1064:Route::middleware(['web', 'admin', 'detect.tenant'])
129:366:0786f15   fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
130:368:c0f37ae   Fix: Complete tenant isolation - Add detect.tenant middleware to all API routes
131:378:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
132:438:**Note**: Shows only middleware group name (TastyIgniter limitation), but detect.tenant IS in the code.
157:23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);

CHANGELOG_LAST_30_DAYS.md
17:| `fd707fa` | Most recent | Fix: Enable CSRF middleware to prevent admin auto-logout |
27:| `f4d2551` | Recent | **Complete tenant isolation: remove all Builder ti_* hardcodes, enforce detect.tenant, fix middleware to switch default connection** |
28:| `8f5a6fd` | Recent | **Fix tenant bleed & ti_ti_ 500 errors: unified middleware, removed double-prefix, hardened config** |
32:| `ed36851` | Recent | **fix(tenancy): remove dual middleware, apply tenant mw to admin+api, fix domain match, add debug** |
43:- Multiple commits touch middleware, database config, and routing
69:**Assessment**: Major attempt to fix tenant isolation in middleware and database config.
106:Added or modified route middleware assignments. Possibly:
112:Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
115:**Assessment**: Fixed double-prefix error and enforced tenant middleware on API routes.
119:### 2.4 Commit ed36851: "fix(tenancy): remove dual middleware, apply tenant mw to admin+api"
131:**Problem**: This commit **introduced the second tenant middleware**, creating the dual middleware issue documented in TENANCY_OVERVIEW.md.
133:**Assessment**: **INTRODUCED PROBLEM** - added competing middleware implementation.
213:| `ed36851` | Added TenantDatabaseMiddleware | Created dual middleware conflict |
223:| `8f5a6fd` | Fixed ti_ti_ double prefix | Config and route middleware | ✓ Likely effective |
283:| `8f5a6fd` | +18, -3 | Added middleware to route groups |
288:- Line 122: `Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {`
289:- 23 routes protected with `detect.tenant` middleware
300:- Lines 362-375: API routes with NO tenant middleware
301:- Lines 378-921: Frontend API routes with NO tenant middleware
357:1. Original system likely had single middleware approach
358:2. Commit `ed36851`: Added `TenantDatabaseMiddleware` (second middleware)
359:3. Commit message says "remove dual middleware" but actually introduced it
360:4. Current state: Two middleware coexist with different strategies
434:**Expected**: Commits adding `detect.tenant` middleware to unprotected routes in `routes.php`
471:**Action**: Choose one middleware strategy and remove the other:
484:**Action**: Apply `detect.tenant` middleware to all unprotected tenant-facing routes
518:- Route protection (all tenant routes have middleware)
531:ed36851: Added second middleware (introduced conflict) ⚠️
533:8f5a6fd: Fixed double-prefix and added route middleware
545:fd707fa: Fixed CSRF middleware (unrelated)

app/admin/routes.php
18:        'middleware' => ['web'],
210:    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
215:        ->middleware('superadmin.auth') // Protect this route
220:    ->middleware('superadmin.auth') // Protect this route
225:    ->middleware('superadmin.auth') // Protect this route
367:    'middleware' => ['api']
382:    'middleware' => ['web']
930:        'middleware' => ['web', 'AdminAuthenticate'], // reuse existing admin auth alias
937:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
1078:Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
1086:Route::middleware(['web', 'admin'])->group(function () {

TENANT_HOST_LEAK_INVESTIGATION.md
14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
53:**Tenant Context**: ✅ Has tenant middleware (via TastyIgniter admin framework)
112:**Status**: ✅ Host derivation correct, ❌ BUT middleware bypass causes DB query issues
204:│    Context: Has tenant middleware ✓                         │
303:   - Applied to: Admin routes (via TastyIgniter framework global middleware)
312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
317:**Both route files explicitly bypass tenant middleware**:
404:- Laravel handles proxy trust automatically via `TrustProxies` middleware
549:- ⚠️ LOW - Blade view executes in tenant context (has middleware)
601:- [x] **Tenant context status** documented (middleware active/bypassed)
645:2. `routes.php` (remove middleware bypass)
646:3. `app/admin/routes.php` (remove middleware bypass)
662:2. 🟡 **HIGH**: Remove middleware bypass (data consistency)

FINAL_DEPLOYMENT_REPORT.md
16:   - Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
74:**All middleware** (5 files):
91:**Problem**: 0% of routes had tenant middleware  
164:fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
212:$ php artisan route:list --columns=uri,middleware | grep "api/v1"
215:Shows only `web` or `api` middleware in output (TastyIgniter's `App::before()` limitation).
217:**BUT** the middleware IS in the code (verified):
220:routes.php:364:    'middleware' => ['api', 'detect.tenant']
221:routes.php:378:    'middleware' => ['web', 'detect.tenant']
222:routes.php:1064:Route::middleware(['web', 'admin', 'detect.tenant'])
366:0786f15   fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
368:c0f37ae   Fix: Complete tenant isolation - Add detect.tenant middleware to all API routes
370:fd707fa   Fix: Enable CSRF middleware to prevent admin auto-logout
378:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
431:$ php artisan route:list --columns=uri,middleware | grep "api/v1" | head -5
438:**Note**: Shows only middleware group name (TastyIgniter limitation), but detect.tenant IS in the code.
446:- (app/admin/routes.php uses framework default middleware)
461:- All controllers, helpers, middleware
470:❌ 0% tenant middleware coverage  
477:✅ 100% tenant middleware coverage  
533:| **Tenant middleware added** | 3 route groups |

ALL_CHANGED_FILES_LIST.md
17:- ✅ Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
251:  (104 files - tenant middleware + prefix refactor)
269:✅ **100%** tenant middleware coverage on API routes  

GITHUB_DEPLOYMENT_SUCCESS.md
5:**Commit**: `0786f15` - fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
27:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
34:- ✅ Added `detect.tenant` middleware to all API routes

... and more
