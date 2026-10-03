<?php

declare(strict_types=1);

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\SuperAdminTenantMarketService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$input = strtolower(trim((string)($argv[1] ?? '')));
if ($input === '') {
    fwrite(STDERR, "Usage: php scripts/apply-location-market-r4.php omantest.paymydine.com\n");
    exit(2);
}
if (!str_contains($input, '.')) $input .= '.paymydine.com';

$tenant = DB::connection('mysql')
    ->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$input])
    ->first();

if (!$tenant) {
    fwrite(STDERR, "Tenant not found: {$input}\n");
    exit(3);
}

$centralCountry = trim((string)($tenant->country ?? ''));
$profiles = new CountryPlatformProfileRegistry();
$profile = $profiles->profile($centralCountry);
if (!$profile) {
    fwrite(STDERR, "Tenant country is not a supported PMD market profile: {$centralCountry}\n");
    exit(4);
}

try {
    $result = (new SuperAdminTenantMarketService())->applyToTenant(
        $tenant,
        (string)$profile['country_code']
    );
} catch (Throwable $error) {
    fwrite(STDERR, "Market apply failed: {$error->getMessage()}\n");
    exit(5);
}

$safe = [
    'ok' => (bool)($result['ok'] ?? false),
    'tenant' => [
        'id' => (int)($tenant->id ?? 0),
        'domain' => (string)($tenant->domain ?? ''),
        'database' => (string)($tenant->database ?? ''),
        'central_country' => $centralCountry,
    ],
    'applied' => [
        'country_code' => (string)($result['country_code'] ?? ''),
        'country_name' => (string)($result['country_name'] ?? ''),
        'location_id' => $result['default_location_id'] ?? null,
        'timezone' => (string)($result['timezone'] ?? ''),
        'currency' => (array)($result['currency'] ?? []),
        'languages' => (array)($result['languages'] ?? []),
        'payment_providers' => array_values((array)($result['payments']['providers'] ?? [])),
        'payment_methods' => array_values((array)($result['payments']['methods'] ?? [])),
    ],
    'warnings' => array_values((array)($result['warnings'] ?? [])),
];

echo json_encode($safe, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

if (!($safe['ok'] ?? false)) {
    fwrite(STDERR, "MARKET APPLY: CHECK REQUIRED\n");
    exit(1);
}

echo "\nMARKET APPLY: OK ({$safe['applied']['country_code']})\n";
