<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use App\Services\AI\AdminAiConversationStore;
use App\Services\AI\AiContext;
use App\Services\AI\AiOrchestrator;
use App\Services\AI\PmdAdminWorkforceIntelligenceService;
use App\Services\AI\PmdIntelligenceActionRegistry;
use App\Services\AI\PmdReadAuthority;
use App\Services\PmdKitchenWorkforceService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * PMD Intelligence
 *
 * Read-only restaurant operations copilot. Restaurant facts are still read
 * through PMD authorities; conversation persistence is tenant-local and scoped
 * to the authenticated PMD user + canonical location.
 */
class Pmdintelligence extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-owner-settings-page pmd-intelligence-page'
        );
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-intelligence-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        $this->addJs('js/pmd-intelligence-v1.js');

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        Template::setTitle('PMD Intelligence');
        Template::setHeading('PMD Intelligence');

        $context = $this->buildAiContext('workspace_boot');
        $this->vars['pmdAiConfig'] = [
            'enabled' => (bool)config('pmd_ai.enabled', false),
            'provider' => (string)config('pmd_ai.provider', 'openai'),
            'model' => (string)config('pmd_ai.model', 'gpt-5.6-luna'),
            'read_only' => true,
            'location_id' => $context->locationId,
            'endpoint' => admin_url('pmdintelligence/ask'),
            'history_endpoint' => admin_url('pmdintelligence/history'),
            'clear_endpoint' => admin_url('pmdintelligence/clear'),
        ];

        return $this->makeView('pmdintelligence/index');
    }

    public function history()
    {
        $user = AdminAuth::getUser();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);
        }
        if (!$user->hasPermission('Admin.Dashboard')) {
            return response()->json(['ok' => false, 'message' => 'Dashboard permission required.'], 403);
        }

        $context = $this->buildAiContext('owner_chat_history');
        if (!$context->locationId || !$context->userId) {
            return response()->json([
                'ok' => false,
                'message' => 'Select a restaurant location before using PMD Intelligence.',
            ], 409);
        }

        try {
            $history = app(AdminAiConversationStore::class)->history(
                (int)$context->locationId,
                (int)$context->userId,
                160
            );

            $messages = [];
            $lastUserQuestion = '';
            $registry = app(PmdIntelligenceActionRegistry::class);
            foreach ((array)($history['messages'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $role = (string)($row['role'] ?? '');
                if ($role === 'user') {
                    $lastUserQuestion = trim((string)($row['content'] ?? ''));
                } elseif ($role === 'assistant') {
                    $row['actions'] = $registry->adminActions(
                        [],
                        $lastUserQuestion,
                        (string)($row['content'] ?? '')
                    );
                }
                $messages[] = $row;
            }

            return response()->json([
                'ok' => true,
                'messages' => $messages,
                'storage_ready' => (bool)($history['storage_ready'] ?? false),
                'location_id' => (int)$context->locationId,
            ])->withHeaders(['Cache-Control' => 'private, no-store, max-age=0']);
        } catch (Throwable $error) {
            logger()->warning('PMD Intelligence history failed', [
                'type' => get_class($error),
                'location_id' => $context->locationId,
                'admin_user_id' => $context->userId,
            ]);

            return response()->json([
                'ok' => false,
                'storage_ready' => false,
                'message' => 'Saved PMD chat is temporarily unavailable.',
            ], 503)->withHeaders(['Cache-Control' => 'private, no-store, max-age=0']);
        }
    }

    public function clear()
    {
        $user = AdminAuth::getUser();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);
        }
        if (!$user->hasPermission('Admin.Dashboard')) {
            return response()->json(['ok' => false, 'message' => 'Dashboard permission required.'], 403);
        }

        $context = $this->buildAiContext('owner_chat_clear');
        if (!$context->locationId || !$context->userId) {
            return response()->json(['ok' => false, 'message' => 'No restaurant location selected.'], 409);
        }

        try {
            $cleared = app(AdminAiConversationStore::class)->clear(
                (int)$context->locationId,
                (int)$context->userId
            );

            return response()->json([
                'ok' => $cleared,
                'cleared' => $cleared,
            ])->withHeaders(['Cache-Control' => 'private, no-store, max-age=0']);
        } catch (Throwable $error) {
            logger()->warning('PMD Intelligence clear failed', [
                'type' => get_class($error),
                'location_id' => $context->locationId,
                'admin_user_id' => $context->userId,
            ]);
            return response()->json(['ok' => false, 'message' => 'Chat could not be cleared.'], 503);
        }
    }

    public function ask()
    {
        $user = AdminAuth::getUser();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);
        }

        if (!$user->hasPermission('Admin.Dashboard')) {
            return response()->json(['ok' => false, 'message' => 'Dashboard permission required.'], 403);
        }

        $question = trim((string)request()->input('question', ''));
        $context = $this->buildAiContext('owner_ask_pmd');

        try {
            $conversation = [];
            if ($context->locationId && $context->userId) {
                $conversation = app(AdminAiConversationStore::class)->modelContext(
                    (int)$context->locationId,
                    (int)$context->userId,
                    10
                );
            }

            $signals = [];
            $result = app(AiOrchestrator::class)->ask(
                $context,
                $this->conversationQuestion($question, $conversation),
                $this->aiTools($signals)
            );

            $answer = trim((string)($result['answer'] ?? ''));
            $persisted = false;
            $storageReady = null;

            if ($answer !== '' && $context->locationId && $context->userId) {
                $saved = app(AdminAiConversationStore::class)->appendPair(
                    (int)$context->locationId,
                    (int)$context->userId,
                    $question,
                    $answer,
                    (string)($result['run_id'] ?? $context->runId)
                );
                $persisted = (bool)($saved['persisted'] ?? false);
                $storageReady = (bool)($saved['storage_ready'] ?? false);
            }

            $result['actions'] = app(PmdIntelligenceActionRegistry::class)->adminActions(
                $signals,
                $question,
                $answer
            );
            $result['persisted'] = $persisted;
            $result['storage_ready'] = $storageReady;

            return response()->json($result)->withHeaders([
                'Cache-Control' => 'private, no-store, max-age=0',
            ]);
        } catch (Throwable $error) {
            logger()->warning('PMD Intelligence request failed', [
                'run_id' => $context->runId,
                'provider' => (string)config('pmd_ai.provider', 'openai'),
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'location_id' => $context->locationId,
            ]);

            return response()->json([
                'ok' => false,
                'run_id' => $context->runId,
                'message' => $this->safePublicError($error),
            ], $this->safePublicStatus($error))->withHeaders([
                'Cache-Control' => 'private, no-store, max-age=0',
            ]);
        }
    }

    private function conversationQuestion(string $question, array $history): string
    {
        $question = trim($question);
        if ($question === '') return $question;

        $timezone = trim((string)$this->readAuthority()->canonicalTimezone())
            ?: (trim((string)config('app.timezone', 'UTC')) ?: 'UTC');
        try {
            $now = Carbon::now($timezone);
        } catch (Throwable $error) {
            $timezone = 'UTC';
            $now = Carbon::now('UTC');
        }

        $runtime = "PMD_RUNTIME_CONTEXT:\n"
            .'restaurant_local_datetime='.$now->toIso8601String()."\n"
            .'restaurant_local_date='.$now->toDateString()."\n"
            .'restaurant_local_weekday='.$now->format('l')."\n"
            .'timezone='.$timezone."\n"
            ."RULE: Resolve today, tomorrow, tonight, yesterday and every relative date strictly from this restaurant-local clock. Never guess a calendar date.";

        if (!$history || mb_strlen($question) > 3000) {
            return $runtime."\n\nCURRENT_USER_QUESTION:\n".$question;
        }

        $baseLength = mb_strlen($runtime) + mb_strlen($question) + 80;
        $budget = max(0, 3900 - $baseLength);
        if ($budget < 180) {
            return $runtime."\n\nCURRENT_USER_QUESTION:\n".$question;
        }

        $rows = [];
        $used = 0;
        foreach (array_reverse($history) as $message) {
            $role = ($message['role'] ?? '') === 'assistant' ? 'ASSISTANT' : 'USER';
            $content = preg_replace('/\s+/u', ' ', trim((string)($message['content'] ?? ''))) ?: '';
            if ($content === '') continue;
            $line = $role.': '.mb_substr($content, 0, 700);
            if ($used + mb_strlen($line) + 1 > $budget) break;
            $used += mb_strlen($line) + 1;
            $rows[] = $line;
        }

        if (!$rows) return $runtime."\n\nCURRENT_USER_QUESTION:\n".$question;
        $historyText = implode("\n", array_reverse($rows));

        return $runtime
            ."\n\nCONVERSATION_CONTINUITY_ONLY:\n"
            .$historyText
            ."\n\nCURRENT_USER_QUESTION:\n"
            .$question
            ."\n\nPMD_RULE: Use prior chat only to understand follow-up references. Re-check PMD tools for restaurant facts, staffing, numbers, availability and current state. Older assistant text is never factual authority.";
    }

    private function readAuthority(): PmdReadAuthority
    {
        return app(PmdReadAuthority::class);
    }

    private function buildAiContext(string $task): AiContext
    {
        $user = AdminAuth::getUser();
        $staff = $user ? $user->staff : null;
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $authority = $this->readAuthority();
        $locationId = $authority->canonicalLocationId();

        $defaultConnection = DB::getDefaultConnection();
        $tenantDatabase = null;
        if ($defaultConnection === 'tenant') {
            try {
                $tenantDatabase = (string)DB::connection('tenant')->getDatabaseName();
            } catch (Throwable $error) {
                $tenantDatabase = null;
            }
        }

        $tenantId = null;
        foreach (['id', 'tenant_id'] as $key) {
            if ($tenant && isset($tenant->{$key}) && (int)$tenant->{$key} > 0) {
                $tenantId = (int)$tenant->{$key};
                break;
            }
        }

        $tenantDomain = null;
        foreach (['domain', 'tenant_domain', 'subdomain'] as $key) {
            if ($tenant && !empty($tenant->{$key})) {
                $tenantDomain = (string)$tenant->{$key};
                break;
            }
        }

        return new AiContext(
            $tenantId,
            $tenantDatabase,
            $tenantDomain ?: request()->getHost(),
            $locationId,
            $user ? (int)$user->getKey() : null,
            $staff ? (int)$staff->getKey() : null,
            ['Admin.Dashboard'],
            (string)app()->getLocale(),
            $authority->canonicalTimezone(),
            (string)Str::uuid(),
            $task
        );
    }

    private function restaurantIdentity(): array
    {
        $user = AdminAuth::getUser();
        $staff = $user ? $user->staff : null;
        $locationId = $this->readAuthority()->canonicalLocationId();
        $restaurantName = null;

        try {
            if ($locationId) {
                $restaurantName = DB::table('locations')
                    ->where('location_id', (int)$locationId)
                    ->value('location_name');
            }
        } catch (Throwable $error) {
            $restaurantName = null;
        }

        $role = null;
        try {
            $role = $staff ? $staff->role : null;
        } catch (Throwable $error) {
            $role = null;
        }

        $roleCode = strtolower(trim((string)($role->code ?? '')));
        $roleName = trim((string)($role->name ?? ''));
        $personName = trim((string)($staff->staff_name ?? ''));
        if ($personName === '') {
            $personName = trim((string)($user->username ?? ''));
        }

        $ownerText = strtolower(trim($roleCode.' '.$roleName));

        return [
            'restaurant_name' => trim((string)$restaurantName) ?: 'this restaurant',
            'signed_in_name' => $personName ?: null,
            'signed_in_role' => $roleName ?: ($roleCode ?: null),
            'is_owner' => str_contains($ownerText, 'owner'),
        ];
    }

    private function dateRangeParameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'start_date' => [
                    'type' => 'string',
                    'description' => 'Restaurant-local start date in YYYY-MM-DD format.',
                ],
                'end_date' => [
                    'type' => 'string',
                    'description' => 'Restaurant-local end date in YYYY-MM-DD format.',
                ],
            ],
            'required' => ['start_date', 'end_date'],
            'additionalProperties' => false,
        ];
    }

    private function aiTools(array &$signals): array
    {
        return [
            'restaurant_identity' => [
                'description' => 'Read only the safe display identity of the current restaurant and signed-in PMD user. Use this only when a friendly personalized restaurant reference would improve the answer. Never infer that the signed-in person is the owner unless is_owner is true.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                    'additionalProperties' => false,
                ],
                'handler' => function () use (&$signals) {
                    $result = $this->restaurantIdentity();
                    $signals[] = ['kind' => 'restaurant_identity'];
                    return $result;
                },
            ],
            'owner_kpis' => [
                'description' => 'Read the current owner KPI snapshot for this restaurant. Use it for current revenue, guests, turnover, channels, kitchen time, occupancy, menu availability and tips.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                    'additionalProperties' => false,
                ],
                'handler' => function () use (&$signals) {
                    $result = $this->readAuthority()->ownerKpis();
                    $signals[] = ['kind' => 'owner_kpis'];
                    return $result;
                },
            ],
            'report_snapshot' => [
                'description' => 'Read one current PMD owner report for today or the current calendar month. Do not use this tool to answer a named historical month or historical date range.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'report' => [
                            'type' => 'string',
                            'enum' => [
                                'sales', 'hourly', 'categories', 'payments',
                                'transactions', 'channels', 'tips', 'alerts',
                                'liveorders', 'topitems', 'reviews',
                                'reservations', 'attendance',
                            ],
                        ],
                        'period' => [
                            'type' => 'string',
                            'enum' => ['today', 'month'],
                        ],
                    ],
                    'required' => ['report', 'period'],
                    'additionalProperties' => false,
                ],
                'handler' => function (array $arguments) use (&$signals) {
                    $report = (string)($arguments['report'] ?? '');
                    $period = (string)($arguments['period'] ?? 'today');
                    $result = $this->readAuthority()->reportSnapshot($report, $period);
                    $signals[] = ['kind' => 'report', 'report' => $report, 'period' => $period];
                    return $result;
                },
            ],
            'report_range' => [
                'description' => 'Read a PMD report for an explicit date range. Use this for named historical dates and also for future reservation schedules. Convert the requested range to exact YYYY-MM-DD dates from PMD_RUNTIME_CONTEXT. Future dates are accepted only by the reservations report.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'report' => [
                            'type' => 'string',
                            'enum' => [
                                'sales', 'hourly', 'categories', 'payments',
                                'transactions', 'channels', 'tips', 'topitems',
                                'reviews', 'reservations', 'attendance',
                            ],
                        ],
                        'start_date' => [
                            'type' => 'string',
                            'description' => 'Restaurant-local start date in YYYY-MM-DD format.',
                        ],
                        'end_date' => [
                            'type' => 'string',
                            'description' => 'Restaurant-local end date in YYYY-MM-DD format.',
                        ],
                    ],
                    'required' => ['report', 'start_date', 'end_date'],
                    'additionalProperties' => false,
                ],
                'handler' => function (array $arguments) use (&$signals) {
                    $report = (string)($arguments['report'] ?? '');
                    $start = (string)($arguments['start_date'] ?? '');
                    $end = (string)($arguments['end_date'] ?? '');
                    $result = $this->readAuthority()->reportRange($report, $start, $end);
                    $signals[] = ['kind' => 'report', 'report' => $report, 'start_date' => $start, 'end_date' => $end];
                    return $result;
                },
            ],
            'order_integrity_range' => [
                'description' => 'Reconcile orders for an exact past/current date range against item rows, order totals, status history, settlement states, tips and payment methods. Use this when the owner asks whether systems are connected, why totals disagree, what is missing, or whether order data reconciles. This is read-only.',
                'parameters' => $this->dateRangeParameters(),
                'handler' => function (array $arguments) use (&$signals) {
                    $result = $this->readAuthority()->orderIntegrityRange(
                        (string)($arguments['start_date'] ?? ''),
                        (string)($arguments['end_date'] ?? '')
                    );
                    $signals[] = ['kind' => 'order_integrity'];
                    return $result;
                },
            ],
            'workforce_schedule_range' => [
                'description' => 'Read the internal workforce schedule for an exact restaurant-local date range, including past, today and future. For authenticated Admin/Owner questions this includes team member display names, department, role, shift start/end, scheduled hours, attendance status, replacements, people not scheduled in the range, and actual worked hours when attendance data exists. Use it whenever the user asks who works, who is off, who should be in kitchen/floor/bar/reception, shift coverage or hours. Never claim staff names are unavailable before calling this tool.',
                'parameters' => $this->dateRangeParameters(),
                'handler' => function (array $arguments) use (&$signals) {
                    $result = app(PmdAdminWorkforceIntelligenceService::class)->range(
                        $this->readAuthority(),
                        (string)($arguments['start_date'] ?? ''),
                        (string)($arguments['end_date'] ?? '')
                    );
                    $signals[] = ['kind' => 'workforce_schedule'];
                    return $result;
                },
            ],
            'kitchen_workforce' => [
                'description' => 'Read the current kitchen workforce snapshot for this restaurant. It includes expected/present/missing counts and, when a current shift exists, the assigned kitchen people with display name, role and attendance status. Use the named workforce schedule tool for future or historical dates.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                    'additionalProperties' => false,
                ],
                'handler' => function () use (&$signals) {
                    $locationId = $this->readAuthority()->canonicalLocationId();
                    if (!$locationId) {
                        return ['available' => false, 'reason' => 'No restaurant location'];
                    }
                    $service = app(PmdKitchenWorkforceService::class);
                    $result = $service->snapshot((int)$locationId);
                    $card = $service->todayCard((int)$locationId);
                    $result['people'] = array_values((array)($card['people'] ?? []));
                    $signals[] = ['kind' => 'kitchen_workforce'];
                    return $result;
                },
            ],
        ];
    }

    private function safePublicStatus(Throwable $error): int
    {
        $message = strtolower($error->getMessage());

        if (
            strpos($message, 'a question is required') !== false
            || strpos($message, 'question is too long') !== false
            || strpos($message, 'historical report') !== false
            || strpos($message, 'yyyy-mm-dd') !== false
            || strpos($message, 'date range') !== false
            || strpos($message, 'report date') !== false
        ) {
            return 422;
        }

        if (strpos($message, 'canonical restaurant location') !== false) {
            return 409;
        }

        if (
            strpos($message, 'disabled') !== false
            || strpos($message, 'api_key') !== false
            || strpos($message, 'api key') !== false
            || strpos($message, 'authentication') !== false
            || strpos($message, 'credit') !== false
            || strpos($message, 'billing') !== false
            || strpos($message, 'quota') !== false
            || strpos($message, 'resource_exhausted') !== false
            || strpos($message, 'rate limit') !== false
            || strpos($message, 'transport failed') !== false
        ) {
            return 503;
        }

        return 502;
    }

    private function safePublicError(Throwable $error): string
    {
        $message = $error->getMessage();
        $lower = strtolower($message);
        $provider = strtolower(trim((string)config('pmd_ai.provider', 'openai')));

        if (
            strpos($message, 'OPENAI_API_KEY') !== false
            || strpos($message, 'GEMINI_API_KEY') !== false
        ) {
            return 'The configured AI provider does not have a server API key.';
        }
        if (strpos($lower, 'disabled') !== false) {
            return 'PMD Intelligence is currently disabled on the server.';
        }
        if (strpos($lower, 'canonical restaurant location') !== false) {
            return 'Select a restaurant location before using PMD Intelligence.';
        }
        if (
            strpos($lower, 'historical report') !== false
            || strpos($lower, 'yyyy-mm-dd') !== false
            || strpos($lower, 'date range') !== false
            || strpos($lower, 'report date') !== false
        ) {
            return $message;
        }
        if (
            strpos($lower, 'no credits') !== false
            || strpos($lower, 'credit') !== false
            || strpos($lower, 'billing') !== false
        ) {
            return 'OpenAI API credit is unavailable for this project. Add API credits or switch PMD Intelligence to Gemini.';
        }
        if (
            strpos($lower, 'resource_exhausted') !== false
            || strpos($lower, 'quota') !== false
            || strpos($lower, 'rate limit') !== false
        ) {
            if ($provider === 'gemini') {
                return 'Gemini quota is temporarily exhausted. Try again after the quota window resets.';
            }
            return 'The AI provider is temporarily rate limited. Try again shortly.';
        }
        if (
            strpos($lower, 'incorrect api key') !== false
            || strpos($lower, 'invalid api key') !== false
            || strpos($lower, 'api key not valid') !== false
            || strpos($lower, 'authentication') !== false
        ) {
            return 'The AI provider rejected the server API key. Replace it with a valid key and try again.';
        }
        if (strpos($lower, 'transport failed') !== false) {
            return 'PMD Intelligence cannot reach the configured AI provider right now. Try again shortly.';
        }
        if (
            strpos($lower, 'model') !== false
            && (
                strpos($lower, 'not found') !== false
                || strpos($lower, 'unsupported') !== false
                || strpos($lower, 'unavailable') !== false
            )
        ) {
            return 'The configured AI model is unavailable. Check PMD_AI_MODEL on the server.';
        }
        if (
            strpos($lower, 'a question is required') !== false
            || strpos($lower, 'question is too long') !== false
        ) {
            return $message;
        }

        return 'PMD Intelligence could not complete this request. Check the server log using the run ID.';
    }
}
