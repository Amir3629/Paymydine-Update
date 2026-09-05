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
$orchestrator = $read('app/Services/AI/AiOrchestrator.php');
$store = $read('app/Services/AI/AdminAiConversationStore.php');
$workforce = $read('app/Services/AI/PmdAdminWorkforceIntelligenceService.php');
$shiftAudit = $read('app/Services/AI/PmdShiftAuditService.php');
$shiftAuditMigration = $read('app/system/database/migrations/2026_09_05_123000_create_pmd_operational_shift_audit_events.php');
$adminPresenceMiddleware = $read('app/admin/middleware/LogUserLastSeen.php');
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
$expect($controller, 'PMD_RUNTIME_CONTEXT:', 'restaurant clock context');
$expect($controller, 'restaurant_local_datetime=', 'restaurant local datetime');
$expect($controller, 'Resolve today, tomorrow, tonight, yesterday', 'relative date rule');
$expect($controller, 'PmdAdminWorkforceIntelligenceService::class', 'named staff workforce authority');
$expect($controller, 'Never claim staff names are unavailable before calling this tool.', 'staff names tool contract');
$expect($controller, "\$result['people']", 'current kitchen named people');
$expect($controller, 'PmdIntelligenceActionRegistry::class', 'safe admin actions');

$expect($orchestrator, 'Never flatter the signed-in user with hierarchy or status language.', 'neutral operator tone');
$expect($orchestrator, 'Do not call them boss, chief, king, queen, president, or similar titles', 'no hierarchy nicknames');
$expect($orchestrator, 'state the role neutrally', 'neutral role reference');
$reject($orchestrator, 'boss 👑', 'no boss crown example');
$reject($orchestrator, 'Around here, [name] is the boss', 'no boss praise example');

$expect($store, "private const TABLE = 'pmd_admin_ai_conversations'", 'admin chat table');
$expect($store, "where('location_id', \$locationId)", 'location scope');
$expect($store, "where('admin_user_id', \$userId)", 'admin-user scope');
$expect($store, "where('created_at', '>=', \$window['storage_start'])", 'restaurant-day start boundary');
$expect($store, "where('created_at', '<', \$window['storage_end'])", 'restaurant-day end boundary');
$expect($store, "'storage_mode' => 'tenant_pinned_created_at_window_v2'", 'durable tenant-pinned daily history mode');
$expect($store, 'canonicalTimezone()', 'restaurant-local day authority');
$expect($store, 'Prior days remain available', 'daily archive retention');
$expect($store, 'public function archive(', 'saved daily archive');
$expect($store, 'getColumnListing(self::TABLE)', 'physical conversation-date column detection');
$expect($store, "in_array('conversation_date', \$columns, true)", 'required conversation-date population');
$expect($store, 'insertGetId', 'verified chat row inserts');
$expect($store, 'Pruning is deliberately best-effort and OUTSIDE the insert transaction.', 'prune cannot rollback chat');
$expect($store, "app()->bound('tenant')", 'tenant context pin');
$expect($store, "return \$this->resolvedConnectionName = 'tenant'", 'explicit tenant connection');
$expect($store, '$db->transaction', 'writes use pinned connection');
$expect($store, 'Schema::connection($this->connectionName())', 'schema uses pinned connection');
$expect($store, "'sql_state'", 'safe SQL state diagnostics');
$expect($store, "'driver_code'", 'safe driver diagnostics');
$reject($store, 'Schema::table(self::TABLE', 'no request-time ALTER TABLE dependency');
$reject($store, 'hasConversationDateColumn', 'no fragile hasColumn persistence gate');
$reject($store, 'DB::transaction(', 'no mutable-default transaction');
$reject($store, 'ip_address', 'no IP persistence');
$reject($store, 'provider_response', 'no provider payload persistence');
$expect($migration, "date('conversation_date')", 'fresh-schema conversation date');

