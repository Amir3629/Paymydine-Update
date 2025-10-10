# Phase 2: Exact Lines Added (Code Only)

## Summary
**Total Lines Added**: 80 lines  
**File Modified**: `routes.php` only  
**No files deleted or modified except routes.php**

---

## Change #1: Custom API Group (routes.php, after line 393)

**Location**: Inside `Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']]`

**Inserted 40 lines**:

```php
    // Inline cache prefixer (no new files): set a per-tenant cache prefix at runtime
    Route::middleware(function ($request, $next) {
        try {
            $tenant = app('tenant'); // expect detect.tenant to have run before this closure
            $slug   = optional($tenant)->slug ?: optional($tenant)->id ?: 'public';
            $base   = config('cache.prefix') ?: 'laravel';
            // Update runtime cache prefix to isolate keys: <base>:tenant:<slug>
            // This affects all Cache operations for the current request lifecycle.
            config(['cache.prefix' => $base.':tenant:'.$slug]);
        } catch (\Throwable $e) {
            // If no tenant, keep default; do not throw to avoid breaking public routes
        }
        return $next($request);
    });

    // Inline session guard (no new files): tie session to tenant and prevent cross-tenant reuse
    Route::middleware(function ($request, $next) {
        try {
            $tenant = app('tenant'); // provided by detect.tenant
            $tid    = optional($tenant)->id;

            // Only enforce for actual tenant contexts
            if ($tid) {
                $bound = session('session_tenant_id');
                if (!$bound) {
                    // First bind for this browser session
                    session(['session_tenant_id' => $tid]);
                } elseif ((string)$bound !== (string)$tid) {
                    // Cross-tenant reuse detected: reset session to avoid leakage
                    session()->invalidate();
                    session()->regenerateToken();
                    session(['session_tenant_id' => $tid]); // rebind to the correct tenant
                }
            }
        } catch (\Throwable $e) {
            // Fail-safe: do nothing to avoid blocking
        }
        return $next($request);
    });

```

---

## Change #2: Public API Group (routes.php, after line 988)

**Location**: Inside `Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant', 'throttle:30,1']]`

**Inserted 40 lines** (identical to Change #1):

```php
    // Inline cache prefixer (no new files): set a per-tenant cache prefix at runtime
    Route::middleware(function ($request, $next) {
        try {
            $tenant = app('tenant'); // expect detect.tenant to have run before this closure
            $slug   = optional($tenant)->slug ?: optional($tenant)->id ?: 'public';
            $base   = config('cache.prefix') ?: 'laravel';
            // Update runtime cache prefix to isolate keys: <base>:tenant:<slug>
            // This affects all Cache operations for the current request lifecycle.
            config(['cache.prefix' => $base.':tenant:'.$slug]);
        } catch (\Throwable $e) {
            // If no tenant, keep default; do not throw to avoid breaking public routes
        }
        return $next($request);
    });

    // Inline session guard (no new files): tie session to tenant and prevent cross-tenant reuse
    Route::middleware(function ($request, $next) {
        try {
            $tenant = app('tenant'); // provided by detect.tenant
            $tid    = optional($tenant)->id;

            // Only enforce for actual tenant contexts
            if ($tid) {
                $bound = session('session_tenant_id');
                if (!$bound) {
                    // First bind for this browser session
                    session(['session_tenant_id' => $tid]);
                } elseif ((string)$bound !== (string)$tid) {
                    // Cross-tenant reuse detected: reset session to avoid leakage
                    session()->invalidate();
                    session()->regenerateToken();
                    session(['session_tenant_id' => $tid]); // rebind to the correct tenant
                }
            }
        } catch (\Throwable $e) {
            // Fail-safe: do nothing to avoid blocking
        }
        return $next($request);
    });

```

---

## Line-by-Line Breakdown

### First Block (Cache Prefixer) - 15 lines per location × 2 = 30 lines total

```
Line 1:     // Inline cache prefixer (no new files): set a per-tenant cache prefix at runtime
Line 2:     Route::middleware(function ($request, $next) {
Line 3:         try {
Line 4:             $tenant = app('tenant'); // expect detect.tenant to have run before this closure
Line 5:             $slug   = optional($tenant)->slug ?: optional($tenant)->id ?: 'public';
Line 6:             $base   = config('cache.prefix') ?: 'laravel';
Line 7:             // Update runtime cache prefix to isolate keys: <base>:tenant:<slug>
Line 8:             // This affects all Cache operations for the current request lifecycle.
Line 9:             config(['cache.prefix' => $base.':tenant:'.$slug]);
Line 10:        } catch (\Throwable $e) {
Line 11:            // If no tenant, keep default; do not throw to avoid breaking public routes
Line 12:        }
Line 13:        return $next($request);
Line 14:    });
Line 15:    (blank line)
```

### Second Block (Session Guard) - 25 lines per location × 2 = 50 lines total

```
Line 1:     // Inline session guard (no new files): tie session to tenant and prevent cross-tenant reuse
Line 2:     Route::middleware(function ($request, $next) {
Line 3:         try {
Line 4:             $tenant = app('tenant'); // provided by detect.tenant
Line 5:             $tid    = optional($tenant)->id;
Line 6:     (blank line)
Line 7:             // Only enforce for actual tenant contexts
Line 8:             if ($tid) {
Line 9:                 $bound = session('session_tenant_id');
Line 10:                if (!$bound) {
Line 11:                    // First bind for this browser session
Line 12:                    session(['session_tenant_id' => $tid]);
Line 13:                } elseif ((string)$bound !== (string)$tid) {
Line 14:                    // Cross-tenant reuse detected: reset session to avoid leakage
Line 15:                    session()->invalidate();
Line 16:                    session()->regenerateToken();
Line 17:                    session(['session_tenant_id' => $tid]); // rebind to the correct tenant
Line 18:                }
Line 19:            }
Line 20:        } catch (\Throwable $e) {
Line 21:            // Fail-safe: do nothing to avoid blocking
Line 22:        }
Line 23:        return $next($request);
Line 24:    });
Line 25:    (blank line)
```

---

## Summary Table

| Location | Lines Added | Type |
|----------|-------------|------|
| Custom API Group (line ~394) | 40 lines | Cache Prefixer (15) + Session Guard (25) |
| Public API Group (line ~989) | 40 lines | Cache Prefixer (15) + Session Guard (25) |
| **TOTAL** | **80 lines** | **2 blocks × 2 locations** |

---

## Git Diff Output

To see exactly what was added:

```bash
cd /Users/amir/Downloads/paymydine-main-22
git show HEAD:routes.php > /tmp/old_routes.php
git diff --no-index --word-diff /tmp/old_routes.php routes.php
```

Or simply:

```bash
git diff HEAD~1 HEAD -- routes.php
```

---

## No Other Changes

- ❌ No lines removed
- ❌ No other files modified
- ❌ No config changes
- ❌ No new files created
- ✅ Only 80 lines added to routes.php

---

**Created**: 2025-10-10  
**Phase**: 2 (Cache & Session Isolation)  
**Commit**: 5ccbe35  
**Tag**: phase2-cache-session-isolation

