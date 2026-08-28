<?php

declare(strict_types=1);

use App\Services\Payments\MoneyMinorUnitConverter;
use App\Services\Payments\PaymobApiClient;
use App\Services\Payments\PaymobOmanRuntimeGate;
use App\Services\Payments\PaymentMarketRegistry;
use App\Services\Payments\ProviderCapabilityRegistry;
use App\Services\TerminalPayments\PaymobOmanTerminalProvider;
use Illuminate\Contracts\Console\Kernel;

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$fail = static function (string $message): never {
    fwrite(STDERR, "PAYMOB OMAN R11 SELFTEST FAILED: {$message}\n");
    exit(5);
};

$money = new MoneyMinorUnitConverter();
if ($money->toMinor('8.500', 'OMR') !== 8500) $fail('OMR exponent/minor-unit conversion is wrong.');

$registry = (new ProviderCapabilityRegistry())->provider('paymob');
if (($registry['implemented_capabilities'] ?? []) !== []) $fail('Paymob capabilities were promoted before sandbox QA.');
if (($registry['implemented_payment_methods'] ?? []) !== []) $fail('Paymob methods were promoted before sandbox QA.');

if (PaymobOmanRuntimeGate::guestReady()) $fail('Production guest runtime gate is unexpectedly open.');
$gate = PaymobOmanRuntimeGate::state(['mode' => 'live']);
if ($gate['checkout_allowed'] ?? false) $fail('Live checkout must remain locked before sandbox certification.');
if ($gate['terminal_ready'] ?? false) $fail('Terminal runtime must remain locked.');

$market = new PaymentMarketRegistry();
$methods = array_keys($market->methodsForCountry('OM'));
foreach (['om_card','om_omannet','om_apple_pay','om_google_pay','om_cash'] as $required) {
    if (!in_array($required, $methods, true)) $fail("Missing Oman method {$required}.");
}

$client = new PaymobApiClient([
    'transaction_mode' => 'test',
    'test_public_key' => 'pk_test_selftest',
]);
$url = $client->checkoutUrl('selftest-client-secret');
if (!str_starts_with($url, 'https://oman.paymob.com/unifiedcheckout/?')) $fail('Unified Checkout URL is not Oman regional.');
if (!str_contains($url, 'publicKey=pk_test_selftest') || !str_contains($url, 'clientSecret=selftest-client-secret')) {
    $fail('Unified Checkout URL is missing public/client secret parameters.');
}

$terminal = (new PaymobOmanTerminalProvider())->validateConfiguration([]);
if ($terminal['ok'] ?? false) $fail('Paymob Oman terminal provider must fail closed.');

$report = [
    'omr_minor_unit' => 8500,
    'online_methods' => $methods,
    'production_guest_ready' => false,
    'live_checkout_allowed' => false,
    'terminal_ready' => false,
    'provider_registry_promoted' => false,
    'unified_checkout_host' => 'oman.paymob.com',
];
echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
echo "PAYMOB OMAN R11 SELFTEST OK\n";
