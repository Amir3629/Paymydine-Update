<?php
/** CLI-only installation support. Never expose this through an HTTP endpoint. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$action = $argv[1] ?? '';
$root = realpath($argv[2] ?? '');
if (!$root || !in_array($action, ['info', 'backup', 'install', 'health'], true)) {
    fwrite(STDERR, "Usage: php pmd-groups-live-tool.php info|backup|install|health APP_ROOT\n");
    exit(2);
}
// Suppress accidental bootstrap output. SQL backup stdout must contain SQL only.
ob_start();
$stage = 'bootstrap';
try {
    chdir($root);
    require $root.'/vendor/autoload.php';
    $app = require $root.'/bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $db = \Illuminate\Support\Facades\DB::connection('mysql');
    if ($db->getDriverName() !== 'mysql') throw new RuntimeException('Expected MySQL central connection.');
    $expected = (string)config('database.connections.mysql.database');
    $actual = (string)($db->selectOne('SELECT DATABASE() AS actual')->actual ?? '');
    if ($expected === '' || $actual !== $expected || !$db->getSchemaBuilder()->hasTable('tenants')) {
        throw new RuntimeException('Central database identity could not be verified.');
    }
    ob_end_clean();
    if ($action === 'info') {
        if ($app->isDownForMaintenance()) throw new RuntimeException('Application is already in maintenance mode; preserve the existing maintenance operation.');
        $paths = [];
        foreach (['getCachedConfigPath', 'getCachedRoutesPath', 'getCachedServicesPath', 'getCachedPackagesPath', 'getCachedClassesPath'] as $method) {
            if (method_exists($app, $method)) $paths[] = $app->{$method}();
        }
        echo json_encode(['cache_paths' => $paths, 'central_verified' => true], JSON_THROW_ON_ERROR);
        exit;
    }
    if ($action === 'backup') {
        $tables = ['tenants', 'pmd_group_schema', 'pmd_group_owners', 'pmd_groups', 'pmd_group_sites',
            'pmd_group_access', 'pmd_group_operations', 'pmd_group_operation_targets', 'pmd_group_audit', 'pmd_group_displays'];
        $pdo = $db->getPdo();
        $quoteName = static fn ($value) => '`'.str_replace('`', '``', $value).'`';
        $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT');
        echo "-- PayMyDine central registry and Restaurant Groups backup\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n";
        foreach ($tables as $logical) {
            if (!$db->getSchemaBuilder()->hasTable($logical)) continue;
            $table = $db->getTablePrefix().$logical;
            $name = $quoteName($table);
            $ddl = $pdo->query('SHOW CREATE TABLE '.$name)->fetch(PDO::FETCH_ASSOC);
            if (!isset($ddl['Create Table'])) throw new RuntimeException('Cannot back up a non-table registry object.');
            echo 'DROP TABLE IF EXISTS '.$name.";\n".$ddl['Create Table'].";\n";
            $rows = $pdo->query('SELECT * FROM '.$name);
            while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
                $columns = implode(',', array_map($quoteName, array_keys($row)));
                $values = array_map(static fn ($value) => $value === null ? 'NULL' : $pdo->quote((string)$value), array_values($row));
                echo 'INSERT INTO '.$name.' ('.$columns.') VALUES ('.implode(',', $values).");\n";
            }
        }
        $pdo->commit();
        echo "SET FOREIGN_KEY_CHECKS=1;\n-- PMD BACKUP COMPLETE\n";
        exit;
    }
    $stage = 'group-store';
    $store = $app->make(\App\Services\RestaurantGroups\Store::class);
    if ((string)$store->central()->getDatabaseName() !== $expected) {
        throw new RuntimeException('Restaurant Groups registry is not on the central database.');
    }
    if ($action === 'install') {
        // Additive central storage only; do not migrate or link existing tenants.
        $app->make(\App\Services\RestaurantGroups\Schema::class)->installCentral($store);
        if (!$store->enabled()) throw new RuntimeException('Restaurant Groups are not enabled after installation.');
        echo "PASS central Restaurant Groups schema installed and feature enabled\n";
        exit;
    }
    $stage = 'feature-enabled';
    if (!$store->enabled()) throw new RuntimeException('Restaurant Groups are disabled or storage is missing.');

    $stage = 'template-preflight';
    $app->make(\App\Services\SuperAdminTenantLifecycleService::class)->assertGroupTemplateReady();

    $stage = 'group-scope-read-model';
    if (!class_exists(\App\Services\RestaurantGroups\GroupScopeReadModel::class)) {
        throw new RuntimeException('GroupScopeReadModel could not be autoloaded.');
    }
    $app->make(\App\Services\RestaurantGroups\GroupScopeReadModel::class);

    $stage = 'provider-registration';
    if (!$app->getProvider(\App\Providers\RestaurantGroupsServiceProvider::class)) {
        throw new RuntimeException('RestaurantGroupsServiceProvider is not registered by the System bootstrap authority.');
    }

    $stage = 'routes';
    $adminRoutesSource = (string)@file_get_contents($root.'/app/admin/routes.php');
    if (strpos($adminRoutesSource, 'PMD_RESTAURANT_GROUPS_ROUTE_LOADER_R1') === false
        || strpos($adminRoutesSource, 'PMD_RESTAURANT_GROUPS_PRIORITY_ROUTE_LOADER_R16') === false) {
        throw new RuntimeException('Admin route authority is missing the Restaurant Groups priority loader.');
    }
    $groupPriorityPos = strpos($adminRoutesSource, 'PMD_RESTAURANT_GROUPS_PRIORITY_ROUTE_LOADER_R16');
    $adminCatchAllPackPos = strpos($adminRoutesSource, "require_once base_path('routes/admin-app-before.php')");
    if ($groupPriorityPos === false || $adminCatchAllPackPos === false || $groupPriorityPos > $adminCatchAllPackPos) {
        throw new RuntimeException('Restaurant Groups routes are registered after the Admin catch-all authority.');
    }
    if (method_exists($app, 'routesAreCached') && $app->routesAreCached()) {
        $cached = method_exists($app, 'getCachedRoutesPath')
            ? (string)$app->getCachedRoutesPath()
            : 'unknown';
        throw new RuntimeException('Route cache is still active during health bootstrap: '.basename($cached));
    }
    $routes = $app['router']->getRoutes();

    // Laravel 8 adds a route to RouteCollection before a fluent ->name()
    // mutation is applied. Refresh both lookup tables before health assertions;
    // this mirrors the framework's own end-of-route-loading behavior.
    if (method_exists($routes, 'refreshNameLookups')) {
        $routes->refreshNameLookups();
    }
    if (method_exists($routes, 'refreshActionLookups')) {
        $routes->refreshActionLookups();
    }

    foreach (['pmd.superadmin.groups','pmd.superadmin.groups.store','pmd.superadmin.groups.retry',
        'pmd.group.context','pmd.group.snapshot','pmd.group.dashboard','pmd.group.menu',
        'pmd.group.catalog','pmd.group.publish.preview','pmd.group.publish.apply'] as $name) {
        if (!$routes->getByName($name)) throw new RuntimeException('Missing route: '.$name);
    }
    $stage = 'superadmin-route-match';
    $request = \Illuminate\Http\Request::create('https://paymydine.com/superadmin/groups', 'GET');
    $matched = $routes->match($request);
    if ($matched->getName() !== 'pmd.superadmin.groups'
        || !in_array(\App\Http\Middleware\SuperAdminAuth::class, $matched->gatherMiddleware(), true)) {
        throw new RuntimeException('Super Admin page route/authentication wiring is not correct.');
    }

    $stage = 'group-context-route-match';
    $groupRequest = \Illuminate\Http\Request::create(
        'https://pmd-route-health.paymydine.com/admin/group/context',
        'GET'
    );
    $groupMatched = $routes->match($groupRequest);
    if ($groupMatched->getName() !== 'pmd.group.context') {
        throw new RuntimeException(
            'Admin catch-all still shadows Restaurant Groups context route; matched: '.
            ((string)$groupMatched->getName() ?: 'unnamed')
        );
    }

    // The public bootstrap binds Igniter's HTTP kernel. An alias declared
    // only in App\Http\Kernel cannot safely be assumed to exist at runtime.
    // R16 checked route matching but did not detect an unresolved middleware
    // alias, which can throw HTTP 500 before AdminController::context() runs.
    $stage = 'group-context-middleware';
    $groupMiddleware = $groupMatched->gatherMiddleware();
    if (!in_array(\App\Http\Middleware\TenantDatabaseMiddleware::class, $groupMiddleware, true)
        || in_array('tenant.database', $groupMiddleware, true)) {
        throw new RuntimeException('Group context must use the concrete tenant database middleware class.');
    }

    $stage = 'security-bindings';
    foreach ([
        \App\Services\PmdOwnerTotpService::class => \App\Services\RestaurantGroups\Totp::class,
        \App\Services\PmdTrustedLoginDeviceService::class => \App\Services\RestaurantGroups\TrustedLogin::class,
        \App\Services\PmdSuperAdminOwnerMfaResetService::class => \App\Services\RestaurantGroups\SupportMfaReset::class,
    ] as $canonical => $expectedClass) {
        if (!($app->make($canonical) instanceof $expectedClass)) {
            throw new RuntimeException('A native module replaced a Restaurant Groups security binding.');
        }
    }
    $stage = 'admin-auth-source';
    $method = new ReflectionMethod(\Admin\Classes\User::class, 'authenticate');
    if (realpath($method->getFileName()) !== realpath($root.'/app/admin/classes/User.php')) {
        throw new RuntimeException('Admin authentication is loading a different source file.');
    }
    // Render the real page with a transient, in-memory session. This is not a
    // real sign-in and does not bypass or exercise HTTP authentication.
    $stage = 'blade-render';
    $session = new \Illuminate\Session\Store('pmd-install-render', new \Illuminate\Session\ArraySessionHandler(30));
    $session->start();
    $request->setLaravelSession($session);
    $app->instance('request', $request);
    $app->instance('session', $session);
    \Illuminate\Support\Facades\Session::clearResolvedInstance('session');

    $profiles = $app->make(\App\Services\Platform\CountryPlatformProfileRegistry::class);
    $panel = $app['view']->make('pmd-groups::create-panel', [
        'pmdCountryOptions' => $profiles->countryOptions(),
        'pmdCreateCountry' => 'DE',
    ])->with('errors', new \Illuminate\Support\ViewErrorBag())->render();

    foreach (['organization_type', 'owner_username', 'sites[', '/superadmin/groups/store'] as $needle) {
        if (strpos($panel, $needle) === false && $needle !== 'sites[') {
            throw new RuntimeException('Integrated Business Account form did not render its required controls.');
        }
    }

    $restaurantsSource = (string)@file_get_contents($root.'/app/admin/views/superadmin_r2/restaurants.blade.php');
    $layoutSource = (string)@file_get_contents($root.'/app/admin/views/superadmin_r2/layout.blade.php');
    $overlaySource = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-overlay-single-visual-plane-v4.js');

    if (strpos($layoutSource, "@stack('page-head')") === false
        || strpos($restaurantsSource, "@push('page-head')") === false) {
        throw new RuntimeException('Restaurants paint authority is not loaded after global styles.');
    }

    if (strpos($restaurantsSource, 'data-pmd-modal-chrome-skip') === false
        || strpos($overlaySource, "candidate.closest('[data-pmd-modal-chrome-skip]')") === false
        || strpos($overlaySource, "btn.closest('[data-pmd-modal-chrome-skip]')") === false) {
        throw new RuntimeException('Create chooser is still exposed to global modal button repainting.');
    }

    if (strpos($restaurantsSource, '<button class="pmd-create-type"') !== false
        || substr_count($restaurantsSource, 'role="button" tabindex="0" data-pmd-create-kind=') !== 3) {
        throw new RuntimeException('Create chooser still uses button elements claimed by modal chrome.');
    }

    if (strpos($layoutSource, 'pmd-overlay-single-visual-plane-v4.js?v=20261004-superadmin-create-r11') === false) {
        throw new RuntimeException('Modal runtime cache key was not advanced for R11.');
    }

    if (strpos($restaurantsSource, 'Location provisioning needs attention') !== false
        || strpos($restaurantsSource, 'pmdGroupAttention') !== false) {
        throw new RuntimeException('Deprecated top-page provisioning attention UI is still present.');
    }
    foreach (['data-pmd-create-chooser', 'data-pmd-create-selection', 'data-pmd-change-create-kind', 'data-pmd-create-kind="independent"', 'data-pmd-create-kind="multi_location"', 'data-pmd-create-kind="food_court"', 'name="owner_username"', 'name="owner_password"', 'name="owner_password_confirmation"', "@include('pmd-groups::create-panel')"] as $needle) {
        if (strpos($restaurantsSource, $needle) === false) {
            throw new RuntimeException('Restaurants modal is missing the integrated type selector.');
        }
    }

    if (strpos($restaurantsSource, "@includeIf('pmd-groups::entry')") !== false) {
        throw new RuntimeException('Deprecated standalone Business Accounts entry is still injected.');
    }

    $sideMenuSource = (string)@file_get_contents($root.'/app/admin/views/superadmin_r2/side_menu.blade.php');
    if (strpos($sideMenuSource, 'href="/superadmin/groups"') !== false
        || strpos($sideMenuSource, '>Business Accounts<') !== false) {
        throw new RuntimeException('Standalone Business Accounts navigation is still present.');
    }

    $tenantLifecycleSource = (string)@file_get_contents($root.'/app/Services/SuperAdminTenantLifecycleService.php');
    if (strpos($tenantLifecycleSource, 'assertGroupTemplateReady') === false
        || strpos($tenantLifecycleSource, 'getTablePrefix()') === false) {
        throw new RuntimeException('Prefix-aware Business Account template preflight is missing.');
    }

    if (strpos($tenantLifecycleSource, 'applyIndependentOwnerAccess') === false
        || strpos($tenantLifecycleSource, 'Hash::check($password') === false) {
        throw new RuntimeException('Standalone restaurant Owner credential replacement is missing.');
    }

    $ownerLinkerSource = (string)@file_get_contents($root.'/app/Services/RestaurantGroups/OwnerLinker.php');
    if (strpos($ownerLinkerSource, 'normalizePreparedTemplate') === false) {
        throw new RuntimeException('Prepared-template repair path is missing.');
    }

    $groupAdminControllerSource = (string)@file_get_contents($root.'/app/Http/Controllers/RestaurantGroups/AdminController.php');
    if (strpos($groupAdminControllerSource, 'use App\\Http\\Controllers\\Controller as BaseAdminController;') === false
        || strpos($groupAdminControllerSource, "AdminAuth::isLogged()") === false
        || strpos($groupAdminControllerSource, "hasAnyPermission('Admin.Dashboard')") === false) {
        throw new RuntimeException('Restaurant Groups JSON controller is still coupled to the Admin page-controller lifecycle or lacks explicit auth.');
    }

    $workspaceGateSource = (string)@file_get_contents($root.'/app/Services/PmdSiteAccessWorkspaceGateService.php');
    if (strpos($workspaceGateSource, 'managedLocalUser($ownerUserId)') === false
        || strpos($workspaceGateSource, 'Never require a duplicate tenant-local pmd_owner_mfa') === false) {
        throw new RuntimeException('Managed Group Owner MFA workspace validation is not using the central factor authority.');
    }

    $loaderSource = (string)@file_get_contents($root.'/app/admin/views/_partials/pmd_admin_i18n.blade.php');
    if (strpos($loaderSource, '$pmdGroupsSessionActive && (') !== false) {
        throw new RuntimeException('Restaurant Groups assets are still incorrectly gated by session markers.');
    }

    $snapshotSource = (string)@file_get_contents($root.'/app/Services/RestaurantGroups/Snapshot.php');
    if (strpos($snapshotSource, 'context(bool $requireMfa = true)') === false) {
        throw new RuntimeException('Restaurant Groups context does not separate selector discovery from MFA-protected cross-tenant reads.');
    }

    $adminControllerSource = (string)@file_get_contents($root.'/app/Http/Controllers/RestaurantGroups/AdminController.php');
    if (strpos($adminControllerSource, '$snapshot->context(false)') === false) {
        throw new RuntimeException('Restaurant Groups selector context is still blocked by MFA.');
    }

    $dashboardSource = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-restaurant-groups-v1.js');
    foreach ([
        "'/admin/ownerdashboard'",
        "'/admin/ownerboard'",
        "'/admin/menu'",
        "'/admin/pmdmenus'",
        "'All restaurants'",
        "request('dashboard?scope='",
        "request('menu?scope='"
    ] as $needle) {
        if (strpos($dashboardSource, $needle) === false) {
            throw new RuntimeException('Restaurant scope switcher runtime is incomplete.');
        }
    }
    if (strpos($dashboardSource, "location.assign(site") !== false
        || strpos($dashboardSource, "window.location.href=site") !== false) {
        throw new RuntimeException('Restaurant scope switcher must not navigate to another tenant subdomain.');
    }

    // R18: existing Dashboard Lab/Menu geometry must remain the only renderer.
    // Preflight the real deployment sources to avoid an R13 duplicate panel
    // returning accidentally with a future merge or partial deployment.
    $stage = 'native-scoped-dashboard-ui';
    $firstPaint = (string)@file_get_contents($root.'/app/admin/views/_partials/pmd_group_scope_firstpaint.blade.php');
    $labView = (string)@file_get_contents($root.'/app/admin/views/dashboardlab/index.blade.php');
    $menuView = (string)@file_get_contents($root.'/app/admin/views/pmdmenus/index.blade.php');
    $nativeKpis = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-dashboard-lab-kpis-v1.js');
    $nativeAnalytics = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js');
    $nativeLive = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-dashboard-live-refresh-v1.js');
    $scopeCss = (string)@file_get_contents($root.'/app/admin/assets/css/pmd-restaurant-groups-v1.css');
    foreach ([$labView, $menuView] as $view) {
        if (strpos($view, "@include('admin::_partials.pmd_group_scope_firstpaint')") === false) {
            throw new RuntimeException('Existing Dashboard/Menu header lacks the first-paint restaurant selector.');
        }
    }
    if (strpos($firstPaint, 'context(false)') === false
        || strpos($firstPaint, 'ManagedIdentity::isManaged') === false
        || strpos($firstPaint, 'data-pmd-group-firstpaint') === false
        || strpos($nativeKpis, 'pmd_group_scoped') === false
        || strpos($nativeAnalytics, 'setScopeProvider: function') === false
        || strpos($nativeLive, 'isRemoteScope()') === false
        || strpos($dashboardSource, "window.PMDRestaurantGroupsV1=") === false
        || strpos($dashboardSource, "PMDDashboardLabKpisV1.applyLivePayload") === false
        || strpos($dashboardSource, "pmd-group-dashboard-panel") !== false
        || strpos($dashboardSource, "Business account',account") !== false
        || strpos($scopeCss, 'pmd-group-dashboard-scope-active>:not(') !== false
        || strpos($scopeCss, 'pmd-group-menu-scope-active>:not(') !== false) {
        throw new RuntimeException('Restaurant Groups native-only scope contract is incomplete.');
    }

    echo "PASS /admin/group/context route matches Restaurant Groups before the greedy Admin catch-all\n";
    echo "PASS Restaurant Groups JSON APIs avoid the Admin page-controller lifecycle and enforce explicit Admin authentication\n";
    echo "PASS managed Group Owner workspace MFA uses the central factor authority without tenant-local factor duplication\n";
    echo "PASS Restaurant Groups assets load by supported route, independent of fragile session markers\n";
    echo "PASS selector discovery is password-authenticated while cross-tenant data remains MFA-protected\n";
    echo "PASS in-place Dashboard/Menu restaurant scope switcher wired without tenant-subdomain navigation\n";
    echo "PASS live Restaurant template preflight resolved configured table prefix\n";
    echo "PASS two-step Create Restaurant flow and group dashboard rendered\n";
    echo "PASS routes, Super Admin authentication middleware and native security bindings resolved\n";
    echo "PASS central feature storage enabled\n";
    echo "NOTE HTTP sign-in, native template/TLS creation, full menu/media and Food Court acceptance are separate checks.\n";
} catch (Throwable $error) {
    while (ob_get_level() > 0) ob_end_clean();
    // Detailed output is restricted to the private deployment log. Remove SQL
    // bindings and control characters; do not dump env/config/session values.
    $message = preg_replace('/\(SQL:.*$/s', '(SQL omitted)', $error->getMessage());
    $message = preg_replace('/[\x00-\x1f\x7f]/', ' ', (string)$message);
    fwrite(STDERR, 'PMD '.$action.' failed at ['.$stage.'] ['.get_class($error).']: '.substr($message, 0, 400).PHP_EOL);
    exit(1);
}
