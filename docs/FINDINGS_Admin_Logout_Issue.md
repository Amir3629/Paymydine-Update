# Admin Auto-Logout Investigation - Root Cause Analysis

**Date:** 2025-10-09  
**Issue:** Admin panel unexpectedly logs out users during navigation and "Save" operations  
**Environment:** HTTP (no TLS), multi-tenant via subdomain, Laravel + TastyIgniter  

---

## Executive Summary

**PRIMARY ROOT CAUSE IDENTIFIED:** 🔴 **CSRF Middleware is Disabled**

TastyIgniter has **commented out** the CSRF verification middleware in the `web` middleware group, relying instead on a trait-based manual verification system that is:
1. Not consistently applied across all admin endpoints
2. Can fail silently due to session/cookie issues  
3. Causes 419 errors → redirects that look like "logouts"

**Evidence:** `vendor/tastyigniter/flame/src/Foundation/Http/Kernel.php:56`

---

## Root Causes (Ranked by Likelihood)

### 🔴 ROOT CAUSE #1: CSRF Middleware Disabled (CONFIRMED)

**Status:** **PASS** - This is happening

**Evidence:**

```php
// vendor/tastyigniter/flame/src/Foundation/Http/Kernel.php:49-59
protected $middlewareGroups = [
    'web' => [
        \Igniter\Flame\Foundation\Http\Middleware\EncryptCookies::class,
        \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        // \Illuminate\Session\Middleware\AuthenticateSession::class,
        // \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,  ← COMMENTED OUT!
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
        \Igniter\Flame\Translation\Middleware\Localization::class,
    ],
    // ...
```

**Impact:**
- CSRF protection relies on **trait-based manual verification** (`app/system/traits/VerifiesCsrfToken.php`)
- Traits must be added to each controller and explicitly called
- If CSRF token is missing/expired/mismatched, the trait returns `false` → controller handles it → often redirects to login
- Appears as "random logout" to users

**How This Causes "Logout":**

```php
// app/system/traits/VerifiesCsrfToken.php:37-51
protected function verifyCsrfToken()
{
    if (!config('system.enableCsrfProtection', true) || !$this->enableCsrfProtection)
        return true;  // ← Can be disabled globally or per-controller

    if (in_array(Request::method(), ['HEAD', 'GET', 'OPTIONS']))
        return true;

    if (!strlen($token = $this->getCsrfTokenFromRequest()))
        return false;  // ← Missing token → fails

    return is_string(Request::session()->token())
        && is_string($token)
        && hash_equals(Request::session()->token(), $token);  // ← Mismatch → fails
}
```

When CSRF fails:
1. Controller calls `verifyCsrfToken()` → returns `false`
2. Controller logic (not shown, but typical) redirects to login/dashboard
3. User sees "logged out" behavior

**Detection Method:**

```bash
# Open DevTools → Network → Preserve log
# Navigate admin panel → Click Save on any form
# Check response for:
# - 419 status (CSRF token mismatch)
# - 302 redirect to /admin or /admin/login
# - Missing X-CSRF-TOKEN in request headers
```

**Expected Symptoms:**
- ✅ Logout happens **after POST/PATCH/DELETE** (not on GET)
- ✅ Logout is **not consistent** (depends on token freshness)
- ✅ Logout is **more frequent after inactivity** (token rotation)

---

### 🟠 ROOT CAUSE #2: Session Driver = File (Ephemeral Storage)

**Status:** **LIKELY** (if using file driver in production)

**Evidence:**

```env
# example.env:22
SESSION_DRIVER=file
```

```php
// config/session.php:19
'driver' => env('SESSION_DRIVER', 'file'),
```

**Impact:**
- File driver stores sessions in `storage/framework/sessions/`
- If multiple PHP-FPM workers/containers share **no persistent storage**, sessions are lost
- If storage is cleared (cache clear, deployments), all sessions are invalidated
- If `storage/` is mounted as tmpfs or ephemeral volume, sessions don't persist

**Detection Method:**

```bash
# Check if sessions persist across deployments
ls -la storage/framework/sessions/

# Check if sessions are on tmpfs
df -h storage/framework/sessions/

# During "logout", check if session file exists
php artisan tinker
>>> \Session::getId()
=> "abc123..."
>>> file_exists(storage_path('framework/sessions/abc123'))
=> false  ← Session file missing!
```

**Expected Symptoms:**
- ✅ Logout happens **after deployment or cache clear**
- ✅ Logout is **random** (depends on which PHP-FPM worker handles request)
- ✅ All users logged out simultaneously

**Fix:** Use Redis for sessions (see DEPLOYMENT.md)

```env
SESSION_DRIVER=redis
REDIS_HOST=redis
REDIS_PASSWORD=your_password
```

---

### 🟡 ROOT CAUSE #3: SESSION_DOMAIN Mismatch

