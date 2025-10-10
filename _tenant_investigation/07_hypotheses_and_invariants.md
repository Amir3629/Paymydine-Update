# Hypotheses and Invariants

This document lists the invariants that must hold for correct tenant isolation, and hypotheses about differences that might affect isolation behavior.

---

## Part 1: Tenant Isolation Invariants

These conditions **must always be true** for proper tenant isolation:

### Database Isolation

**INV-DB-1**: Each tenant's data resides in a separate database or is logically separated by tenant_id in a shared database.

**Evidence**: 
- Tenant registry (`ti_tenants`) stores `database` column pointing to separate databases
- Current system uses separate-database-per-tenant approach

**Status**: ✅ **Holds** (as designed)

---

**INV-DB-2**: Queries executed in tenant context MUST use the tenant's database connection, not the central database.

**Evidence**:
- `DetectTenant` middleware sets default connection to `tenant`
- Routes with `detect.tenant` middleware should query tenant DB

**Status**: ⚠️ **Conditionally holds**
- Holds IF `detect.tenant` middleware is applied
- Does NOT hold on routes without tenant middleware

---

**INV-DB-3**: Central database operations (tenant registry, superadmin) MUST explicitly use `DB::connection('mysql')` or run on routes that bypass tenant middleware.

**Evidence**:
- Superadmin routes use `withoutMiddleware(TenantDatabaseMiddleware)`
- Tenant management queries use `DB::connection('mysql')->table('ti_tenants')`

**Status**: ✅ **Holds** (explicit pattern enforced)

---

**INV-DB-4**: Table prefixes MUST be consistent within a tenant database and match the configured prefix.

**Evidence**:
- Both `mysql` and `tenant` connections configured with `ti_` prefix
- Raw SQL has hardcoded `ti_` prefixes

**Status**: ⚠️ **Fragile**
- Holds IF all tenant DBs use `ti_` prefix
- Breaks if any tenant uses different prefix
- Not enforced, just assumed

---

### Connection Switching

**INV-CONN-1**: After tenant detection middleware runs, the default database connection MUST point to the detected tenant's database.

**Evidence**:
- `DetectTenant`: Sets `Config::set('database.default', 'tenant')`
- `DetectTenant`: Calls `DB::setDefaultConnection('tenant')`

**Status**: ✅ **Holds** (in current DetectTenant, not in old version)

---

**INV-CONN-2**: Tenant detection MUST occur before any database queries in tenant-scoped routes.

**Evidence**:
- Middleware runs before route handlers
- Tenant middleware should be early in stack

**Status**: ⚠️ **Depends on middleware order**
- If `detect.tenant` is in route group, runs after global middleware
- If global middleware queries DB before tenant detection, breaks isolation

---

**INV-CONN-3**: Switching to a tenant connection MUST purge stale connections to prevent cross-tenant leakage.

**Evidence**:
- Current `DetectTenant`: Calls `DB::purge('tenant')` and `DB::reconnect('tenant')`
- Old `DetectTenant`: Does NOT purge

**Status**: 
- ✅ **Holds** in current version
- ❌ **Does NOT hold** in old version (connection pool pollution risk)

---

### Route Middleware

**INV-ROUTE-1**: All API routes that access tenant data MUST have tenant detection middleware applied.

**Evidence**:
- Current `routes.php`: api/v1 custom routes have `'detect.tenant'` middleware
- Current `app/admin/routes.php`: api/v1 routes have NO tenant middleware
- Old `routes.php`: api/v1 routes have NO tenant middleware

**Status**: ⚠️ **Inconsistent**
- Holds in current `routes.php`
- Does NOT hold in current `app/admin/routes.php` or old `routes.php`

---

**INV-ROUTE-2**: Superadmin routes that manage tenant registry MUST bypass tenant middleware.

**Evidence**:
- All superadmin routes use `->withoutMiddleware(TenantDatabaseMiddleware)`

**Status**: ✅ **Holds**

---

**INV-ROUTE-3**: Admin panel routes MUST query the tenant database of the subdomain they're accessed from.

**Evidence**:
- Admin group has `['web']` middleware only
- No explicit tenant middleware on admin group
- Must rely on global middleware or internal switching

**Status**: ❓ **Unclear** (depends on global middleware registration)

---

### Cache & Session Isolation

**INV-CACHE-1**: Cache keys MUST be scoped by tenant to prevent cross-tenant data leakage.

