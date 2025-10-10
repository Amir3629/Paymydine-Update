# Old Version: Middleware and Routes (Quick Reference)

This file contains concatenated key sections from the old version for quick review.

---

## File: oldversionfiels/routes.php (Old)

### Admin Group (Lines 14-24)

```php
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // Register Assets Combiner routes
    Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

    // Other pages
    Route::any('{slug}', 'System\Classes\Controller@runAdmin')
        ->where('slug', '(.*)?');
});

// Admin entry point
Route::any(config('system.adminUri', 'admin'), 'System\Classes\Controller@runAdmin');
```

**Middleware**: `['web']` only  
**No tenant middleware**

---

### Superadmin Routes (Lines 28-83)

```php
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/new', [SuperAdminController::class, 'showNewPage'])
    ->name('superadmin.new')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/index', [SuperAdminController::class, 'showIndex'])
    ->name('superadmin.index')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

// ... more superadmin routes with withoutMiddleware()

Route::post('/tenant/update-status', function (Request $request) {
    $id = $request->input('id');
    $status = $request->input('status') === 'activate' ? 'active' : 'disabled';
    
    $updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
    
    if ($updated) {
        return response()->json(['success' => true]);
    } else {
        return response()->json(['success' => false, 'error' => 'Failed to update']);
    }
})->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
```

**Same pattern as current version**

---

### Frontend API Routes (Lines 87-99)

```php
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    
    // Order endpoints
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
```

**Middleware**: `['api']`  
**No tenant middleware** (same as current)

---

### Custom API Routes (Lines 102-521) - NO TENANT MIDDLEWARE!

```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️⚠️⚠️ NO TENANT MIDDLEWARE
], function () {
    // Menu endpoints
    Route::get('/menu', function () { /* ... */ });
    
    // Media serving route
    Route::get('/media/{path}', function ($path) { /* ... */ });
    
    // Categories endpoints
    Route::get('/categories', function () { /* ... */ });
    Route::get('/categories/{categoryId}', function ($categoryId) { /* ... */ });
    
    // Restaurant info endpoint
    Route::get('/restaurant', function () { /* ... */ });
    
    // Settings endpoint
    Route::get('/settings', function () { /* ... */ });
});

// Image serving endpoint (outside group)
Route::get('/api/images', function () { /* ... */ });
```

**Middleware**: `['web']` only ❌  
**NO tenant detection**

**Difference from current**: Current version has `'detect.tenant'` in this group!

---

## File: oldversionfiels/app/admin/routes.php (Old)

### Minimal Admin Routes (24 lines total)

```php
<?php
App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        // Register Assets Combiner routes
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        // Other pages
        Route::any('{slug}', 'System\Classes\Controller@runAdmin')
            ->where('slug', '(.*)?');
    });

    // Admin entry point
    Route::any(config('system.adminUri', 'admin'), 'System\Classes\Controller@runAdmin');
});
```

**Very minimal** compared to current version (which has 1,086 lines!)

---

## File: oldversionfiels/app/Http/Middleware/DetectTenant.php (Old)

```php
class DetectTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Get subdomain from various possible headers
        $subdomain = $request->header('X-Tenant-Subdomain') 
                  ?? $request->header('X-Original-Host') 
                  ?? $this->extractSubdomainFromHost($request->getHost());

        if ($subdomain && $subdomain !== 'www') {
            try {
                // Query the main database for tenant information
                $tenant = DB::connection('mysql')->table('ti_tenants')
                    ->where('domain', 'like', $subdomain . '.%')
                    ->orWhere('domain', $subdomain)
                    ->first();

                if ($tenant && $tenant->database) {
                    // ⚠️ Only sets database name, no host/port/credentials
                    Config::set('database.connections.tenant.database', $tenant->database);
                    DB::setDefaultConnection('tenant');
                    
                    // ❌ Does NOT purge connection
                    // ❌ Does NOT set host/port/username/password
                    // ❌ Does NOT store in app container
                    
                    // Store tenant info in request for later use
                    $request->attributes->set('tenant', $tenant);
                    
                    Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
                } else {
                    Log::warning("No tenant found for subdomain: {$subdomain}");
                    
                    // Return 404 for unknown tenants
                    return response()->json([
                        'error' => 'Tenant not found',
                        'message' => 'The requested restaurant domain was not found.'
                    ], 404);
                }
            } catch (\Exception $e) {
                Log::error("Error detecting tenant: " . $e->getMessage());
                
                return response()->json([
                    'error' => 'Database Error',
                    'message' => 'Unable to connect to tenant database.'
                ], 500);
            }
        } else {
            // No subdomain provided, use default connection
            Log::info("No subdomain detected, using default connection");
        }

        return $next($request);
    }
}
```

**Limitations**:
- ❌ Does NOT set host, port, username, password (assumes same as defaults)
- ❌ Does NOT purge and reconnect connection (may use stale connection)
- ❌ Does NOT store tenant in app container (only request attributes)

---

## File: oldversionfiels/app/Http/Middleware/TenantDatabaseMiddleware.php (Old)

**IDENTICAL to current version** (no changes)

---

## File: oldversionfiels/app/Http/Kernel.php (Old)

```php
protected $routeMiddleware = [
    // ... same as current ...
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
    'cors' => \App\Http\Middleware\CorsMiddleware::class,
];
```

**IDENTICAL to current version**

---

## Summary: Old Version

### Route Middleware Matrix

| Route Group | Middleware | Tenant-Scoped? |
|-------------|------------|----------------|
| Admin (`/admin/*`) | `['web']` | ❓ (depends on global middleware) |
| Superadmin routes | `withoutMiddleware(TenantDatabaseMiddleware)` | ❌ No (central DB) |
| Frontend API (`api/v1` - Admin\Controllers\Api) | `['api']` | ❌ No |
| **Custom API (`api/v1`)** | **`['web']`** | **❌ No** |

### Middleware Capabilities

| Middleware | Sets Default Conn | Purges Conn | Multi-Server | Stores in App Container |
|------------|-------------------|-------------|--------------|-------------------------|
| **DetectTenant (Old)** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **TenantDatabaseMiddleware (Old)** | ❌ No | ✅ Yes | ❌ No | ❌ No |

### Key Differences from Current

1. **Custom API routes**: NO `detect.tenant` middleware (current has it)
2. **DetectTenant middleware**: Simpler, no purge/reconnect, no multi-server support
3. **app/admin/routes.php**: Minimal file (current has extensive routes)

---

## Current vs Old Comparison

### What Changed
1. ✅ **DetectTenant middleware enhanced** to support multi-server tenancy
2. ⚠️ **Custom API routes middleware changed** from `['web']` to `['web', 'detect.tenant']`
3. ⚠️ **app/admin/routes.php expanded** from 24 lines to 1,086 lines

### What Stayed the Same
1. ✅ Admin group structure
2. ✅ Superadmin route pattern
3. ✅ Frontend API routes
4. ✅ TenantDatabaseMiddleware (unchanged)
5. ✅ Middleware registration in Kernel