$expect($workforce, 'final class PmdAdminWorkforceIntelligenceService', 'internal staff detail service');
$expect($workforce, 'private const MAX_RANGE_DAYS = 730', 'historical/YTD workforce range');
$expect($workforce, '90-day cap block Admin historical/YTD intelligence', 'canonical short-range cap bypass');
$expect($workforce, "'name' =>", 'staff display names');
$expect($workforce, "'job_role' =>", 'staff roles');
$expect($workforce, "'scheduled_hours' =>", 'staff scheduled hours');
$expect($workforce, "'actual_worked_hours' =>", 'historical actual worked hours');
$expect($workforce, "'worked_days' =>", 'historical worked days');
$expect($workforce, "'completed_attendance_sessions' =>", 'completed attendance sessions');
$expect($workforce, "'open_attendance_sessions' =>", 'open attendance sessions');
$expect($workforce, "'anomalous_attendance_sessions' =>", 'attendance anomaly visibility');
$expect($workforce, "'worked_vs_scheduled_hours'", 'worked versus scheduled comparison');
$expect($workforce, "'actual_hours_on_date' =>", 'optional actual worked hours by date');
$expect($workforce, "'attendance_status' =>", 'attendance state');
$expect($workforce, "'assignment_added_at' =>", 'legacy assignment creation timestamp');
$expect($workforce, "'confirmed_by' =>", 'shift confirmer identity');
$expect($workforce, "'not_scheduled_in_range'", 'off-roster visibility');
$expect($workforce, "'shift_audit'", 'immutable shift audit included in staff tool');
$expect($workforce, 'No contact, login credentials, salary/payroll or private profile data.', 'workforce privacy boundary');
$reject($workforce, 'staff_email', 'no staff email field to model');
$reject($workforce, 'staff_phone', 'no staff phone field to model');
$reject($workforce, 'password_hash', 'no staff auth secret to model');

$expect($shiftAudit, "public const TABLE = 'pmd_operational_shift_audit_events'", 'shift audit table authority');
$expect($shiftAudit, "'actor_name' =>", 'audit actor display name');
$expect($shiftAudit, "'actor_role' =>", 'audit actor role');
$expect($shiftAudit, "'person_name' =>", 'audit target person');
$expect($shiftAudit, "'coverage_start'", 'audit coverage boundary');
$expect($shiftAudit, 'Earlier shift changes may predate the audit trail.', 'no fabricated pre-audit actor history');

$expect($shiftAuditMigration, "'assignment_added'", 'assignment added audit event');
$expect($shiftAuditMigration, "'assignment_removed'", 'assignment removed audit event');
$expect($shiftAuditMigration, "'shift_confirmed'", 'shift confirmation audit event');
$expect($shiftAuditMigration, "'attendance_changed'", 'attendance audit event');
$expect($shiftAuditMigration, '@pmd_actor_admin_user_id', 'trigger reads authenticated admin actor');
$expect($shiftAuditMigration, '@pmd_actor_staff_id', 'trigger reads authenticated staff actor');
$expect($shiftAuditMigration, '@pmd_audit_source', 'trigger records request source');
$expect($shiftAuditMigration, 'JSON_OBJECT(', 'immutable before/after event payloads');

$expect($adminPresenceMiddleware, 'PMD_SHIFT_AUDIT_ACTOR_CONTEXT_V1', 'admin audit actor middleware');
$expect($adminPresenceMiddleware, '@pmd_actor_admin_user_id', 'admin user DB session context');
$expect($adminPresenceMiddleware, '@pmd_actor_staff_id', 'staff DB session context');
$expect($adminPresenceMiddleware, '@pmd_audit_source', 'request source DB session context');
$expect($adminPresenceMiddleware, 'reset on every', 'connection reuse identity reset');

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
$reject($view, 'pmd-ai-nav-mark-v3', 'no page-specific robot nav override');
$reject($view, '-webkit-mask:', 'no page-specific nav mask');
$expect($view, 'The sidebar icon is intentionally NOT restyled here.', 'canonical side menu owns AI icon');
$expect($view, 'Saved chats ·', 'previous daily chats exposed');
$expect($view, 'AdminAiConversationStore::class)->archive(', 'archive read is server-owned');
$expect($sideMenu, 'data-pmd-ai-nav', 'AI side navigation entry');
$expect($js, 'function loadHistory()', 'history hydration');
$expect($js, 'void loadHistory();', 'history loads on workspace boot');
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
$reject($guestRoute, 'PmdShiftAuditService', 'guest cannot access shift audit authority');
$reject($guestRoute, 'PmdAdminWorkforceIntelligenceService', 'guest cannot access admin workforce authority');
$expect($guestUi, 'await callWaiter()', 'reuse waiter authority');
$expect($guestUi, 'openCart()', 'reuse cart authority');
$expect($guestUi, 'openCheckout()', 'reuse checkout authority');
$expect($guestUi, 'bootstrap.features.waiterCall', 'waiter feature gate');

fwrite(STDOUT, "PMD Intelligence chat/actions audit: PASS\n");
