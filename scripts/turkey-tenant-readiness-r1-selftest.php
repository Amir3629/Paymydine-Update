<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$autoload = $root.'/vendor/autoload.php';
if (!is_file($autoload)) {
    fwrite(STDERR, "vendor/autoload.php not found.\n");
    exit(2);
}
require $autoload;

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Turkey\TurkeyIntegrationRegistry;

$failures = [];
$assert = static function (bool $condition, string $message) use (&$failures): void {
    if (!$condition) $failures[] = $message;
};

$profiles = new CountryPlatformProfileRegistry();
$tr = $profiles->requireProfile('Türkiye');
$assert(($tr['country_code'] ?? null) === 'TR', 'Türkiye country code must be TR.');
$assert(($tr['timezone'] ?? null) === 'Europe/Istanbul', 'Türkiye timezone must be Europe/Istanbul.');
$assert(($tr['currency']['code'] ?? null) === 'TRY', 'Türkiye currency must be TRY.');
$assert(($tr['currency']['minor_exponent'] ?? null) === 2, 'TRY exponent must be 2.');
$assert(in_array('tr', (array)($tr['languages']['eligible'] ?? []), true), 'Turkish language must be eligible.');
$assert(in_array('en', (array)($tr['languages']['eligible'] ?? []), true), 'English language must be eligible.');

// Payments remain deliberately fail-closed until real Turkish partners are
// contracted and verified. This is a safety property, not a missing assertion.
$assert((array)($tr['payments']['providers'] ?? []) === [], 'Türkiye provider catalogue must remain fail-closed until partner integration is reviewed.');
$assert((array)($tr['terminals']['providers'] ?? []) === [], 'Türkiye terminal catalogue must remain fail-closed until fiscal/payment device integration is reviewed.');

$registry = new TurkeyIntegrationRegistry();
$integrations = $registry->integrations();
foreach (['yn_okc', 'e_document', 'acquirer', 'tr_qr_fast', 'yemeksepeti', 'uber_trendyol_go', 'iys', 'sms', 'whatsapp', 'accounting'] as $code) {
    $assert(isset($integrations[$code]), 'Missing Türkiye integration definition: '.$code);
}
$assert(($integrations['yn_okc']['regulated'] ?? false) === true, 'YN ÖKC must be marked regulated.');
$assert(($integrations['acquirer']['regulated'] ?? false) === true, 'Acquirer must be marked regulated.');
$assert(($integrations['getiryemek']['default_status'] ?? '') === 'do_not_start_new_connector', 'GetirYemek must remain a legacy/no-new-connector path.');

foreach ([
    'App\\Services\\Turkey\\TurkeyTenantContext',
    'App\\Services\\Turkey\\TurkeyTenantProvisioningService',
    'App\\Services\\Turkey\\TurkeyIntegrationConfigurationService',
    'App\\Services\\Turkey\\TurkeyReadinessService',
    'App\\Services\\Turkey\\TurkeyMarketplaceGatewayService',
    'App\\Services\\Turkey\\TurkeyInventoryService',
    'App\\Services\\Turkey\\TurkeyLoyaltyService',
    'App\\Services\\Turkey\\TurkeyFiscalStateService',
    'App\\Services\\Turkey\\TurkeyEdgeEventService',
] as $class) {
    $assert(class_exists($class), 'Missing Türkiye service class: '.$class);
}

if ($failures) {
    fwrite(STDERR, "TURKEY TENANT READINESS R1 SELFTEST FAILED\n");
    foreach ($failures as $failure) fwrite(STDERR, " - {$failure}\n");
    exit(1);
}

echo "TURKEY TENANT READINESS R1 SELFTEST OK\n";
echo "TR: Europe/Istanbul | TRY(2) | tr,en\n";
echo "Turkey payments/terminals: fail-closed until partner approval\n";
echo "Turkey domains: fiscal, marketplace, inventory, loyalty/consent, edge\n";
