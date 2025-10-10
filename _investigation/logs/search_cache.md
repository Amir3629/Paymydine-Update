`grep -r "\bcache\b" .`

<file_content>
_investigation/logs/search_db_select.md
37:artifacts/cache-qr-notes.md

_investigation/logs/search_db_table.md
160:artifacts/cache-qr-notes.md

_investigation/logs/search_tenant.md
11:39:| `35beb01` | Recent | **Fix tenant bleed: SSR tenant detection and cache isolation** |
27:137:### 2.5 Commit 35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
45:329:**Created in commit**: `35beb01` (Fix tenant bleed: SSR tenant detection and cache isolation)
46:331:**Purpose**: Provide scoped cache keys to prevent cache collisions between tenants.
48:346:**Issue**: Global cache prefix not tenant-scoped.
50:395:35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
65:517:- Cache entries (no cross-tenant cache hits)

CHANGELOG_LAST_30_DAYS.md
39:| `35beb01` | Recent | **Fix tenant bleed: SSR tenant detection and cache isolation** |
137:### 2.5 Commit 35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
147:- **Created** `TableHelper.php` using scoped cache keys
149:**Assessment**: Added cache isolation helpers, but **only adopted in TableHelper**, not system-wide.
224:| `35beb01` | Added cache scoping helpers | Prevent cache bleed | ⚠️ Partially - not widely adopted |
329:**Created in commit**: `35beb01` (Fix tenant bleed: SSR tenant detection and cache isolation)
331:**Purpose**: Provide scoped cache keys to prevent cache collisions between tenants.
335:**Assessment**: **Good pattern, underutilized** - should be adopted everywhere cache is used.
339:### 4.7 config/cache.php
346:**Issue**: Global cache prefix not tenant-scoped.
348:**Assessment**: **NOT fixed** - cache isolation incomplete.
395:35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
423:- Global cache keys
453:- No refactor of existing cache usage
507:**Action**: Refactor all `Cache::` and `cache()` calls to use `TenantHelper::scopedCacheKey()`
517:- Cache entries (no cross-tenant cache hits)
529:35beb01: Added cache scoping helpers (partial fix)

TENANT_HOST_LEAK_INVESTIGATION.md
369:**From `config/cache.php`**:
372:- Path: `storage/framework/cache/data`
375:- Routes cache: DISABLED (`enableRoutesCache => false`)
376:- Template cache: 10 minutes TTL
380:- Route cache disabled

ALL_CHANGED_FILES_LIST.md
186:- app/Helpers/TenantHelper.php (cache scoping utility)

GITHUB_DEPLOYMENT_SUCCESS.md
164:  - cache-qr-notes.md

PREFIX_REFACTOR_FINAL_REPORT.md
141:Configuration cache cleared!

PREFIX_REFACTOR_COMPLETE.md
196:Application cache cleared!
197:Route cache cleared!
198:Configuration cache cleared!

TENANT_FIX_COMPLETE_SUMMARY.md
57:Application cache cleared!
58:Route cache cleared!
59:Configuration cache cleared!

DEPLOYMENT_READY.md
46:Application cache cleared!
47:Route cache cleared!
48:Configuration cache cleared!

storage/logs/system.log
7201:[2025-09-25 21:29:36] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
7825:[2025-09-25 21:29:40] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
8150:[2025-09-25 21:30:14] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
8378:[2025-09-25 21:32:02] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
8466:[2025-09-25 21:32:17] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36

FINAL_TENANT_FIX_VERIFICATION.md
49:Application cache cleared!
50:Route cache cleared!
51:Configuration cache cleared!

CHANGES_SUMMARY.md
88:php artisan cache:clear
254:- [x] Local cache cleared

README_TENANT_FIX.md
242:   - cache-qr-notes.md

TENANT_BLEED_INVESTIGATION_REPORT.md
631:**File**: `config/cache.php:18`
652:// Use tenant-scoped cache key to avoid cross-tenant cache collisions
1002:    'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,

artifacts/cache-qr-notes.md
5:**Cache**: Global prefix used, but caching is minimal in codebase (only TableHelper uses cache).
15:**File**: `config/cache.php`
33:    'path' => storage_path('framework/cache/data'),
37:**Cache files stored at**: `storage/framework/cache/data/`
43:**File**: `config/cache.php:98`
55:**⚠️ ISSUE**: Prefix is **global**, not tenant-scoped. All tenants share same cache prefix.
59:- Full cache key: `tenant_default_cache:menu_list`
61:- Cross-tenant cache poisoning ⚠️
67:**Search Results**: `Cache::remember|cache()`
75:    // Use tenant-scoped cache key to avoid cross-tenant cache collisions
130:- Different cache entries ✓
132:**✓ CORRECT**: TableHelper properly scopes cache keys.
212:- Global cache prefix is still wrong, but has minimal impact currently
221:// BAD - Global cache key
230:**GOOD - Scoped cache key**:
240:// Separate cache entries ✓
548:// config/cache.php:98
643:- ⚠️ Global cache prefix is wrong but has minimal impact currently
655:3. **LOW**: Update global cache prefix name (cosmetic)
682:# Check cache directory
683:ls -la storage/framework/cache/data/

