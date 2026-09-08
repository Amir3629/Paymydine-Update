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
use App\Services\Turkey\IsBankApiClient;
use App\Services\Turkey\TurkeyIntegrationRegistry;
use App\Services\Turkey\TurkeyInvoiceRoutingService;
use App\Services\Turkey\TurkeyPaymentArchitectureService;

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

$providers = (array)($tr['payments']['providers'] ?? []);
$methods = (array)($tr['payments']['methods'] ?? []);
$terminals = (array)($tr['terminals']['providers'] ?? []);
$assert(isset($providers['isbank']), 'Türkiye must expose İş Bankası as an eligible provider candidate.');
$assert(isset($terminals['isbank']), 'Türkiye must expose İş Bankası terminal-management capability.');
foreach (['tr_card', 'tr_fast_request', 'tr_tr_qr', 'tr_ispay', 'tr_cash'] as $code) {
    $assert(isset($methods[$code]), 'Missing Türkiye payment method catalogue row: '.$code);
    $assert(($methods[$code]['runtime_offerable'] ?? true) === false, 'New Türkiye catalogue methods must stay disabled until provider activation.');
}

$registry = new TurkeyIntegrationRegistry();
$integrations = $registry->integrations();
foreach ([
    'yn_okc', 'gmoebys', 'e_document', 'isbank_api', 'isbank_sanal_pos',
    'acquirer', 'tr_qr_fast', 'fast_request', 'ispay', 'yemeksepeti',
    'uber_trendyol_go', 'iys', 'sms', 'whatsapp', 'accounting'
] as $code) {
    $assert(isset($integrations[$code]), 'Missing Türkiye integration definition: '.$code);
}
$assert(($integrations['yn_okc']['regulated'] ?? false) === true, 'YN ÖKC must be marked regulated.');
$assert(($integrations['gmoebys']['regulated'] ?? false) === true, 'GMÖEBYS must be marked regulated.');
$assert(($integrations['isbank_api']['regulated'] ?? false) === true, 'İş Bankası API connection must be marked regulated.');
$assert(($integrations['isbank_sanal_pos']['regulated'] ?? false) === true, 'İş Bankası Sanal POS must be marked regulated.');
$assert(($integrations['acquirer']['regulated'] ?? false) === true, 'Acquirer must be marked regulated.');
$assert(($integrations['fast_request']['regulated'] ?? false) === true, 'FAST Request-to-Pay must be marked regulated.');
$assert(($integrations['getiryemek']['default_status'] ?? '') === 'do_not_start_new_connector', 'GetirYemek must remain a legacy/no-new-connector path.');

$architecture = new TurkeyPaymentArchitectureService();
$catalogue = $architecture->methods();
$assert(isset($catalogue['card'], $catalogue['fast_request'], $catalogue['tr_qr_fast'], $catalogue['cash']), 'Turkey payment architecture catalogue is incomplete.');
$assert(in_array('contactless', (array)($catalogue['card']['entry_modes'] ?? []), true), 'Card must support contactless entry mode.');
$assert(in_array('chip', (array)($catalogue['card']['entry_modes'] ?? []), true), 'Card must support chip/insert entry mode.');
$assert(in_array('softpos', (array)($catalogue['card']['channels'] ?? []), true), 'Card must model SoftPOS as a channel, not a separate payment method.');
$assert(isset($architecture->fiscalModes()['yn_okc'], $architecture->fiscalModes()['gmoebys']), 'Both Turkey fiscal modes must be modeled.');

$invoice = new TurkeyInvoiceRoutingService();
$assert($invoice->route(false, 'yn_okc') === 'yn_okc_fis', 'Ordinary YN ÖKC sale must route to fiscal receipt.');
$assert($invoice->route(true, 'yn_okc', true) === 'e_fatura', 'Registered invoice recipient must route to e-Fatura.');
$assert($invoice->route(true, 'yn_okc', false) === 'e_arsiv', 'Non-registered invoice recipient must route to e-Arşiv.');

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

$isbank = new IsBankApiClient($secrets);
$sampleBankConfig = [
    'environment' => 'uat',
    'uat_client_id' => 'UAT-CLIENT',
    'uat_client_secret_reference' => 'env:PMD_TR_TEST_SECRET',
    'production_client_id' => 'PROD-CLIENT',
    'production_client_secret_reference' => 'env:PMD_TR_PROD_TEST_SECRET',
    'products' => [
        'request_to_pay' => [
            'scope' => 'rtp.scope',
            'auth_mode' => 'client_credentials',
        ],
        'payment_facilitator' => [
            'scope' => 'pf.scope',
            'auth_mode' => 's2s_password',
            's2s_username' => 'pf-user',
            's2s_password_reference' => 'env:PMD_TR_TEST_SECRET',
        ],
    ],
];
$assert(($isbank->environmentCredentials($sampleBankConfig)['client_id'] ?? '') === 'UAT-CLIENT', 'İş Bank UAT Client ID selection failed.');
$assert(($isbank->securityProfile($sampleBankConfig, 'request_to_pay')['scope'] ?? '') === 'rtp.scope', 'Request-to-Pay per-product scope failed.');
$assert(($isbank->securityProfile($sampleBankConfig, 'payment_facilitator')['auth_mode'] ?? '') === 's2s_password', 'Payment Facilitator per-product auth mode failed.');
$sampleBankConfig['environment'] = 'production';
$assert(($isbank->environmentCredentials($sampleBankConfig)['client_id'] ?? '') === 'PROD-CLIENT', 'İş Bank Production Client ID must be separate from UAT.');

