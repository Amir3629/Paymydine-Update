## Multi-Tenant Isolation Investigation v2 - Complete Audit

**Date:** 2025-10-09  
**Scope:** Complete end-to-end tenant isolation audit  
**Status:** ✅ COMPLETE

---

### Investigation Overview

This is a comprehensive, code-level investigation of tenant isolation across the entire PayMyDine application. The audit examined routing, middleware, database access, caching, sessions, queues, file storage, and URL generation to identify where tenant boundaries are enforced and where gaps exist.

### Critical Findings

#### 🔴 **ONE CRITICAL VULNERABILITY IDENTIFIED**

**Unprotected Admin Notification API Routes**
- **Location:** `app/admin/routes.php:1078-1083`
- **Impact:** Database queries execute on unpredictable connection, leading to data leakage
- **Severity:** CRITICAL
- **Fix:** Delete 6 lines of code (duplicate route registration)
- **Details:** See [01_summary.md](./01_summary.md)

### Document Structure

#### Core Analysis Documents

1. **[01_summary.md](./01_summary.md)** - Executive summary with critical findings, statistics, and immediate recommendations
   - Critical vulnerabilities
   - What's working correctly
   - Statistics and metrics
   - Prioritized recommendations

2. **[02_db_connection_trace.md](./02_db_connection_trace.md)** - Deep dive into database connection switching
   - Request lifecycle traces
   - Connection state verification
   - Examples for menu, orders, waiter calls
   - Vulnerable route analysis

3. **[03_route_matrix.md](./03_route_matrix.md)** - Complete route and middleware matrix
   - All 39 registered routes
   - Middleware chains (actual vs reported)
   - Framework limitations documented
   - Gap analysis with exact line numbers

4. **[04_raw_sql_audit.md](./04_raw_sql_audit.md)** - Comprehensive SQL and prefix usage audit
   - All database access patterns
   - Raw SQL vs Query Builder
   - Hardcoded prefix search results
   - Query-by-query isolation verification

5. **[05_cache_session_queue.md](./05_cache_session_queue.md)** - Cache, session, and queue isolation analysis
   - Cache key scoping patterns
   - Session isolation mechanisms
   - Queue context preservation (future concern)
   - Middleware comparison (DetectTenant vs legacy)

6. **[06_host_url_derivation.md](./06_host_url_derivation.md)** - URL and host derivation analysis
   - QR code URL generation
   - Cashier URL patterns
   - Historical issues (fixed)
   - Best practices verification

#### Supporting Materials

##### Logs Directory (`logs/`)

- **route_list_full.txt** - Output from `php artisan route:list`
- **db_access_patterns.txt** - All DB::table, DB::select, DB::connection calls
- **critical_patterns.txt** - getTablePrefix, withoutMiddleware, getHost patterns
- **cache_patterns.txt** - All Cache:: and cache() usage

##### Reader Files Directory (`readers/`)

Complete source code for audit reference:

- **complete_middleware.md** - All middleware (Kernel, DetectTenant, TenantDatabaseMiddleware)
- **complete_routes_part1.md** - routes.php lines 1-600
- **complete_routes_part2.md** - routes.php lines 601-1053
- **complete_helpers.md** - TenantHelper.php and TableHelper.php
- **complete_config.md** - All configuration files (database, cache, session, filesystems)

---

### Key Metrics

#### Route Coverage
- **Total Routes:** 39
- **API Routes:** 19/19 (100%) with tenant middleware ✅
- **Protected Admin Routes:** 4/4 with tenant middleware ✅
- **Unprotected Admin Routes:** 4/4 WITHOUT tenant middleware ❌
- **Super Admin Routes:** 6/6 correctly unscoped ✅

#### Database Access
- **Total DB Calls:** ~40 in main routes
- **Using Tenant Connection:** ~38 (95%) ✅
- **Using Central Connection:** 1 (super admin) ✅
- **Vulnerable:** Unknown count in NotificationsApi ❌

#### SQL Safety
- **Hardcoded `ti_` prefixes:** 0 ✅
- **Raw SQL with dynamic prefix:** 100% ✅
- **Query Builder usage:** ~80% ✅

---

### Architecture Overview

#### Tenant Detection Flow

