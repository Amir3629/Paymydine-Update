<?php

// Standalone tests: no Laravel bootstrap, DB, vendor dependencies or Meta secrets.
require __DIR__.'/../app/Services/WhatsApp/PmdWhatsAppGateway.php';

use App\Services\WhatsApp\PmdWhatsAppGateway;

function testCase(bool $pass, string $name): void
{
    if (!$pass) {
        fwrite(STDERR, "FAIL: ".$name.PHP_EOL);
        exit(1);
    }
    echo "PASS: ".$name.PHP_EOL;
}

$service = new PmdWhatsAppGateway();
$secret = 'test-only-example-app-secret-with-entropy';
$body = '{"object":"whatsapp_business_account","entry":[]}';
$signature = 'sha256='.hash_hmac('sha256', $body, $secret);

testCase($service->validSignature($body, $signature, $secret), 'valid Meta SHA256 accepted');
testCase(!$service->validSignature($body.' ', $signature, $secret), 'tampered payload rejected');
testCase(!$service->validSignature($body, $signature, 'wrong-secret-not-equal-to-example'), 'wrong secret rejected');
testCase(!$service->validSignature($body, 'sha256=invalid', $secret), 'malformed signature rejected');
testCase(!$service->validSignature($body, '', $secret), 'missing signature rejected');
testCase(!$service->validSignature($body, $signature, ''), 'missing app secret rejected');
testCase(!$service->validSignature($body, $signature, 'weak'), 'too short app secret rejected');

echo "R30 signed WhatsApp webhook tests passed.".PHP_EOL;
