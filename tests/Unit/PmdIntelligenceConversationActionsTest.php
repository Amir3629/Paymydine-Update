<?php

use PHPUnit\Framework\TestCase;

final class PmdIntelligenceConversationActionsTest extends TestCase
{
    public function testAdminChatIsTenantLocalUserLocationAndDailyScoped(): void
    {
        $root = dirname(__DIR__, 2);
        $store = file_get_contents($root.'/app/Services/AI/AdminAiConversationStore.php');
        $migration = file_get_contents($root.'/app/system/database/migrations/2026_09_04_120000_create_pmd_admin_ai_conversations.php');

        self::assertIsString($store);
        self::assertIsString($migration);
        self::assertStringContainsString("private const TABLE = 'pmd_admin_ai_conversations'", $store);
        self::assertStringContainsString("where('location_id', \$locationId)", $store);
        self::assertStringContainsString("where('admin_user_id', \$userId)", $store);
        self::assertStringContainsString("where('conversation_date', \$conversationDate)", $store);
        self::assertStringContainsString("where('conversation_date', \$this->conversationDate())", $store);
        self::assertStringContainsString('canonicalTimezone()', $store);
        self::assertStringContainsString('conversation_date', $store);
        self::assertStringContainsString('Previous daily chats remain stored', $store);
        self::assertStringContainsString('MAX_MESSAGES = 300', $store);
        self::assertStringContainsString('modelContext', $store);
        self::assertStringContainsString('clear(int $locationId, int $userId)', $store);
        self::assertStringNotContainsString('ip_address', $store);
        self::assertStringNotContainsString('provider_response', $store);
        self::assertStringNotContainsString('api_key', strtolower($store));
        self::assertStringContainsString('pmd_admin_ai_conversations', $migration);
        self::assertStringContainsString("date('conversation_date')", $migration);
        self::assertStringContainsString("['location_id', 'admin_user_id', 'conversation_date', 'id']", $migration);
    }

    public function testAdminControllerPersistsFollowupsAndRechecksPmdAuthority(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/app/admin/controllers/Pmdintelligence.php');

        self::assertIsString($source);
        self::assertStringContainsString("admin_url('pmdintelligence/history')", $source);
        self::assertStringContainsString("admin_url('pmdintelligence/clear')", $source);
        self::assertStringContainsString('AdminAiConversationStore::class', $source);
        self::assertStringContainsString('PmdIntelligenceActionRegistry::class', $source);
        self::assertStringContainsString('CONVERSATION_CONTINUITY_ONLY:', $source);
        self::assertStringContainsString('Re-check PMD tools for restaurant facts', $source);
        self::assertStringContainsString('$context->userId', $source);
        self::assertStringNotContainsString('$context->adminUserId', $source);
        self::assertStringContainsString("['kind' => 'report', 'report' => \$report", $source);
        self::assertStringContainsString("['kind' => 'order_integrity']", $source);
        self::assertStringContainsString("['kind' => 'workforce_schedule']", $source);
        self::assertStringContainsString("['kind' => 'kitchen_workforce']", $source);
        self::assertStringContainsString("'actions'", $source);
        self::assertStringContainsString("'persisted'", $source);
        self::assertStringContainsString("'storage_ready'", $source);
    }

    public function testAdminActionsAreServerOwnedCanonicalNavigationOnly(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/app/Services/AI/PmdIntelligenceActionRegistry.php');

        self::assertIsString($source);
        self::assertStringContainsString('private const MAX_ACTIONS = 3', $source);
        self::assertStringContainsString("'pmdreports/sales'", $source);
        self::assertStringContainsString("'pmdreports/liveorders'", $source);
        self::assertStringContainsString("'pmdreports/topitems'", $source);
        self::assertStringContainsString("'pmdreports/reviews'", $source);
        self::assertStringContainsString("'pmdreports/reservations'", $source);
        self::assertStringContainsString("'pmdreports/attendance'", $source);
        self::assertStringContainsString("'pmdreportchannels'", $source);
        self::assertStringContainsString("'pmdreporttips'", $source);
        self::assertStringContainsString("'orders'", $source);
        self::assertStringContainsString("'reservations'", $source);
        self::assertStringContainsString("'shifts'", $source);
        self::assertStringContainsString("'menu'", $source);
        self::assertStringContainsString("'dashboard'", $source);
        self::assertStringContainsString('admin_url($route)', $source);
        self::assertStringContainsString("'read_only_navigation' => true", $source);
        self::assertStringNotContainsString('request()->input', $source);
        self::assertStringNotContainsString('DB::', $source);
    }

