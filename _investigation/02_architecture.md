## Multi-Tenancy Isolation Investigation: Architecture Map

This document outlines the end-to-end request flow for a typical tenant API call, detailing the classes, functions, and state transitions involved in maintaining tenant isolation.

### 1. End-to-End Request Flow: Tenant API Call

This flow traces a request to a tenant-scoped endpoint, such as `https://amir.paymydine.com/api/v1/menu`.

1.  **Request Initiation**: A client sends an HTTP GET request.
    *   `GET /api/v1/menu`
    *   `Host: amir.paymydine.com`

2.  **Routing**: Laravel's routing mechanism matches the request to a route definition.
    *   **File**: `routes.php`
    *   **Code**: The request matches the `api/v1` route group, which is protected by the `detect.tenant` middleware.
        ```php
        // routes.php:376
        Route::group([
            'prefix' => 'api/v1',
            'middleware' => ['web', 'detect.tenant']
        ], function () {
            // routes.php:394
            Route::get('/menu', function () { ... });
        });
        ```

3.  **Middleware Execution: Tenant Resolution**: The `detect.tenant` middleware runs.
    *   **File**: `app/Http/Middleware/DetectTenant.php`
    *   **Class**: `App\Http\Middleware\DetectTenant`
    *   **Function**: `handle(Request $request, Closure $next)`
    *   **State Passing**:
        *   The middleware calls `$request->getHost()` which returns `amir.paymydine.com`.
        *   The `extractSubdomainFromHost()` method parses this string and returns the subdomain `amir`.
        *   A database query is executed against the **main `mysql` connection** to find the tenant:
            ```sql
            SELECT * FROM `ti_tenants` WHERE `domain` LIKE 'amir.%' OR `domain` = 'amir' LIMIT 1;
            ```
        *   The tenant record is found, containing the tenant's database name (e.g., `amir_db`) and credentials.

4.  **Middleware Execution: DB Connection Switching**:
    *   **File**: `app/Http/Middleware/DetectTenant.php`
    *   **State Passing**:
        *   `Config::set('database.connections.tenant.database', 'amir_db')` dynamically updates the in-memory configuration for the `tenant` database connection.
        *   `DB::purge('tenant')` and `DB::reconnect('tenant')` drop the old connection and establish a new one to the `amir_db` database.
        *   `DB::setDefaultConnection('tenant')` sets the default connection for the entire application for the scope of this request. **This is the most critical step for ensuring isolation.**
        *   `app()->instance('tenant', $tenant)` stores the tenant model instance in the service container for optional use in other parts of the application.

5.  **Controller/Closure Execution**: The request is passed to the route's closure.
    *   **File**: `routes.php`
    *   **Code**: The closure for the `/menu` route is executed.

6.  **Database Queries**:
    *   **File**: `routes.php`
    *   **Function**: Route closure for `/menu`
    *   **Code**:
        ```php
        // routes.php:397
        $p = DB::connection()->getTablePrefix();
        // ...
        $items = DB::select($query);
        ```
    *   **Isolation Mechanism**:
        *   `DB::connection()` now returns the `tenant` connection, because it was set as the default. `getTablePrefix()` returns the prefix for the tenant database (e.g., `ti_`).
        *   The `DB::select()` call is executed on the `tenant` connection, querying the `amir_db` database, not the main `paymydine` database.

7.  **Response**: The controller returns a JSON response with the tenant's menu data.

### 2. Call Graphs for Specific Operations

#### Reading Menu/Categories

*   `GET /api/v1/menu`
    *   `routes.php` -> `Route::get('/menu', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()`
            *   `DB::connection('mysql')->table('ti_tenants')->...` (Resolves tenant)
            *   `Config::set(...)` (Sets tenant DB config)
            *   `DB::setDefaultConnection('tenant')` (Switches connection)
        *   Route Closure execution:
            *   `DB::connection()->getTablePrefix()` (Gets prefix from `tenant` connection)
            *   `DB::select(...)` (Queries the `menus`, `categories`, and `media_attachments` tables on the tenant's database)
    *   Returns JSON response.

#### Writing an Order

*   `POST /api/v1/orders`
    *   `routes.php` -> `Route::post('/orders', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()` -> (Switches to tenant DB)
        *   Route Closure execution:
            *   `DB::beginTransaction()` (Starts transaction on `tenant` connection)
            *   `DB::table('orders')->max('order_id')`
            *   `DB::table('orders')->insertGetId(...)`
            *   `DB::table('order_menus')->insert(...)`
            *   `DB::table('order_totals')->insert(...)`
            *   `DB::commit()` (Commits transaction to tenant's DB)
    *   Returns JSON response with order ID.

#### Writing a Waiter/Table Note

*   `POST /api/v1/waiter-call` or `POST /api/v1/table-notes`
    *   `routes.php` -> `Route::post('/waiter-call', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()` -> (Switches to tenant DB)
        *   Route Closure execution:
            *   `DB::transaction(...)`
                *   `DB::table('waiter_calls')->insertGetId(...)`
                *   `App\Helpers\TableHelper::getTableInfo(...)`
                    *   `TenantHelper::scopedCacheKey(...)` (Creates tenant-scoped cache key)
                    *   `Cache::remember(..., function() { ... })`
                        *   `DB::table('tables')->where(...)`
                *   `DB::table('notifications')->insert(...)`
    *   Returns JSON response.

#### Serving Media/Images

*   `GET /api/v1/images?file={filename}`
    *   `routes.php` -> `Route::get('/images', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()` -> (Switches to tenant DB, although not strictly needed for this operation as it doesn't query the DB)
        *   Route Closure execution:
            *   `request()->get('file')`
            *   `storage_path("app/public/assets/media/attachments/public/...")` (Constructs path on the **server's global filesystem**)
            *   `file_exists(...)`
            *   `response()->file(...)` (Streams the file from the filesystem)
    *   Returns file response.
    *   **Isolation Note**: Isolation is based on the obscurity of the hashed filename. The storage path itself is not tenant-specific.
