# Cache & QR URL Scoping Analysis

## Executive Summary

**Cache**: Global prefix used, but caching is minimal in codebase (only TableHelper uses cache).

**QR URLs**: Use global `FRONTEND_URL` instead of tenant-specific subdomains, potentially directing customers to wrong tenant's menu.

---

## Part 1: Cache Analysis

### 1.1 Cache Configuration

**File**: `config/cache.php`

**Default Driver** (Line 18):
```php
'default' => env('CACHE_DRIVER', 'file'),
```

**From `.env`**:
```bash
CACHE_DRIVER=file
```

**Active Driver**: `file` (filesystem-based caching)

**Storage Path** (Line 50):
```php
'file' => [
    'driver' => 'file',
    'path' => storage_path('framework/cache/data'),
],
```

**Cache files stored at**: `storage/framework/cache/data/`

---

### 1.2 Cache Prefix Configuration

**File**: `config/cache.php:98`
```php
'prefix' => env('CACHE_PREFIX', 'tenant_default_cache'),
```

**From `.env`**:
```bash
# CACHE_PREFIX not set in .env
```

**Actual Prefix**: `tenant_default_cache` (default value)

**⚠️ ISSUE**: Prefix is **global**, not tenant-scoped. All tenants share same cache prefix.

**Impact**:
- If Tenant A caches menu with key `menu_list`
- Full cache key: `tenant_default_cache:menu_list`
- Tenant B requests menu, gets cached data from Tenant A
- Cross-tenant cache poisoning ⚠️

---

### 1.3 Cache Usage in Codebase

**Search Results**: `Cache::remember|cache()`

#### Found: TableHelper (GOOD - Uses Scoped Keys)

**File**: `app/Helpers/TableHelper.php:20-40`
```php
public static function getTableInfo($tableId)
{
    // Use tenant-scoped cache key to avoid cross-tenant cache collisions
    $cacheKey = TenantHelper::scopedCacheKey("table_info_{$tableId}");  // ✓ SCOPED
    return Cache::remember($cacheKey, 300, function() use ($tableId) {
        $table = DB::table('tables')
            ->where('table_id', $tableId)
            ->where('table_status', 1)
            ->first();
            
        if (!$table) {
            return null;
        }
        
        return [
            'table_id' => $table->table_id,
            'table_name' => $table->table_name,
            'qr_code' => $table->qr_code,
            'min_capacity' => $table->min_capacity,
            'max_capacity' => $table->max_capacity,
            'is_joinable' => $table->is_joinable,
            'priority' => $table->priority
        ];
    });
}
```

**TenantHelper Scoping** (`app/Helpers/TenantHelper.php:14-43`):
```php
public static function tenantCachePrefix(): string
{
    $request = app('request');
    $tenant = $request->attributes->get('tenant');
    
    // If tenant is available from the middleware, use its database name
    if ($tenant && isset($tenant->database)) {
        return "tenant:{$tenant->database}:";  // e.g., "tenant:rosana:"
    }
    
    // Fallback to current database name
    try {
        $database = DB::connection()->getDatabaseName();
        return "db:{$database}:";
    } catch (\Exception $e) {
        return "unknown:";
    }
}

public static function scopedCacheKey(string $key): string
{
    return self::tenantCachePrefix() . $key;
}
```

**Example Keys**:
- Tenant Rosana: `tenant:rosana:table_info_5`
- Tenant Amir: `tenant:amir:table_info_5`
- Different cache entries ✓

**✓ CORRECT**: TableHelper properly scopes cache keys.

---

#### Not Found: Menu Caching

**Files Checked**:
- `app/Http/Controllers/Api/MenuController.php` - NO caching
- `app/admin/controllers/Api/RestaurantController.php` - NO caching
- `routes.php` (menu closures) - NO caching

**Queries**: Direct DB queries without caching
```php
// routes.php:396
Route::get('/menu', function () {
    $items = DB::select($query);  // No caching
```

