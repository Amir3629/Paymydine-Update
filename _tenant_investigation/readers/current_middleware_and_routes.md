# Current Version: Middleware and Routes (Quick Reference)

This file contains concatenated key sections from the current version for quick review.

---

## File: routes.php (Current)

### Admin Group (Lines 16-201)

```php
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // Assets combiner
    Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');
    
    // Order helper routes
    Route::get('/orders/get-table-statuses', function () { /* ... */ });
    Route::get('/orders/get-cashier-url', function (Request $request) { /* ... */ });
    Route::get('/storefront-url', function (Request $request) { /* ... */ });
    Route::post('/orders/save-table-layout', function (Request $request) { /* ... */ });
    Route::get('/orders/get-table-qr-url', function (Request $request) { /* ... */ });
    
    // Catch-all
    Route::any('{slug}', 'System\Classes\Controller@runAdmin')->where('slug', '(.*)?');
});
```

**Middleware**: `['web']` only  
**No tenant middleware in group**

---

### Superadmin Routes (Lines 205-260)

```php
// QR Redirect - WITH tenant middleware
Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

// Superadmin pages - WITHOUT tenant middleware
Route::get('/new', [SuperAdminController::class, 'showNewPage'])
    ->name('superadmin.new')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/index', [SuperAdminController::class, 'showIndex'])
    ->name('superadmin.index')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

// ... more superadmin routes, all with withoutMiddleware()

// Tenant status update - explicit mysql connection
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

---

### Frontend API Routes (Lines 359-371)

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
**No tenant middleware**

---

### ⚠️ CRITICAL: Custom API Routes (Lines 374-917)

```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', 'detect.tenant']  // ⚠️⚠️⚠️ HAS TENANT MIDDLEWARE
], function () {
    // Payments endpoint
    Route::get('/payments', function () { /* ... */ });
    
    // Menu endpoints
    Route::get('/menu', function () { /* ... */ });
    Route::get('/categories', function () { /* ... */ });
    Route::get('/images', function () { /* ... */ });
    
    // Restaurant info
    Route::get('/restaurant', function () { /* ... */ });
    Route::get('/settings', function () { /* ... */ });
    
    // Order endpoints
    Route::post('/orders', function (Request $request) { /* ... */ });
    Route::get('/order-status', function (Request $request) { /* ... */ });
    Route::post('/order-status', function (Request $request) { /* ... */ });
    
    // Table endpoints
    Route::get('/table-info', function (Request $request) { /* ... */ });
    Route::get('/current-table', function (Request $request) { /* ... */ });
});
```

**Middleware**: `['web', 'detect.tenant']` ✅  
**Has tenant detection!**

---

## File: app/admin/routes.php (Current)

### Custom API Routes (Lines 378-921) - INCONSISTENT!

```php
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']  // ⚠️⚠️⚠️ NO TENANT MIDDLEWARE (different from routes.php!)
], function () {
    // SAME ROUTES as in routes.php
    // But WITHOUT detect.tenant middleware
});
```

**Middleware**: `['web']` only ❌  
**NO tenant detection** (inconsistent with routes.php)

---

## File: app/Http/Middleware/DetectTenant.php (Current)

```php
class DetectTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Get subdomain from headers or host
        $subdomain = $request->header('X-Tenant-Subdomain') 
                  ?? $request->header('X-Original-Host') 
                  ?? $this->extractSubdomainFromHost($request->getHost());

        if ($subdomain && $subdomain !== 'www') {
            try {
                // Query central database for tenant info
                $tenant = DB::connection('mysql')->table('ti_tenants')
                    ->where('domain', 'like', $subdomain . '.%')
                    ->orWhere('domain', $subdomain)
                    ->first();

                if ($tenant && $tenant->database) {
                    // ✅ Configure tenant connection dynamically
                    Config::set('database.connections.tenant.database', $tenant->database);
                    Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
                    Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
                    Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
                    Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
                    
                    // ✅ Reconnect to tenant database
                    DB::purge('tenant');
                    DB::reconnect('tenant');
                    
                    // ✅ Set tenant as default connection for this request
                    Config::set('database.default', 'tenant');
                    DB::setDefaultConnection('tenant');
                    
                    // ✅ Store tenant info in request and app container
                    $request->attributes->set('tenant', $tenant);
                    app()->instance('tenant', $tenant);
                    
                    Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
                } else {
                    Log::warning("No tenant found for subdomain: {$subdomain}");
                    
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
            Log::info("No subdomain detected, using default connection");
        }

        return $next($request);
    }
}
```

**Key Features**:
- ✅ Sets host, port, username, password for tenant connection
- ✅ Purges and reconnects connection
- ✅ Sets tenant as default connection
- ✅ Stores tenant in app container
- ✅ Returns 404 if tenant not found

---

## File: app/Http/Middleware/TenantDatabaseMiddleware.php (Current)

```php
class TenantDatabaseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->extractTenantFromDomain($request);
        
        if ($tenant) {
            $tenantInfo = DB::connection('mysql')->table('ti_tenants')
                ->where('domain', $tenant . '.paymydine.com')
                ->where('status', 'active')
                ->first();
            
            if ($tenantInfo) {
                // ⚠️ Overwrites mysql connection (destructive)
                Config::set('database.connections.mysql.database', $tenantInfo->database);
                
                // Reconnect with new database
                DB::purge('mysql');
                DB::reconnect('mysql');
                
                $request->attributes->set('tenant', $tenantInfo);
            } else {
                return response()->json(['error' => 'Restaurant not found or inactive'], 404);
            }
        } else {
            return response()->json(['error' => 'Invalid domain'], 400);
        }
        
        return $next($request);
    }
}
```

**Key Features**:
- ⚠️ Modifies `mysql` connection instead of using separate `tenant` connection
- ⚠️ Does NOT set default connection
- ⚠️ Hardcoded to expect `paymydine` domain
- ✅ Checks tenant status (must be 'active')

---

## File: app/Http/Kernel.php (Current)

```php
protected $routeMiddleware = [
    'auth' => \App\Http\Middleware\Authenticate::class,
    'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
    // ... other middleware
    'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
    'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
    'cors' => \App\Http\Middleware\CorsMiddleware::class,
];
```

**Aliases**:
- `'detect.tenant'` → `DetectTenant` middleware
- `'tenant.database'` → `TenantDatabaseMiddleware` middleware

---

## Summary: Current Version

### Route Middleware Matrix

| Route Group | Middleware | Tenant-Scoped? |
|-------------|------------|----------------|
| Admin (`/admin/*`) | `['web']` | ❓ (depends on global middleware) |
| Superadmin routes | `withoutMiddleware(TenantDatabaseMiddleware)` | ❌ No (central DB) |
| Frontend API (`api/v1` - Admin\Controllers\Api) | `['api']` | ❌ No |
| **Custom API (`api/v1` - routes.php)** | **`['web', 'detect.tenant']`** | **✅ Yes** |
| **Custom API (`api/v1` - app/admin/routes.php)** | **`['web']`** | **❌ No** |
| Public API (nested) | Inherits from parent | ⚠️ Mixed |
| Notifications API | None | ❌ No |

### Middleware Capabilities

| Middleware | Sets Default Conn | Purges Conn | Multi-Server | Stores in App Container |
|------------|-------------------|-------------|--------------|-------------------------|
| **DetectTenant** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **TenantDatabaseMiddleware** | ❌ No | ✅ Yes | ❌ No | ❌ No |

### Critical Issues

1. **Inconsistent API routes**: `routes.php` has `detect.tenant`, `app/admin/routes.php` does not
2. **File duplication**: Two route files define the same routes differently
3. **Mixed middleware**: Both `DetectTenant` and `TenantDatabaseMiddleware` exist, serve different purposes

