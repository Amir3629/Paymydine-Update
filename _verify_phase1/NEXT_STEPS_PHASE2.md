# Phase 2 Plan: Lightweight Isolation Boosts

**Status**: PLANNING ONLY - No code changes yet  
**Prerequisite**: Phase 1 must be approved and green

---

## Overview

Phase 2 addresses infrastructure-level tenant isolation issues identified in the investigation:
1. **Cache scoping** - Prevent cross-tenant cache poisoning
2. **Session safety** - Validate sessions belong to current tenant
3. **Filesystem isolation** - Separate file storage per tenant
4. **Queue tenant context** - Preserve tenant context in queued jobs

---

## 1. Cache Scoping

### Problem

All tenants share the same cache prefix (`tenant_default_cache`), causing:
- Cross-tenant data leakage
- Cache poisoning attacks
- Performance issues (wrong cache hits)

**Evidence**: `config/cache.php:98` - Static prefix

### Proposed Solution

Add cache prefix scoping in `DetectTenant` middleware after tenant is detected.

**File to modify**: `app/Http/Middleware/DetectTenant.php`

**Code snippet** (add after line 49):

```php
// Set tenant as default connection for this request
Config::set('database.default', 'tenant');
DB::setDefaultConnection('tenant');

// ⚠️ ADDITION: Scope cache by tenant
Config::set('cache.prefix', "tenant_{$tenant->id}_cache");

// Store tenant info in request and app container
$request->attributes->set('tenant', $tenant);
app()->instance('tenant', $tenant);
```

**Alternative approach** (if cache needs to be purged/reconnected):

```php
// Scope cache by tenant and reset cache manager
Config::set('cache.prefix', "tenant_{$tenant->id}_cache");
app()->forgetInstance('cache');
app()->forgetInstance('cache.store');
```

### Risk Assessment

**Risk Level**: Low-Medium

**Potential issues**:
- Cache hit rate may decrease initially (each tenant has fresh cache)
- Storage usage increases (caches are separate, no sharing)
- Need to ensure cache is cleared properly on tenant switch

**Mitigation**:
- Test with multiple tenant requests in quick succession
- Monitor cache storage space
- Consider cache expiration policies

**Testing**:
```php
// Test case
// 1. Cache data in Tenant A
// 2. Switch to Tenant B
// 3. Verify Tenant B doesn't see Tenant A's cache
```

---

## 2. Session Safety

### Problem

Sessions not validated to belong to current tenant:
- Session fixation possible
- Admin sessions may leak across subdomains
- No tenant ID check in session data

**Evidence**: `config/session.php` - No tenant-aware configuration

### Proposed Solution Option A: Tenant ID Validation

**File to modify**: `app/Http/Middleware/DetectTenant.php`

**Code snippet** (add after setting tenant in app container):

```php
// Store tenant info in request and app container
$request->attributes->set('tenant', $tenant);
app()->instance('tenant', $tenant);

// ⚠️ ADDITION: Validate or set session tenant
if (session()->has('tenant_id')) {
    // Validate existing session belongs to this tenant
    if (session('tenant_id') !== $tenant->id) {
        Log::warning("Session tenant mismatch", [
            'session_tenant' => session('tenant_id'),
            'detected_tenant' => $tenant->id,
            'subdomain' => $subdomain
        ]);
        session()->flush();
        session(['tenant_id' => $tenant->id]);
    }
} else {
    // First request, set tenant in session
    session(['tenant_id' => $tenant->id]);
}
```

### Proposed Solution Option B: Subdomain-Scoped Cookies

**File to modify**: `app/Http/Middleware/DetectTenant.php`

**Code snippet** (add after storing tenant):

```php
// ⚠️ ADDITION: Scope session cookie to subdomain
Config::set('session.domain', $tenant->domain);
```

**Note**: This requires session to be re-initialized, which is complex. Option A is safer.

### Recommended Approach

Use **Option A** (tenant ID validation) first. Add **Option B** (subdomain cookies) only if needed.