**Impact**: Menu reads always hit database. Cache bleed not a concern for menus since not cached.

---

#### Not Found: Order Caching

**Files Checked**:
- `app/Http/Controllers/Api/OrderController.php` - NO caching
- `app/admin/controllers/Api/OrderController.php` - NO caching
- `routes.php` (order closures) - NO caching

**Impact**: Orders not cached. Cache bleed not applicable.

---

#### Not Found: Notification Caching

**Files Checked**:
- `app/admin/controllers/NotificationsApi.php` - NO caching
- `app/Helpers/NotificationHelper.php` - NO caching

**Queries**: Direct DB queries
```php
// NotificationsApi.php:29
$rows = DB::table('notifications')->get();  // No caching
```

**Impact**: Notifications not cached. Cache bleed not applicable.

---

#### Not Found: Settings Caching

**Files Checked**:
- `app/Helpers/SettingsHelper.php` - NO caching
- `routes.php` (settings closure) - NO caching

**Queries**: Direct DB queries
```php
// SettingsHelper.php:19
$setting = DB::table('settings')->where('item', $key)->first();  // No caching
```

**Impact**: Settings not cached. Cache bleed not applicable.

---

### 1.4 Cache Usage Summary

| Component | Uses Cache? | Scoped Keys? | Risk Level |
|-----------|-------------|--------------|------------|
| **TableHelper** | YES ✓ | YES ✓ | ✅ LOW - Properly scoped |
| **MenuController** | NO | N/A | ✅ LOW - No caching, no issue |
| **OrderController** | NO | N/A | ✅ LOW - No caching, no issue |
| **NotificationHelper** | NO | N/A | ✅ LOW - No caching, no issue |
| **SettingsHelper** | NO | N/A | ✅ LOW - No caching, no issue |
| **Other Components** | NO | N/A | ✅ LOW - No caching found |

**Conclusion**: 
- Cache bleed is **NOT a primary concern** in this application
- Only TableHelper caches data, and it uses proper scoping
- Most queries are not cached
- Global cache prefix is still wrong, but has minimal impact currently

---

### 1.5 Cache Bleed Potential (Hypothetical)

**IF caching were added without scoping**:

```php
// BAD - Global cache key
Cache::remember('menu_list', 3600, function() {
    return DB::table('menus')->get();
});

// Rosana requests menu → caches as 'tenant_default_cache:menu_list'
// Amir requests menu → gets Rosana's cached menu ⚠️
```

**GOOD - Scoped cache key**:
```php
// Use TenantHelper
$key = TenantHelper::scopedCacheKey('menu_list');
Cache::remember($key, 3600, function() {
    return DB::table('menus')->get();
});

// Rosana: 'tenant_default_cache:tenant:rosana:menu_list'
// Amir: 'tenant_default_cache:tenant:amir:menu_list'
// Separate cache entries ✓
```

---

## Part 2: QR URL Scoping Analysis

### 2.1 QR URL Generation Locations

#### Location 1: Get Table QR URL Endpoint

**File**: `routes.php:297-358`
**Route**: `GET /admin/orders/get-table-qr-url`

