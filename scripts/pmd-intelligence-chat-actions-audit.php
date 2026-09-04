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
$migration = $read('app/system/database/migrations/2026_09_04_120000_create_pmd_admin_ai_conversations.php');
$registry = $read('app/Services/AI/PmdIntelligenceActionRegistry.php');
$view = $read('app/admin/views/pmdintelligence/index.blade.php');
$sideMenu = $read('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php');
$js = $read('app/admin/assets/js/pmd-intelligence-v1.js');
$guestRoute = $read('app/main/routes/api-v1-guest-ai.php');
$guestConfig = $read('config/pmd_ai.php');
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
$expect($store, "where('conversation_date', \$conversationDate)", 'daily history/write scope');
$expect($store, "where('conversation_date', \$this->conversationDate())", 'daily clear scope');
$expect($store, 'canonicalTimezone()', 'restaurant-local day authority');
$expect($store, 'Previous daily chats remain stored', 'daily archive retention');
$expect($migration, "date('conversation_date')", 'fresh-schema conversation date');
$expect($migration, "['location_id', 'admin_user_id', 'conversation_date', 'id']", 'daily scope index');
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
$expect($view, 'Clear today', 'daily clear copy');
$expect($view, 'Loading today’s chat', 'daily chat loading copy');
$reject($view, 'How PMD Intelligence uses your data', 'removed data disclosure block');
$reject($view, 'pmd-ai-safety-details', 'removed safety details card');
$reject($view, 'pmd-ai-grid', 'old split-card layout retired');
$expect($view, 'data-pmd-ai-chat-root', 'cache-safe admin runtime root');
$expect($view, 'data-pmd-ai-versioned-style', 'versioned admin AI stylesheet');
$expect($view, 'data-pmd-ai-versioned-runtime', 'versioned admin AI runtime');
$expect($view, 'filemtime($pmdAiCssPath)', 'stylesheet mtime cache key');
$expect($view, 'filemtime($pmdAiJsPath)', 'runtime mtime cache key');
$expect($view, '<link rel="stylesheet" type="text/css" href="{{ $pmdAiCssUrl }}" data-pmd-ai-versioned-style>', 'stylesheet emitted in rendered page');
$expect($view, 'document.body.appendChild(script);', 'runtime emitted in rendered page');
$reject($view, "@push('styles')", 'late page stylesheet push');
$reject($view, "@push('scripts')", 'late page runtime push');
$expect($view, 'width="24" height="24" fill="none" stroke="currentColor"', 'safe inline SVG fallback geometry');
$expect($sideMenu, 'data-pmd-ai-nav', 'AI side navigation entry');
$expect($sideMenu, 'M12 3l1.15 3.65', 'sparkles AI navigation mark');
$expect($sideMenu, 'M18.5 3.5v3M17 5h3', 'secondary sparkle mark');
$expect($js, 'function loadHistory()', 'history hydration');
$expect($js, 'function renderActions(', 'action renderer');
$expect($js, 'pmd-ai-action-link', 'action links');
$reject($js, 'MutationObserver', 'no admin repair observer');
$reject($js, 'setInterval(', 'no admin polling layer');

$expect($guestRoute, "'question' => 'required|string|max:600'", 'public guest question boundary');
$expect($guestRoute, '$maxChars = 1500;', 'bounded trusted guest model envelope');
$expect($guestConfig, "'guest_max_question_chars' => max(", 'separate trusted service envelope');
$expect($guestConfig, '1600,', 'trusted service floor above model envelope');
$expect($guestRoute, "$allowed = ['call_waiter', 'view_cart', 'checkout']", 'closed guest action ids');
$expect($guestRoute, '[[PMD_ACTION:call_waiter]]', 'guest waiter action marker');
$expect($guestRoute, "'actions' => \$actions", 'guest action response');
$reject($guestRoute, 'PMD_ACTION:http', 'no guest model URLs');
$expect($guestRoute, 'pmd_guest_ai_public_answer_guard_20260904', 'guest-facing disclosure guard');
$expect($guestRoute, 'never expose PMD data gaps', 'guest UX hides internal data weakness');
$expect($guestRoute, 'Mention popularity only when the guest asks', 'popularity stays intent-scoped');
$expect($guestRoute, 'Persist only the guest-safe answer', 'stored history is sanitized before persistence');
$expect($guestRoute, 'recent order data', 'known internal weakness phrase is covered by disclosure detector');
$expect($guestUi, 'await callWaiter()', 'reuse waiter authority');
$expect($guestUi, 'openCart()', 'reuse cart authority');
$expect($guestUi, 'openCheckout()', 'reuse checkout authority');
$expect($guestUi, 'bootstrap.features.waiterCall', 'waiter feature gate');

fwrite(STDOUT, "PMD Intelligence chat/actions audit: PASS\n");