### Risk Assessment

**Risk Level**: Medium

**Potential issues**:
- May log out users unexpectedly if session tenant doesn't match
- Session flush on mismatch could break workflows
- Need to handle edge cases (subdomain changes, tenant transfers)

**Mitigation**:
- Log warnings before flushing sessions
- Provide user-friendly error messages
- Test thoroughly with admin panel logins

**Testing**:
```php
// Test cases
// 1. Login to Tenant A, verify session has tenant_id
// 2. Try to access Tenant B with same session
// 3. Verify session is flushed and new tenant_id is set
```

---

## 3. Filesystem Isolation

### Problem

All tenants share filesystem directories:
- `storage/app` (local disk)
- `assets/media` (media disk)
- `storage/app/public` (public disk)

Causes:
- Filename collisions
- Potential unauthorized cross-tenant file access
- No automatic cleanup when tenant is deleted

**Evidence**: `config/filesystems.php:46-61` - Shared paths

### Proposed Solution

Dynamically set disk roots based on tenant ID.

**File to modify**: `app/Http/Middleware/DetectTenant.php` or a new middleware

**Code snippet** (add after storing tenant):

```php
// ⚠️ ADDITION: Isolate filesystems by tenant
Config::set('filesystems.disks.local.root', storage_path("app/tenant_{$tenant->id}"));
Config::set('filesystems.disks.media.root', assets_path("media/tenant_{$tenant->id}"));
Config::set('filesystems.disks.public.root', storage_path("app/public/tenant_{$tenant->id}"));

// Optionally update public URL
Config::set('filesystems.disks.public.url', env('APP_URL')."/storage/tenant_{$tenant->id}");
```

**Note**: Requires creation of tenant-specific directories and migration of existing files.

### Migration Plan

1. **Before deploying**:
   - Create directories: `storage/app/tenant_{id}` for each tenant
   - Move existing files to tenant-specific directories
   - Update database references if paths are stored

2. **After deploying**:
   - Test file uploads in each tenant
   - Verify media serving works
   - Check public files are accessible

### Risk Assessment

**Risk Level**: High (requires data migration)

**Potential issues**:
- Existing files not accessible until migrated
- Database may have hardcoded paths
- Public symlinks may break
- Storage usage increases (no file sharing)

**Mitigation**:
- Migrate files before enabling filesystem isolation
- Create migration script to copy files to tenant directories
- Test extensively in staging environment
- Keep backups

**Recommendation**: **Defer to Phase 3** - Too risky for Phase 2

---

## 4. Queue Tenant Context

### Problem

If queues are used, tenant context is not preserved:
- Jobs dispatched in tenant context may run in central DB context
- Worker doesn't know which DB to connect to

**Evidence**: `config/queue.php:18` - Default driver is `sync` (no queue)

### Current Status

Since default queue driver is `sync`, jobs run immediately in same request context. **No queue isolation needed yet**.

### If Queues Are Introduced Later

**Approach 1**: Store tenant ID in job payload

```php
class ProcessOrder implements ShouldQueue
{
    public $tenantId;
    public $orderId;

    public function __construct($orderId)
    {
        $this->orderId = $orderId;
        $this->tenantId = app('tenant') ? app('tenant')->id : null;
    }

    public function handle()
    {
        if ($this->tenantId) {
            // Lookup tenant and switch connection
            $tenant = DB::connection('mysql')->table('ti_tenants')
                ->where('id', $this->tenantId)->first();
            
            if ($tenant) {
                Config::set('database.connections.tenant.database', $tenant->database);
                // ... set host, port, etc.
                DB::setDefaultConnection('tenant');
            }
        }
        
        // Process order
    }
}
```

**Approach 2**: Use separate queue per tenant

```php
// When dispatching
dispatch(new ProcessOrder($orderId))->onQueue("tenant_{$tenant->id}");

// Worker command
php artisan queue:work --queue=tenant_123
```

### Recommendation

