<?php

$root = dirname(__DIR__);
$read = static function (string $path) use ($root): string {
    $full = $root.'/'.$path;
    if (!is_file($full)) {
        fwrite(STDERR, "Missing required file: {$path}\n");
        exit(2);
    }
    return (string)file_get_contents($full);
};

$expect = static function (string $source, string $needle, string $label): void {
    if (!str_contains($source, $needle)) {
        fwrite(STDERR, "FAIL {$label}: missing {$needle}\n");
        exit(3);
    }
};

$reject = static function (string $source, string $needle, string $label): void {
    if (str_contains($source, $needle)) {
        fwrite(STDERR, "FAIL {$label}: forbidden {$needle}\n");
        exit(4);
    }
};

$config = $read('config/pmd_ai.php');
$orchestrator = $read('app/Services/AI/AiOrchestrator.php');
$guest = $read('app/Services/AI/GuestMenuAiService.php');
$health = $read('app/Services/AI/AiHealthService.php');
$usage = $read('app/Services/AI/AiUsageLedger.php');
$policy = $read('app/Services/AI/AiCapabilityPolicy.php');
$retention = $read('app/Services/AI/AiRetentionService.php');
$guestContext = $read('app/Services/AI/GuestAiContextBuilder.php');
$visitBudget = $read('app/Services/AI/GuestAiVisitBudgetService.php');
$adminView = $read('app/admin/views/pmdintelligence/index.blade.php');

$expect($config, 'PMD_AI_REQUIRE_EXPLICIT_PROVIDER', 'explicit provider gate');
$expect($config, 'PMD_AI_GLOBAL_REQUESTS_PER_MINUTE', 'global request budget');
$expect($config, 'PMD_AI_ADMIN_CHAT_RETENTION_DAYS', 'admin retention config');
$expect($config, 'PMD_AI_GUEST_CHAT_RETENTION_DAYS', 'guest retention config');
$expect($config, 'PMD_AI_GUEST_CONTEXT_MENU_ITEMS', 'guest context size config');
$expect($config, 'PMD_AI_GUEST_DAILY_REQUESTS_PER_VISIT', 'guest visit budget config');

$expect($orchestrator, 'AiHealthService', 'admin health integration');
$expect($orchestrator, 'AiUsageLedger', 'admin usage integration');
$expect($orchestrator, 'AiCapabilityPolicy', 'admin capability policy');
$expect($orchestrator, 'filterTools', 'server-owned tool filtering');
$expect($orchestrator, 'consumeGlobal', 'provider-call global budget');
$expect($orchestrator, "'store' => (bool)config('pmd_ai.store_provider_response', false)", 'provider storage off');

$expect($guest, 'AiHealthService', 'guest health integration');
$expect($guest, 'AiUsageLedger', 'guest usage integration');
$expect($guest, 'GuestAiContextBuilder', 'guest context compaction');
$expect($guest, 'GuestAiVisitBudgetService', 'guest visit budget integration');
$expect($guest, 'consumeGlobal', 'guest global provider budget');
$reject($guest, 'PmdReadAuthority', 'guest/admin authority isolation');
$reject($guest, 'PmdKitchenWorkforceService', 'guest/workforce authority isolation');

$expect($health, 'circuit_open_until', 'provider circuit breaker');
$expect($health, 'project_suspended', 'suspended project classification');
$expect($health, 'account_state', 'service account classification');
$expect($usage, "'guest'", 'guest usage surface');
$expect($usage, "'admin'", 'admin usage surface');
$expect($policy, "'admin.dashboard'", 'owner capability scope');
$expect($policy, "'admin.orders'", 'orders capability scope');
$expect($policy, "'admin.reservations'", 'reservation capability scope');
$expect($retention, 'pmd_guest_ai_conversations', 'guest retention table');
$expect($guestContext, 'guest_context_menu_items', 'guest deterministic context limit');
$expect($visitBudget, 'guest_session_id', 'visit session scope');
$expect($visitBudget, 'guest_daily_requests_per_visit', 'visit daily threshold');
$expect($adminView, 'AiHealthService', 'Admin health state');
$expect($adminView, 'Restaurant operations are unaffected', 'Admin graceful provider failure UX');
$reject($adminView, "{{ $pmdAiConfig['provider'] }} · {{ $pmdAiConfig['model'] }}", 'provider internals hidden from normal Admin UI');

echo "PMD AI production contract audit: PASS\n";
