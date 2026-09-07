<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$autoload = $root.'/vendor/autoload.php';
if (!is_file($autoload)) {
    fwrite(STDERR, "vendor/autoload.php not found.\n");
    exit(2);
}
require $autoload;

use App\Services\Integrations\SecretReferenceService;
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

$assert((array)($tr['payments']['providers'] ?? []) === [], 'Türkiye provider catalogue must remain fail-closed until partner integration is reviewed.');
$assert((array)($tr['terminals']['providers'] ?? []) === [], 'Türkiye terminal catalogue must remain fail-closed until fiscal/payment device integration is reviewed.');

$registry = new TurkeyIntegrationRegistry();
$integrations = $registry->integrations();
foreach (['yn_okc', 'e_document', 'acquirer', 'tr_qr_fast', 'fast_request', 'yemeksepeti', 'uber_trendyol_go', 'iys', 'sms', 'whatsapp', 'accounting'] as $code) {
    $assert(isset($integrations[$code]), 'Missing Türkiye integration definition: '.$code);
}
$assert(($integrations['yn_okc']['regulated'] ?? false) === true, 'YN ÖKC must be marked regulated.');
$assert(($integrations['acquirer']['regulated'] ?? false) === true, 'Acquirer must be marked regulated.');
$assert(($integrations['fast_request']['regulated'] ?? false) === true, 'FAST Request-to-Pay must be marked regulated.');
$assert(($integrations['getiryemek']['default_status'] ?? '') === 'do_not_start_new_connector', 'GetirYemek must remain a legacy/no-new-connector path.');

$secrets = new SecretReferenceService();
$assert($secrets->normalize('env:PMD_TR_TEST_SECRET') === 'env:PMD_TR_TEST_SECRET', 'env secret reference normalization failed.');
$assert($secrets->normalize('config:services.turkey.test.secret') === 'config:services.turkey.test.secret', 'config secret reference normalization failed.');
$assert($secrets->sanitizeConfig(['credential_reference' => 'env:PMD_TR_TEST_SECRET'])['credential_reference'] === 'env:PMD_TR_TEST_SECRET', 'credential reference sanitization failed.');
$assert($secrets->sanitizeConfig(['contract_reference' => 'CONTRACT-123'])['contract_reference'] === 'CONTRACT-123', 'non-secret document reference must remain allowed.');
try {
    $secrets->sanitizeConfig(['client_secret' => 'raw-secret']);
    $failures[] = 'Raw client_secret must be rejected.';
} catch (\InvalidArgumentException) {
}

foreach ([
    'App\\Services\\Integrations\\SecretReferenceService',
    'App\\Services\\Integrations\\TenantIntegrationSecretSchemaService',
    'App\\Services\\Integrations\\IntegrationSecretReferenceRepository',
    'App\\Services\\Turkey\\TurkeyTenantContext',
    'App\\Services\\Turkey\\TurkeyTenantProvisioningService',
    'App\\Services\\Turkey\\TurkeyIntegrationConfigurationService',
    'App\\Services\\Turkey\\TurkeyReadinessService',
    'App\\Services\\Turkey\\TurkeyPaymentMethodService',
    'App\\Services\\Turkey\\YemeksepetiPartnerClient',
    'App\\Services\\Turkey\\TurkeyMarketplaceGatewayService',
    'App\\Services\\Turkey\\TurkeyInventoryService',
    'App\\Services\\Turkey\\TurkeyLoyaltyService',
    'App\\Services\\Turkey\\TurkeyFiscalStateService',
    'App\\Services\\Turkey\\TurkeyEdgeEventService',
] as $class) {
    $assert(class_exists($class), 'Missing Türkiye/readiness class: '.$class);
}

// Türkiye owner UI is now merged into the existing settings information
// architecture instead of exposing a separate country settings page.
$assert(is_file($root.'/app/admin/controllers/Pmdfinance.php'), 'Missing Payments & finance controller source.');
$assert(is_file($root.'/app/admin/views/pmdfinance/index.blade.php'), 'Missing Payments & finance view source.');
$assert(is_file($root.'/app/admin/controllers/Pmddevices.php'), 'Missing Devices controller source.');
$assert(is_file($root.'/app/admin/views/pmddevices/index.blade.php'), 'Missing Devices view source.');
$assert(is_file($root.'/app/admin/controllers/Pmdturkey.php'), 'Missing legacy Türkiye redirect controller source.');

if ($failures) {
    fwrite(STDERR, "TURKEY TENANT READINESS R1 SELFTEST FAILED\n");
    foreach ($failures as $failure) fwrite(STDERR, " - {$failure}\n");
    exit(1);
}

echo "TURKEY TENANT READINESS R1 SELFTEST OK\n";
echo "TR: Europe/Istanbul | TRY(2) | tr,en\n";
echo "Turkey payments/terminals: fail-closed until partner approval\n";
echo "Turkey checkout: card | FAST Request-to-Pay | FAST/TR QR | cash\n";
echo "Yemeksepeti: official sandbox client present; credentials required\n";
echo "PMD-wide secret references: env:/config: supported; raw new-integration secrets rejected\n";
echo "Turkey settings UI: Payments & finance + Devices; /admin/pmdturkey redirects\n";
