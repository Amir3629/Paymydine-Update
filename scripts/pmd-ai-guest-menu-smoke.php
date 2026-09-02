<?php

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\AI\GuestMenuAiService;
use Illuminate\Support\Facades\DB;

// Read-only canary smoke. Never changes the persistent .env feature flag.
config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => 'tomo',
    'pmd_ai.enabled' => true,
    'pmd_ai.guest_enabled' => true,
    'pmd_ai.guest_tenant_allowlist' => ['tomo'],
]);

DB::purge('tenant');
DB::setDefaultConnection('tenant');
DB::reconnect('tenant');

if ((string)DB::connection('tenant')->getDatabaseName() !== 'tomo') {
    fwrite(STDERR, "RESULT: FAIL\nERROR: wrong tenant database\n");
    exit(20);
}

try {
    $result = app(GuestMenuAiService::class)->ask(
        'What are two good choices from the current menu? Keep it short.',
        'en',
        '127.0.0.1'
    );

    $answer = trim((string)($result['answer'] ?? ''));
    if ($answer === '') {
        throw new RuntimeException('empty answer');
    }

    echo "DATABASE: tomo\n";
    echo "MODE: READ_ONLY_GUEST_MENU_SMOKE\n";
    echo "ANSWER: ".$answer."\n";
    echo "RESULT: PASS\n";
} catch (Throwable $error) {
    echo "RESULT: FAIL\n";
    echo "ERROR_TYPE: ".get_class($error)."\n";
    echo "ERROR: ".$error->getMessage()."\n";
    exit(10);
}
