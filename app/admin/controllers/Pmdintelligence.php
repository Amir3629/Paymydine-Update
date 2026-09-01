<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use App\Services\AI\AiContext;
use App\Services\AI\AiOrchestrator;
use App\Services\AI\PmdReadAuthority;
use App\Services\PmdKitchenWorkforceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * PMD Intelligence V1
 *
 * Read-only owner operations copilot. Data access is delegated to
 * PmdReadAuthority so this page does not inherit Dashboard/Reservations/Reports
 * UI constructors or their asset stacks.
 */
class Pmdintelligence extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();

        // Use the same first-paint shell and owner UI authority as the current
        // PMD Menu / Settings family. Intelligence owns only route-local layout.
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
        ];

        return $this->makeView('pmdintelligence/index');
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
            $result = app(AiOrchestrator::class)->ask(
                $context,
                $question,
                $this->aiTools()
            );

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

    private function aiTools(): array
    {
        return [
            'owner_kpis' => [
                'description' => 'Read the canonical Dashboard2 owner KPI snapshot for the current restaurant location. Use this for revenue, guests, turnover, channels, kitchen time, occupancy, menu availability and tips.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                    'additionalProperties' => false,
                ],
                'handler' => function () {
                    return $this->readAuthority()->ownerKpis();
                },
            ],
            'report_snapshot' => [
                'description' => 'Read one canonical PMD owner report for the current location for today or the current calendar month only. Do not use this tool to answer a named historical month or historical date range.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'report' => [
                            'type' => 'string',
                            'enum' => ['sales', 'hourly', 'categories', 'payments', 'transactions', 'alerts', 'liveorders', 'topitems', 'reviews', 'reservations', 'attendance'],
                        ],
                        'period' => [
                            'type' => 'string',
                            'enum' => ['today', 'month'],
                        ],
                    ],
                    'required' => ['report', 'period'],
                    'additionalProperties' => false,
                ],
                'handler' => function (array $arguments) {
                    return $this->readAuthority()->reportSnapshot(
                        (string)($arguments['report'] ?? ''),
                        (string)($arguments['period'] ?? 'today')
                    );
                },
            ],
            'report_range' => [
                'description' => 'Read a canonical PMD report for an explicit historical restaurant-local date range. Use this whenever the user names a past day, month, year, or date range such as August 2026. Convert the requested range to exact YYYY-MM-DD start_date and end_date. Never relabel current-month data as a historical period.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'report' => [
                            'type' => 'string',
                            'enum' => ['sales', 'hourly', 'categories', 'payments', 'transactions', 'topitems', 'reservations'],
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
                'handler' => function (array $arguments) {
                    return $this->readAuthority()->reportRange(
                        (string)($arguments['report'] ?? ''),
                        (string)($arguments['start_date'] ?? ''),
                        (string)($arguments['end_date'] ?? '')
                    );
                },
            ],
            'kitchen_workforce' => [
                'description' => 'Read the current canonical kitchen workforce snapshot for the already-selected location, including expected, actual, missing counts, role counts, source and confidence.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                    'additionalProperties' => false,
                ],
                'handler' => function () {
                    $locationId = $this->readAuthority()->canonicalLocationId();
                    if (!$locationId) {
                        return ['available' => false, 'reason' => 'No canonical location'];
                    }
                    return app(PmdKitchenWorkforceService::class)->snapshot((int)$locationId);
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
                return 'Gemini free-tier quota is temporarily exhausted. Try again after the quota window resets or use a paid Gemini project.';
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