**Evidence**:
- Cache prefix: `'tenant_default_cache'` (static, same for all tenants)

**Status**: ❌ **Does NOT hold**
- All tenants share cache prefix
- Cache collision possible

---

**INV-SESSION-1**: Sessions MUST be validated to belong to the current tenant.

**Evidence**:
- No tenant_id stored or validated in session
- Session cookie not scoped by subdomain

**Status**: ❌ **Does NOT hold**
- Session fixation possible
- Admin sessions not validated against tenant

---

### Storage Isolation

**INV-STORAGE-1**: Uploaded files MUST be stored in tenant-specific directories or include tenant identifiers.

**Evidence**:
- All tenants share `storage/app`, `assets/media`, `storage/app/public`
- No path prefixing by tenant

**Status**: ❌ **Does NOT hold**
- File collisions possible
- Cross-tenant file access possible

---

## Part 2: Hypotheses on Behavioral Differences

These are non-judgmental hypotheses about how differences between versions might alter tenant isolation.

### Hypothesis 1: API Route Middleware Change

**Observation**: 
- Old `routes.php`: api/v1 routes have `['web']` middleware
- Current `routes.php`: api/v1 routes have `['web', 'detect.tenant']` middleware

**Hypothesis**: 
- Old version: API routes query central DB (or default DB if global middleware exists)
- Current version: API routes query tenant DB based on subdomain/headers
- **Impact**: Breaking change for API clients that expect central DB access

**Test to verify**:
1. Access `/api/v1/menu` without subdomain in old version
2. Access `/api/v1/menu` without subdomain in current version
3. Compare which database is queried

**Expected result**:
- Old: Queries default DB (likely central)
- Current: Returns 404 or error (no tenant detected)

---

### Hypothesis 2: Dual Route Files Conflict

**Observation**:
- Current version has TWO route files defining api/v1 routes:
  - `routes.php`: api/v1 WITH `detect.tenant`
  - `app/admin/routes.php`: api/v1 WITHOUT `detect.tenant`
- Old version has minimal `app/admin/routes.php`

**Hypothesis**:
- If both files load, routes conflict
- Last-loaded file wins (likely `app/admin/routes.php` if loaded by Admin ServiceProvider)
- **Impact**: `detect.tenant` middleware may be bypassed even though `routes.php` specifies it

**Test to verify**:
1. Check load order: Does `routes.php` or `app/admin/routes.php` load first?
2. Access `/api/v1/menu` and inspect which middleware stack runs
3. Check if tenant DB is switched

**Expected result**:
- IF `app/admin/routes.php` loads last: NO tenant middleware (routes overridden)
- IF `routes.php` loads last: HAS tenant middleware

---

### Hypothesis 3: Global Middleware Application

**Observation**:
- Extensive use of `->withoutMiddleware(TenantDatabaseMiddleware)` implies global middleware
- No global middleware visible in `app/Http/Kernel.php`
- Must be registered elsewhere (ServiceProvider or TastyIgniter core)

**Hypothesis**:
- TenantDatabaseMiddleware is applied globally by Admin ServiceProvider or TastyIgniter core
- This explains why superadmin routes need to opt out
- **Impact**: ALL routes get tenant middleware by default, including routes that shouldn't

**Test to verify**:
1. Search for `TenantDatabaseMiddleware` in service providers
2. Check TastyIgniter core for global middleware registration
3. Inspect middleware stack on various routes

**Expected result**:
- Find global middleware registration in Admin\ServiceProvider or core

---

### Hypothesis 4: DetectTenant Enhancements Break Old Setups

**Observation**:
- Old `DetectTenant`: Only sets database name, no purge/reconnect
- Current `DetectTenant`: Sets host/port/user/pass, purges, reconnects

**Hypothesis**:
- Old version assumes all tenants on same DB server with same credentials
- Current version supports multi-server tenancy
- **Impact**: Migration from old to current requires tenant registry to have host/port/user/pass columns

**Test to verify**:
1. Check `ti_tenants` table schema - does it have `db_host`, `db_port`, `db_user`, `db_pass` columns?
2. If columns exist, migration already occurred
3. If columns missing, current code will use defaults

**Expected result**:
- Columns exist in current DB schema
- Old DB schema may not have these columns

---

### Hypothesis 5: TenantDatabaseMiddleware vs DetectTenant

