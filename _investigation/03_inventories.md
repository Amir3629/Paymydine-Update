## Multi-Tenancy Isolation Investigation: Inventories & Checks

This document provides a detailed inventory of the application's components and patterns related to multi-tenancy.

### 1. Tenant Context: Setters and Readers

The tenant context is primarily managed within the `DetectTenant` middleware.

*   **Primary Context Setter**:
    *   `app/Http/Middleware/DetectTenant.php`: The `handle` method resolves the tenant from the subdomain and sets the tenant context for the request.
*   **Key Actions**:
    *   Reads subdomain from `request()->getHost()`.
    *   Reads tenant record from the main database: `DB::connection('mysql')->table('ti_tenants')->...`
    *   Sets the tenant-specific database configuration: `Config::set('database.connections.tenant.database', ...)`
    *   Switches the default connection: `DB::setDefaultConnection('tenant')`
    *   Stores the tenant object in the application container: `app()->instance('tenant', $tenant)`
*   **Primary Context Readers**:
    *   **Implicitly**: Every `DB::` call that does not specify a connection implicitly reads the context by using the `tenant` default connection set by the middleware.
    *   `app/Helpers/TenantHelper.php`: The `tenantCachePrefix` method reads the tenant object from the request attributes (`$request->attributes->get('tenant')`) to generate a tenant-specific cache prefix.

### 2. Routing: Tenant-Scoped Routes

The following route groups are intended to be tenant-scoped and are protected by the `detect.tenant` middleware.

*   **`routes.php`**:
    *   **Group**: `api/v1` (for TastyIgniter framework API)
        *   **Middleware**: `['api', 'detect.tenant']`
        *   **Lines**: 361-373
    *   **Group**: `api/v1` (for custom frontend API)
        *   **Middleware**: `['web', 'detect.tenant']`
        *   **Lines**: 376-1044
*   **`app/admin/routes.php`**:
    *   **Group**: `admin/notifications-api`
        *   **Middleware**: `['web', 'admin', 'detect.tenant']`
        *   **Lines**: 1047-1052 (in `routes.php` as per recent refactoring)

#### Routes Missing Tenant Middleware (Identified Gaps)

*   **`app/admin/routes.php`**:
    *   **Group**: `admin/notifications-api` (Backward-compatibility)
        *   **Middleware**: `['web']`
        *   **Lines**: 1078-1083
        *   **Risk**: **CRITICAL**. This group lacks tenant middleware. Any database operation within these routes will not be scoped to a tenant, leading to data leakage.

### 3. DB Access Patterns

*   **Default Connection Reliance**: The vast majority of database queries in the application (e.g., in route closures in `routes.php`, `app/admin/routes.php`, and helpers like `TableHelper.php`) use the default `DB::table()` or `DB::select()` methods. This is the correct pattern, as it relies on the `DetectTenant` middleware to switch the connection.

*   **Raw SQL & Dynamic Prefixes**: Raw SQL queries are common, especially for complex menu lookups. The correct pattern of dynamically getting the table prefix is used in most places.
    *   **Pattern**: `$p = DB::connection()->getTablePrefix(); $query = "SELECT * FROM {$p}menus ...";`
    *   **Locations**: `routes.php` (menu endpoint), `app/Http/Controllers/Api/MenuController.php`.

*   **Hardcoded Prefixes / Table Names**:
    *   The `search_from_ti.md` log revealed many instances of `FROM ti_...`. Analysis of the code (e.g., `app/Http/Controllers/Api/MenuController.php` in `reader_data_access.md`) confirms that the active API controller code **has been refactored** to use the dynamic `$p` prefix. The remaining instances are largely in documentation, logs, and old/inactive route files (`app.main.routes.php`).
    *   The query to the central `ti_tenants` table is an intentional, correctly implemented case of using a hardcoded table name on a specific connection: `DB::connection('mysql')->table('ti_tenants')`.

*   **Direct Connection Selection**:
    *   `DB::connection('mysql')`: Used correctly in `DetectTenant.php` to query the main `ti_tenants` table.
    *   `DB::connection('mysql')`: Also used in `app/admin/routes.php` for super admin functions (e.g., updating tenant status), which is also correct as these operations must happen on the central database.

### 4. Caching & Sessions

*   **Caching**:
    *   **Key Patterns**: Both the `Cache::` facade and `cache()` helper are used.
    *   **Tenant Scoping**: A `TenantHelper::scopedCacheKey()` method exists to create tenant-specific cache keys (e.g., `tenant:amir_db:table_info_123`).
    *   **Gap**: The application's default cache prefix in `config/cache.php` is **global** (`'prefix' => 'tenant_default_cache'`). While `TableHelper.php` correctly uses the scoped key helper, there is no guarantee that other parts of the application do. This creates a risk of cross-tenant cache poisoning for any cache calls that do not use the helper.

*   **Sessions**:
    *   **Driver**: The default session driver is `file`.
    *   **Path**: Session files are stored in `storage/framework/sessions`. This is a global, shared directory.
    *   **Scoping**: Standard Laravel file-based sessions are isolated by a unique session ID stored in a cookie. The `session()` helper interacts with the data for the current session ID. Direct cross-tenant session data leakage is unlikely unless the session ID is compromised. The `session()` helper itself is tenant-aware in the sense that it operates on the current request's session, not a global state.
    *   **Log Errors**: Logs show a repeated error: `Component "session" is not registered.` This indicates a potential framework-level configuration issue with TastyIgniter that could affect session stability.

### 5. File/Media Storage

*   **Disk Configuration**: `config/filesystems.php` defines a `public` disk pointing to `storage/path/app/public`.
*   **Path Structure**: The media serving endpoint in `routes.php` constructs image paths using a hash-based directory structure: `storage_path("app/public/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}")`.
*   **Isolation**: There is **no tenant-specific identifier** in the file storage path. All tenant media files are stored in the same directory tree. Isolation relies on the uniqueness of the generated filenames (which appear to be hashes). This is a form of "security through obscurity" for file paths and carries a low risk of collision or unauthorized access if an attacker could guess file hashes.

### 6. URL/Host Derivation

*   **Host Reading**: `request()->getHost()` is used to get the current host.
*   **Subdomain Parsing**: The `extractSubdomainFromHost()` method in `DetectTenant.php` is responsible for parsing the subdomain from the host string.
*   **URL Building**: For tenant-facing URLs like QR codes, the application now correctly uses `$request->getScheme() . '://' . $request->getHost()` to construct the base URL. This ensures links are always scoped to the tenant who initiated the request. This fixes a major previous bug where URLs pointed to `localhost` or a default domain.
    *   **Locations**: `app/admin/routes.php` (e.g., `/orders/get-table-qr-url`), `routes.php`.
