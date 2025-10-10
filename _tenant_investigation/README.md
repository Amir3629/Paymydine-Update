# PayMyDine Multi-Tenant Isolation Investigation

**Date**: October 10, 2025  
**Status**: Read-Only Analysis Completed  
**Objective**: Document and compare multi-tenant isolation mechanisms between current and old versions

---

## Executive Summary

This investigation analyzed how multi-tenant isolation is implemented in the PayMyDine application across two codebases:
- **Current version** (in main repo root)
- **Old version** (in `oldversionfiels/` directory)

### Key Findings

🔴 **Critical Issues Identified**:
1. **Inconsistent API route middleware** - Two route files define same routes with different middleware
2. **Cache not tenant-isolated** - All tenants share cache prefix
3. **Sessions not validated by tenant** - Session fixation possible
4. **Storage not tenant-isolated** - All tenants share filesystem directories
5. **Hardcoded table prefixes** in raw SQL - System fragile to prefix changes

⚠️ **Major Differences (Old → Current)**:
1. **API routes gained tenant middleware** - `routes.php` now has `'detect.tenant'` on api/v1 routes
2. **DetectTenant middleware enhanced** - Now supports multi-server tenancy with connection purging
3. **Route file duplication** - `app/admin/routes.php` expanded from 24 to 1,086 lines but lacks tenant middleware on API routes

✅ **Working Correctly**:
1. Database-level isolation (separate databases per tenant)
2. Superadmin bypass mechanism (routes explicitly opt out of tenant middleware)
3. Connection switching on tenant detection

---

## Investigation Scope

### Areas Analyzed

- ✅ **Routing**: Route groups, middleware stacks, admin vs API vs superadmin routes
- ✅ **Middleware**: Tenant detection logic, database connection switching
- ✅ **Database**: Connection configs, table prefixes, raw SQL usage
- ✅ **Storage**: Filesystem, media, cache, sessions, queues
- ✅ **Admin Panel**: Scoping behavior, authentication, authorization

### Areas NOT Modified
- ❌ No code changes made
- ❌ No migrations executed
- ❌ No environment files modified
- ❌ No vendor code touched

---

## Glossary

### Terms

**Tenant**  
A restaurant/customer instance with its own subdomain (e.g., `tenant-a.paymydine.com`) and separate database. Each tenant's data is logically or physically isolated from other tenants.

**Central DB**  
The main database (named `mysql` in connection config) that stores the tenant registry (`ti_tenants` table) and superadmin data. Not tenant-specific.

**Tenant DB**  
A database dedicated to a single tenant, containing their menus, orders, customers, etc. Name stored in central DB's `ti_tenants.database` column.

**Admin Group**  
Routes under `/admin/*` that serve the TastyIgniter admin panel. Used by tenant admins to manage their restaurant.

**Superadmin**  
Routes and functionality for managing the multi-tenant system itself: creating tenants, managing tenant databases, etc. Accesses central DB, not tenant DBs.

**API Routes**  
RESTful JSON endpoints under `/api/v1/*` that serve the frontend application (Next.js). Should be tenant-scoped.

**Middleware**  
Laravel middleware that runs before route handlers. Used for tenant detection, connection switching, authentication, etc.

**Connection Switching**  
The process of dynamically changing which database connection is used based on detected tenant. Done by middleware.

**Table Prefix**  
A string prepended to all table names (default: `ti_`). E.g., `menus` table becomes `ti_menus`. Both central and tenant DBs use same prefix.

**Route Group**  
A collection of routes that share common middleware, prefix, namespace, etc. Defined via `Route::group()`.

**withoutMiddleware()**  
Laravel method to exclude specific middleware from a route, even if it's applied globally or in a parent group.

### Middleware Aliases

**`detect.tenant`**  
Alias for `App\Http\Middleware\DetectTenant` - detects tenant from subdomain/headers, switches to separate tenant connection.

**`tenant.database`**  
Alias for `App\Http\Middleware\TenantDatabaseMiddleware` - detects tenant, but overwrites `mysql` connection (destructive approach).

**`superadmin.auth`**  
Custom auth middleware for superadmin routes (checks if user has superadmin privileges).

### Connections

