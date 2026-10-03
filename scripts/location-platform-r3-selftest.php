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
use App\Services\Platform\CountryPlatformProfileRegistry;

$failures = [];
$assert = static function (bool $condition, string $message) use (&$failures): void {
    if (!$condition) $failures[] = $message;
};

$platform = new CountryPlatformProfileRegistry();
$de = $platform->requireProfile('Germany');
$om = $platform->requireProfile('OM');

$assert($platform->normalizeCountry('Deutschland') === 'DE', 'Germany normalization failed.');
$assert($platform->normalizeCountry('Oman') === 'OM', 'Oman normalization failed.');
$assert(($de['timezone'] ?? null) === 'Europe/Berlin', 'Germany timezone must be Europe/Berlin.');
$assert(($de['currency']['code'] ?? null) === 'EUR', 'Germany currency must be EUR.');
$assert(($de['currency']['minor_exponent'] ?? null) === 2, 'EUR exponent must be 2.');
$assert(in_array('de', (array)($de['languages']['eligible'] ?? []), true), 'German must be eligible in Germany.');
$assert(($om['timezone'] ?? null) === 'Asia/Muscat', 'Oman timezone must be Asia/Muscat.');
$assert(($om['currency']['code'] ?? null) === 'OMR', 'Oman currency must be OMR.');
$assert(($om['currency']['minor_exponent'] ?? null) === 3, 'OMR exponent must be 3.');
$assert(in_array('ar', (array)($om['languages']['eligible'] ?? []), true), 'Arabic must be market-eligible in Oman.');
$assert(isset($om['payments']['methods']['om_cash']), 'Oman must have a regional Cash identity.');

$payments = new PaymentMarketRegistry($platform);
$assert($payments->canonicalMethodCode('om_card') === 'card', 'om_card canonical method failed.');
$assert($payments->canonicalMethodCode('om_omannet') === 'omannet', 'om_omannet canonical method failed.');
$assert($payments->canonicalMethodCode('om_apple_pay') === 'apple_pay', 'om_apple_pay canonical method failed.');
$assert($payments->canonicalMethodCode('om_google_pay') === 'google_pay', 'om_google_pay canonical method failed.');
$assert($payments->canonicalMethodCode('om_cash') === 'cash', 'om_cash canonical method failed.');
$assert($payments->providerForMethod('om_card') === 'paymob', 'Oman Card must resolve to Paymob catalogue provider.');
$assert($payments->providerForMethod('om_cash') === null, 'Oman Cash must never be Paymob-owned.');
$assert($payments->paymobIntegrationKey('om_cash') === null, 'Oman Cash must have no Paymob Integration ID key.');
$assert($payments->paymobIntegrationKey('om_omannet') === 'omannet', 'OmanNet Paymob integration key failed.');

$terminal = $payments->terminalState('OM');
$assert(($terminal['tap_to_pay_product'] ?? false) === true, 'Paymob Oman Tap to Pay should be catalogued.');
$assert(($terminal['remote_terminal_api'] ?? true) === false, 'Paymob Oman remote terminal API must remain fail-closed.');
$assert(($terminal['pmd_terminal_runtime'] ?? true) === false, 'Paymob Oman terminal runtime must remain blocked.');

$money = new MoneyMinorUnitConverter();
$assert($money->toMinor('8.500', 'OMR') === 8500, '8.500 OMR must be 8500 baisa/minor units.');
$assert($money->toMinor('8.50', 'EUR') === 850, '8.50 EUR must be 850 minor units.');

$public = $platform->publicProfiles();
$assert(isset($public['OM'], $public['DE']), 'Superadmin public profiles must expose Germany and Oman.');
$assert(in_array('Paymob', array_map(static fn ($value) => ucfirst((string)$value), $public['OM']['payment_providers'] ?? []), true), 'Superadmin Oman preview must expose Paymob.');

if ($failures) {
    fwrite(STDERR, "LOCATION PLATFORM R3 SELFTEST FAILED\n");
    foreach ($failures as $failure) fwrite(STDERR, " - {$failure}\n");
    exit(1);
}

echo "LOCATION PLATFORM R3 SELFTEST OK\n";
echo "Germany: Europe/Berlin | EUR(2) | de,en | regional payments\n";
echo "Oman: Asia/Muscat | OMR(3) | en,ar eligible | Paymob + regional payments\n";
echo "Oman cash: platform-owned, not Paymob-owned\n";
echo "Oman terminal: Tap to Pay catalogued; PMD remote terminal runtime blocked pending ECR/Cloud contract\n";
