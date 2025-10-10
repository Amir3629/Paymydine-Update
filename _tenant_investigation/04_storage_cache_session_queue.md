# Storage, Cache, Session, and Queue Configuration

This document compares how storage, caching, sessions, and queues are configured for tenant isolation in both versions.

---

## Summary Comparison Table

| Component | Current Version | Old Version | Tenant-Aware? |
|-----------|----------------|-------------|---------------|
| **Filesystems - Local** | `storage/app` (shared) | Same | ❌ No |
| **Filesystems - Media** | `assets/media` (shared) | Same | ❌ No |
| **Filesystems - Public** | `storage/app/public` (shared) | Same | ❌ No |
| **Cache Driver** | File (shared directory) | Same | ❌ No |
| **Cache Prefix** | `'tenant_default_cache'` | Same | ⚠️ Static (not dynamic) |
| **Session Driver** | File (shared directory) | Same | ❌ No |
| **Session Cookie** | `tastyigniter_session` | Same | ❌ No isolation |
| **Queue Driver** | Sync (no queue) | Same | N/A |
| **Queue Failed Jobs** | Uses `mysql` connection | Same | ⚠️ Uses default connection |

**Overall Assessment**: ⚠️ **Minimal tenant isolation at infrastructure level**. Both versions share storage, cache, and session spaces across all tenants.

---

## Detailed Analysis

### 1. Filesystem Configuration

**File**: `config/filesystems.php` (identical in both versions)

#### Default Disk (Line 16)
```php
'default' => env('FILESYSTEM_DRIVER', 'local'),
```

#### Local Disk (Lines 46-49)
```php
'local' => [
    'driver' => 'local',
    'root' => storage_path('app'),  // storage/app
],
```

**Path**: `storage/app/`  
**Tenant Isolation**: ❌ **Shared across all tenants**

**Impact**:
- Files uploaded by different tenants go to same directory tree
- Potential for filename collisions
- No automatic cleanup when tenant is deleted
- Cross-tenant file access possible if paths are discovered

#### Media Disk (Lines 51-54)
```php
'media' => [
    'driver' => 'local',
    'root' => assets_path('media'),  // assets/media
],
```

**Path**: `assets/media/`  
**Tenant Isolation**: ❌ **Shared across all tenants**

**Impact**:
- Media attachments (menu images, logos, etc.) from all tenants stored together
- Query: `app/admin/routes.php:410`: `ti_media_attachments ma ON ma.attachment_type = 'menus'`
- Filtering depends on database queries, not filesystem isolation
- Risk: If media is served by direct URL, tenant A could access tenant B's images

#### Public Disk (Lines 56-61)
```php
'public' => [
    'driver' => 'local',
    'root' => storage_path('app/public'),  // storage/app/public
    'url' => env('APP_URL').'/storage',
    'visibility' => 'public',
],
```

**Path**: `storage/app/public/`  
**Tenant Isolation**: ❌ **Shared across all tenants**

**Impact**:
- Public files accessible via `/storage/*` URLs
- All tenants share the same public storage space

#### S3 Disk (Lines 63-71)
```php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
    'url' => env('AWS_URL'),
    'endpoint' => env('AWS_ENDPOINT'),
],
```

**Bucket**: Single bucket shared  
**Tenant Isolation**: ❌ **Shared bucket, no path prefixing**

**Impact**:
- If S3 is used, all tenants store in same bucket
- No automatic path prefixing by tenant ID
- Application code must manually organize by tenant

### Recommendations for Filesystems

#### Option 1: Path Prefixing
Modify disk roots dynamically based on tenant:
```php
// In a service provider or middleware
if ($tenant = app('tenant')) {
    Config::set('filesystems.disks.local.root', storage_path("app/tenant_{$tenant->id}"));
    Config::set('filesystems.disks.media.root', assets_path("media/tenant_{$tenant->id}"));
}
```

#### Option 2: S3 with Path Prefixing
```php
's3' => [
    'driver' => 's3',
    // ...
    'root' => env('TENANT_ID') ? 'tenant_'.env('TENANT_ID') : '',
],
```

---

### 2. Cache Configuration

**File**: `config/cache.php` (identical in both versions)

#### Default Driver (Line 18)
```php
'default' => env('CACHE_DRIVER', 'file'),
```

#### File Cache Store (Lines 48-51)
```php
'file' => [
    'driver' => 'file',
    'path' => storage_path('framework/cache/data'),  // Shared path
],
```

**Path**: `storage/framework/cache/data/`  
**Tenant Isolation**: ❌ **Shared cache directory**

#### Cache Key Prefix (Line 98)
```php
'prefix' => env('CACHE_PREFIX', 'tenant_default_cache'),
```

**Default**: `'tenant_default_cache'`  
**Tenant Isolation**: ⚠️ **Static prefix, NOT dynamic**

**Problem**:
- All tenants share the same cache prefix
- Cache keys are **not scoped by tenant**
- Tenant A can read/overwrite tenant B's cache

**Example collision**:
```php
// Tenant A
Cache::put('menu_items', $tenantAMenus);  // Key: tenant_default_cache:menu_items

// Tenant B
Cache::get('menu_items');  // Gets tenant A's menus! ⚠️
```