    public function testAdminPageIsOneFocusedDailyChatWorkspace(): void
    {
        $root = dirname(__DIR__, 2);
        $view = file_get_contents($root.'/app/admin/views/pmdintelligence/index.blade.php');
        $js = file_get_contents($root.'/app/admin/assets/js/pmd-intelligence-v1.js');
        $css = file_get_contents($root.'/app/admin/assets/css/pmd-intelligence-v1.css');
        $sideMenu = file_get_contents($root.'/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php');

        self::assertIsString($view);
        self::assertIsString($js);
        self::assertIsString($css);
        self::assertIsString($sideMenu);
        self::assertStringContainsString('data-history-endpoint', $view);
        self::assertStringContainsString('data-clear-endpoint', $view);
        self::assertStringContainsString('data-pmd-ai-thread', $view);
        self::assertStringContainsString('data-pmd-ai-messages', $view);
        self::assertStringContainsString('role="log"', $view);
        self::assertStringContainsString('Clear today', $view);
        self::assertStringContainsString('Loading today’s chat', $view);
        self::assertStringNotContainsString('How PMD Intelligence uses your data', $view);
        self::assertStringNotContainsString('pmd-ai-safety-details', $view);
        self::assertStringNotContainsString('pmd-ai-grid', $view);
        self::assertStringNotContainsString('pmd-ai-answer-card', $view);

        self::assertStringContainsString('data-pmd-ai-nav', $sideMenu);
        self::assertStringContainsString('M12 3l1.15 3.65', $sideMenu);
        self::assertStringContainsString('M18.5 3.5v3M17 5h3', $sideMenu);

        self::assertStringContainsString('function loadHistory()', $js);
        self::assertStringContainsString('function renderActions(', $js);
        self::assertStringContainsString('pmd-ai-action-link', $js);
        self::assertStringContainsString('clearEndpoint', $js);
        self::assertStringContainsString("event.key === 'Enter' && !event.shiftKey", $js);
        self::assertStringNotContainsString('MutationObserver', $js);
        self::assertStringNotContainsString('setInterval(', $js);
        self::assertStringNotContainsString('eval(', $js);

        self::assertStringContainsString('.pmd-ai-chat-card', $css);
        self::assertStringContainsString('.pmd-ai-message-actions', $css);
        self::assertStringContainsString('.pmd-ai-action-link', $css);
    }

    public function testGuestActionsReuseExistingV2AuthoritiesAndNeverModelUrls(): void
    {
        $root = dirname(__DIR__, 2);
        $route = file_get_contents($root.'/app/main/routes/api-v1-guest-ai.php');
        $component = file_get_contents($root.'/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/GuestAiConcierge.tsx');

        self::assertIsString($route);
        self::assertIsString($component);
        self::assertStringContainsString("\$allowed = ['call_waiter', 'view_cart', 'checkout']", $route);
        self::assertStringContainsString('[[PMD_ACTION:call_waiter]]', $route);
        self::assertStringContainsString('[[PMD_ACTION:view_cart]]', $route);
        self::assertStringContainsString('[[PMD_ACTION:checkout]]', $route);
        self::assertStringContainsString("'actions' => \$actions", $route);
        self::assertStringNotContainsString('PMD_ACTION:http', $route);

        self::assertStringContainsString('normalizeActionIds', $component);
        self::assertStringContainsString('await callWaiter()', $component);
        self::assertStringContainsString('openCart()', $component);
        self::assertStringContainsString('openCheckout()', $component);
        self::assertStringContainsString('bootstrap.features.waiterCall', $component);
        self::assertStringNotContainsString("fetch('/api/v1/waiter-call", $component);
    }
}
