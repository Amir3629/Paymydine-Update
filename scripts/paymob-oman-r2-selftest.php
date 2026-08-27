<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$autoload = $root.'/vendor/autoload.php';
if (!is_file($autoload)) {
    fwrite(STDERR, "vendor/autoload.php not found.\n");
    exit(2);
}
require $autoload;

use App\Services\Payments\MoneyMinorUnitConverter;
use App\Services\Payments\PaymentMarketRegistry;
use App\Services\Payments\PaymobApiClient;
use App\Services\Payments\PaymobOmanConfigSchema;

$failures = [];
$assert = static function (bool $condition, string $message) use (&$failures): void {
    if (!$condition) $failures[] = $message;
};

$money = new MoneyMinorUnitConverter();
$assert($money->exponent('OMR') === 3, 'OMR exponent must be 3.');
$assert($money->toMinor('8.500', 'OMR') === 8500, '8.500 OMR must convert to 8500 minor units.');
$assert($money->fromMinor(8500, 'OMR') === '8.500', '8500 OMR minor units must render as 8.500.');
$assert($money->toMinor('8.50', 'EUR') === 850, '8.50 EUR must convert to 850 minor units.');

$markets = new PaymentMarketRegistry();
$oman = $markets->market('OM');
$assert(is_array($oman), 'Oman market must resolve.');
$assert(($oman['currency'] ?? null) === 'OMR', 'Oman market currency must be OMR.');
$assert(($oman['currency_minor_exponent'] ?? null) === 3, 'Oman market currency exponent must be 3.');
$assert($markets->canonicalMethodCode('om_card') === 'card', 'om_card must normalize to card.');
$assert($markets->canonicalMethodCode('om_omannet') === 'omannet', 'om_omannet must normalize to omannet.');
$assert($markets->canonicalMethodCode('om_apple_pay') === 'apple_pay', 'om_apple_pay must normalize to apple_pay.');
$assert($markets->canonicalMethodCode('om_google_pay') === 'google_pay', 'om_google_pay must normalize to google_pay.');
$assert($markets->market('DE') === null, 'Unsupported market must not inherit Oman methods.');

$terminal = $markets->terminalState('OM');
$assert(($terminal['tap_to_pay_product'] ?? false) === true, 'Paymob Oman Tap to Pay product should be catalogued.');
$assert(($terminal['remote_terminal_api'] ?? true) === false, 'Remote terminal API must remain fail-closed.');
$assert(($terminal['pmd_terminal_runtime'] ?? true) === false, 'PMD terminal runtime must remain disabled.');

$schema = new PaymobOmanConfigSchema();
$fields = $schema->fields();
foreach ([
    'test_secret_key', 'test_public_key', 'test_api_key', 'test_hmac_secret',
    'test_integration_id_card', 'test_integration_id_omannet',
    'test_integration_id_apple_pay', 'test_integration_id_google_pay',
    'live_secret_key', 'live_public_key', 'live_api_key', 'live_hmac_secret',
    'live_integration_id_card', 'live_integration_id_omannet',
    'live_integration_id_apple_pay', 'live_integration_id_google_pay',
] as $field) {
    $assert(array_key_exists($field, $fields), 'Missing Paymob config field: '.$field);
}

$client = new PaymobApiClient([]);
$safe = $client->safeConfig();
$assert(($safe['api_base_url'] ?? null) === PaymobApiClient::OMAN_BASE_URL, 'Paymob Oman API base URL mismatch.');
$assert(($safe['currency'] ?? null) === 'OMR', 'Paymob Oman default currency must be OMR.');
$assert(($client->validateConfiguration(false)['ok'] ?? true) === false, 'Empty credentials must fail closed.');

if ($failures) {
    fwrite(STDERR, "PAYMOB OMAN R2 SELFTEST FAILED\n");
    foreach ($failures as $failure) fwrite(STDERR, " - {$failure}\n");
    exit(1);
}

echo "PAYMOB OMAN R2 SELFTEST OK\n";
echo "OMR: 8.500 -> ".$money->toMinor('8.500', 'OMR')." minor units\n";
echo "Methods: ".implode(', ', array_keys($markets->methodsForCountry('OM')))."\n";
echo "Terminal runtime: blocked until Paymob Oman POS/ECR API contract is received\n";
