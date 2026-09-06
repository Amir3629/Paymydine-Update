<?php

use App\Services\AI\AiHealthService;
use App\Services\AI\AiRetentionService;
use App\Services\AI\AiUsageLedger;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$health = app(AiHealthService::class)->status();
$retention = app(AiRetentionService::class)->purge();
$usage = app(AiUsageLedger::class)->snapshot();

echo "PMD AI MAINTENANCE\n";
echo "==================\n";
echo 'PROVIDER: '.($health['provider'] ?: '(unset)').PHP_EOL;
echo 'MODEL: '.($health['model'] ?: '(unset)').PHP_EOL;
echo 'CONFIGURED: '.(!empty($health['configured']) ? 'YES' : 'NO').PHP_EOL;
echo 'AVAILABLE_FOR_TRAFFIC: '.(!empty($health['available_for_traffic']) ? 'YES' : 'NO').PHP_EOL;
echo 'HEALTHY: '.($health['healthy'] === null ? 'UNKNOWN' : ($health['healthy'] ? 'YES' : 'NO')).PHP_EOL;
echo 'LAST_SUCCESS_AT: '.($health['last_success_at'] ?? 'none').PHP_EOL;
echo 'LAST_FAILURE_AT: '.($health['last_failure_at'] ?? 'none').PHP_EOL;
echo 'LAST_ERROR_CLASS: '.($health['last_error_class'] ?? 'none').PHP_EOL;
echo 'ADMIN_CHAT_ROWS_DELETED: '.(int)($retention['admin_deleted'] ?? 0).PHP_EOL;
echo 'GUEST_CHAT_ROWS_DELETED: '.(int)($retention['guest_deleted'] ?? 0).PHP_EOL;
echo 'USAGE_SURFACES_TODAY: '.implode(',', array_keys($usage)).PHP_EOL;