artifacts/README.md
86:### 6. [cache-qr-notes.md](cache-qr-notes.md)
225:- cache-qr-notes.md (cache & QR analysis)

artifacts/executive-summary.md
485:6. **cache-qr-notes.md** - Cache prefix analysis and QR URL scoping issues

TENANCY_OVERVIEW.md
268:**Location**: `config/cache.php:98`
274:**⚠️ ISSUE**: Global prefix `tenant_default_cache` is NOT tenant-scoped. All tenants share the same cache prefix.
313:**⚠️ ADOPTION**: Only `TableHelper` uses scoped cache keys. Other parts of the codebase may not scope cache keys properly.
407:**Global cache prefix**: `tenant_default_cache` for all tenants
427:| `35beb01` | Recent | "Fix tenant bleed: SSR tenant detection and cache isolation" - Added TenantHelper and TableHelper |

INVESTIGATION_SUMMARY.md
25:- Global cache prefix (Section 7.1)
95:35beb01: Added cache scoping helpers (partial)
198:**Evidence**: `config/cache.php:98`
204:- All tenants share same cache prefix
206:- Only `TableHelper` uses scoped cache keys
267:3. Clear all caches: `php artisan cache:clear && php artisan route:clear`
356:- ✓ `app/Helpers/TenantHelper.php` - Provides scoped cache keys (good pattern)
357:- ✓ `app/Helpers/TableHelper.php` - Uses scoped cache keys (good implementation)
361:- ⚠️ `config/cache.php` - Global cache prefix (not tenant-scoped)
382:   - Check actual cache driver in use
388:   - Test cache isolation (if caching is used)
408:4. **MEDIUM: Adopt cache scoping system-wide**
410:   - OR change cache driver to redis with tenant-specific prefixes

OPEN_QUESTIONS.md
142:- Is route cache enabled (`php artisan route:cache`)?
146:- **Cache files**: `bootstrap/cache/routes-v7.php` or similar (if exists)
147:- **Clear cache**: Run `php artisan route:clear` and test
148:- **Config**: `config/cache.php` (line 18: `'default' => env('CACHE_DRIVER', 'file')`)
151:- Clear all caches: `php artisan cache:clear && php artisan route:clear && php artisan config:clear`
159:### Q7: What cache driver is actually in use?
162:- Is it file cache (default)?
169:- **Config**: `config/cache.php:18` (default is `file`)
174:  Route::get('/debug/cache', fn() => response()->json([
175:      'driver' => config('cache.default'),
176:      'prefix' => config('cache.prefix'),
181:- File cache: Each tenant needs file path scoping
183:- Database: Needs tenant_id in cache table
186:**Current config**: `config/cache.php:98` shows `'prefix' => env('CACHE_PREFIX', 'tenant_default_cache')`
192:### Q8: Is cache being used at all in affected flows?
199:- **Menu caching**: Search for `Cache::remember` or `cache()->remember` in:
209:**Assessment**: Cache bleed may not be the primary issue since most queries don't cache.
437:4. Cache in tenant A, verify tenant B gets different cache
523:| Q7 | Active cache driver | Check `.env` and `config/cache.php` | Inform cache isolation approach |
588:// Set cache in tenant A
589:cache()->put('test_key', 'from_amir', 60);
591:// Check cache in tenant B (same key)
592:$value = cache()->get('test_key');
593:// If $value === 'from_amir', cache is NOT isolated
597:cache()->put(TenantHelper::scopedCacheKey('test_key'), 'from_amir', 60);

ROUTES_MIDDLEWARE_COVERAGE.md
20:    'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,

app/Http/Kernel.php
46:        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,

ADMIN_LOGOUT_FIX_COMPLETE.md
516:# Clear cache
518:php artisan cache:clear

README_INVESTIGATION.md
249:2. ⏳ **Clear cache** - `php artisan config:clear`

INVESTIGATION_INDEX.md
250:# 1. Clear cache (CSRF middleware was just enabled)
252:php artisan cache:clear
510:2. **Not persistent:** Lost on deployments, cache clears

docs/ADMIN_LOGOUT_SUMMARY.md
54:- Lost on deployments, cache clears, or container restarts

docs/FINDINGS_Admin_Logout_Issue.md
115:- If storage is cleared (cache clear, deployments), all sessions are invalidated
136:- ✅ Logout happens **after deployment or cache clear**
316:# 2. Network tab → Preserve log → Check "Disable cache"

patches/HOWTO.md
74:# 1. Clear compiled views and cache
76:php artisan cache:clear
251:# Clear cache
279:# Clear cache
307:# Clear cache
368:3. Clear cache: `php artisan config:clear`

patches/README.md
20:# Clear cache
22:php artisan cache:clear
309:# Clear cache

frontend/package-lock.json
4491:        "file-entry-cache": "^8.0.0",
5032:    "node_modules/file-entry-cache": {
5034:      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
5039:        "flat-cache": "^4.0.0"
5074:    "node_modules/flat-cache": {

... and more