**Document the pattern only**. No code changes needed until queues are actually used.

---

## Phase 2 Implementation Order

### Recommended Sequence

1. **Cache scoping** (Low risk, high value)
   - Add cache prefix scoping to DetectTenant middleware
   - Test with multiple tenants
   - Monitor cache hit rates

2. **Session safety** (Medium risk, high security value)
   - Add tenant ID validation to DetectTenant middleware
   - Test admin panel logins across tenants
   - Monitor logs for session mismatches

3. **Filesystem isolation** (High risk - **defer to Phase 3**)
   - Too complex for Phase 2
   - Requires data migration
   - Needs extensive testing

4. **Queue context** (Not needed - **document only**)
   - No queues in use currently
   - Document pattern for future

### Phase 2 Deliverables

**If approved**:
1. Modified `app/Http/Middleware/DetectTenant.php` with:
   - Cache prefix scoping
   - Session tenant validation
2. Tests for cache and session isolation
3. Documentation of changes
4. Migration guide

---

## Files to Modify (Phase 2)

| File | Changes | Risk |
|------|---------|------|
| `app/Http/Middleware/DetectTenant.php` | Add cache prefix scoping | Low |
| `app/Http/Middleware/DetectTenant.php` | Add session tenant validation | Medium |

**Total files**: 1  
**Total additions**: ~15-20 lines of code

---

## Testing Plan (Phase 2)

### Cache Isolation Tests

```php
// Test 1: Cache isolation
Route::get('/test/cache/set/{key}/{value}', function ($key, $value) {
    Cache::put($key, $value, 60);
    return ['set' => $key, 'value' => $value, 'tenant' => app('tenant')->id];
});

Route::get('/test/cache/get/{key}', function ($key) {
    return ['key' => $key, 'value' => Cache::get($key), 'tenant' => app('tenant')->id];
});

// Test steps:
// 1. Tenant A: /test/cache/set/foo/bar-A
// 2. Tenant B: /test/cache/set/foo/bar-B
// 3. Tenant A: /test/cache/get/foo -> Should return 'bar-A', not 'bar-B'
// 4. Tenant B: /test/cache/get/foo -> Should return 'bar-B', not 'bar-A'
```

### Session Validation Tests

```php
// Test 1: Session tenant validation
Route::get('/test/session/check', function () {
    return [
        'session_tenant' => session('tenant_id'),
        'detected_tenant' => app('tenant')->id,
        'match' => session('tenant_id') === app('tenant')->id
    ];
});

// Test steps:
// 1. Login to Tenant A admin panel
// 2. Check /test/session/check -> session_tenant should equal detected_tenant
// 3. Change Host header to Tenant B
// 4. Check /test/session/check -> session should be flushed, new tenant_id set
```

---

## Risk Summary

| Component | Risk | Complexity | Value | Recommend |
|-----------|------|------------|-------|-----------|
| Cache scoping | Low | Low | High | ✅ Phase 2 |
| Session safety | Medium | Low | High | ✅ Phase 2 |
| Filesystem isolation | High | High | Medium | ❌ Defer to Phase 3 |
| Queue context | N/A | Medium | Low | ❌ Document only |

---

## Approval Checklist

Before proceeding with Phase 2:

- [ ] Phase 1 changes verified and working
- [ ] Manual tenant isolation tests passing
- [ ] No regression in admin panel or API functionality
- [ ] Review and approve Phase 2 plan
- [ ] Staging environment available for testing
- [ ] Rollback plan documented

---

## Questions for Review

1. **Cache scoping**: Should we use `tenant_{$tenant->id}_cache` or another format for cache prefix?
2. **Session validation**: Should we flush sessions on mismatch, or just update tenant_id?
3. **Filesystem**: Should we include filesystem isolation in Phase 2, or defer to Phase 3?
4. **Monitoring**: What metrics should we track post-deployment (cache hit rate, session flushes, etc.)?

---

**End of Phase 2 Plan**

Awaiting approval to proceed with implementation.