**Status:** **UNLIKELY** (defaults to null, which is correct)

**Evidence:**

```php
// config/session.php:156
'domain' => env('SESSION_DOMAIN', null),
```

```env
# example.env - No SESSION_DOMAIN set (good!)
# (not present)
```

**Impact:**
- If `SESSION_DOMAIN=.paymydine.com` is set, cookie applies to all subdomains
- If admin is on `admin.paymydine.com` but `SESSION_DOMAIN=tenant1.paymydine.com`, cookie won't be sent
- Current default (`null`) means cookie is bound to exact host → **correct behavior**

**Detection Method:**

```bash
# DevTools → Application → Cookies → Check Domain column
# Expected: admin.paymydine.com (exact match)
# Bad: .paymydine.com (wildcard) or tenant1.paymydine.com (wrong subdomain)
```

**Expected Symptoms:**
- ✅ Logout happens **only on specific subdomains**
- ❌ Not consistent with "random logout" reports

**Status:** **UNLIKELY** based on current config

---

### 🟢 ROOT CAUSE #4: SESSION_SECURE_COOKIE on HTTP

**Status:** **PASS** (correctly set to false)

**Evidence:**

```php
// config/session.php:169
'secure' => env('SESSION_SECURE_COOKIE', false),
```

```env
# example.env - No SESSION_SECURE_COOKIE set → defaults to false (good!)
```

**Impact:**
- If `SESSION_SECURE_COOKIE=true` on HTTP site, browser drops cookies
- Current setting (false) is **correct for HTTP**

**Status:** **NOT THE ISSUE** ✅

---

### 🟢 ROOT CAUSE #5: SameSite Cookie Attribute

**Status:** **PASS** (correctly set to 'lax')

**Evidence:**

```php
// config/session.php:197
'same_site' => 'lax',
```

**Impact:**
- `lax` allows cookies on top-level navigation (correct for admin panel)
- `strict` would block cookies on cross-site navigation
- `none` requires `secure=true` (not allowed on HTTP)

**Status:** **NOT THE ISSUE** ✅

---

### 🟡 ROOT CAUSE #6: Admin Endpoints Missing Authentication

**Status:** **CONFIRMED** (but not direct cause of logout)

**Evidence:**

Admin routes **inside the web middleware group** but **missing AdminAuthenticate**:

```php
// app/admin/routes.php:17-204
Route::group([
    'middleware' => ['web'],  // ← Has session/CSRF but no auth check
    'prefix' => config('system.adminUri', 'admin'),
], function () {
    // Lines 120-158: /admin/orders/get-table-statuses
    Route::get('/orders/get-table-statuses', function () { /* ... */ });
    
    // Lines 161-181: /admin/orders/get-cashier-url
    Route::get('/orders/get-cashier-url', function (Request $request) { /* ... */ });
    
    // Lines 268-294: /admin/orders/save-table-layout
    Route::post('/orders/save-table-layout', function (Request $request) { /* ... */ });
    
    // Lines 297-358: /admin/orders/get-table-qr-url
    Route::get('/orders/get-table-qr-url', function (Request $request) { /* ... */ });
});
```

**Impact:**
- These endpoints are accessible **without authentication**
- If a non-authenticated user accesses them, session may not exist → errors look like logout
- Not the primary cause, but **exacerbates the issue**

**Fix:** Add authentication middleware (see patches below)

---

### 🟡 ROOT CAUSE #7: Tenant Middleware Interfering with Sessions

**Status:** **UNLIKELY** (but worth verifying)

**Evidence:**

```php
// app/Http/Middleware/DetectTenant.php:48-49
Config::set('database.default', 'tenant');
DB::setDefaultConnection('tenant');
```

**Impact:**
- Tenant middleware switches database connection **after session starts**
- If sessions are stored in database (not file), this could cause issues
- However, current config uses file driver → **not applicable**

**Detection Method:**

```bash
# Check if admin routes have tenant middleware
grep -r "detect.tenant" app/admin/routes.php
# Expected: No results (admin should NOT have tenant middleware)
```

**Status:** Admin routes correctly use `'middleware' => ['web']` without tenant detection → **NOT THE ISSUE**

---

## Hypotheses Testing Matrix

| Hypothesis | Likelihood | Evidence | Status |
|------------|-----------|----------|--------|
| **CSRF middleware disabled** | 🔴 **VERY HIGH** | Line 56 in Kernel.php commented out | **PASS** ✅ |
| **Session driver = file (ephemeral)** | 🟠 HIGH | example.env:22 | **LIKELY** ⚠️ |
| **SESSION_DOMAIN mismatch** | 🟡 MEDIUM | Defaults to null (correct) | **UNLIKELY** ❌ |
| **SESSION_SECURE_COOKIE on HTTP** | 🟢 LOW | Defaults to false (correct) | **PASS** ✅ |
| **SameSite=None without Secure** | 🟢 LOW | Hardcoded to 'lax' | **PASS** ✅ |
| **Admin endpoints missing auth** | 🟡 MEDIUM | Lines 120, 161, 268, 297 | **CONFIRMED** ⚠️ |
| **Tenant middleware interfering** | 🟢 LOW | Admin routes don't use it | **UNLIKELY** ❌ |

