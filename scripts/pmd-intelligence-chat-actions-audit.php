<?php

declare(strict_types=1);

$root = dirname(__DIR__);

$read = static function (string $path) use ($root): string {
    $full = $root.'/'.$path;
    if (!is_file($full)) {
        fwrite(STDERR, "FAIL missing {$path}\n");
        exit(1);
    }
    $value = file_get_contents($full);
    if (!is_string($value)) {
        fwrite(STDERR, "FAIL unreadable {$path}\n");
        exit(1);
    }
    return $value;
};

$expect = static function (string $source, string $needle, string $label): void {
    if (!str_contains($source, $needle)) {
        fwrite(STDERR, "FAIL {$label}: missing {$needle}\n");
        exit(1);
    }
};

$reject = static function (string $source, string $needle, string $label): void {
    if (str_contains($source, $needle)) {
        fwrite(STDERR, "FAIL {$label}: forbidden {$needle}\n");
        exit(1);
    }
};

$controller = $read('app/admin/controllers/Pmdintelligence.php');
$store = $read('app/Services/AI/AdminAiConversationStore.php');
$registry = $read('app/Services/AI/PmdIntelligenceActionRegistry.php');
$view = $read('app/admin/views/pmdintelligence/index.blade.php');
$js = $read('app/admin/assets/js/pmd-intelligence-v1.js');
$guestRoute = $read('app/main/routes/api-v1-guest-ai.php');
$guestUi = $read('frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/GuestAiConcierge.tsx');

$expect($controller, '$context->userId', 'real AiContext user scope');
$reject($controller, '$context->adminUserId', 'invented AiContext property');
$expect($controller, "admin_url('pmdintelligence/history')", 'admin history endpoint');
$expect($controller, "admin_url('pmdintelligence/clear')", 'admin clear endpoint');
$expect($controller, 'CONVERSATION_CONTINUITY_ONLY:', 'follow-up continuity');
$expect($controller, 'Re-check PMD tools for restaurant facts', 'fresh data authority rule');
$expect($controller, 'PmdIntelligenceActionRegistry::class', 'safe admin actions');

$expect($store, "private const TABLE = 'pmd_admin_ai_conversations'", 'admin chat table');
$expect($store, "where('location_id', \$locationId)", 'location scope');
$expect($store, "where('admin_user_id', \$userId)", 'admin-user scope');
$reject($store, 'ip_address', 'no IP persistence');
$reject($store, 'provider_response', 'no provider payload persistence');

$expect($registry, 'admin_url($route)', 'server-owned href generation');
$expect($registry, "'read_only_navigation' => true", 'navigation-only contract');
$expect($registry, "'pmdreports/topitems'", 'top-items destination');
$expect($registry, "'pmdreports/liveorders'", 'live-orders destination');
$expect($registry, "'reservations'", 'reservations destination');
$expect($registry, "'shifts'", 'shifts destination');
$expect($registry, "'menu'", 'menu destination');
$reject($registry, 'request()->input', 'model/request cannot supply href');

$expect($view, 'data-pmd-ai-messages', 'single chat transcript');
$expect($view, 'data-history-endpoint', 'history config');
$expect($view, 'data-clear-endpoint', 'clear config');
$expect($view, '<details class="pmd-ai-safety-details">', 'compact safety disclosure');
$reject($view, 'pmd-ai-grid', 'old split-card layout retired');
$expect($js, 'function loadHistory()', 'history hydration');
$expect($js, 'function renderActions(', 'action renderer');
$expect($js, 'pmd-ai-action-link', 'action links');
$reject($js, 'MutationObserver', 'no admin repair observer');
$reject($js, 'setInterval(', 'no admin polling layer');

$expect($guestRoute, "$allowed = ['call_waiter', 'view_cart', 'checkout']", 'closed guest action ids');
$expect($guestRoute, '[[PMD_ACTION:call_waiter]]', 'guest waiter action marker');
$expect($guestRoute, "'actions' => \$actions", 'guest action response');
$reject($guestRoute, 'PMD_ACTION:http', 'no guest model URLs');
$expect($guestUi, 'await callWaiter()', 'reuse waiter authority');
$expect($guestUi, 'openCart()', 'reuse cart authority');
$expect($guestUi, 'openCheckout()', 'reuse checkout authority');
$expect($guestUi, 'bootstrap.features.waiterCall', 'waiter feature gate');

fwrite(STDOUT, "PMD Intelligence chat/actions audit: PASS\n");
