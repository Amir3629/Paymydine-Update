<?php

declare(strict_types=1);

use App\Services\Payments\PaymobOmanCallbackService;
use App\Services\Payments\PaymobOmanPaymentAttemptService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$domain = strtolower(trim((string)($argv[1] ?? '')));
$limit = max(1, min(100, (int)($argv[2] ?? 25)));
if ($domain === '') {
    fwrite(STDERR, "Usage: php scripts/reconcile-paymob-oman-pending-r11.php omantest.paymydine.com [limit]\n");
    exit(2);
}
if (!str_contains($domain, '.')) $domain .= '.paymydine.com';

try {
    $tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$domain])->first();
    if (!$tenant || empty($tenant->database)) throw new RuntimeException('Tenant was not found.');

    Config::set('database.connections.mysql.database', (string)$tenant->database);
    Config::set('database.default', 'mysql');
    DB::purge('mysql');
    DB::reconnect('mysql');
    DB::setDefaultConnection('mysql');

    app(PaymobOmanPaymentAttemptService::class)->ensureSchema();
    if (!Schema::hasTable(PaymobOmanPaymentAttemptService::TABLE)) throw new RuntimeException('Paymob attempt table is unavailable.');

    $rows = DB::table(PaymobOmanPaymentAttemptService::TABLE)
        ->whereIn('status', [
            'provider_call_started',
            'intention_created',
            'pending',
            'provider_paid',
            'reconciliation_required',
        ])
        ->where('updated_at', '<=', now()->subSeconds(45))
        ->orderBy('updated_at')
        ->limit($limit)
        ->get();

    $service = app(PaymobOmanCallbackService::class);
    $results = [];
    foreach ($rows as $attempt) {
        try {
            $result = $service->reconcile($attempt);
            $results[] = [
                'reference' => (string)$attempt->special_reference,
                'before' => (string)$attempt->status,
                'after' => (string)($result['status'] ?? 'unknown'),
                'provider_paid' => (bool)($result['provider_paid'] ?? false),
                'settled_by_backend' => (bool)($result['settled_by_backend'] ?? false),
                'ok' => (bool)($result['ok'] ?? false),
            ];
        } catch (Throwable $error) {
            $results[] = [
                'reference' => (string)$attempt->special_reference,
                'before' => (string)$attempt->status,
                'after' => 'error',
                'ok' => false,
                'message' => mb_substr($error->getMessage(), 0, 500),
            ];
        }
    }

    echo json_encode([
        'ok' => true,
        'tenant' => (string)$tenant->domain,
        'scanned' => count($results),
        'settled' => count(array_filter($results, static fn (array $row): bool => (bool)($row['settled_by_backend'] ?? false))),
        'results' => $results,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
    echo "PAYMOB OMAN RECONCILIATION SWEEP R11: OK\n";
} catch (Throwable $error) {
    fwrite(STDERR, "PAYMOB OMAN RECONCILIATION SWEEP R11: FAILED\n".$error->getMessage()."\n");
    exit(5);
}
