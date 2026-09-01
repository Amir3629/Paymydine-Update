<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use App\Services\AI\AiContext;
use App\Services\AI\AiOrchestrator;
use App\Services\PmdKitchenWorkforceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * PMD Intelligence V1
 *
 * Read-only owner operations copilot. It deliberately inherits Pmdreports so
 * AI tools reuse Dashboard2/Pmdreports tenant/location/report authorities.
 * No AI tool accepts tenant, database, user or location identifiers.
 */
class Pmdintelligence extends Pmdreports
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-intelligence-page');
        $this->addCss('css/pmd-intelligence-v1.css');
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
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'location_id' => $context->locationId,
            ]);

            $status = strpos($error->getMessage(), 'disabled') !== false ? 503 : 422;
            return response()->json([
                'ok' => false,
                'run_id' => $context->runId,
                'message' => $this->safePublicError($error),
            ], $status)->withHeaders([
                'Cache-Control' => 'private, no-store, max-age=0',
            ]);
        }
    }

    private function buildAiContext(string $task): AiContext
    {
        $user = AdminAuth::getUser();
        $staff = $user ? $user->staff : null;
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $locationId = $this->locationId();

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
            $this->restaurantTimezone(),
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
                    return $this->kpiPayload();
                },
            ],
            'report_snapshot' => [
                'description' => 'Read one canonical PMD owner report for the current location. Use for detailed sales, hourly sales, categories, payments, transactions, alerts, live orders, top items, reviews, reservations or attendance.',
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
                    return $this->toolReportSnapshot(
                        (string)($arguments['report'] ?? ''),
                        (string)($arguments['period'] ?? 'today')
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
                    $locationId = $this->locationId();
                    if (!$locationId) {
                        return ['available' => false, 'reason' => 'No canonical location'];
                    }
                    return app(PmdKitchenWorkforceService::class)->snapshot((int)$locationId);
                },
            ],
        ];
    }

    private function toolReportSnapshot(string $report, string $period): array
    {
        $allowed = ['sales', 'hourly', 'categories', 'payments', 'transactions', 'alerts', 'liveorders', 'topitems', 'reviews', 'reservations', 'attendance'];
        if (!in_array($report, $allowed, true)) {
            return ['available' => false, 'reason' => 'Unsupported report'];
        }

        $timezone = $this->restaurantTimezone();
        $now = Carbon::now($timezone);
        if ($period === 'month') {
            $start = $now->copy()->startOfMonth();
        } else {
            $period = 'today';
            $start = $now->copy()->startOfDay();
        }

        $payload = $this->payload($report, $start, $now, $period);

        return [
            'available' => true,
            'report' => $report,
            'period' => $period,
            'generated_at' => $now->toIso8601String(),
            'location_id' => $this->locationId(),
            'stats' => $payload['stats'] ?? [],
            'chart' => $payload['chart'] ?? null,
            'columns' => $payload['columns'] ?? [],
            'rows' => array_slice((array)($payload['rows'] ?? []), 0, 50),
            'empty' => (bool)($payload['empty'] ?? false),
            'source' => $payload['source'] ?? 'PMD canonical report authority',
        ];
    }

    private function safePublicError(Throwable $error): string
    {
        $message = $error->getMessage();
        if (strpos($message, 'OPENAI_API_KEY') !== false) {
            return 'OpenAI is not configured on the server.';
        }
        if (strpos($message, 'disabled') !== false) {
            return 'PMD Intelligence is currently disabled on the server.';
        }
        if (strpos($message, 'canonical restaurant location') !== false) {
            return 'Select a restaurant location before using PMD Intelligence.';
        }
        if (strpos($message, 'Question') !== false || strpos($message, 'question') !== false) {
            return $message;
        }
        return 'PMD Intelligence could not complete this request safely. Check the server log using the run ID.';
    }
}