**Observation**:
- Both middleware exist and switch connections
- `TenantDatabaseMiddleware`: Overwrites `mysql` connection
- `DetectTenant`: Creates separate `tenant` connection
- Routes use one or the other via middleware bypass

**Hypothesis**:
- Two different tenant isolation strategies exist in codebase
- `TenantDatabaseMiddleware`: Legacy approach (destructive)
- `DetectTenant`: New approach (non-destructive)
- **Impact**: Mixing the two can cause confusion and connection state issues

**Test to verify**:
1. Find where each middleware is actually used
2. Check if any routes apply both (would be bad)
3. Determine which is preferred

**Expected result**:
- `TenantDatabaseMiddleware` is legacy, being phased out
- `DetectTenant` is current standard
- `withoutMiddleware(TenantDatabaseMiddleware)` suggests it's globally applied (legacy)

---

### Hypothesis 6: Cache Prefix Not Tenant-Aware

**Observation**:
- Cache prefix is static: `'tenant_default_cache'`
- Not dynamically set based on tenant

**Hypothesis**:
- All tenants share the same cache namespace
- Cache keys collide across tenants
- **Impact**: 
  - Tenant A caches data, Tenant B reads it (data leakage)
  - Performance degradation (cache hits from wrong tenant)

**Test to verify**:
1. Cache something in Tenant A's context
2. Access same cache key in Tenant B's context
3. Check if data is shared

**Expected result**:
- Data IS shared (cache not isolated)

---

### Hypothesis 7: Session Cookie Domain Causes Leakage

**Observation**:
- Session cookie domain is `null` (defaults to current domain)
- Session cookie name is shared: `'tastyigniter_session'`

**Hypothesis**:
- IF cookie domain is set to `.paymydine.com`, cookie is shared across all subdomains
- Admin logged into `tenant-a.paymydine.com` has session valid on `tenant-b.paymydine.com`
- **Impact**: Session fixation, potential cross-tenant access

**Test to verify**:
1. Check actual session cookie domain in browser
2. Login as admin on Tenant A
3. Try accessing Tenant B admin panel with same session cookie

**Expected result**:
- IF domain is `.paymydine.com`: Session IS shared (vulnerability)
- IF domain is tenant-specific: Session NOT shared (safe)

---

### Hypothesis 8: Hardcoded Table Prefixes Assume `ti_`

**Observation**:
- 90%+ of raw SQL has hardcoded `ti_` prefix
- Query Builder auto-prefixes with configured prefix

**Hypothesis**:
- System only works if all tenant DBs use `ti_` prefix
- If any tenant imported from external system with different prefix, queries fail
- **Impact**: Limited portability, fragile multi-tenancy

**Test to verify**:
1. Create test tenant with `abc_` prefix
2. Try accessing that tenant's data
3. Check for query errors

**Expected result**:
- Queries fail due to table not found (looking for `ti_menu`, but table is `abc_menu`)

---

### Hypothesis 9: Order Helper Routes Incorrectly Bypass Tenant Middleware

**Observation**:
- Routes like `/orders/save-table-layout` and `/orders/get-table-qr-url` use `withoutMiddleware(TenantDatabaseMiddleware)`
- These routes seem to deal with tenant-specific data (tables, QR codes)

**Hypothesis**:
- These routes are bugs - should NOT bypass tenant middleware
- OR: They're only used in superadmin context and work differently than expected
- **Impact**: May access wrong tenant's data or fail to find data

**Test to verify**:
1. Access these routes as tenant admin
2. Check which database connection is used
3. Verify data returned is for correct tenant

**Expected result**:
- IF buggy: Uses central DB, returns wrong data
- IF correct: Uses explicit DB connection lookup based on request params

---

### Hypothesis 10: Admin Panel Relies on Hidden Global Middleware

**Observation**:
- Admin group routes have NO explicit tenant middleware
- Admin panel must access tenant database
- Must be via hidden mechanism

**Hypothesis**:
- TastyIgniter's `System\Classes\Controller@runAdmin` internally handles tenant detection
- OR: Global middleware applies before route groups
- OR: Admin authentication system switches connection
- **Impact**: Tenant isolation relies on hidden logic, not visible in routes file

**Test to verify**:
1. Read `System\Classes\Controller` source code
2. Check for connection switching logic
3. Verify admin panel accesses correct tenant DB

