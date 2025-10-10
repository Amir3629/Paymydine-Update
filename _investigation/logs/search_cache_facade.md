`grep -r "Cache::" .`

<file_content>
CHANGELOG_LAST_30_DAYS.md
507:**Action**: Refactor all `Cache::` and `cache()` calls to use `TenantHelper::scopedCacheKey()`

TENANT_BLEED_INVESTIGATION_REPORT.md
654:return Cache::remember($cacheKey, 300, function() use ($tableId) {

artifacts/cache-qr-notes.md
67:**Search Results**: `Cache::remember|cache()`
77:    return Cache::remember($cacheKey, 300, function() use ($tableId) {
222:Cache::remember('menu_list', 3600, function() {
234:Cache::remember($key, 3600, function() {
563:Cache::remember($key, 3600, function() {
571:Cache::remember('menu_list', 3600, function() {

TENANCY_OVERVIEW.md
308:return Cache::remember($cacheKey, 300, function() use ($tableId) {

OPEN_QUESTIONS.md
199:- **Menu caching**: Search for `Cache::remember` or `cache()->remember` in:
530:| Q8 | Cache usage extent | Search for `Cache::` calls | May not be primary issue |

app/Helpers/TableHelper.php
21:        return Cache::remember($cacheKey, 300, function() use ($tableId) {
78:        Cache::forget($cacheKey);

vendor/laravel/framework/src/Illuminate/Console/Scheduling/Schedule.php
199:        if (! Container::getInstance()->bound(Cache::class)) {
203:        if (! (new UniqueLock(Container::getInstance()->make(Cache::class)))->acquire($job)) {

app/main/classes/ChainFileSource.php
64:                Cache::forget($cacheKey);
67:            $pathCache[] = Cache::rememberForever($cacheKey, function () use ($source) {

app/main/classes/Router.php
116:                        Cache::put(
208:        $cached = $cacheable ? Cache::get($this->getUrlMapCacheKey(), false) : false;
223:                Cache::put(
243:        Cache::forget($this->getUrlMapCacheKey());
244:        Cache::forget($this->getUrlListCacheKey());
335:        $urlList = Cache::get($key, false);

app/main/classes/MediaLibrary.php
57:        $cached = Cache::get(self::$cacheKey, false);
73:            Cache::put(
342:        Cache::forget(self::$cacheKey);

app/system/helpers/CacheHelper.php
18:        Cache::flush();

app/system/aliases.php
10:    'Cache' => Illuminate\Support\Facades\Cache::class,

app/system/models/Mail_themes_model.php
72:        Cache::forget($cacheKey);
81:        if (Cache::has($cacheKey)) {
82:            return Cache::get($cacheKey);
87:            Cache::forever($cacheKey, $customCss);

app/system/classes/HubManager.php
59:        if ($force || !$response = Cache::get($cacheKey)) {
67:                Cache::put($cacheKey, $response, $this->cacheTtl);

vendor/laravel/framework/src/Illuminate/Queue/CallQueuedHandler.php
209:                    : $this->container->make(Cache::class);

app/system/traits/CombinesAssets.php
402:        if (!Cache::has($this->cacheKeyPrefix.$cacheKey)) {
406:        return @unserialize(@base64_decode(Cache::get($this->cacheKeyPrefix.$cacheKey)));
411:        if (Cache::has($this->cacheKeyPrefix.$cacheKey))
414:        Cache::forever($this->cacheKeyPrefix.$cacheKey, base64_encode(serialize($cacheData)));

vendor/laravel/framework/src/Illuminate/Queue/Middleware/WithoutOverlapping.php
65:        $lock = Container::getInstance()->make(Cache::class)->lock(

vendor/laravel/framework/src/Illuminate/Support/Facades/Event.php
43:        Cache::refreshEventDispatcher();
80:            Cache::refreshEventDispatcher();
101:            Cache::refreshEventDispatcher();
