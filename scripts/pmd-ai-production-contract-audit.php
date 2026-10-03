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
$tenantPolicy = $read('app/Services/AI/PmdAiTenantPolicyService.php');
$retention = $read('app/Services/AI/AiRetentionService.php');
$guestContext = $read('app/Services/AI/GuestAiContextBuilder.php');
$visitBudget = $read('app/Services/AI/GuestAiVisitBudgetService.php');
$maintenance = $read('scripts/pmd-ai-maintenance.php');
$adminController = $read('app/admin/controllers/Pmdintelligence.php');
$adminView = $read('app/admin/views/pmdintelligence/index.blade.php');

$expect($config, 'PMD_AI_REQUIRE_EXPLICIT_PROVIDER', 'explicit provider gate');
$expect($config, 'PMD_AI_ADMIN_TENANT_ALLOWLIST', 'Admin tenant canary gate');
$expect($config, 'PMD_AI_GLOBAL_REQUESTS_PER_MINUTE', 'global request budget');
$expect($config, 'PMD_AI_USAGE_RETENTION_DAYS', 'usage retention config');
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
$expect($guest, 'PmdAiTenantPolicyService', 'guest tenant policy integration');
$expect($guest, 'consumeGlobal', 'guest global provider budget');
$reject($guest, 'PmdReadAuthority', 'guest/admin authority isolation');
$reject($guest, 'PmdKitchenWorkforceService', 'guest/workforce authority isolation');

$expect($health, 'circuit_open_until', 'provider circuit breaker');
$expect($health, 'project_suspended', 'suspended project classification');
$expect($health, 'account_state', 'service account classification');
$expect($usage, 'pmd_ai_usage_daily', 'persistent tenant usage ledger');
$expect($usage, 'provider_calls', 'provider-call accounting');
$expect($usage, 'thinking_tokens', 'thinking-token accounting');
$expect($usage, "'guest'", 'guest usage surface');
$expect($usage, "'admin'", 'admin usage surface');
$reject($usage, "'question' =>", 'usage ledger stores no questions');
$reject($usage, "'answer' =>", 'usage ledger stores no answers');
$expect($policy, "'admin.dashboard'", 'owner capability scope');
$expect($policy, "'admin.orders'", 'orders capability scope');
$expect($policy, "'admin.reservations'", 'reservation capability scope');
$expect($policy, 'PmdAiTenantPolicyService', 'Admin tenant entitlement gate');
$expect($tenantPolicy, 'pmd_ai_admin_enabled', 'tenant Admin entitlement setting');
$expect($tenantPolicy, 'admin_tenant_allowlist', 'Admin environment canary fallback');
$expect($tenantPolicy, 'pmd_ai_guest_enabled', 'tenant Guest entitlement setting');
$expect($tenantPolicy, 'pmd_ai_guest_location_allowlist', 'tenant Guest location policy');
$expect($tenantPolicy, 'server_canary_fallback', 'safe environment fallback');
$expect($tenantPolicy, 'getColumnListing', 'legacy-compatible settings schema inspection');
$reject($tenantPolicy, 'return $value === null ? true', 'Admin AI must not default on for every tenant');
$expect($retention, 'pmd_guest_ai_conversations', 'guest retention table');
$expect($retention, 'pmd_ai_usage_daily', 'usage retention table');
$expect($retention, 'usage_retention_days', 'usage retention policy');
$expect($guestContext, 'guest_context_menu_items', 'guest deterministic context limit');
$expect($visitBudget, 'guest_session_id', 'visit session scope');
$expect($visitBudget, 'guestVisitDailyRequestBudget', 'tenant-aware visit daily threshold');
$expect($maintenance, "getopt('', ['tenant-host:'])", 'maintenance requires explicit tenant');
$expect($maintenance, "where('domain', \$host)", 'maintenance resolves tenant from central registry');
$expect($maintenance, "DB::setDefaultConnection('tenant')", 'maintenance pins tenant connection');
$expect($maintenance, 'Connected tenant database does not match the registry tenant', 'maintenance database identity check');
$expect($adminController, 'PmdAiTenantPolicyService', 'Admin tenant policy controller gate');
$expect($adminController, 'Restaurant operations are unaffected', 'Admin generic provider failure response');
$reject($adminController, 'OpenAI API credit is unavailable', 'vendor billing details hidden from operators');
$reject($adminController, 'Gemini quota is temporarily exhausted', 'vendor quota details hidden from operators');
$expect($adminView, 'AiHealthService', 'Admin health state');
$expect($adminView, 'Restaurant operations are unaffected', 'Admin graceful provider failure UX');
$reject($adminView, '{{ $pmdAiConfig[\'provider\'] }} · {{ $pmdAiConfig[\'model\'] }}', 'provider internals hidden from normal Admin UI');

echo "PMD AI production contract audit: PASS\n";