**`mysql`**  
Default database connection, points to central DB initially. Can be overwritten by `TenantDatabaseMiddleware`.

**`tenant`**  
Separate database connection configured dynamically by `DetectTenant` middleware to point to a tenant's database.

---

## Document Index

### Core Analysis Documents

#### [01_route_and_middleware_matrix.md](./01_route_and_middleware_matrix.md)
Complete mapping of all route groups and their middleware stacks. Shows which routes have tenant isolation and which don't.

**Key Sections**:
- Current version route groups (admin, superadmin, API, custom API)
- Old version route groups
- Side-by-side comparison table
- Critical difference: `detect.tenant` middleware on api/v1 routes

---

#### [02_tenant_detection_and_db_switch.md](./02_tenant_detection_and_db_switch.md)
Deep dive into how tenants are detected and database connections are switched.

**Key Sections**:
- DetectTenant middleware logic (current vs old)
- TenantDatabaseMiddleware logic (both versions identical)
- Database configuration
- Connection switching flow
- Invariants and assumptions

**Critical Findings**:
- Old DetectTenant: No purge/reconnect, no multi-server support
- Current DetectTenant: Full connection config, purges, app container storage
- TenantDatabaseMiddleware: Destructive (overwrites `mysql` connection)

---

#### [03_raw_sql_and_prefix_audit.md](./03_raw_sql_and_prefix_audit.md)
Analysis of all raw SQL queries and table prefix usage.

**Key Sections**:
- Hardcoded `ti_` prefixes in raw SQL
- Dynamic prefix usage (rare)
- `DB::table()` auto-prefixing
- Inconsistent `ti_tenants` vs `tenants` references

**Risk Assessment**:
- 🔴 High: Hardcoded prefixes break if tenant uses different prefix
- 🔴 High: Inconsistent tenant table naming
- 🟡 Medium: Mixed Query Builder prefix usage

---

#### [04_storage_cache_session_queue.md](./04_storage_cache_session_queue.md)
Infrastructure-level isolation analysis: filesystems, cache, sessions, queues.

**Key Sections**:
- Filesystem configuration (all shared across tenants)
- Cache configuration (static prefix, not tenant-aware)
- Session configuration (not validated by tenant)
- Queue configuration (uses default connection)

**Risk Assessment**:
- 🔴 High: Cache not isolated (cross-tenant data leakage)
- 🟡 Medium: Filesystems not isolated (filename collisions, unauthorized access)
- 🟡 Medium: Sessions not validated (fixation risk)
- 🟢 Low: Queues (default is sync, low usage)

---

#### [05_admin_panel_scoping.md](./05_admin_panel_scoping.md)
How admin panel routes determine tenant context.

**Key Sections**:
- Admin group middleware (no explicit tenant middleware)
- Superadmin routes (explicitly bypass tenant middleware)
- Request flow diagrams
- Auth and authorization patterns

**Unanswered Questions**:
- Where is global middleware applied?
- How does admin panel detect tenant without explicit middleware?
- Are order helper routes buggy (why do they bypass tenant middleware)?

---

#### [06_side_by_side_diffs.md](./06_side_by_side_diffs.md)
File-by-file comparison of key differences between versions.

**Files Compared**:
- routes.php (current vs old)
- app/admin/routes.php (current vs old)
- DetectTenant.php (current vs old)
- TenantDatabaseMiddleware.php (identical)
- Kernel.php (identical)
- All config files (identical)

**Critical Differences**:
1. routes.php: api/v1 routes have `detect.tenant` in current, not in old
2. DetectTenant.php: Enhanced in current with purge, reconnect, multi-server support
3. app/admin/routes.php: Expanded from 24 to 1,086 lines, but api/v1 routes lack `detect.tenant`

---

#### [07_hypotheses_and_invariants.md](./07_hypotheses_and_invariants.md)
Invariants that must hold for isolation, and hypotheses about behavioral differences.

**Invariants Status**:
- ✅ 5 hold
- ⚠️ 3 conditionally hold
- ❌ 5 do NOT hold
- ❓ 1 unclear

**Hypotheses**:
- 10 testable hypotheses about how differences affect behavior
- 5 critical questions to answer
- 5 test scenarios to verify isolation

---

### Quick Reference Files