```php
Route::get('/orders/get-table-qr-url', function (Request $request) {
    try {
        $tableId = $request->get('table_id');
        if (!$tableId) {
            return response()->json([
                'success' => false,
                'error' => 'table_id is required'
            ]);
        }

        // Get table data
        $table = DB::table('tables')->where('table_id', $tableId)->first();
        if (!$table) {
            return response()->json([
                'success' => false,
                'error' => 'Table not found'
            ]);
        }

        // Get location data
        $locationData = DB::table('locationables')
            ->where('locationable_id', $tableId)
            ->where('locationable_type', 'tables')
            ->first();
            
        $locationId = $locationData ? $locationData->location_id : 1;
        $maxCapacity = $table->max_capacity ?? 3;
        $date = date('Y-m-d');
        $time = date('H:i');

        // Build QR code URL (same logic as in tables/edit.blade.php)
        $frontendUrl = env('FRONTEND_URL', config('app.url'));  // ⚠️ Line 328 - GLOBAL URL
            
        $tableNumber = ($table->table_no > 0) ? $table->table_no : $tableId;
            
        $qrUrl = rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
            'location' => $locationId,
            'guest' => $maxCapacity,
            'date' => $date,
            'time' => $time,
            'qr' => $table->qr_code,
            'table' => $tableNumber
        ]);

        return response()->json([
            'success' => true,
            'qr_url' => $qrUrl,
            'table_data' => [
                'table_id' => $table->table_id,
                'table_name' => $table->table_name,
                'qr_code' => $table->qr_code,
                'location_id' => $locationId,
                'max_capacity' => $maxCapacity
            ]
        ]);
```

**⚠️ ISSUE - Line 328**:
```php
$frontendUrl = env('FRONTEND_URL', config('app.url'));
```

**From `.env`**:
```bash
# FRONTEND_URL not defined in .env
```

**Fallback** (`config/app.php`):
```php
'url' => env('APP_URL', 'http://127.0.0.1:8000'),
```

**From `.env`**:
```bash
APP_URL=http://127.0.0.1:8000
```

**Actual URL Used**: `http://127.0.0.1:8000` (localhost, NOT tenant-specific)

**Generated QR URL Example**:
```
http://127.0.0.1:8000/table/5?location=1&guest=4&date=2024-10-09&time=19:00&qr=table-5&table=5
```

**Problems**:
1. Uses localhost instead of production domain
2. Not tenant-specific (should use `https://rosana.paymydine.com`)
3. All tenants' QR codes point to same URL
4. Customer scans QR at Rosana's restaurant → gets localhost URL (broken)

---

#### Location 2: Cashier Table URL Builder

**File**: `routes.php:81-113`
**Function**: `buildCashierTableUrl($locationId = 1)`

```php
function buildCashierTableUrl($locationId = 1) {
    try {
        $cashierTableId = resolveCashierTableId($locationId);
        if (!$cashierTableId) {
            return null;
        }

        // Get table_no for the cashier table
        $cashierTable = DB::table('tables')->where('table_id', $cashierTableId)->first();
        if (!$cashierTable) {
            return null;
        }

        $frontendUrl = env('FRONTEND_URL', config('app.url'));  // ⚠️ Line 95 - GLOBAL URL
        $date = date('Y-m-d');
        $time = date('H:i');

        $tableNumber = ($cashierTable->table_no > 0) ? $cashierTable->table_no : $cashierTableId;
        
        return rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
            'location' => $locationId,
            'guest' => 1,
            'date' => $date,
            'time' => $time,
            'qr' => 'cashier',
            'table' => $tableNumber
        ]);
    } catch (\Throwable $e) {
        \Log::error('Failed to build Cashier table URL: ' . $e->getMessage());
        return null;
    }
}
```

**Same Issue**: Line 95 uses global `FRONTEND_URL`

---

#### Location 3: Get Cashier URL Endpoint

**File**: `routes.php:161-181`
**Route**: `GET /admin/orders/get-cashier-url`

```php
Route::get('/orders/get-cashier-url', function (Request $request) {
    try {
        $locationId = (int) $request->get('location_id', 1);
        
        $frontendUrl = env('FRONTEND_URL', config('app.url'));  // ⚠️ Line 165 - GLOBAL URL
        $url = rtrim($frontendUrl, '/').'/cashier?'.http_build_query([
            'location' => $locationId,
            'mode'     => 'cashier',
        ]);

        return response()->json([
            'success' => true,
            'url'     => $url,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error'   => $e->getMessage(),
        ], 500);
    }
})->name('admin.orders.getCashierUrl');
```

**Same Issue**: Line 165 uses global `FRONTEND_URL`