**Expected result**:
- Find connection switching in controller or auth middleware

---

## Part 3: Critical Questions to Answer

Based on the hypotheses above, these questions need answers:

### Q1: Which Route File Loads?
- Does `routes.php` load, or `app/admin/routes.php`, or both?
- If both, what's the load order?
- Do routes override each other?

### Q2: Where is Global Middleware Applied?
- Is `TenantDatabaseMiddleware` applied globally?
- Where is it registered (ServiceProvider, HTTP Kernel, TastyIgniter core)?
- Why do superadmin routes need `withoutMiddleware()` if it's not global?

### Q3: Which Middleware is Preferred?
- Should new code use `DetectTenant` or `TenantDatabaseMiddleware`?
- Why do both exist?
- Is one being phased out?

### Q4: How Does Admin Panel Detect Tenant?
- Does `System\Classes\Controller@runAdmin` switch connections?
- Or does admin rely on global middleware?
- Or does admin auth system handle it?

### Q5: Are Old Helper Routes Buggy?
- Should `/orders/save-table-layout` and `/orders/get-table-qr-url` have tenant middleware?
- Or are they superadmin-only?
- Why do they bypass middleware?

---

## Part 4: Recommendations for Invariant Enforcement

### Database Isolation
✅ **Working**: Separate databases per tenant  
⚠️ **Fix**: Add validation that prefix matches across all tenant DBs  
⚠️ **Fix**: Refactor raw SQL to use dynamic prefixing

### Connection Switching
✅ **Working**: Current `DetectTenant` purges and reconnects  
❌ **Fix**: Old version needs upgrade to purge connections  
⚠️ **Fix**: Document middleware load order

### Route Middleware
❌ **Fix**: Resolve `routes.php` vs `app/admin/routes.php` conflict  
⚠️ **Fix**: Standardize all API routes to use `detect.tenant`  
⚠️ **Fix**: Document which routes need tenant middleware

### Cache & Session
❌ **Fix**: Dynamic cache prefix based on tenant ID  
❌ **Fix**: Subdomain-scoped session cookies  
❌ **Fix**: Tenant validation in session data

### Storage
❌ **Fix**: Tenant-prefixed storage paths  
⚠️ **Fix**: S3 path prefixing for cloud storage

---

## Part 5: Test Scenarios for Verification

### Test 1: Tenant Isolation
1. Create two tenants (A and B)
2. Add menu item "Item A" to Tenant A
3. Access Tenant B's API
4. **Expected**: Only Tenant B's menu items, not "Item A"
5. **Actual**: ? (run test to verify)

### Test 2: Cache Isolation
1. Cache value "test_value" with key "test" in Tenant A
2. Read cache key "test" from Tenant B
3. **Expected**: Cache miss or Tenant B's value
4. **Actual**: ? (likely gets Tenant A's value - bug)

### Test 3: API Route Middleware
1. Access `/api/v1/menu` from `tenant-a.paymydine.com`
2. Inspect middleware stack
3. **Expected**: `detect.tenant` middleware runs
4. **Actual**: ? (depends on which route file loads)

### Test 4: Superadmin Access
1. Login as superadmin
2. Access `/new` (create tenant page)
3. **Expected**: Uses central DB, sees all tenants
4. **Actual**: ? (should work due to `withoutMiddleware()`)

### Test 5: Connection Purge
1. Access Tenant A's API
2. Check connection pool
3. Access Tenant B's API
4. **Expected**: Tenant A's connection is purged
5. **Actual**: ? (current version should purge, old might not)

---

## Summary

### Invariants Status
- **5 hold** ✅
- **3 conditionally hold** ⚠️
- **5 do NOT hold** ❌
- **1 unclear** ❓

### Critical Issues Found
1. ❌ Cache not isolated by tenant
2. ❌ Sessions not validated by tenant
3. ❌ Storage not isolated by tenant
4. ⚠️ Inconsistent API route middleware (routes.php vs app/admin/routes.php)
5. ⚠️ Hardcoded table prefixes assume `ti_`

### Hypotheses to Test
- 10 hypotheses identified
- 5 critical questions to answer
- 5 test scenarios recommended

### Next Steps
1. Run test scenarios to verify hypotheses
2. Answer critical questions via code inspection
3. Fix identified invariant violations
4. Document expected behavior and invariants in code comments