#### [readers/current_middleware_and_routes.md](./readers/current_middleware_and_routes.md)
Concatenated excerpts from current version's route and middleware files for quick review.

#### [readers/old_middleware_and_routes.md](./readers/old_middleware_and_routes.md)
Concatenated excerpts from old version's route and middleware files for quick review.

---

## Evidence Logs

All grep and command outputs are stored in `logs/`:

### Route Information
- `logs/route_list_current.txt` - Output of `php artisan route:list` for current version
- `logs/route_list_old.txt` - Output of `php artisan route:list` for old version
- `logs/route_groups_current.txt` - Grep results for route groups in current version
- `logs/route_groups_old.txt` - Grep results for route groups in old version

### Middleware Usage
- `logs/middleware_current.txt` - All references to tenant middleware in current version
- `logs/middleware_old.txt` - All references to tenant middleware in old version

### Database Calls
- `logs/current_db_calls.txt` - All DB:: calls in current version (grep)
- `logs/old_db_calls.txt` - All DB:: calls in old version (grep)

### Raw SQL
- `logs/raw_sql_current.txt` - Raw SQL queries in current version (first 500 lines)
- `logs/raw_sql_old.txt` - Raw SQL queries in old version (first 500 lines)

---

## Critical Issues Detail

### 🔴 Issue 1: Inconsistent API Route Middleware

**Problem**: Two route files define the same api/v1 routes with different middleware.

**Evidence**:
- `routes.php:374-376` - Has `['web', 'detect.tenant']`
- `app/admin/routes.php:378-380` - Has `['web']` only

**Impact**:
- If `app/admin/routes.php` loads last, tenant detection is bypassed
- API routes would use default/central DB instead of tenant DB
- Data leakage across tenants

**Recommendation**:
1. Determine which file loads (check service provider or bootstrap)
2. Remove duplicate routes from one file, OR
3. Ensure both files have identical middleware

---

### 🔴 Issue 2: Cache Not Tenant-Isolated

**Problem**: All tenants share the same cache prefix.

**Evidence**:
- `config/cache.php:98` - `'prefix' => 'tenant_default_cache'` (static)