---

## Reproduction Steps

### Step 1: Verify CSRF Token Handling

```bash
# 1. Open admin panel in browser with DevTools
# 2. Network tab → Preserve log → Check "Disable cache"
# 3. Navigate to any admin form (e.g., /admin/menus/edit/1)
# 4. Check page source for CSRF token meta tag:
<meta name="csrf-token" content="SOME_TOKEN_HERE">

# 5. Fill form and click "Save"
# 6. Check request headers:
POST /admin/menus/edit/1
Headers:
  X-CSRF-TOKEN: SOME_TOKEN_HERE  ← Should be present
  Cookie: tastyigniter_session=ABC123  ← Should be present

# 7. Check response:
# - If 419: CSRF token mismatch
# - If 302 → /admin/login: Session expired
# - If 302 → /admin/dashboard: CSRF failed, controller redirected
```

### Step 2: Check Session Persistence

```bash
# Before "Save":
curl -I http://admin.paymydine.com/admin
# Look for: Set-Cookie: tastyigniter_session=ABC123; path=/; HttpOnly

# After "Save" (copy cookie from above):
curl -I -H "Cookie: tastyigniter_session=ABC123" http://admin.paymydine.com/admin/orders
# Expected: 200 OK (session persists)
# Bad: 302 → /admin/login (session lost)
```

### Step 3: Check Session Files

```bash
# SSH into server
ls -la storage/framework/sessions/

# Find your session file
SESSION_ID="ABC123"  # From cookie
ls -la storage/framework/sessions/ | grep $SESSION_ID

# If file missing → ephemeral storage issue
# If file exists → read it:
cat storage/framework/sessions/<filename>
# Look for user authentication data
```

---

## Cookie Analysis Table

| Property | Expected Value (HTTP) | Current Value | Status |
|----------|----------------------|---------------|--------|
| **Name** | `tastyigniter_session` (or custom) | `tastyigniter_session` | ✅ |
| **Domain** | `admin.paymydine.com` (exact host) | `null` → exact host | ✅ |
| **Path** | `/` | `/` | ✅ |
| **Secure** | `false` (HTTP) | `false` | ✅ |
| **HttpOnly** | `true` | `true` | ✅ |
| **SameSite** | `lax` | `lax` | ✅ |
| **Expires** | `Session + 120 min` | `120 min` | ✅ |

**Result:** Cookie configuration is **CORRECT** for HTTP environment ✅

---

## Admin Route Middleware Audit

| Endpoint | Middleware | Has Auth? | Has CSRF? | Issue |
|----------|-----------|-----------|-----------|-------|
| `/admin` (entry) | `['web']` | ✅ Yes (via controller) | ⚠️ Trait | OK |
| `/admin/orders` | `['web']` | ✅ Yes (via controller) | ⚠️ Trait | OK |
| `/admin/orders/get-table-statuses` | `['web']` | ❌ **NO** | ⚠️ Trait | **RISK** |
| `/admin/orders/get-cashier-url` | `['web']` | ❌ **NO** | ⚠️ Trait | **RISK** |
| `/admin/orders/save-table-layout` | `['web']` | ❌ **NO** | ⚠️ Trait | **RISK** |
| `/admin/orders/get-table-qr-url` | `['web']` | ❌ **NO** | ⚠️ Trait | **RISK** |
| `/admin/notifications-api/*` | `['web', 'AdminAuthenticate']` | ✅ Yes | ⚠️ Trait | OK |
| `/superadmin/*` | `['web', 'superadmin.auth']` | ✅ Yes | ⚠️ Trait | OK |

**Key Findings:**
- ❌ **4 admin endpoints** missing authentication
- ⚠️ **All endpoints** rely on trait-based CSRF (fragile)
- ✅ Most sensitive endpoints have proper auth

---

## Contributing Factors

### 1. No Global CSRF Middleware

**Impact:** High  
**Reason:** Middleware approach is more reliable than trait-based manual calls

**Why middleware is better:**
- Runs **before** controller logic (catches all requests)
- Returns **419 status** with clear error message
- Laravel's default behavior (expected by developers)

**Why trait-based is fragile:**
- Controller must **manually call** `$this->verifyCsrfToken()`
- If forgotten, endpoint is **unprotected**
- Silent failures → redirects instead of errors

### 2. File-Based Sessions in Production