#### Redis Configuration (Lines 137-160)
If using Redis (not default):
```php
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),
    'options' => [
        'cluster' => env('REDIS_CLUSTER', 'redis'),
        'prefix' => env('REDIS_PREFIX', str_slug(env('APP_NAME', 'tastyigniter'), '_').'_database_'),
    ],
    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'database' => env('REDIS_DB', '0'),  // Shared database
    ],
    'cache' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'database' => env('REDIS_CACHE_DB', '1'),  // Shared database
    ],
],
```

**Database**: Single Redis DB (0 or 1)  
**Tenant Isolation**: ❌ **Shared Redis database**

### Cache Isolation Risk

**Severity**: **High**

**Impact**:
- Cross-tenant cache poisoning
- Tenant A can overwrite tenant B's cached data
- Performance impact (cache hits from wrong tenant)
- Data leakage (sensitive cached data accessible across tenants)

**Example Attack**:
1. Tenant A caches `'active_promotion' => '50% off'`
2. Tenant B reads `'active_promotion'` and displays tenant A's promotion
3. Or: Tenant A intentionally poisons cache to disrupt tenant B

### Recommendations for Cache

#### Option 1: Dynamic Prefix (Middleware)
```php
// After tenant detection in middleware
if ($tenant = app('tenant')) {
    Config::set('cache.prefix', "tenant_{$tenant->id}_cache");
    // Purge and reconnect cache if needed
}
```

#### Option 2: Explicit Tenant Prefix in Code
```php
// Wrapper helper
function tenant_cache_key($key) {
    $tenant = app('tenant');
    return $tenant ? "tenant_{$tenant->id}_{$key}" : $key;
}

// Usage
Cache::put(tenant_cache_key('menu_items'), $menus);
```

#### Option 3: Redis Database per Tenant
```php
if ($tenant = app('tenant')) {
    // Use tenant ID as Redis DB number (limited to 16 by default)
    Config::set('cache.stores.redis.connection', "tenant_{$tenant->id}");
}
```

---

### 3. Session Configuration

**File**: `config/session.php` (identical in both versions)

#### Default Driver (Line 19)
```php
'driver' => env('SESSION_DRIVER', 'file'),
```

#### File Session Storage (Line 60)
```php
'files' => storage_path('framework/sessions'),
```

**Path**: `storage/framework/sessions/`  
**Tenant Isolation**: ❌ **Shared session directory**

#### Session Cookie Name (Lines 127-130)
```php
'cookie' => env(
    'SESSION_COOKIE',
    str_slug(env('APP_NAME', 'tastyigniter'), '_').'_session'
),
```

**Default**: `'tastyigniter_session'`  
**Tenant Isolation**: ❌ **Shared cookie name**

#### Session Domain (Line 156)
```php
'domain' => env('SESSION_DOMAIN', null),
```

**Default**: `null` (current domain)

### Session Isolation Risk

**Severity**: **Medium-High**

**Impact**:
- Sessions are stored by session ID (random), so no direct cross-tenant access
- **BUT**: Session cookie is shared across all subdomains if domain is set to `.paymydine.com`
- Admin logged into tenant A's subdomain might have session valid on tenant B's subdomain

**Session Fixation Risk**:
1. Attacker gets session ID from tenant A
2. Forces victim to use that session ID on tenant B
3. If session storage is shared and not validated against tenant, session might work

**Current Mitigation**:
- Random session IDs prevent accidental collision
- Session data is isolated by ID

**Missing Mitigation**:
- No tenant ID stored in session for validation
- No check that session belongs to current tenant

### Recommendations for Sessions

#### Option 1: Subdomain-Scoped Cookies
```php
// In middleware after tenant detection
if ($tenant = app('tenant')) {
    Config::set('session.domain', $tenant->domain);  // e.g., 'tenant-a.paymydine.com'
}
```

**Effect**: Session cookie only valid for that specific subdomain.

#### Option 2: Tenant Validation in Session
```php
// After tenant detection
session(['tenant_id' => $tenant->id]);

// On subsequent requests
if (session('tenant_id') !== $tenant->id) {
    // Session belongs to different tenant, invalidate
    session()->flush();
    abort(403, 'Session tenant mismatch');
}
```

#### Option 3: Database Sessions with Tenant Scoping
**Config** (`config/session.php:86`):
```php
'table' => 'sessions',
```

**Migration**: Add `tenant_id` column to sessions table

**Middleware**:
```php
// Store tenant ID with session
DB::table('sessions')->where('id', session()->getId())->update([
    'tenant_id' => $tenant->id
]);

// Validate on load
$session = DB::table('sessions')->where('id', session()->getId())->first();
if ($session->tenant_id !== $tenant->id) {
    session()->flush();
}
```

---

### 4. Queue Configuration

**File**: `config/queue.php` (identical in both versions)

#### Default Driver (Line 18)
```php
'default' => env('QUEUE_CONNECTION', 'sync'),
```

**Default**: `'sync'` (no actual queue, runs immediately)

