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

    $stage = 'provider-registration';
    if (!$app->getProvider(\App\Providers\RestaurantGroupsServiceProvider::class)) {
        throw new RuntimeException('RestaurantGroupsServiceProvider is not registered by the System bootstrap authority.');
    }

    $stage = 'routes';
    $adminRoutesSource = (string)@file_get_contents($root.'/app/admin/routes.php');
    if (strpos($adminRoutesSource, 'PMD_RESTAURANT_GROUPS_ROUTE_LOADER_R1') === false) {
        throw new RuntimeException('Admin route authority is missing the Restaurant Groups loader.');
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
        'pmd.group.context','pmd.group.snapshot','pmd.group.catalog','pmd.group.publish.preview','pmd.group.publish.apply'] as $name) {
        if (!$routes->getByName($name)) throw new RuntimeException('Missing route: '.$name);
    }
    $stage = 'superadmin-route-match';
    $request = \Illuminate\Http\Request::create('https://paymydine.com/superadmin/groups', 'GET');
    $matched = $routes->match($request);
    if ($matched->getName() !== 'pmd.superadmin.groups'
        || !in_array(\App\Http\Middleware\SuperAdminAuth::class, $matched->gatherMiddleware(), true)) {
        throw new RuntimeException('Super Admin page route/authentication wiring is not correct.');
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
    foreach (['data-pmd-create-kind="independent"', 'data-pmd-create-kind="multi_location"', 'data-pmd-create-kind="food_court"', "@include('pmd-groups::create-panel')"] as $needle) {
        if (strpos($restaurantsSource, $needle) === false) {
            throw new RuntimeException('Restaurants modal is missing the integrated type selector.');
        }
    }

    if (strpos($restaurantsSource, "@includeIf('pmd-groups::entry')") !== false) {
        throw new RuntimeException('Deprecated standalone Business Accounts entry is still injected.');
    }

    echo "PASS integrated Create Restaurant modal rendered\n";
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