---

### 2.2 QR URL Issues Summary

| Location | File:Line | Uses | Actual Value | Expected Value |
|----------|-----------|------|--------------|----------------|
| Table QR endpoint | routes.php:328 | `FRONTEND_URL` | `http://127.0.0.1:8000` | `https://rosana.paymydine.com` |
| Cashier URL builder | routes.php:95 | `FRONTEND_URL` | `http://127.0.0.1:8000` | `https://rosana.paymydine.com` |
| Cashier URL endpoint | routes.php:165 | `FRONTEND_URL` | `http://127.0.0.1:8000` | `https://rosana.paymydine.com` |

**⚠️ ALL QR URLs** use global localhost URL instead of tenant-specific production domains.

---

### 2.3 QR URL Impact Analysis

#### Scenario: Customer at Rosana's Restaurant

**Expected Flow**:
1. Customer scans QR code at Rosana's table
2. QR contains: `https://rosana.paymydine.com/table/5?...`
3. Browser opens Rosana's subdomain
4. Frontend makes API call to `rosana.paymydine.com/api/v1/menu`
5. (If middleware worked) Gets Rosana's menu ✓

**Actual Flow (Current)**:
1. Customer scans QR code at Rosana's table
2. QR contains: `http://127.0.0.1:8000/table/5?...`
3. Browser tries to open localhost (fails - not accessible from phone) ⚠️
4. Customer can't access menu at all

**⚠️ CRITICAL**: QR codes don't work in production because they point to localhost.

---

#### Scenario: If FRONTEND_URL Was Set to paymydine.com (No Subdomain)

**If `.env` had**:
```bash
FRONTEND_URL=https://paymydine.com
```

**Then QR URL would be**:
```
https://paymydine.com/table/5?...
```

**Problem**:
- All tenants' QR codes point to main domain
- No subdomain differentiation
- Customer at Rosana's restaurant → opens main paymydine.com
- Gets mixed menu from all tenants (due to lack of middleware)
- OR gets default tenant's menu

**Still wrong** - needs tenant-specific subdomain.

---

### 2.4 Correct QR URL Generation

**What it should be**:

```php
// Get current request's host (tenant-specific)
$domain = $request->getHost();  // e.g., "rosana.paymydine.com"
$scheme = $request->getScheme();  // "https"

$frontendUrl = "{$scheme}://{$domain}";  // "https://rosana.paymydine.com"

$qrUrl = rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
    'location' => $locationId,
    'guest' => $maxCapacity,
    'date' => $date,
    'time' => $time,
    'qr' => $table->qr_code,
    'table' => $tableNumber
]);
```

**Result**: 
- Rosana's QR → `https://rosana.paymydine.com/table/5?...`
- Amir's QR → `https://amir.paymydine.com/table/7?...`
- Each tenant's QR points to their own subdomain ✓

---

### 2.5 Frontend Configuration

**Relevant Files**:
- `frontend/lib/api-client.ts`
- `frontend/lib/environment-config.ts`
- `frontend/env local example`

**Environment Example** (`frontend/env local example`):
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

**API Client** (`frontend/lib/api-client.ts:6`):
```typescript
const FRONTEND_URL = envConfig.getFrontendUrl();
```

**Issue**: Frontend also uses global `FRONTEND_URL`. Frontend should:
1. Detect current hostname from `window.location.host`
2. Make API calls to same hostname
3. Not rely on environment variable for current host

**Example**:
```typescript
// BAD - Global URL
const API_URL = 'https://api.paymydine.com/api/v1';

// GOOD - Current host
const API_URL = `${window.location.protocol}//${window.location.host}/api/v1`;
```

---

## Recommendations

### Cache Recommendations

#### 1. Update Global Cache Prefix (LOW priority - minimal impact)
```php
// config/cache.php:98
'prefix' => env('CACHE_PREFIX', 'pmd_cache'),  // Shorter prefix
```

**Rationale**: Current "tenant_default_cache" is misleading (not actually tenant-scoped).

---

#### 2. Adopt Scoped Caching System-Wide (MEDIUM priority)
If caching is added in future:
```php
// Good pattern (already in TableHelper)
use App\Helpers\TenantHelper;