foreach ([
    'App\\Services\\Integrations\\SecretReferenceService',
    'App\\Services\\Integrations\\TenantIntegrationSecretSchemaService',
    'App\\Services\\Integrations\\IntegrationSecretReferenceRepository',
    'App\\Services\\Turkey\\TurkeyTenantContext',
    'App\\Services\\Turkey\\TurkeyTenantProvisioningService',
    'App\\Services\\Turkey\\TurkeyIntegrationConfigurationService',
    'App\\Services\\Turkey\\TurkeyReadinessService',
    'App\\Services\\Turkey\\TurkeyPaymentMethodService',
    'App\\Services\\Turkey\\TurkeyPaymentArchitectureService',
    'App\\Services\\Turkey\\TurkeyInvoiceRoutingService',
    'App\\Services\\Turkey\\TurkeyTerminalRegistryService',
    'App\\Services\\Turkey\\IsBankApiClient',
    'App\\Services\\Turkey\\IsBankRequestToPayService',
    'App\\Services\\Turkey\\IsBankPaymentFacilitatorService',
    'App\\Services\\Turkey\\IsBankTrQrService',
    'App\\Services\\Turkey\\IsBankSanalPosService',
    'App\\Services\\Turkey\\TurkeyEDocumentProviderClient',
    'App\\Services\\Turkey\\TurkeyYnOkcAdapterService',
    'App\\Services\\Turkey\\YemeksepetiPartnerClient',
    'App\\Services\\Turkey\\TurkeyMarketplaceGatewayService',
    'App\\Services\\Turkey\\TurkeyInventoryService',
    'App\\Services\\Turkey\\TurkeyLoyaltyService',
    'App\\Services\\Turkey\\TurkeyFiscalStateService',
    'App\\Services\\Turkey\\TurkeyEdgeEventService',
] as $class) {
    $assert(class_exists($class), 'Missing Türkiye/readiness class: '.$class);
}

$assert(is_file($root.'/app/admin/controllers/Pmdfinance.php'), 'Missing Payments & finance controller source.');
$assert(is_file($root.'/app/admin/views/pmdfinance/index.blade.php'), 'Missing Payments & finance view source.');
$assert(is_file($root.'/app/admin/controllers/Pmddevices.php'), 'Missing Devices controller source.');
$assert(is_file($root.'/app/admin/views/pmddevices/index.blade.php'), 'Missing Devices view source.');
$assert(is_file($root.'/app/admin/controllers/Pmdturkey.php'), 'Missing legacy Türkiye redirect controller source.');
$assert(is_file($root.'/routes/pmd-turkey-integrations-r2.php'), 'Missing Türkiye integration route source.');
$assert(is_file($root.'/app/admin/assets/js/pmd-turkey-settings-r3.js'), 'Missing Türkiye R3 settings enhancer.');

if ($failures) {
    fwrite(STDERR, "TURKEY TENANT READINESS R1 SELFTEST FAILED\n");
    foreach ($failures as $failure) fwrite(STDERR, " - {$failure}\n");
    exit(1);
}

echo "TURKEY TENANT READINESS R1 SELFTEST OK\n";
echo "TR: Europe/Istanbul | TRY(2) | tr,en\n";
echo "Turkey provider catalogue: İş Bankası candidate; methods remain fail-closed until real activation\n";
echo "Turkey card model: one Card method | terminal / SoftPOS / online channels | tap/chip are entry modes\n";
echo "Turkey card safety: acquirer alone is not enough; a verified terminal/SoftPOS or Sanal POS channel is required\n";
echo "Turkey terminal model: bank/provider != hardware manufacturer; verified activation lifecycle present\n";
echo "Turkey fiscal modes: YN ÖKC OR approved GMÖEBYS\n";
echo "Turkey invoices: YN ÖKC fiş | e-Fatura | e-Arşiv routing + provider SOAP boundary present\n";
echo "İş Bankası R3: separate UAT/Production credentials + per-API scope/security profiles\n";
echo "İş Bankası typed adapters: Request To Pay | Payment Facilitator | TR QR boundary | Sanal POS boundary\n";
echo "Türkiye VAT policy: consumer menu prices enforced VAT-inclusive by the R3 admin route layer\n";
echo "Yemeksepeti: official sandbox client present; credentials required\n";
echo "PMD-wide secret references: env:/config: supported; raw new-integration secrets rejected\n";
echo "Turkey settings UI: Payments & finance + Devices; R3 enhancer loaded into existing pages\n";
