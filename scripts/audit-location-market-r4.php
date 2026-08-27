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

    $paymentRows = [];
    $paymobSafe = null;
    try {
        $model = new Payments_model();
        $table = $model->getTable();
        $connection = $model->getConnection();
        if ($connection->getSchemaBuilder()->hasTable($table)) {
            $codes = ['paymob', 'om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash', 'card', 'apple_pay', 'google_pay', 'cash', 'cod'];
            $rows = $connection->table($table)->whereIn('code', $codes)->orderBy('code')->get();
            foreach ($rows as $row) {
                $paymentRows[] = [
                    'code' => (string)($row->code ?? ''),
                    'name' => (string)($row->name ?? ''),
                    'enabled' => (bool)($row->status ?? false),
                    'provider_code' => isset($row->provider_code) && trim((string)$row->provider_code) !== '' ? (string)$row->provider_code : null,
                ];
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
        'payments' => $paymentRows,
        'paymob_admin_safe' => $paymobSafe,
    ];

    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

    $ok = strtolower((string)($tenant->country ?? '')) === 'oman'
        && strtoupper((string)($country->iso_code_2 ?? '')) === 'OM'
        && (string)($settings['timezone'] ?? '') === 'Asia/Muscat'
        && strtoupper((string)($settings['default_currency_code'] ?? '')) === 'OMR'
        && ($currency !== null)
        && (int)($currency->decimal_position ?? 0) === 3
        && (bool)($currency->currency_status ?? false);

    echo $ok ? "\nMARKET AUDIT: OK (Oman)\n" : "\nMARKET AUDIT: CHECK REQUIRED\n";
    exit($ok ? 0 : 1);
} finally {
    Config::set('database.connections.mysql.database', $centralDatabase);
    DB::purge('mysql');
    DB::reconnect('mysql');
}
