<?php

declare(strict_types=1);

use Admin\Models\Payments_model;
use App\Services\Payments\PaymobOmanConnectionService;
use App\Services\Payments\PaymobOmanPaymentAttemptService;
use App\Services\Payments\PaymobOmanRuntimeGate;
use App\Services\Payments\ProviderCapabilityRegistry;
use App\Services\Payments\MoneyMinorUnitConverter;
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
    fwrite(STDERR, "Usage: php scripts/install-paymob-oman-runtime-r11.php omantest.paymydine.com\n");
    exit(2);
}
if (!str_contains($domain, '.')) $domain .= '.paymydine.com';

try {
    $tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$domain])->first();
    if (!$tenant || empty($tenant->database)) throw new RuntimeException('Tenant was not found in the central database.');

    Config::set('database.connections.mysql.database', (string)$tenant->database);
    Config::set('database.default', 'mysql');
    DB::purge('mysql');
    DB::reconnect('mysql');
    DB::setDefaultConnection('mysql');

    $location = Schema::hasTable('locations') ? DB::table('locations')->orderBy('location_id')->first() : null;
    $country = null;
    if ($location && Schema::hasTable('countries')) {
        $countryId = (int)($location->location_country_id ?? 0);
        if ($countryId > 0) $country = DB::table('countries')->where('country_id', $countryId)->first();
    }
    $iso2 = strtoupper(trim((string)($country->iso_code_2 ?? '')));
    if ($iso2 !== 'OM') throw new RuntimeException('Target tenant is not resolved to Oman.');

    $attempts = app(PaymobOmanPaymentAttemptService::class);
    $attempts->ensureSchema();

    $requiredColumns = [
        'id','order_id','client_request_id','special_reference','method_variant',
        'principal_amount','tip_amount','coupon_discount','payable_amount','amount_minor',
        'currency','order_allocations','provider_intention_id','provider_order_id',
        'provider_transaction_id','client_secret_ciphertext','status','settled_at',
        'financial_adjustment_state',
    ];
    $actualColumns = Schema::getColumnListing(PaymobOmanPaymentAttemptService::TABLE);
    $missingColumns = array_values(array_diff($requiredColumns, $actualColumns));
    if ($missingColumns) throw new RuntimeException('Paymob attempt table is missing columns: '.implode(', ', $missingColumns));

    $connection = app(PaymobOmanConnectionService::class);
    $runtimeConfig = $connection->runtimeConfig();
    $gate = PaymobOmanRuntimeGate::state($runtimeConfig);

    $provider = Payments_model::query()->where('code', 'paymob')->first();
    $methodRows = Payments_model::query()->whereIn('code', ['om_card','om_omannet','om_apple_pay','om_google_pay','om_cash'])->get();
    $registry = (new ProviderCapabilityRegistry())->provider('paymob');
    $money = new MoneyMinorUnitConverter();

    $report = [
        'ok' => true,
        'version' => '11.1.0',
        'tenant' => [
            'id' => (int)($tenant->id ?? 0),
            'domain' => (string)$tenant->domain,
            'database' => (string)$tenant->database,
            'central_country' => (string)($tenant->country ?? ''),
        ],
        'location' => [
            'id' => (int)($location->location_id ?? 0),
            'name' => (string)($location->location_name ?? ''),
            'country_iso2' => $iso2,
        ],
        'money_selftest' => [
            'omr_8_500_minor' => $money->toMinor('8.500', 'OMR'),
        ],
        'attempt_store' => [
            'table' => PaymobOmanPaymentAttemptService::TABLE,
            'exists' => Schema::hasTable(PaymobOmanPaymentAttemptService::TABLE),
            'missing_required_columns' => $missingColumns,
        ],
        'runtime_gate' => $gate,
        'provider' => [
            'exists' => $provider !== null,
            'enabled' => (bool)($provider->status ?? false),
            'mode' => strtolower(trim((string)($runtimeConfig['mode'] ?? 'test'))),
            'secret_key_present' => trim((string)($runtimeConfig['secret_key'] ?? '')) !== '',
            'api_key_present' => trim((string)($runtimeConfig['api_key'] ?? '')) !== '',
            'hmac_secret_present' => trim((string)($runtimeConfig['hmac_secret'] ?? '')) !== '',
            'public_key_present' => trim((string)($runtimeConfig['public_key'] ?? '')) !== '',
        ],
        'methods' => $methodRows->map(static fn ($row) => [
            'code' => (string)$row->code,
            'enabled' => (bool)($row->status ?? false),
            'provider_code' => isset($row->provider_code) && trim((string)$row->provider_code) !== '' ? (string)$row->provider_code : null,
        ])->values()->all(),
        'release_safety' => [
            'provider_registry_implemented_capabilities' => array_values((array)($registry['implemented_capabilities'] ?? [])),
            'provider_registry_implemented_methods' => array_values((array)($registry['implemented_payment_methods'] ?? [])),
            'guest_production_ready' => PaymobOmanRuntimeGate::guestReady(),
            'terminal_ready' => (bool)($gate['terminal_ready'] ?? false),
        ],
    ];

    if ($report['money_selftest']['omr_8_500_minor'] !== 8500) throw new RuntimeException('OMR minor-unit selftest failed.');
    if ($report['release_safety']['guest_production_ready'] !== false) throw new RuntimeException('Production guest Paymob gate was unexpectedly open.');
    if ($report['release_safety']['terminal_ready'] !== false) throw new RuntimeException('Paymob terminal gate was unexpectedly open.');
    if ($report['release_safety']['provider_registry_implemented_capabilities'] !== [] || $report['release_safety']['provider_registry_implemented_methods'] !== []) {
        throw new RuntimeException('Provider registry was promoted before real sandbox QA.');
    }

    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;
    echo "PAYMOB OMAN ONLINE R11 INSTALL/AUDIT: OK (software installed; production guest gate locked)\n";
} catch (Throwable $error) {
    fwrite(STDERR, "PAYMOB OMAN ONLINE R11 INSTALL/AUDIT: FAILED\n".$error->getMessage()."\n");
    exit(5);
}
