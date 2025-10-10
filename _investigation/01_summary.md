## Multi-Tenancy Isolation Investigation: Executive Summary

This document summarizes the findings of a codebase-wide investigation into the multi-tenant isolation mechanisms of the PayMyDine application. The focus was on database access, file storage, and request scoping.

### 1. High-Level Overview of Tenant Context

The application establishes tenant context using a subdomain-driven approach. The core of this mechanism is the `App\Http\Middleware\DetectTenant` middleware.

**Request Flow:**
1.  An incoming request hits the server (e.g., `https://amir.paymydine.com`).
2.  The `DetectTenant` middleware intercepts the request.
3.  It extracts the subdomain (`amir`) from the request's host.
4.  It queries a central `mysql` database, specifically the `ti_tenants` table, to find a tenant record matching the subdomain.
5.  Upon finding a tenant, it dynamically configures a new database connection named `tenant` using the credentials stored in the tenant's record.
6.  Crucially, it **sets the default database connection to `tenant`** for the remainder of the request lifecycle.
7.  The request then proceeds to the appropriate controller and executes business logic, with all subsequent database queries automatically targeting the tenant's dedicated database.

This approach is generally robust and a standard practice for multi-tenant Laravel applications.

### 2. Key Findings & Attention Points

While the core tenancy model is sound, the investigation revealed several inconsistencies and areas that require attention. These are prioritized by risk level.

#### 🔴 CRITICAL RISK
*   **Unprotected Admin API Route**: A backward-compatibility route for admin notifications (`/admin/notifications-api`, defined in `app/admin/routes.php` lines 1078-1083) **lacks any tenant middleware**. This is a critical security gap. Any database queries performed by this endpoint will execute on the default `mysql` connection, which could be the main database or, even worse, the database of the previously authenticated tenant, leading to a high risk of data leakage.

#### 🟡 MEDIUM RISK
*   **Dual Middleware Implementations**: The codebase contains two distinct tenant middleware: `DetectTenant` and `TenantDatabaseMiddleware`. `DetectTenant` is the modern, correct implementation. `TenantDatabaseMiddleware` is an older, riskier version that modifies the shared `mysql` connection configuration directly. While `DetectTenant` is used for most API routes, the older middleware is still referenced in `app/admin/routes.php`, and a number of superadmin routes are configured to bypass it. This creates confusion and increases the risk of misconfiguration. The application should be standardized to use only the `DetectTenant` middleware.
*   **Global Cache Prefix**: The cache is configured with a global prefix (`tenant_default_cache` in `config/cache.php`). While a `TenantHelper::scopedCacheKey()` method exists to create tenant-specific cache keys, its adoption is not enforced globally. Only `TableHelper` uses it. Any other part of the application using Laravel's cache without this helper risks cross-tenant cache poisoning.

#### 🔵 LOW RISK
*   **Shared File Storage**: Media and file uploads are stored in a common directory structure under `storage/app/public`. Files are distinguished by a path derived from a hash of the filename. While this prevents direct path traversal, it means all tenants' files are stored together. There is no tenant identifier in the storage path. This is a common pattern but carries a low risk of data exposure if filename hash collisions were to occur or if file access permissions are not handled carefully.
*   **Hardcoded Table Prefixes**: The investigation found lingering instances of hardcoded `ti_` table prefixes in raw SQL queries, particularly in older documentation and migration files. While most active application code has been refactored to use dynamic prefixes (`$p = DB::connection()->getTablePrefix();`), any remaining hardcoded prefixes could bypass the tenant database connection if they exist in overlooked code paths.

### 3. Areas Where Tenant Boundaries Are Guaranteed

*   **Frontend API Routes**: The main `api/v1` route groups defined in `routes.php` are consistently protected by the `detect.tenant` middleware. This provides strong assurance that all standard frontend operations (fetching menus, placing orders, etc.) are correctly scoped to the tenant's database.
*   **URL & QR Code Generation**: Following recent fixes, the generation of QR codes and other frontend-facing URLs correctly uses the request's host (`$request->getHost()`), ensuring that links are always generated for the correct tenant subdomain.

### 4. Summary

The application has a solid foundation for multi-tenancy. The `DetectTenant` middleware correctly isolates database connections on a per-request basis. However, critical gaps exist, most notably the unprotected admin notifications API. The presence of a legacy tenant middleware and a global cache prefix also introduce unnecessary risk.

**Immediate Recommendations:**
1.  **Secure the Admin Notifications API**: Apply the `detect.tenant` middleware to the unprotected route group in `app/admin/routes.php`.
2.  **Consolidate Middleware**: Refactor the codebase to remove `TenantDatabaseMiddleware` and use `DetectTenant` exclusively.
3.  **Enforce Scoped Caching**: Mandate the use of `TenantHelper::scopedCacheKey()` for all cache operations or implement a tenant-aware cache driver.