$key = TenantHelper::scopedCacheKey('menu_list');
Cache::remember($key, 3600, function() {
    return DB::table('menus')->get();
});
```

**Don't**:
```php
// BAD - Global key
Cache::remember('menu_list', 3600, function() {
    return DB::table('menus')->get();
});
```

---

#### 3. Consider Redis for Multi-Tenant Apps (FUTURE)
For better isolation:
```php
// config/database.php:143
'prefix' => env('REDIS_PREFIX', 'pmd_') . (app('tenant')->database ?? 'main') . '_',
```

Each tenant gets separate Redis key namespace.

---

### QR URL Recommendations

#### 1. Use Request Host Instead of Global URL (CRITICAL)
**Update all 3 locations** (routes.php:95, 165, 328):

```php
// Before
$frontendUrl = env('FRONTEND_URL', config('app.url'));

// After
$request = request();  // Get current request
$frontendUrl = $request->getScheme() . '://' . $request->getHost();
```

**Impact**: QR codes will use tenant-specific subdomain.

---

#### 2. Validate Generated URLs (TESTING)
Add logging:
```php
\Log::info('Generated QR URL', [
    'url' => $qrUrl,
    'host' => $request->getHost(),
    'tenant' => optional(app('tenant'))->domain,
]);
```

Check logs to ensure URLs are tenant-specific.

---

#### 3. Update Frontend to Use Current Host
**frontend/lib/api-client.ts**:
```typescript
// Detect API URL from current hostname
const getApiUrl = () => {
    if (typeof window === 'undefined') {
        // Server-side: use env variable
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    }
    // Client-side: use current host
    return `${window.location.protocol}//${window.location.host}/api/v1`;
};

const API_URL = getApiUrl();
```

---

## Summary

### Cache Scoping
- ✅ **LOW RISK**: Only TableHelper caches data, and it uses proper scoping
- ⚠️ Global cache prefix is wrong but has minimal impact currently
- 📝 Recommendation: Adopt scoped caching pattern if/when caching is expanded

### QR URL Scoping
- ⚠️ **HIGH RISK**: All QR URLs use localhost, non-functional in production
- ⚠️ QR codes point to wrong domain (not tenant-specific)
- 🔴 **CRITICAL**: Fix by using `$request->getHost()` instead of global `FRONTEND_URL`
- 📝 Must update 3 locations in routes.php

### Priority
1. **CRITICAL**: Fix QR URL generation (routes.php:95, 165, 328)
2. **MEDIUM**: Document scoped caching pattern for future use
3. **LOW**: Update global cache prefix name (cosmetic)

---

## Test Plan (Read-Only)

### Test 1: Verify QR URL Generation
```bash
# Call QR endpoint
curl -X GET "https://rosana.paymydine.com/admin/orders/get-table-qr-url?table_id=5" \
  -H "Cookie: session=..."

# Expected (current - WRONG):
{
  "success": true,
  "qr_url": "http://127.0.0.1:8000/table/5?location=1&..."
}

# Expected (after fix - CORRECT):
{
  "success": true,
  "qr_url": "https://rosana.paymydine.com/table/5?location=1&..."
}
```

### Test 2: Verify Cache Keys
```bash
# Check cache directory
ls -la storage/framework/cache/data/

# Files should show tenant-scoped keys if TableHelper is used
# Example: tenant:rosana:table_info_5
```

### Test 3: Scan QR Code
```
1. Generate QR code for a table
2. Print QR code
3. Scan with mobile phone
4. Verify URL opens correct tenant subdomain
5. Verify menu loads for that tenant
```

