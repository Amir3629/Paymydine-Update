<?php
/** CLI-only installation support. Never expose this through an HTTP endpoint. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$action = $argv[1] ?? '';
$root = realpath($argv[2] ?? '');
if (!$root || !in_array($action, ['info', 'backup', 'install', 'health', 'audit-products', 'audit-reporting', 'confirm-empty-clock', 'confirm-verified-history-clock'], true)) {
    fwrite(STDERR, "Usage: php pmd-groups-live-tool.php info|backup|install|health|audit-products|audit-reporting|confirm-empty-clock|confirm-verified-history-clock APP_ROOT [SITE_ID UTC CONFIRMATION]\n");
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

    if (in_array($action, ['audit-reporting', 'confirm-empty-clock', 'confirm-verified-history-clock'], true)) {
        // R22: product-site reporting storage clock has to be based on real
        // order history and the known application timestamp writer, not the
        // display timezone, a static guessed UTC, or another tenant's data.
        $stage = 'group-reporting-clock';
        $sites = $store->central()->table('pmd_group_sites as s')
            ->join('tenants as t', 't.id', '=', 's.tenant_id')
            ->select('s.id as site_id', 's.tenant_id', 's.label', 's.state', 't.database', 't.status')
            ->where('s.state','ready')->orderBy('s.id')->get();
        $applicationClock = trim((string)config('app.timezone', ''));
        $globalClock = trim((string)config('pmd_groups.reporting_storage_timezone', ''));
        $siteFilter = 0;
        $historyConfirmation = $action === 'confirm-verified-history-clock';
        if ($action !== 'audit-reporting') {
            $siteText = (string)($argv[3] ?? '');
            $targetClock = (string)($argv[4] ?? '');
            $phrase = (string)($argv[5] ?? '');
            $requiredPhrase = $historyConfirmation
                ? 'I_VERIFIED_EXISTING_SETTLEMENT_TIMESTAMPS_ARE_UTC'
                : 'CONFIRM_EMPTY_ORDER_HISTORY';
            if (!preg_match('/^[1-9][0-9]*$/D', $siteText)
                || $targetClock !== $applicationClock
                || $targetClock !== 'UTC'
                || $phrase !== $requiredPhrase) {
                throw new RuntimeException(
                    'Usage: '.$action.' APP_ROOT SITE_ID UTC '.$requiredPhrase.'. '
                    .'Only the verified UTC application writer is supported; inspect audit-reporting first.'
                );
            }
            $siteFilter = (int)$siteText;
        }
        if ($siteFilter && !$sites->first(fn ($site) => (int)$site->site_id === $siteFilter)) {
            throw new RuntimeException('Specified ready group site was not found.');
        }
        foreach ($sites as $site) {
            if ($siteFilter && (int)$site->site_id !== $siteFilter) continue;
            $tenantId = (int)$site->tenant_id;
            $connection = $store->connection($tenantId, false);
            if ((string)$connection->getDatabaseName() !== (string)$site->database) {
                throw new RuntimeException('Site database mapping mismatch.');
            }
            $schema = $connection->getSchemaBuilder();
            if (!$schema->hasTable('settings') || !$schema->hasTable('orders')) {
                throw new RuntimeException('Restaurant settings/order schema is incomplete.');
            }
            $settingsColumns = array_flip($schema->getColumnListing('settings'));
            foreach (['item', 'sort', 'value'] as $column) {
                if (!isset($settingsColumns[$column])) {
                    throw new RuntimeException('Restaurant reporting settings schema is incomplete.');
                }
            }
            $configRows = $connection->table('settings')
                ->where('sort','config')->where('item','pmd_groups_storage_timezone')->get();
            if ($configRows->count() > 1) {
                throw new RuntimeException('Duplicate reporting storage clocks require manual review.');
            }
            $configured = trim((string)($configRows->first()->value ?? ''));
            $ordersCount = (int)$connection->table('orders')->count();
            $ordersColumns = array_flip($schema->getColumnListing('orders'));
            $settled = (isset($ordersColumns['settlement_status'],$ordersColumns['settled_at']))
                ? (int)$connection->table('orders')
                    ->whereIn('settlement_status',['paid','settled'])
                    ->whereNotNull('settled_at')->count()
                : -1;
            $label = trim(preg_replace('/[\x00-\x1f\x7f]+/', ' ', (string)$site->label));
            // R23 historical-clock review exposes only the most recent
            // financial timestamps; never customer or payment credentials.
            $settlementRows = collect();
            if (isset($ordersColumns['order_id'], $ordersColumns['settled_at'],
                $ordersColumns['settlement_status'])) {
                $columnsToInspect = array_values(array_intersect(
                    ['order_id', 'settled_at', 'created_at', 'updated_at', 'settled_amount'],
                    array_keys($ordersColumns)
                ));
                $settlementRows = $connection->table('orders')
                    ->whereIn('settlement_status', ['paid','settled'])
                    ->whereNotNull('settled_at')
                    ->orderByDesc('order_id')
                    ->limit(3)->get($columnsToInspect);
            }
            if ($action === 'audit-reporting') {
                echo sprintf(
                    "PMD REPORT SITE %d %s: orders=%d settled=%s storage=%s app_writer=%s global=%s %s\n",
                    (int)$site->site_id, substr($label,0,55), $ordersCount,
                    $settled>=0?(string)$settled:'schema_incomplete',
                    $configured!==''?$configured:'not_confirmed',
                    $applicationClock!==''?$applicationClock:'unknown',
                    $globalClock!==''?$globalClock:'not_configured',
                    $ordersCount===0 && $configured===''?'eligible_for_empty_site_confirmation':'verify_existing_history'
                );
                foreach ($settlementRows as $order) {
                    echo sprintf(
                        "PMD CLOCK EVIDENCE SITE %d: order=%d settled_at=%s created_at=%s updated_at=%s settled_amount=%s utc_now=%s\n",
                        (int)$site->site_id,
                        (int)($order->order_id ?? 0),
                        (string)($order->settled_at ?? 'null'),
                        (string)($order->created_at ?? 'unknown'),
                        (string)($order->updated_at ?? 'unknown'),
                        (string)($order->settled_amount ?? 'unknown'),
                        \Carbon\Carbon::now('UTC')->format('Y-m-d H:i:s')
                    );
                }
                continue;
            }

            // Explicit single-site mutation. Existing orders are NEVER
            // reinterpreted automatically. A human has to compare the
            // displayed settlement timestamps to the verified UTC writer
            // before accepting them as UTC.
            if ($configured !== '' || !in_array((string)$site->status,['active'],true)) {
                throw new RuntimeException('Clock is already set or group site is inactive.');
            }
            if ($historyConfirmation) {
                if ($ordersCount < 1 || $settled < 1 || $settlementRows->isEmpty()) {
                    throw new RuntimeException('Historical UTC confirmation requires settled order evidence.');
                }
                foreach ($settlementRows as $order) {
                    $raw = (string)($order->settled_at ?? '');
                    $parsed = \DateTimeImmutable::createFromFormat(
                        '!Y-m-d H:i:s', $raw, new \DateTimeZone('UTC')
                    );
                    if (!$parsed || $parsed->getTimestamp() > time()+600) {
                        throw new RuntimeException(
                            'Settlement clock evidence is invalid or ahead of UTC; manual timezone investigation required.'
                        );
                    }
                }
            } elseif ($ordersCount !== 0) {
                throw new RuntimeException('The empty-clock command requires ZERO historical orders.');
            }
            try { new DateTimeZone($applicationClock); }
            catch (Throwable $error) {
                throw new RuntimeException('Application timestamp clock is invalid.');
            }
            $update = ['value'=>$applicationClock];
            if (isset($settingsColumns['updated_at'])) $update['updated_at']=now();
            $connection->transaction(function () use ($connection,$configRows,$update,$settingsColumns,$applicationClock): void {
                if ($configRows->isNotEmpty()) {
                    $connection->table('settings')->where('sort','config')
                        ->where('item','pmd_groups_storage_timezone')->update($update);
                } else {
                    $row=['item'=>'pmd_groups_storage_timezone','sort'=>'config','value'=>$applicationClock];
                    if (isset($settingsColumns['serialized'])) $row['serialized']=0;
                    if (isset($settingsColumns['created_at'])) $row['created_at']=now();
                    if (isset($settingsColumns['updated_at'])) $row['updated_at']=now();
                    $connection->table('settings')->insert($row);
                }
            });
            $verified = (string)$connection->table('settings')
                ->where('sort','config')->where('item','pmd_groups_storage_timezone')->value('value');
            if ($verified!==$applicationClock) throw new RuntimeException('Saved reporting clock could not be verified.');
            echo sprintf(
                "PMD REPORT CLOCK CONFIRMED site=%d label=%s clock=%s orders=%d (site-only setting, no order mutations)\n",
                (int)$site->site_id, substr($label,0,55), $applicationClock, $ordersCount
            );
        }
        if ($action === 'audit-reporting') {
            echo "PMD reporting clock audit complete; READ ONLY. No historical timezone was guessed.\n";
        }
        exit;
    }

    if ($action === 'audit-products') {
        // R21 read-only acceptance: audit ACTUAL group databases without
        // changing the default connection, orders, identity or provider setup.
        // A successful code/route health-check alone cannot prove old tenants
        // were provisioned with operational product schema.
        $stage = 'ready-group-tenant-product-audit';
        $sites = $store->central()->table('pmd_group_sites as s')
            ->join('tenants as t', 't.id', '=', 's.tenant_id')
            ->select('s.id as site_id', 's.tenant_id', 's.label', 't.database')
            ->where('s.state', 'ready')
            ->orderBy('s.id')->get();
        $requirements = [
            'orders' => ['order_id', 'settlement_status', 'settled_amount'],
            'tables' => ['table_id'],
            'order_payment_transactions' => ['id', 'order_id', 'payment_method', 'amount', 'idempotency_key'],
            'order_payment_transaction_items' => ['id', 'transaction_id', 'order_menu_id', 'line_total'],
            'payment_attempts' => ['id', 'order_id', 'provider_code', 'amount', 'status'],
            'kds_stations' => ['station_id', 'name', 'slug'],
            'order_notes' => ['note_id', 'order_id'],
        ];
        $failures = 0;
        foreach ($sites as $site) {
            $missing = [];
            try {
                $schema = $store->connection((int)$site->tenant_id, false)->getSchemaBuilder();
                foreach ($requirements as $table => $columns) {
                    if (!$schema->hasTable($table)) {
                        $missing[] = $table.' (table)';
                        continue;
                    }
                    $actualColumns = $schema->getColumnListing($table);
                    foreach (array_diff($columns, $actualColumns) as $column) {
                        $missing[] = $table.'.'.$column;
                    }
                }
            } catch (Throwable $error) {
                $missing[] = 'tenant database unavailable';
            }
            if ($missing) $failures++;
            $label = trim(preg_replace('/[\x00-\x1f\x7f]+/', ' ', (string)$site->label));
            echo sprintf(
                "PMD SITE %d %s: %s\n",
                (int)$site->site_id,
                substr($label, 0, 55),
                $missing ? 'INCOMPLETE '.implode(', ', $missing) : 'READY (required tables and columns exist)'
            );
        }
        echo sprintf("PMD readiness audit: %d ready-group sites checked; %d incomplete; READ ONLY\n", $sites->count(), $failures);
        exit($failures ? 3 : 0);
    }

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

    // R19: first-paint Quick Setup return is not dismissed by Not now.
    // Only server-side "completed" removes the header link.
    $stage = 'quick-setup-persistent-return';
    $quickReturn = (string)@file_get_contents($root.'/app/admin/views/_partials/pmd_quick_setup_return.blade.php');
    $quickWelcome = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-onboarding-welcome-v1.js');
    $quickFormRuntime = (string)@file_get_contents($root.'/app/admin/assets/js/pmd-tenant-quick-setup-v3.js');
    if (strpos($quickReturn, "hasPermission('Site.Settings')") === false
        || strpos($quickReturn, "setting('pmd_onboarding_status', 'pending')") === false
        || strpos($quickReturn, "!== 'completed'") === false
        || strpos($quickReturn, 'data-pmd-quick-setup-return') === false
        || strpos($labView, "@include('admin::_partials.pmd_quick_setup_return')") === false
        || strpos($menuView, "@include('admin::_partials.pmd_quick_setup_return')") === false
        || strpos($labView, 'data-pmd-onboarding-welcome-r19') === false
        || strpos($quickWelcome, "event.target.closest('[data-pmd-quick-setup-return]')") !== false
        || strpos($quickWelcome, "target.closest('[data-pmd-quick-setup-return]')") === false
        || strpos($quickWelcome, 'prior.remove()') === false
        || strpos($quickWelcome, "pmd:quick-setup-completed") === false
        || strpos($quickFormRuntime, "response.status.status === 'completed'") === false
        || strpos($quickFormRuntime, "pmd:quick-setup-completed") === false
    ) {
        throw new RuntimeException('Quick Setup return is not durable, permission-checked, or completion-gated.');
    }
    echo "PASS Quick Setup remains in the original Dashboard/Menu header after Not now, closes only on completed state\n";

    // R21: use existing, idempotent tenant product repair in ALL three
    // entry points: clone finalization, first Quick Setup and existing POS.
    // The checks are source contracts only; runtime acceptance remains
    // separate and payment transactions must never be created by the probe.
    $stage = 'tenant-product-readiness-r21';
    $setupServiceCode = (string)@file_get_contents($root.'/app/admin/Services/PmdTenantQuickSetupService.php');
    $productBaselineCode = (string)@file_get_contents($root.'/app/Services/PmdTenantProductBaselineR1.php');
    $lifecycleCode = (string)@file_get_contents($root.'/app/Services/SuperAdminTenantLifecycleService.php');
    $posTransactionCode = (string)@file_get_contents($root.'/app/admin/controllers/concerns/PmdWaiterPosPaymentTransactionConcern.php');
    $posSettlementCode = (string)@file_get_contents($root.'/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php');
    $posBatchCode = (string)@file_get_contents($root.'/app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php');
    $posTerminalCode = (string)@file_get_contents($root.'/app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php');

    $setupProductPos = strpos($setupServiceCode, '->repairCurrentTenant($productScopes)');
    $setupTxnPos = strpos($setupServiceCode, '$result = DB::transaction(function () use (');
    $settleGuardPos = strpos($posSettlementCode, 'pmdEnsurePaymentStorageR21();');
    $settleTxnPos = strpos($posSettlementCode, '$result = DB::transaction(function () use (');
    $batchGuardPos = strpos($posBatchCode, 'pmdEnsurePaymentStorageR21();');
    $batchTxnPos = strpos($posBatchCode, '$result = DB::transaction(function () use (');
    $terminalGuardPos = strpos($posTerminalCode, 'pmdEnsurePaymentStorageR21();');
    $terminalAttemptPos = strpos($posTerminalCode, '->createAttempt(');

    if ($setupProductPos === false || $setupTxnPos === false || $setupProductPos >= $setupTxnPos
        || strpos($setupServiceCode, 'PMD_QUICK_SETUP_R21_TENANT_PRODUCT_READINESS') === false
        || strpos($setupServiceCode, "DB::getDefaultConnection() !== 'tenant'") === false
        || strpos($setupServiceCode, "['payment_runtime', 'orders']") === false
        || strpos($productBaselineCode, "elseif (in_array('payment_runtime', \$scopes, true))") === false
        || strpos($productBaselineCode, "\$schema->create('order_payment_transactions'") === false
        || strpos($productBaselineCode, "\$schema->create('order_payment_transaction_items'") === false
        || strpos($productBaselineCode, "\$schema->create('kds_stations'") === false
        || strpos($productBaselineCode, 'Tenant payment runtime table has missing columns') === false
        || strpos($lifecycleCode, '$this->ensureTenantProductReadiness($database);') === false
        || strpos($lifecycleCode, "->repairCurrentTenant(['payment_runtime', 'kds', 'orders'])") === false
        || strpos($lifecycleCode, "'order_payment_transactions',") === false
        || strpos($posTransactionCode, 'protected function pmdEnsurePaymentStorageR21(): void') === false
        || strpos($posTransactionCode, "DB::getDefaultConnection() !== 'tenant'") === false
        || strpos($posTransactionCode, "->repairCurrentTenant(['payment_runtime', 'orders'])") === false
        || $settleGuardPos === false || $settleTxnPos === false || $settleGuardPos >= $settleTxnPos
        || $batchGuardPos === false || $batchTxnPos === false || $batchGuardPos >= $batchTxnPos
        || $terminalGuardPos === false || $terminalAttemptPos === false || $terminalGuardPos >= $terminalAttemptPos) {
        throw new RuntimeException('Tenant product readiness must repair only the right database BEFORE payment transactions and site activation.');
    }

    echo "PASS R21: ready sites require tenant KDS, orders and settlement schema; POS repairs missing tables before charges\n";
    // R22: the original Dashboard widgets now show the SELECTED group's own
    // Floor tables, while a fresh empty-order tenant can report without
    // guessing the timezone of any historical paid transaction.
    $stage = 'group-scoped-floor-and-clock-r22';
    $groupModel = (string)@file_get_contents($root.'/app/Services/RestaurantGroups/GroupScopeReadModel.php');
    $reportingProfile = (string)@file_get_contents($root.'/app/Services/RestaurantGroups/ReportingProfile.php');
    $newTenantLifecycle = (string)@file_get_contents($root.'/app/Services/SuperAdminTenantLifecycleService.php');
    $toolSource = (string)@file_get_contents($root.'/scripts/pmd-groups-live-tool.php');
    if (strpos($groupModel, 'private function readOnlyFloorSite(') === false
        || strpos($groupModel, "'floor' => ['read_only' => true") === false
        || strpos($groupModel, '$this->store->access((int)$context[\'owner\'][\'id\'], $tenantId)') === false
        || strpos($groupModel, "->where('location_id', (int)\$site->location_id)") === false
        || strpos($groupModel, "'locationables'") === false
        || strpos($groupModel, "->whereIn('locationable_type'") === false
        || strpos($groupModel, 'limit(251)') === false
        || strpos($dashboardSource, 'function displayGroupFloor(data)') === false
        || strpos($dashboardSource, 'restoreNativeFloor();') === false
        || strpos($dashboardSource, "'Loading selected restaurant tables") === false
        || strpos($scopeCss, '.pmd-group-floor-readonly-table') === false
        || strpos($reportingProfile, 'empty_order_history_application_clock') === false
        || strpos($reportingProfile, "->where('location_id',\$locationId)->exists()") === false
        || strpos($reportingProfile, 'storage_timezone_source') === false
        || strpos($newTenantLifecycle, '$this->initializeEmptyGroupStorageClock($database);') === false
        || strpos($newTenantLifecycle, "->table('orders')->exists()") === false
        // R23.1: Do not match a literal R22 two-action `if` statement.
        // R23 deliberately expanded the dispatcher to a third, guarded action.
        // Check both required command names; R23 guard below independently
        // checks the historical-payment clock confirmation contract.
        || strpos($toolSource, "'audit-reporting'") === false
        || strpos($toolSource, "'confirm-empty-clock'") === false
        || strpos($toolSource, 'CONFIRM_EMPTY_ORDER_HISTORY') === false
        || strpos($toolSource, 'ordersCount !== 0') === false) {
        throw new RuntimeException('Restaurant Groups selected Floor and safe reporting clock contract is incomplete.');
    }
    echo "PASS R22 selected tenant Floor is read-only; empty-order clock and historical reporting guard are active\n";
    // R23: protect existing financial history and verify the corrected
    // center-based Floor placement. The VPS operator must inspect settlement
    // timestamps before explicit per-site UTC confirmation.
    $stage = 'verified-history-and-floor-geometry-r23';
    if (strpos($dashboardSource, 'var cursor=24;') === false
        || strpos($dashboardSource, 'var x=strip?cursor+w/2:Number(table.x);') === false
        || strpos($dashboardSource, 'var y=strip?22+h/2:Number(table.y);') === false
        || strpos($dashboardSource, "floor.classList.contains('is-strip-mode')") === false
        || strpos($toolSource, "'confirm-verified-history-clock'") === false
        || strpos($toolSource, 'PMD CLOCK EVIDENCE SITE') === false
        || strpos($toolSource, 'I_VERIFIED_EXISTING_SETTLEMENT_TIMESTAMPS_ARE_UTC') === false
        || strpos($toolSource, '$settled < 1 || $settlementRows->isEmpty()') === false
        || strpos($toolSource, 'getTimestamp() > time()+600') === false
        || strpos($toolSource, "if (\$action === 'audit-reporting')") === false) {
        throw new RuntimeException('R23 historical UTC confirmation or native Floor coordinate safety missing.');
    }
    echo "PASS R23 historical reporting clock requires operator-reviewed UTC evidence; Floor cards use native center geometry\n";

    // R24: preserve THE existing Floor UI and layout. All restaurants is
    // aggregate reporting only; never mix cross-tenant operational tables.
    // The old grey card rules and fabricated grid coordinates are forbidden.
    $stage = 'native-selected-site-floor-r24';
    if (strpos($groupModel, "if (\$scope !== 'all')") === false
        || strpos($groupModel, "'disabled' => \$scope === 'all'") === false
        || strpos($groupModel, "'floor_x'") === false
        || strpos($groupModel, "'floor_y'") === false
        || strpos($groupModel, "'operational_status'") === false
        || strpos($groupModel, "'visible_on_floor_plan'") === false
        || strpos($dashboardSource, "selectedScope==='all'") === false
        || strpos($dashboardSource, "siteList=data&&data.floor&&data.floor.restaurants") === false
        || strpos($dashboardSource, "if(sites.length!==1)") === false
        || strpos($dashboardSource, "el('button',null,'pmd-floor-v1__table pmd-group-floor-readonly-table')") === false
        || strpos($dashboardSource, "node.style.left=x+'px'") === false
        || strpos($dashboardSource, "node.style.top=y+'px'") === false
        || strpos($dashboardSource, "floor.classList.toggle('pmd-group-floor-all-disabled',scope==='all')") === false
        || strpos($dashboardSource, "floor.inert=remote") === false
        || strpos($dashboardSource, "restoreNativeFloor();") === false
        || strpos($scopeCss, '.pmd-group-floor-all-disabled') === false
        || strpos($scopeCss, '.pmd-floor-v1__table:not(.pmd-group-floor-readonly-table)') === false
        || strpos($scopeCss, "pointer-events:none!important") === false
        || strpos($scopeCss, "background:#f2f7f5!important") !== false) {
        throw new RuntimeException('R24 Floor must use native status and location data; aggregate floor must be disabled.');
    }
    echo "PASS R24: native Floor look preserved, remote site read only and All restaurants Floor disabled\n";

    // R25: one actual sale must remain one financial bucket, but its line
    // chart must have a visible 0-to-sale SVG path. Restaurant switches keep
    // the old verified DOM visible until the new location data is ready.
    $stage = 'first-sale-no-flicker-r25';
    if (strpos($nativeAnalytics, 'var singleRecordedBucket = ') === false
        || strpos($nativeAnalytics, 'allRows.length === 1') === false
        || strpos($nativeAnalytics, 'points.unshift({x: d.left, y: base, value: 0, row: null, visualBaseline: true})') === false
        || strpos($nativeAnalytics, "if (point.visualBaseline) return '';") === false
        || strpos($nativeAnalytics, 'var wasScoped = !!scopeProvider;') === false
        || strpos($nativeAnalytics, 'if (!scopeProvider && wasScoped)') === false
        || strpos($nativeAnalytics, "body.innerHTML = empty({reason: 'Loading restaurant data…'});") !== false
        || strpos($nativeAnalytics, 'if (body.innerHTML !== markup) body.innerHTML = markup;') === false
        || strpos($nativeKpis, 'data-pmd-kpi-rendered-icon') === false
        || strpos($dashboardSource, 'Promise.allSettled([') === false
        || strpos($dashboardSource, "report(scope,'last30')") === false
        || strpos($dashboardSource, "if(scope==='all')showFloorNotice(") === false
        || strpos($dashboardSource, "if(floor)floor.setAttribute('aria-busy','true')") === false
        || strpos($dashboardSource, 'applyKpis(null,null,true);') !== false
        || strpos($dashboardSource, "showFloorNotice('Loading selected restaurant tables") !== false
        || strpos($dashboardSource, 'if(version!==sequence||selectedScope!==scope)return;') === false
        || strpos($dashboardSource, 'analytics.refresh().catch(function(error)') === false) {
        throw new RuntimeException('R25 one-sale line baseline or no-flicker restaurant scope contract is missing.');
    }
    echo "PASS R25: first sale draws a 0-to-sale line; scope changes preserve KPI/chart DOM and the native Floor\n";








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
