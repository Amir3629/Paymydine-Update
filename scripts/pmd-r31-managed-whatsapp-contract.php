<?php

// R31 pure contract tests: no Laravel/bootstrap, credentials, Meta or DB.
$GLOBALS['pmdTestConfig'] = [];
function config($name, $fallback = null) {
    return array_key_exists($name, $GLOBALS['pmdTestConfig'])
        ? $GLOBALS['pmdTestConfig'][$name] : $fallback;
}
function assertCheck(bool $value, string $name): void {
    if (!$value) {
        fwrite(STDERR, 'FAIL: '.$name.PHP_EOL);
        exit(1);
    }
    echo 'PASS: '.$name.PHP_EOL;
}
require __DIR__.'/../app/Services/WhatsApp/PmdManagedWhatsAppService.php';

$managed = new \App\Services\WhatsApp\PmdManagedWhatsAppService();
$events = ['created' => true, 'updated' => true, 'canceled' => true];

assertCheck(!$managed->credentialsReady(), 'One-platform sender disabled by default.');
assertCheck(!$managed->hasTemplatesForEvents($events), 'No templates means no proactive sends.');
$GLOBALS['pmdTestConfig'] = [
    'pmd_whatsapp.managed_enabled' => true,
    'pmd_whatsapp.system_user_token' => str_repeat('T', 60),
    'pmd_whatsapp.graph_version' => 'v25.0',
    'pmd_whatsapp.templates.created' => 'reservation_created',
    'pmd_whatsapp.templates.updated' => 'reservation_updated',
    'pmd_whatsapp.templates.canceled' => 'reservation_canceled',
];
assertCheck($managed->credentialsReady(), 'Valid opt-in global sender configuration recognized.');
assertCheck($managed->hasTemplatesForEvents($events), 'All three configured template names recognized.');
$GLOBALS['pmdTestConfig']['pmd_whatsapp.templates.updated'] = '';
assertCheck(!$managed->hasTemplatesForEvents($events), 'Missing enabled-event template fails closed.');
$events['updated'] = false;
assertCheck($managed->hasTemplatesForEvents($events), 'Disabled event does not require a template.');
$GLOBALS['pmdTestConfig']['pmd_whatsapp.managed_enabled'] = false;
assertCheck(!$managed->credentialsReady(), 'Disabling global sender disables managed API.');
$GLOBALS['pmdTestConfig']['pmd_whatsapp.managed_enabled'] = true;
$GLOBALS['pmdTestConfig']['pmd_whatsapp.graph_version'] = 'https://evil.test';
assertCheck(!$managed->credentialsReady(), 'Graph version cannot be an arbitrary URL.');
echo "R31 managed WhatsApp contracts passed.".PHP_EOL;