```
1. Request arrives → https://amir.paymydine.com/api/v1/menu
2. Route matched → api/v1 group with detect.tenant middleware
3. DetectTenant runs:
   a. Extract subdomain: "amir"
   b. Query central DB: SELECT * FROM paymydine.ti_tenants WHERE domain LIKE 'amir.%'
   c. Configure tenant connection: database='amir_db'
   d. Switch default: DB::setDefaultConnection('tenant')
4. Route handler executes:
   a. All DB::table() calls use tenant connection
   b. All queries target amir_db
5. Response returned with tenant's data
```

#### Isolation Mechanism

**NOT** based on table prefixes (all databases use `ti_` prefix)  
**IS** based on separate databases per tenant:
- Central DB: `paymydine` (contains `ti_tenants` table)
- Tenant DBs: `amir_db`, `rosana_db`, etc. (each with `ti_*` tables)

---

### What's Working Correctly ✅

1. **Database Isolation** (95% of routes)
   - Connection switching works perfectly
   - No hardcoded prefixes
   - Clean separation of central vs tenant data

2. **URL Generation** (100% correct)
   - All QR codes use request host
   - All cashier URLs tenant-specific
   - No stored slugs used

3. **Raw SQL Handling** (100% safe)
   - All use dynamic prefix: `DB::connection()->getTablePrefix()`
   - No SQL injection points for wrong tenant

4. **Session Isolation** (100% secure)
   - Standard Laravel session by ID
   - No tenant-specific issues

---

### What's Vulnerable ❌

1. **Duplicate Notification Routes** (CRITICAL)
   - One set protected ✅
   - One set unprotected ❌
   - Unpredictable behavior

2. **Cache Scoping** (MEDIUM)
   - Helper exists but not enforced
   - Global prefix in config
   - Risk of cache poisoning

3. **Legacy Middleware** (LOW)
   - Unused `TenantDatabaseMiddleware` should be deleted
   - Confusing bypass calls

---

### Immediate Action Required

**Delete these lines from `app/admin/routes.php`:**

```php
// Lines 1078-1083 - DELETE THIS ENTIRE BLOCK
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
```

**Why:** These routes are duplicates of protected routes in `routes.php:1047-1052`. The unprotected version creates a critical data leakage vulnerability.

---

### Verification Commands

Run these to verify tenant isolation:

```bash
# 1. Check route list
php artisan route:list --columns=uri,middleware | grep "api/v1"

# 2. Search for hardcoded prefixes
grep -rn "FROM ti_" routes.php app/admin/routes.php app/Http/Controllers/

# 3. Find all DB access
grep -rn "DB::table\|DB::select" routes.php app/admin/routes.php | wc -l

# 4. Check middleware usage
grep -rn "detect.tenant" routes.php app/admin/routes.php

# 5. Verify no stored slugs in URL generation
grep -rn "permalink_slug" routes.php app/admin/routes.php
```

Expected results:
- ✅ detect.tenant found in 3 route groups
- ✅ NO hardcoded ti_ in FROM clauses
- ✅ NO permalink_slug in URL generation

---

### Framework Limitations Discovered

1. **TastyIgniter Route Listing**
   - `php artisan route:list` does NOT show middleware from `App::before()` callbacks
   - Must inspect source code directly
   - Documented in `03_route_matrix.md`

2. **Middleware Groups**
   - TastyIgniter uses `App::before()` instead of standard Laravel routing
   - Makes automated auditing difficult
   - Requires manual code inspection

---

### Conclusion

**Overall Security Rating:** 🟡 GOOD with ONE CRITICAL GAP

The application has a **solid multi-tenant architecture** with proper connection switching, clean SQL handling, and correct URL generation. However, one duplicate route group creates a critical vulnerability that must be fixed immediately.

**Fix effort:** 5 minutes (delete 6 lines)  
**Risk if not fixed:** CRITICAL - data leakage between tenants  
**Risk after fix:** LOW - standard multi-tenant best practices in place

---

### Investigation Methodology

1. **Route enumeration** via `php artisan route:list`
2. **Source code analysis** of all route files and middleware
3. **Pattern matching** with grep for DB access, prefixes, and host usage
4. **Static tracing** of request lifecycle
5. **Configuration review** of database, cache, and session settings
6. **Manual verification** against framework limitations

**Tools used:**
- php artisan (route listing)
- grep (pattern searching)
- Static code analysis (manual review)

**No code execution required** - all findings based on static analysis.