#### Database Queue (Lines 37-42)
```php
'database' => [
    'driver' => 'database',
    'table' => 'jobs',
    'queue' => 'default',
    'retry_after' => 90,
],
```

**Table**: `jobs` (with `ti_` prefix = `ti_jobs`)  
**Connection**: Uses default connection  
**Tenant Isolation**: ⚠️ **Depends on default connection at queue time**

#### Failed Jobs (Lines 82-86)
```php
'failed' => [
    'driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
    'database' => env('DB_CONNECTION', 'mysql'),
    'table' => 'failed_jobs',
],
```

**Connection**: `'mysql'` (central DB)  
**Tenant Isolation**: ⚠️ **Failed jobs go to central DB**

### Queue Isolation Risk

**Severity**: **Medium** (low usage since default is sync)

**Impact** (if queues are used):
- Jobs are stored in `ti_jobs` table of whichever connection is default when job is dispatched
- If dispatched during tenant request, goes to tenant DB
- If dispatched during central/admin request, goes to central DB
- **Worker must know which connection to use for each job**

**Failed Jobs**:
- Hardcoded to `mysql` connection
- All failed jobs from all tenants go to central DB
- If tenant DB fails, error logged to central DB (may be desired)

### Recommendations for Queues

#### Option 1: Tenant Context in Job Payload
```php
// When dispatching job
dispatch(new ProcessOrder($orderId))->onConnection($tenant->database);

// In job
protected $tenant;

public function __construct($orderId) {
    $this->tenant = app('tenant');
}

public function handle() {
    // Switch to tenant DB
    Config::set('database.default', $this->tenant->database);
    // ...
}
```

#### Option 2: Separate Queue per Tenant
```php
// Redis queues
'redis' => [
    'driver' => 'redis',
    'queue' => env('TENANT_QUEUE', 'default'),  // tenant_123, tenant_456, etc.
],
```

**Worker command**:
```bash
php artisan queue:work redis --queue=tenant_123
```

---

## Side-by-Side Configuration Comparison

| Config Item | Current | Old | Notes |
|-------------|---------|-----|-------|
| **Filesystems** ||||
| Default disk | `local` | `local` | Same |
| Local root | `storage/app` | Same | Shared |
| Media root | `assets/media` | Same | Shared |
| Public root | `storage/app/public` | Same | Shared |
| S3 bucket | Single | Same | Shared |
| **Cache** ||||
| Default driver | `file` | `file` | Same |
| File cache path | `storage/framework/cache/data` | Same | Shared |
| Cache prefix | `tenant_default_cache` | Same | ⚠️ Static |
| Redis DB | 0 (default), 1 (cache) | Same | Shared |
| **Session** ||||
| Default driver | `file` | `file` | Same |
| File session path | `storage/framework/sessions` | Same | Shared |
| Cookie name | `tastyigniter_session` | Same | Shared |
| Cookie domain | `null` | Same | Not scoped |
| **Queue** ||||
| Default driver | `sync` | `sync` | Same |
| Database table | `jobs` | Same | Uses default conn |
| Failed jobs DB | `mysql` | Same | Central DB |

---

## Overall Tenant Isolation Assessment

### What IS Isolated
✅ **Database data** (when tenant middleware is applied)  
✅ **Session data** (by random session ID, not by design)

### What is NOT Isolated
❌ **Filesystem storage** - all tenants share directories  
❌ **Media files** - all tenants share `assets/media/`  
❌ **Cache keys** - all tenants share cache with same prefix  
❌ **Session cookies** - may leak across subdomains  
❌ **Queue jobs** - tenant context not preserved  
❌ **Failed jobs** - logged to central DB only

### Risk Levels

| Component | Risk Level | Reason |
|-----------|------------|--------|
| **Cache** | 🔴 High | Cross-tenant data leakage, cache poisoning |
| **Filesystems** | 🟡 Medium | Filename collisions, no auto-cleanup, potential unauthorized access |
| **Sessions** | 🟡 Medium | Cookie domain issues, no tenant validation |
| **Queue** | 🟢 Low | Default is sync (no queue), low usage |

---

## Evidence

- Current filesystem config: `config/filesystems.php` (lines 46-71)
- Current cache config: `config/cache.php` (lines 48-51, 98)
- Current session config: `config/session.php` (lines 60, 127-130, 156)
- Current queue config: `config/queue.php` (lines 18, 37-42, 82-86)
- Old versions: Identical files in `oldversionfiels/config/`

---

## Recommendations Summary

### Immediate (High Priority)
1. **Dynamic cache prefix** based on tenant ID
2. **Subdomain-scoped session cookies**
3. **Tenant validation in session data**

### Short-term (Medium Priority)
4. **Filesystem path prefixing** for local/media/public disks
5. **S3 path prefixing** if using cloud storage

### Long-term (Low Priority - if queues are used)
6. **Tenant context in queue jobs**
7. **Separate queues per tenant** (if high volume)

### Not Recommended
- Shared infrastructure is acceptable **IF**:
  - Application logic strictly filters by tenant ID in queries
  - Cache keys include tenant ID
  - Sessions validate tenant ID
  - File paths include tenant ID or UUID subdirectories

