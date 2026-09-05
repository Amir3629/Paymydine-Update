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
        self::assertStringContainsString("where('created_at', '>=', \$window['storage_start'])", $store);
        self::assertStringContainsString("where('created_at', '<', \$window['storage_end'])", $store);
        self::assertStringContainsString("'storage_mode' => 'tenant_pinned_created_at_window_v2'", $store);
        self::assertStringContainsString('canonicalTimezone()', $store);
        self::assertStringContainsString('Prior days remain available', $store);
        self::assertStringContainsString('MAX_MESSAGES = 300', $store);
        self::assertStringContainsString('modelContext', $store);
        self::assertStringContainsString('public function archive(', $store);
        self::assertStringContainsString('clear(int $locationId, int $userId)', $store);
        self::assertStringContainsString('getColumnListing(self::TABLE)', $store);
        self::assertStringContainsString("in_array('conversation_date', \$columns, true)", $store);
        self::assertStringContainsString('insertGetId', $store);
        self::assertStringContainsString('Pruning is deliberately best-effort and OUTSIDE the insert transaction.', $store);
        self::assertStringContainsString("app()->bound('tenant')", $store);
        self::assertStringContainsString("return \$this->resolvedConnectionName = 'tenant'", $store);
        self::assertStringContainsString('$db->transaction', $store);
        self::assertStringContainsString('Schema::connection($this->connectionName())', $store);
        self::assertStringNotContainsString('Schema::table(self::TABLE', $store);
        self::assertStringNotContainsString('hasConversationDateColumn', $store);
        self::assertStringNotContainsString('DB::transaction(', $store);
        self::assertStringNotContainsString('ip_address', $store);
        self::assertStringNotContainsString('provider_response', $store);
        self::assertStringNotContainsString('api_key', strtolower($store));
        self::assertStringContainsString('pmd_admin_ai_conversations', $migration);
        self::assertStringContainsString("date('conversation_date')", $migration);
    }

    public function testAdminControllerPersistsFollowupsUsesLocalClockAndStaffAuthority(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/app/admin/controllers/Pmdintelligence.php');

        self::assertIsString($source);
        self::assertStringContainsString("admin_url('pmdintelligence/history')", $source);
        self::assertStringContainsString("admin_url('pmdintelligence/clear')", $source);
        self::assertStringContainsString('AdminAiConversationStore::class', $source);
        self::assertStringContainsString('PmdIntelligenceActionRegistry::class', $source);
        self::assertStringContainsString('PmdAdminWorkforceIntelligenceService::class', $source);
        self::assertStringContainsString('CONVERSATION_CONTINUITY_ONLY:', $source);
        self::assertStringContainsString('PMD_RUNTIME_CONTEXT:', $source);
        self::assertStringContainsString('restaurant_local_datetime=', $source);
        self::assertStringContainsString('Resolve today, tomorrow, tonight, yesterday', $source);
        self::assertStringContainsString('Re-check PMD tools for restaurant facts', $source);
        self::assertStringContainsString('Never claim staff names are unavailable before calling this tool.', $source);
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

    public function testInternalWorkforceIntelligenceExposesOperationsNotPrivateStaffData(): void
    {
        $root = dirname(__DIR__, 2);
        $source = file_get_contents($root.'/app/Services/AI/PmdAdminWorkforceIntelligenceService.php');
        $personHours = file_get_contents($root.'/app/Services/AI/PmdWorkforcePersonHoursService.php');
        $compactor = file_get_contents($root.'/app/Services/AI/PmdWorkforceToolFactCompactor.php');

        self::assertIsString($source);
        self::assertIsString($personHours);
        self::assertIsString($compactor);
        self::assertStringContainsString('PmdAdminWorkforceIntelligenceService', $source);
        self::assertStringContainsString("'name' =>", $source);
        self::assertStringContainsString("'department' =>", $source);
        self::assertStringContainsString("'job_role' =>", $source);
        self::assertStringContainsString("'attendance_status' =>", $source);
        self::assertStringContainsString("'scheduled_hours' =>", $source);
        self::assertStringContainsString("'actual_hours_on_date' =>", $source);
        self::assertStringContainsString("'not_scheduled_in_range'", $source);
        self::assertStringContainsString('no contact, login, payroll or private profile data', $source);
        self::assertStringNotContainsString('email', strtolower($source));
        self::assertStringNotContainsString('phone', strtolower($source));
        self::assertStringNotContainsString('password', strtolower($source));
        self::assertStringNotContainsString('salary', strtolower($source));

        self::assertStringContainsString("private const BASE_CONNECTION = 'tenant'", $personHours);
        self::assertStringContainsString("private const RUNTIME_CONNECTION = 'pmd_ai_workforce_tenant'", $personHours);
        self::assertStringContainsString("app()->bound('tenant')", $personHours);
        self::assertStringContainsString('$base->getConfig()', $personHours);
        self::assertStringContainsString("\$config['url'] = null;", $personHours);
        self::assertStringContainsString("\$config['prefix'] = (string)\$base->getTablePrefix();", $personHours);
        self::assertStringContainsString('DB::purge(self::RUNTIME_CONNECTION)', $personHours);
        self::assertStringContainsString('DB::connection(self::RUNTIME_CONNECTION)', $personHours);
        self::assertStringContainsString('getDatabaseName()', $personHours);
        self::assertStringContainsString('strcasecmp($baseDatabase, $database)', $personHours);
        self::assertStringContainsString('strcasecmp($actualDatabase, $database)', $personHours);
        self::assertStringContainsString('information_schema.TABLES', $personHours);
        self::assertStringContainsString('physicalTable(', $personHours);
        self::assertStringContainsString('$connection->raw($this->quoteIdentifier($physical))', $personHours);
        self::assertStringContainsString("table('staff_attendance')", $personHours);
        self::assertStringContainsString("table('pmd_operational_people')", $personHours);
        self::assertStringContainsString("table('staffs')", $personHours);
        self::assertStringContainsString("->select(['staff_id', 'location_id', 'check_in_time', 'check_out_time'])", $personHours);
        self::assertStringContainsString("->where('staff_id', \$staffId)", $personHours);
        self::assertStringContainsString("'attendance_read_ok'", $personHours);
        self::assertStringContainsString("'attendance_rows_found'", $personHours);
        self::assertStringNotContainsString('Schema::', $personHours);
        self::assertStringNotContainsString("DB::table('staff_attendance')", $personHours);
        self::assertStringNotContainsString("->table('staff_attendance')", $personHours);
        self::assertStringNotContainsString('DB::setDefaultConnection(', $personHours);

        self::assertStringContainsString('attendance_read_ok', $compactor);
        self::assertStringContainsString('attendance_rows_found=0', $compactor);
        self::assertStringContainsString('no clock-in/clock-out attendance records', $compactor);
        self::assertStringContainsString('A readable zero-row source is not unavailable.', $compactor);
    }

    public function testAdminAiToneDoesNotFlatterRoleOrCallUserBoss(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/app/Services/AI/AiOrchestrator.php');

        self::assertIsString($source);
        self::assertStringContainsString('Never flatter the signed-in user with hierarchy or status language.', $source);
        self::assertStringContainsString('Do not call them boss, chief, king, queen, president, or similar titles', $source);
        self::assertStringContainsString('state the role neutrally', $source);
        self::assertStringNotContainsString('boss 👑', $source);
        self::assertStringNotContainsString('Around here, [name] is the boss', $source);
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

    public function testAdminPageIsOneFocusedDailyChatWorkspaceWithCanonicalAiIcon(): void
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
        self::assertStringContainsString('Saved chats ·', $view);
        self::assertStringContainsString('AdminAiConversationStore::class)->archive(', $view);
        self::assertStringNotContainsString('How PMD Intelligence uses your data', $view);
        self::assertStringNotContainsString('pmd-ai-safety-details', $view);
        self::assertStringNotContainsString('pmd-ai-grid', $view);
        self::assertStringNotContainsString('pmd-ai-answer-card', $view);

        self::assertStringContainsString('data-pmd-ai-nav', $sideMenu);
        self::assertStringNotContainsString('pmd-ai-nav-mark-v3', $view);
        self::assertStringNotContainsString('-webkit-mask:', $view);
        self::assertStringContainsString('The sidebar icon is intentionally NOT restyled here.', $view);

        self::assertStringContainsString('function loadHistory()', $js);
        self::assertStringContainsString('void loadHistory();', $js);
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