**Impact**:
- Tenant A caches `'menu_items'`, Tenant B reads it (gets Tenant A's data)
- Cross-tenant cache poisoning
- Performance issues (wrong cache hits)

**Recommendation**:
1. Dynamic cache prefix in middleware:
   ```php
   if ($tenant = app('tenant')) {
       Config::set('cache.prefix', "tenant_{$tenant->id}_cache");
   }
   ```
2. OR: Explicit tenant prefixing in all cache calls:
   ```php
   Cache::put("tenant_{$tenant->id}_{$key}", $value);
   ```

---

### 🔴 Issue 3: Sessions Not Validated by Tenant

**Problem**: No tenant ID validation in session data.

**Evidence**:
- `config/session.php` - No tenant-aware configuration
- Session cookie domain is `null` (may leak across subdomains)

**Impact**:
- Session fixation attacks
- Admin logged into Tenant A might access Tenant B if cookie is shared

**Recommendation**:
1. Subdomain-scoped session cookies:
   ```php
   Config::set('session.domain', $tenant->domain);
   ```
2. Tenant validation in session:
   ```php
   session(['tenant_id' => $tenant->id]);
   // On subsequent requests:
   if (session('tenant_id') !== $tenant->id) {
       session()->flush();
       abort(403);
   }
   ```

---

### 🔴 Issue 4: Storage Not Tenant-Isolated

**Problem**: All tenants share filesystem directories.

**Evidence**:
- `config/filesystems.php` - All disks point to shared paths
  - `local`: `storage/app`
  - `media`: `assets/media`
  - `public`: `storage/app/public`

**Impact**:
- Filename collisions
- Cross-tenant file access if paths are guessed
- No automatic cleanup when tenant is deleted

**Recommendation**:
1. Dynamic disk roots in middleware:
   ```php
   if ($tenant = app('tenant')) {
       Config::set('filesystems.disks.local.root', storage_path("app/tenant_{$tenant->id}"));
       Config::set('filesystems.disks.media.root', assets_path("media/tenant_{$tenant->id}"));
   }
   ```

---

### 🔴 Issue 5: Hardcoded Table Prefixes

**Problem**: Raw SQL has hardcoded `ti_` prefixes.

**Evidence**:
- `logs/raw_sql_current.txt` - 90%+ of queries have `FROM ti_menus`, `JOIN ti_categories`, etc.

**Impact**:
- System breaks if any tenant uses different prefix
- Not portable to other environments
- Migration from other systems difficult

**Recommendation**:
1. Refactor raw SQL to use Query Builder (auto-prefixes)
2. OR: Use `DB::getTablePrefix()` in raw SQL:
   ```php
   $prefix = DB::getTablePrefix();
   $query = "FROM {$prefix}menus ...";
   ```

---

## Migration Notes (Old → Current)

### Breaking Changes
1. **API routes now require tenant detection** - Old API routes worked without tenant context, current version requires it
2. **DetectTenant requires additional tenant table columns** - Must have `db_host`, `db_port`, `db_user`, `db_pass` columns

### Non-Breaking Changes
1. Admin routes (same pattern)
2. Superadmin routes (same pattern)
3. Config files (identical)

### Upgrade Path
1. Add columns to `ti_tenants` table: `db_host`, `db_port`, `db_user`, `db_pass`
2. Populate columns for existing tenants (defaults to central DB server)
3. Update API clients to send proper tenant headers or use subdomain
4. Test admin panel access on all tenant subdomains

---

## Recommendations Priority

### Immediate (P0) - Fix Before Production
1. ⚠️ **Resolve route file conflict** (`routes.php` vs `app/admin/routes.php`)
2. 🔴 **Dynamic cache prefix** based on tenant ID
3. 🔴 **Session tenant validation**

### High (P1) - Fix Soon
4. 🔴 **Filesystem tenant isolation** (path prefixing)
5. ⚠️ **Refactor hardcoded table prefixes** in most critical queries

### Medium (P2) - Plan for Next Sprint
6. ⚠️ **Audit and fix order helper routes** that bypass tenant middleware
7. ⚠️ **Consistent tenant table naming** (`ti_tenants` vs `tenants`)

### Low (P3) - Future Improvements
8. 🟢 **Queue tenant context** (if queues are used)
9. 🟢 **S3 path prefixing** (if using cloud storage)

---

## Next Steps

### For Immediate Action
1. **Verify which route file loads**: Check Laravel service providers and bootstrap process
2. **Test tenant isolation**: Run the 5 test scenarios from `07_hypotheses_and_invariants.md`
3. **Answer critical questions**: See Part 3 of `07_hypotheses_and_invariants.md`

### For Documentation
1. **Comment global middleware registration**: Where is `TenantDatabaseMiddleware` applied globally?
2. **Document expected behavior**: Add comments to route files explaining tenant isolation strategy
3. **Create tenant isolation tests**: Automated tests to verify invariants hold

### For Code Quality
1. **Standardize middleware usage**: Choose `DetectTenant` or `TenantDatabaseMiddleware`, deprecate the other
2. **Extract common queries**: Create repository classes for menu, category, order queries (avoid raw SQL duplication)
3. **Add schema validation**: Tests to verify `ti_tenants` table has expected columns

---

## Contacts & References

**Investigation Path**: `/Users/amir/Downloads/paymydine-main-22/_tenant_investigation/`

**Old Version Path**: `/Users/amir/Downloads/paymydine-main-22/oldversionfiels/`

**Tools Used**:
- `grep` for code search
- `php artisan route:list` for route inspection
- File comparison tools
- Manual code review

**Investigation Completed**: October 10, 2025

---

## Document Cross-References

- For route-specific questions → See `01_route_and_middleware_matrix.md`
- For middleware behavior → See `02_tenant_detection_and_db_switch.md`
- For database queries → See `03_raw_sql_and_prefix_audit.md`
- For infrastructure isolation → See `04_storage_cache_session_queue.md`
- For admin panel → See `05_admin_panel_scoping.md`
- For version differences → See `06_side_by_side_diffs.md`
- For testing and validation → See `07_hypotheses_and_invariants.md`

**Quick Reference**: `readers/` folder for condensed file contents
**Raw Evidence**: `logs/` folder for grep outputs and command results