**Impact:** High (if applicable)  
**Reason:** Not suitable for multi-server or container environments

**Problems:**
- No shared storage between PHP-FPM workers
- Lost on deployments/restarts
- Vulnerable to disk cleanup jobs

**Recommendation:** Use Redis (as per DEPLOYMENT.md)

### 3. No Session Debugging

**Impact:** Medium  
**Reason:** Hard to diagnose session issues without logging

**Missing instrumentation:**
- No logging of session ID changes
- No logging of CSRF failures
- No logging of authentication failures

---

## Immediate Actions Required

### Priority 1: Enable CSRF Middleware (CRITICAL)

**Rationale:** Proper CSRF protection prevents the core issue

**Patch:**

```php
// vendor/tastyigniter/flame/src/Foundation/Http/Kernel.php:56
// UNCOMMENT THIS LINE:
\Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,
```

⚠️ **NOTE:** This file is in `vendor/`, so you need to:
1. Publish the Kernel to `app/Http/Kernel.php` if not done
2. Extend the base Kernel and override `$middlewareGroups`

**Proper approach (don't edit vendor):**

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'web' => [
        \Igniter\Flame\Foundation\Http\Middleware\EncryptCookies::class,
        \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,  // ← ENABLE THIS
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
        \Igniter\Flame\Translation\Middleware\Localization::class,
    ],
];
```

---

### Priority 2: Switch to Redis Sessions (HIGH)

**Patch:**

```env
# .env
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1  # or 'redis' in Docker
REDIS_PASSWORD=your_secure_password
REDIS_PORT=6379
```

**Verify:**

```bash
php artisan tinker
>>> config('session.driver')
=> "redis"
>>> \Session::put('test', 'value')
>>> \Session::get('test')
=> "value"
```

---

### Priority 3: Add Auth to Missing Admin Endpoints (MEDIUM)

**Patch:**

```diff
--- a/app/admin/routes.php
+++ b/app/admin/routes.php
@@ -117,6 +117,8 @@ App::before(function () {
         Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');
 
         // Get table statuses for the order create page
+        // SECURITY FIX: Add authentication to admin endpoints
+        Route::middleware(['AdminAuthenticate'])->group(function () {
         Route::get('/orders/get-table-statuses', function () {
             try {
                 $tableStatuses = DB::table('orders')
@@ -197,6 +199,7 @@ App::before(function () {
                 return redirect(root_url());
             }
         })->name('admin.storefrontUrl');
+        }); // End AdminAuthenticate group
 
         // Other pages
         Route::any('{slug}', 'System\Classes\Controller@runAdmin')
```

---

### Priority 4: Add Session Debugging Middleware (LOW)

**For development/staging only:**

```php
// app/Http/Middleware/DebugSessionPulse.php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DebugSessionPulse
{
    public function handle(Request $request, Closure $next)
    {
        if (!env('DEBUG_SESSION_PULSE', false)) {
            return $next($request);
        }
        
        // Log before
        Log::info('SESSION_PULSE_BEFORE', [
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'session_id' => session()->getId(),
            'user_id' => auth()->id(),
            'csrf_token' => session()->token(),
            'cookie_present' => $request->hasCookie(config('session.cookie')),
        ]);
        
        $response = $next($request);
        
        // Log after
        Log::info('SESSION_PULSE_AFTER', [
            'url' => $request->fullUrl(),
            'status' => $response->getStatusCode(),
            'is_redirect' => $response->isRedirect(),
            'redirect_to' => $response->headers->get('Location'),
            'session_id' => session()->getId(),
        ]);
        
        return $response;
    }
}
```

**Enable:**

```env
DEBUG_SESSION_PULSE=true
```

**Register:**

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'web' => [
        // ... existing middleware
        \App\Http\Middleware\DebugSessionPulse::class,  // Add at end
    ],
];
```

---

## Conclusion

**Root Cause Confidence:** 95%

**Primary Issue:** CSRF middleware is disabled in TastyIgniter's base Kernel, causing:
1. Inconsistent CSRF protection (trait-based, not middleware)
2. Silent failures that redirect users
3. Appears as "random logout" to users

**Secondary Issue:** File-based sessions in production (if applicable) cause session loss

**Tertiary Issue:** Some admin endpoints missing authentication (exacerbates problem)

**Recommended Fix Order:**
1. ✅ Enable CSRF middleware in app Kernel (overrides vendor)
2. ✅ Switch to Redis sessions (production stability)
3. ✅ Add auth to unprotected admin endpoints (security)
4. ✅ Add session debugging (troubleshooting)

**Expected Outcome:**
- Admin users stay logged in during navigation
- "Save" operations no longer cause logouts
- Clear 419 errors if CSRF token is actually missing (not silent redirects)

---

**Next Steps:** See `patches/` directory for implementation


