<?php

declare(strict_types=1);

use App\Services\Payments\PaymobOmanConfigSchema;
use Admin\Models\Payments_model;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$input = strtolower(trim((string)($argv[1] ?? '')));
if ($input === '') {
    fwrite(STDERR, "Usage: php scripts/audit-location-market-r4.php omantest.paymydine.com\n");
    exit(2);
}
if (!str_contains($input, '.')) $input .= '.paymydine.com';

$centralDatabase = (string)Config::get('database.connections.mysql.database');

try {
    $tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$input])->first();
    if (!$tenant) {
        fwrite(STDERR, "Tenant not found: {$input}\n");
        exit(3);
    }

    $database = trim((string)($tenant->database ?? ''));
    if ($database === '') {
        fwrite(STDERR, "Tenant database is empty.\n");
        exit(4);
    }

    Config::set('database.connections.mysql.database', $database);
    DB::purge('mysql');
    DB::reconnect('mysql');

    $settings = [];
    if (Schema::hasTable('settings')) {
        $settings = DB::table('settings')
            ->whereIn('item', [
                'country_id', 'timezone', 'default_currency_code', 'default_language',
                'supported_languages', 'pmd_market_country_code', 'pmd_market_country_name',
                'pmd_market_timezone', 'pmd_market_currency_code', 'pmd_market_currency_minor_exponent',
            ])
            ->pluck('value', 'item')
            ->all();
    }

    $location = null;
    if (Schema::hasTable('locations')) {
        $location = DB::table('locations')->orderBy('location_id')->first();
    }

    $country = null;
    if ($location && Schema::hasTable('countries')) {
        $countryId = (int)($location->location_country_id ?? 0);
        if ($countryId > 0) {
            $country = DB::table('countries')->where('country_id', $countryId)->first();
        }
    }

    $currency = null;
    if (Schema::hasTable('currencies')) {
        $currency = DB::table('currencies')->whereRaw('UPPER(currency_code) = ?', ['OMR'])->first();
    }

    $requiredRegionalCodes = [
        'paymob',
        'om_card',
        'om_omannet',
        'om_apple_pay',
        'om_google_pay',
        'om_cash',
    ];

    // These are never valid active provider/method rows for an Oman online
    // market. `cash`/`cod` are deliberately excluded from this foreign list:
    // the R4 Oman Cash bridge may reuse one providerless canonical cash row.
    $foreignCodes = [
        'stripe',
        'worldline',
        'sumup',
        'square',
        'vr_payment',
        'card',
        'apple_pay',
        'google_pay',
        'wero',
        'paypal',
        'de_card',
        'de_apple_pay',
        'de_google_pay',
        'de_wero',
        'de_paypal',
        'de_cash',
    ];

    $paymentRows = [];
    $paymentMap = [];
    $paymobSafe = null;
    $paymentTable = null;

    try {
        $model = new Payments_model();
        $paymentTable = $model->getTable();
        $connection = $model->getConnection();
        if ($connection->getSchemaBuilder()->hasTable($paymentTable)) {
            $codes = array_values(array_unique(array_merge(
                $requiredRegionalCodes,
                $foreignCodes,
                ['cash', 'cod']
            )));

            $rows = $connection->table($paymentTable)->whereIn('code', $codes)->orderBy('code')->get();
            foreach ($rows as $row) {
                $item = [
                    'code' => (string)($row->code ?? ''),
                    'name' => (string)($row->name ?? ''),
                    'enabled' => (bool)($row->status ?? false),
                    'provider_code' => isset($row->provider_code) && trim((string)$row->provider_code) !== ''
                        ? (string)$row->provider_code
                        : null,
                ];
                $paymentRows[] = $item;
                $paymentMap[$item['code']] = $item;
            }

            $paymob = Payments_model::query()->where('code', 'paymob')->first();
            if ($paymob) {
                $saved = method_exists($paymob, 'getConfigData') ? (array)$paymob->getConfigData() : [];
                $paymobSafe = (new PaymobOmanConfigSchema())->safeAdminConfig($saved);
                $paymobSafe['provider_enabled'] = (bool)($paymob->status ?? false);
            }
        }
    } catch (\Throwable $error) {
        $paymentRows = [['error' => $error->getMessage()]];
    }

    $missingRegional = array_values(array_filter(
        $requiredRegionalCodes,
        static fn (string $code): bool => !isset($paymentMap[$code])
    ));

    $foreignEnabled = array_values(array_map(
        static fn (array $row): string => (string)$row['code'],
        array_filter(
            array_values($paymentMap),
            static fn (array $row): bool => in_array((string)$row['code'], $foreignCodes, true)
                && (bool)$row['enabled']
        )
    ));

    $regionalEnabled = array_values(array_map(
        static fn (array $row): string => (string)$row['code'],
        array_filter(
            array_values($paymentMap),
            static fn (array $row): bool => in_array((string)$row['code'], $requiredRegionalCodes, true)
                && (bool)$row['enabled']
        )
    ));

    $paymobExists = isset($paymentMap['paymob']);
    $paymobProviderEnabled = (bool)($paymentMap['paymob']['enabled'] ?? false);

    $report = [
        'tenant' => [
            'id' => (int)($tenant->id ?? 0),
            'domain' => (string)($tenant->domain ?? ''),
            'database' => $database,
            'central_country' => (string)($tenant->country ?? ''),
            'status' => (string)($tenant->status ?? ''),
        ],
        'location' => [
            'id' => (int)($location->location_id ?? 0),
            'name' => (string)($location->location_name ?? ''),
            'country_id' => (int)($location->location_country_id ?? 0),
            'country_name' => (string)($country->country_name ?? ''),
            'iso_code_2' => (string)($country->iso_code_2 ?? ''),
            'iso_code_3' => (string)($country->iso_code_3 ?? ''),
        ],
        'platform_settings' => $settings,
        'omr' => $currency ? [
            'exists' => true,
            'currency_code' => (string)($currency->currency_code ?? ''),
            'decimal_position' => (int)($currency->decimal_position ?? 0),
            'enabled' => (bool)($currency->currency_status ?? false),
            'iso_numeric' => (int)($currency->iso_numeric ?? 0),
        ] : ['exists' => false],
        'payment_isolation' => [
            'table' => $paymentTable,
            'required_regional_codes' => $requiredRegionalCodes,
            'missing_regional' => $missingRegional,
            'foreign_enabled' => $foreignEnabled,
            'regional_enabled' => $regionalEnabled,
            'paymob_exists' => $paymobExists,
            // R4 intentionally expects false until checkout/callback settlement
            // is completed and sandbox verified.
            'paymob_provider_enabled' => $paymobProviderEnabled,
            'paymob_guest_runtime_expected_locked' => true,
        ],
        'payments' => $paymentRows,
        // No secret value is present here. Only non-secret fields and booleans
        // indicating whether a secret is stored.
        'paymob_admin_safe' => $paymobSafe,
    ];

    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

    $ok = strtolower((string)($tenant->country ?? '')) === 'oman'
        && strtoupper((string)($country->iso_code_2 ?? '')) === 'OM'
        && (string)($settings['timezone'] ?? '') === 'Asia/Muscat'
        && strtoupper((string)($settings['default_currency_code'] ?? '')) === 'OMR'
        && ($currency !== null)
        && strtoupper((string)($currency->currency_code ?? '')) === 'OMR'
        && (int)($currency->decimal_position ?? 0) === 3
        && (bool)($currency->currency_status ?? false)
        && $paymobExists
        && $missingRegional === []
        && $foreignEnabled === []
        // Until the guarded settlement runtime is released, Paymob must not be
        // enabled for guests merely because credentials/catalogue exist.
        && $paymobProviderEnabled === false;

    echo $ok
        ? "\nMARKET AUDIT: OK (Oman isolated; Paymob guest runtime locked)\n"
        : "\nMARKET AUDIT: CHECK REQUIRED\n";

    exit($ok ? 0 : 1);
} finally {
    Config::set('database.connections.mysql.database', $centralDatabase);
    DB::purge('mysql');
    DB::reconnect('mysql');
}
