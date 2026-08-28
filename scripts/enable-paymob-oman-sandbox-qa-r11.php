<?php

declare(strict_types=1);

use Admin\Models\Payments_model;
use App\Services\Payments\PaymobOmanConnectionService;
use App\Services\Payments\PaymobOmanPaymentAttemptService;
use App\Services\Payments\PaymobOmanRuntimeGate;
use App\Services\Payments\PaymobOmanRuntimeService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$domain = strtolower(trim((string)($argv[1] ?? '')));
if ($domain === '') {
    fwrite(STDERR, "Usage: php scripts/enable-paymob-oman-sandbox-qa-r11.php omantest.paymydine.com\n");
    exit(2);
}
if (!str_contains($domain, '.')) $domain .= '.paymydine.com';

try {
    $tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$domain])->first();
    if (!$tenant || empty($tenant->database)) throw new RuntimeException('Tenant was not found.');

    Config::set('database.connections.mysql.database', (string)$tenant->database);
    Config::set('database.default', 'mysql');
    DB::purge('mysql');
    DB::reconnect('mysql');
    DB::setDefaultConnection('mysql');

    $location = Schema::hasTable('locations') ? DB::table('locations')->orderBy('location_id')->first() : null;
    $country = null;
    if ($location && Schema::hasTable('countries')) {
        $country = DB::table('countries')->where('country_id', (int)($location->location_country_id ?? 0))->first();
    }
    if (strtoupper(trim((string)($country->iso_code_2 ?? ''))) !== 'OM') {
        throw new RuntimeException('Sandbox Paymob activation is allowed only for an Oman tenant.');
    }

    $connection = app(PaymobOmanConnectionService::class);
    $runtimeConfig = $connection->runtimeConfig();
    $mode = strtolower(trim((string)($runtimeConfig['mode'] ?? 'test')));
    if ($mode !== 'test') throw new RuntimeException('Refusing QA activation: Paymob provider is not in Test mode.');

    $gate = PaymobOmanRuntimeGate::state($runtimeConfig);
    if (!($gate['sandbox_qa_enabled'] ?? false)) {
        throw new RuntimeException('PMD_PAYMOB_OMAN_SANDBOX_QA is not enabled through config/paymob_oman.php. Set it to true in the server environment, clear config cache, then retry.');
    }
    if (PaymobOmanRuntimeGate::guestReady()) {
        throw new RuntimeException('This script is for sandbox QA only; production guest gate is unexpectedly open.');
    }

    $readiness = $connection->readiness();
    if (!($readiness['ready'] ?? false)) {
        throw new RuntimeException((string)($readiness['structural']['message'] ?? 'Paymob Test configuration is incomplete.'));
    }

    // Safe authentication-only call; this creates no Intention and charges nothing.
    $connectionTest = $connection->test(null, true);
    if (!($connectionTest['ok'] ?? false)) {
        throw new RuntimeException('Paymob API connection test failed: '.(string)($connectionTest['message'] ?? 'unknown error'));
    }

    $runtime = new PaymobOmanRuntimeService($runtimeConfig);
    $runtimeState = $runtime->state();
    $configuredMethods = [];
    foreach (['om_card','om_omannet','om_apple_pay','om_google_pay'] as $code) {
        $methodState = (array)($runtimeState['methods'][$code] ?? []);
        if ($methodState['integration_configured'] ?? false) $configuredMethods[] = $code;
    }
    if (!$configuredMethods) throw new RuntimeException('No Paymob Oman Integration ID is configured for Test mode.');

    app(PaymobOmanPaymentAttemptService::class)->ensureSchema();

    $provider = Payments_model::query()->where('code', 'paymob')->first();
    if (!$provider) throw new RuntimeException('Paymob provider row is missing.');
    $provider->status = 1;
    $provider->is_default = 0;
    $provider->save();

    $enabled = [];
    foreach (['om_card','om_omannet','om_apple_pay','om_google_pay'] as $code) {
        $row = Payments_model::query()->where('code', $code)->first();
        if (!$row) continue;
        $shouldEnable = in_array($code, $configuredMethods, true);

        $connectionDb = $row->getConnection();
        $table = $row->getTable();
        $columns = $connectionDb->getSchemaBuilder()->getColumnListing($table);
        $update = [];
        if (in_array('status', $columns, true)) $update['status'] = $shouldEnable ? 1 : 0;
        if (in_array('is_default', $columns, true)) $update['is_default'] = 0;
        if (in_array('provider_code', $columns, true)) $update['provider_code'] = $shouldEnable ? 'paymob' : null;

        $jsonColumn = in_array('meta', $columns, true) ? 'meta' : (in_array('data', $columns, true) ? 'data' : null);
        if ($jsonColumn) {
            $raw = $row->getAttribute($jsonColumn);
            $meta = is_array($raw) ? $raw : (is_string($raw) ? (json_decode($raw, true) ?: []) : []);
            $meta['provider_code'] = $shouldEnable ? 'paymob' : null;
            $meta['market_country'] = 'OM';
            $meta['market_variant'] = $code;
            $update[$jsonColumn] = json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
        if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
        if ($update) $connectionDb->table($table)->where('code', $code)->update($update);
        if ($shouldEnable) $enabled[] = $code;
    }

    // Cash remains platform-owned and this script never touches terminal state.
    $report = [
        'ok' => true,
        'tenant' => (string)$tenant->domain,
        'database' => (string)$tenant->database,
        'mode' => 'test',
        'api_connection' => 'connected',
        'sandbox_qa_enabled' => true,
        'production_guest_ready' => false,
        'paymob_provider_enabled_for_test_qa' => true,
        'enabled_test_methods' => $enabled,
        'terminal_ready' => false,
        'note' => 'This is a TEST-only QA arm. It does not certify or release production Paymob.',
    ];
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
    echo "PAYMOB OMAN SANDBOX QA: ARMED (TEST ONLY)\n";
} catch (Throwable $error) {
    fwrite(STDERR, "PAYMOB OMAN SANDBOX QA: NOT ARMED\n".$error->getMessage()."\n");
    exit(5);
}
