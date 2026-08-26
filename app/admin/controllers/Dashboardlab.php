<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdRoleDashboardDataV1;

/**
 * PMD Dashboard Lab
 *
 * Clean dashboard workspace rebuilt one shared component at a time.
 *
 * Step 2 authority:
 * - the page remains a plain AdminController page
 * - Dashboard2 is used only as the existing KPI DATA authority
 * - KPI values are resolved on the server before Blade is returned
 * - no Dashboard2/Reservations2 browser runtime is imported
 */
class Dashboardlab extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    private const KPI_ORDER = [
        'revenue',
        'guests',
        'turnover',
        'channels',
        'kitchen',
        'occupancy',
        'menu',
        'tips',
    ];

    private const KPI_DEFAULTS = [
        'revenue',
        'guests',
        'turnover',
        'channels',
    ];

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-dashboard-lab-page'
        );

        // Proven first-paint outer shell.
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');

        // Same shared KPI visual authority already used by Dashboard2.
        $this->addCss('css/pmd-reservations2-kpis-v307.css');

        // Lab route geometry + placement only.
        $this->addCss('css/pmd-dashboard-lab-v1.css');

        /* PMD_DASHBOARD_LAB_STEP3_EXACT_RESERVATIONS_FLOOR_ASSETS_V1 */
        // The same LIVE visual authorities used by Reservations2.
        $this->addCss('css/pmd-floor-v1.css');
        $this->addCss('css/pmd-floor-v1-stable-v11.css');
        $this->addCss('css/pmd-floor-v1-native-smart-v20.css');
        $this->addCss('css/pmd-reservations2-floor-canvas-v310.css');
        $this->addCss('css/pmd-reservations2-floor-toolbar-v316.css');
        $this->addCss('css/pmd-reservations2-floor-reservation-v312.css');
        $this->addCss('css/pmd-dashboard-lab-exact-floor-v1.css');
        // PMD_SHARED_FLOOR_DASHBOARDLAB_BRIDGE_V1_3_1
        $this->addCss('css/pmd-shared-floor-multi-floor-v1.css');

        /* PMD_DASHBOARD_LAB_STEP4_ALL_DASHBOARD2_ANALYTICS_ASSETS_V1 */
        $this->addCss('css/pmd-dashboard-lab-analytics-v1.css');

        // Interaction only: KPI chooser. No boot fetch and no layout writer.
        $this->addJs('js/pmd-dashboard-lab-kpis-v1.js');

        // Route-scoped copy of the LIVE Floor V1 core only. Appended legacy
        // observer/retry patches are excluded; first geometry comes from Blade.
        $this->addJs('js/pmd-dashboard-lab-exact-floor-v1.js?v=20260826-floor-core-controls-v3');
        // Same coordinator used by Manager/Cashier/Reservations shared Floor.
        $this->addJs('js/pmd-shared-floor-multi-floor-v1.js?v=20260826-floor-core-controls-v3');

        // Clean route-scoped Analytics renderer. Dashboard2 remains data-only.
        $this->addJs('js/pmd-dashboard-lab-analytics-v1.js');

        // PMD_DASHBOARD_LIVE_REFRESH_ASSET_V1
        $this->addJs('js/pmd-dashboard-live-refresh-v1.js');

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        Template::setTitle('Dashboard Lab');
        Template::setHeading('Dashboard Lab');

        /* PMD_DASHBOARD_LAB_CONTENT_REFINEMENT_V8 */
        if ((string)request()->query('pmd_analytics', '') === '1') {
            return response()->json(
                $this->resolveAnalyticsPayload(
                    (string)request()->query('period', 'today')
                )
            );
        }

        $payload = $this->resolveKpiPayload();
        $cards = [];

        foreach (($payload['cards'] ?? []) as $key => $card) {
            if (!in_array($key, self::KPI_ORDER, true)) {
                continue;
            }

            $cards[$key] = $this->normalizeCard(
                (string)$key,
                is_array($card) ? $card : []
            );
        }

        foreach (self::KPI_ORDER as $key) {
            if (!isset($cards[$key])) {
                $cards[$key] = $this->fallbackCard($key);
            }
        }

        $selection = $this->readSelection();

        $this->vars['pmdDashboardLabKpiCards'] = $cards;
        $this->vars['pmdDashboardLabKpiSelection'] = $selection;
        $this->vars['pmdDashboardLabKpiOrder'] = self::KPI_ORDER;
        $this->vars['pmdDashboardLabKpiPayloadVersion'] =
            (string)($payload['version'] ?? 'unknown');

        /* PMD_DASHBOARD_LAB_STEP3_EXACT_RESERVATIONS_FLOOR_V1 */
        $floorBootstrap = $this->resolveFloorBootstrap();

        /*
         * PMD_DASHBOARDLAB_USER_PAGE_FLOOR_VIEW_V1
         * Server first paint uses the authenticated Owner's Dashboard-only
         * Floor mode/zoom preference.
         */
        try {
            $pmdFloorViewLocationId =
                (int)app(PmdRoleDashboardDataV1::class)
                    ->resolveWorkspaceLocation();

            $floorBootstrap =
                app(
                    \Admin\Services\PmdSharedFloorRegistryV1::class
                )->applyUserPageViewPreference(
                    $pmdFloorViewLocationId,
                    'dashboard',
                    $floorBootstrap
                );
        } catch (\Throwable $error) {
            logger()->warning(
                'Dashboard Lab user/page Floor preference read failed',
                [
                    'message' =>
                        $error->getMessage(),
                ]
            );
        }
        $this->vars['pmdDashboardLabFloorBootstrap'] = $floorBootstrap;
        $this->vars['pmdDashboardLabFloorDisplayTables'] =
            $floorBootstrap['display_tables'] ?? [];
        $this->vars['pmdDashboardLabFloorMode'] =
            $floorBootstrap['mode'] ?? 'row';
        $this->vars['pmdDashboardLabFloorZoom'] =
            $floorBootstrap['zoom'] ?? 1.0;

        /*
         * PMD_DASHBOARD_LIVE_ENDPOINT_V1
         * Event-driven soft-refresh endpoint.
         * No page HTML, no analytics bootstrap, no layout authority.
         */
        if ((string)request()->query('pmd_live', '') === '1') {
            return response()->json([
                'success' => true,
                'workspace' => 'dashboard',
                'generated_at' => now()->toIso8601String(),
                'kpis' => $cards,
                'kpi_payload_version' =>
                    (string)($payload['version'] ?? 'unknown'),
                'floor_tables' => array_values(
                    (array)($floorBootstrap['display_tables'] ?? [])
                ),
                'floor_mode' =>
                    (string)($floorBootstrap['mode'] ?? 'row'),
            ]);
        }

        /* PMD_SHARED_FLOOR_DASHBOARDLAB_REGISTRY_BRIDGE_V1_3_1
         * DashboardLab includes the same shared Floor Blade but is not a
         * PmdCleanWorkspaceControllerV1 subclass. Resolve the exact same
         * location-scoped registry here so Owner sees the same Floors as
         * Manager/Cashier/Reservations and first paint uses the same active
         * Floor cookie. No second registry or table assignment authority.
         */
        try {
            $pmdFloorLocationId = (int)app(PmdRoleDashboardDataV1::class)
                ->resolveWorkspaceLocation();
            $pmdFloorRegistryService = app(\Admin\Services\PmdSharedFloorRegistryV1::class);
            $pmdFloorRegistrySnapshot = $pmdFloorRegistryService->snapshot($pmdFloorLocationId);
            $pmdFloorCookieName =
                (string)(
                    $pmdFloorRegistrySnapshot[
                        'cookie_name'
                    ]
                    ?? ''
                );

            $pmdFloorRequested =
                $pmdFloorCookieName !== ''
                    ? (string)request()->cookie(
                        $pmdFloorCookieName,
                        ''
                    )
                    : '';

            // PMD_DASHBOARD_ACTIVE_FLOOR_USER_PAGE_MIGRATION_V2
            if (
                trim($pmdFloorRequested) === ''
                && !empty(
                    $pmdFloorRegistrySnapshot[
                        'legacy_cookie_name'
                    ]
                )
            ) {
                $pmdFloorRequested =
                    (string)request()->cookie(
                        (string)$pmdFloorRegistrySnapshot[
                            'legacy_cookie_name'
                        ],
                        ''
                    );
            }
            $pmdFloorActive = $pmdFloorRegistryService->activeFloor(
                (array)($pmdFloorRegistrySnapshot['floors'] ?? []),
                $pmdFloorRequested
            );

            $this->vars['pmdCleanWorkspaceLocationId'] = $pmdFloorLocationId;
            $this->vars['pmdCleanWorkspaceFloorRegistry'] =
                array_values((array)($pmdFloorRegistrySnapshot['floors'] ?? []));
            $this->vars['pmdCleanWorkspaceFloorActive'] = $pmdFloorActive;
            $this->vars['pmdCleanWorkspaceFloorCookie'] = $pmdFloorCookieName;
            $this->vars['pmdCleanWorkspaceFloorTableMap'] =
                (array)($pmdFloorRegistrySnapshot['table_floor_map'] ?? [
                    'by_id' => [],
                    'by_number' => [],
                    'by_name' => [],
                ]);
        } catch (\Throwable $error) {
            logger()->warning('Dashboard Lab shared Floor registry bridge failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);
        }


        /*
         * PMD_DASHBOARDLAB_RESERVATION_CALENDAR_PAYLOAD_V2
         *
         * DashboardLab hosts the SAME ReservationsLab Calendar/Hour runtime.
         * Only the host route changes; schedule data authority remains
         * PmdReservationsLabScheduleV1.
         */
        try {
            $pmdDashboardCalendarLocationId = max(
                0,
                (int)($this->vars['pmdCleanWorkspaceLocationId'] ?? 0)
            );

            if ($pmdDashboardCalendarLocationId < 1) {
                $pmdDashboardCalendarLocationId = max(
                    0,
                    (int)app(PmdRoleDashboardDataV1::class)
                        ->resolveWorkspaceLocation()
                );
            }

            $pmdDashboardCalendarLocale =
                strtolower((string)app()->getLocale());

            $pmdDashboardCalendarLocale =
                str_starts_with(
                    $pmdDashboardCalendarLocale,
                    'de'
                )
                    ? 'de'
                    : 'en';

            $this->vars['pmdReservationsLabSchedule'] =
                app(
                    \Admin\Services\PmdReservationsLabScheduleV1::class
                )->payload(
                    $pmdDashboardCalendarLocationId,
                    $pmdDashboardCalendarLocale
                );
        } catch (\Throwable $error) {
            logger()->warning(
                'Dashboard Lab reservation Calendar payload failed',
                [
                    'type' => get_class($error),
                    'message' => $error->getMessage(),
                ]
            );

            $this->vars['pmdReservationsLabSchedule'] = [];
        }

        /* PMD_DASHBOARD_LAB_ANALYTICS_SCROLL_FIRSTPAINT_V2 */
        // Resolve the two initial Analytics periods before Blade is returned.
        // The browser therefore does not wait for an initial Analytics fetch.
        $analyticsBootstrap = $this->resolveAnalyticsBootstrap();
        $this->vars['pmdDashboardLabAnalyticsBootstrap'] =
            $analyticsBootstrap;

        // Dashboard2 data source constructor sets Reservations context.
        // Restore the Lab's intended menu context before rendering.
        AdminMenu::setContext('dashboard');

        return $this->makeView('dashboardlab/index');
    }

    /**
     * Use the existing Dashboard2 aggregate implementation without calling
     * Dashboard2::index() and therefore without rendering Reservations2.
     */
    /*
     * PMD_DASHBOARDLAB_USER_PAGE_FLOOR_VIEW_SAVE_V1
     */
    public function onSaveFloorViewPreference()
    {
        $user =
            \Admin\Facades\AdminAuth::getUser();

        if (!$user) {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Unauthenticated.',
                ],
                401
            );
        }

        $floorId =
            trim(
                (string)request()->input(
                    'floor_id'
                )
            );

        $mode =
            trim(
                (string)request()->input(
                    'layout_mode'
                )
            );

        $zoom =
            request()->input(
                'full_floor_zoom'
            );

        if ($floorId !== 'main-floor') {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Invalid Floor.',
                ],
                422
            );
        }

        if (
            !in_array(
                $mode,
                ['full', 'row'],
                true
            )
        ) {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Invalid Floor layout mode.',
                ],
                422
            );
        }

        if (
            !is_numeric($zoom)
            || (float)$zoom < 0.4
            || (float)$zoom > 1.6
        ) {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Invalid Floor zoom.',
                ],
                422
            );
        }

        try {
            $locationId =
                (int)app(
                    PmdRoleDashboardDataV1::class
                )->resolveWorkspaceLocation();

            if ($locationId < 1) {
                return response()->json(
                    [
                        'ok' => false,
                        'message' =>
                            'Active restaurant location is unavailable.',
                    ],
                    409
                );
            }

            $view =
                app(
                    \Admin\Services\PmdSharedFloorRegistryV1::class
                )->saveUserPageViewPreference(
                    $locationId,
                    'dashboard',
                    $mode,
                    (float)$zoom
                );

            return response()->json([
                'ok' => true,
                'scope' =>
                    'authenticated-user-page-location',
                'view' =>
                    $view,
            ]);
        } catch (\Throwable $error) {
            logger()->warning(
                'Dashboard Lab user/page Floor preference save failed',
                [
                    'message' =>
                        $error->getMessage(),
                ]
            );

            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Floor view preference could not be saved.',
                ],
                500
            );
        }
    }

    private function resolveKpiPayload(): array
    {
        try {
            /* PMD_DASHBOARD_LAB_EXPLICIT_LOCATION_V3_4_3 */
            $locationId = app(PmdRoleDashboardDataV1::class)
                ->resolveWorkspaceLocation();

            if (!$locationId) {
                throw new \RuntimeException(
                    'Dashboard Lab location unavailable after safe resolution.'
                );
            }

            $source = new class($locationId) extends Dashboard2 {
                private ?int $pmdDashboardLabLocationId = null;

                public function __construct(int $locationId)
                {
                    $this->pmdDashboardLabLocationId = $locationId;
                    parent::__construct();
                }

                protected function locationId(): ?int
                {
                    return $this->pmdDashboardLabLocationId
                        ?: parent::locationId();
                }

                public function pmdDashboardLabPayload(): array
                {
                    return $this->kpiPayload();
                }
            };

            $payload = $source->pmdDashboardLabPayload();

            if (
                !is_array($payload)
                || ($payload['success'] ?? false) !== true
                || !isset($payload['cards'])
                || !is_array($payload['cards'])
            ) {
                throw new \RuntimeException(
                    'Dashboard2 KPI payload contract was invalid.'
                );
            }

            return $payload;
        } catch (\Throwable $error) {
            logger()->warning(
                'Dashboard Lab server KPI render failed',
                [
                    'type' => get_class($error),
                    'message' => $error->getMessage(),
                ]
            );

            return [
                'success' => false,
                'version' => 'fallback',
                'cards' => [],
            ];
        }
    }

    /**
     * PMD_DASHBOARD_LAB_ANALYTICS_SCROLL_FIRSTPAINT_V2
     * PMD_DASHBOARD_LAB_CONTENT_REFINEMENT_V8
     *
     * Dashboard2 remains the aggregate data authority. Dashboard Lab owns
     * only route-scoped presentation enrichment and exposes the same payload
     * for first paint and later period/refresh requests.
     */
    private function resolveAnalyticsBootstrap(): array
    {
        $bootstrap = [
            'server_first_paint' => false,
            'periods' => [],
        ];

        foreach (['last30', 'month'] as $period) {
            $payload = $this->resolveAnalyticsPayload($period);

            if (($payload['success'] ?? false) !== true) {
                return $bootstrap;
            }

            $bootstrap['periods'][$period] = $payload;
        }

        $bootstrap['server_first_paint'] = true;
        return $bootstrap;
    }

    private function resolveAnalyticsPayload(string $period): array
    {
        $period = in_array(
            $period,
            ['today', 'week', 'month', 'last30'],
            true
        ) ? $period : 'today';

        try {
            /* PMD_DASHBOARD_LAB_ANALYTICS_LOCATION_PIN_V3_4_3 */
            $locationId = app(PmdRoleDashboardDataV1::class)
                ->resolveWorkspaceLocation();

            if (!$locationId) {
                throw new \RuntimeException(
                    'Dashboard Lab Analytics location unavailable after safe resolution.'
                );
            }

            $source = new class($locationId) extends Dashboard2 {
                private ?int $pmdDashboardLabLocationId = null;

                public function __construct(int $locationId)
                {
                    $this->pmdDashboardLabLocationId = $locationId;
                    parent::__construct();
                }

                protected function locationId(): ?int
                {
                    return $this->pmdDashboardLabLocationId
                        ?: parent::locationId();
                }

                public function pmdDashboardLabAnalyticsPayload(
                    string $period
                ): array {
                    $payload = $this->analyticsPayload($period);

                    if (($payload['success'] ?? false) !== true) {
                        return $payload;
                    }

                    /*
                     * PMD_DASHBOARD_LAB_ENRICHMENT_FAILSOFT_V3_4_3
                     *
                     * These three blocks are presentation enrichments only.
                     * A prefix/schema edge case in one enrichment must never
                     * blank the entire proven Dashboard2 analytics payload.
                     * On failure, keep Dashboard2's original section intact.
                     */
                    $enrichments = [
                        'recent_transactions' => 'pmdDashboardLabLatestFiveTransactions',
                        'reviews' => 'pmdDashboardLabReviewsWithReviewer',
                        'calendar_events' => 'pmdDashboardLabUpcomingEventsPayload',
                    ];

                    foreach ($enrichments as $key => $method) {
                        try {
                            $payload[$key] = $this->{$method}();
                        } catch (\Throwable $error) {
                            logger()->warning(
                                'Dashboard Lab optional analytics enrichment failed',
                                [
                                    'key' => $key,
                                    'type' => get_class($error),
                                    'message' => $error->getMessage(),
                                    'location_id' => $this->locationId(),
                                ]
                            );
                        }
                    }

                    return $payload;
                }

                private function pmdDashboardLabLatestFiveTransactions(): array
                {
                    $now = \Carbon\Carbon::now(
                        $this->restaurantTimezone()
                    );
                    $start = \Carbon\Carbon::create(
                        2000,
                        1,
                        1,
                        0,
                        0,
                        0,
                        $this->restaurantTimezone()
                    );

                    $rows = \Illuminate\Support\Facades\DB::query()
                        ->fromSub(
                            $this->analyticsPaidQuery($start, $now),
                            'paid'
                        )
                        ->orderByDesc('paid.effective_at')
                        ->limit(5)
                        ->get([
                            'paid.order_id',
                            'paid.effective_amount',
                            'paid.effective_at',
                            'paid.effective_payment',
                        ]);

                    $excluded = [
                        'qr_payment_later',
                        'qr_pay_later',
                        'payment_later',
                        'pay_later',
                        'later',
                        'deferred',
                        'pending_payment',
                        'unpaid',
                        'not_paid',
                    ];

                    $normalize = static function ($value): string {
                        $value = strtolower(trim((string)$value));
                        return trim(
                            preg_replace('/[^a-z0-9]+/', '_', $value),
                            '_'
                        );
                    };

                    $label = static function (string $code): string {
                        return match ($code) {
                            'cash', 'cod' => 'Cash',
                            'card', 'credit_card', 'debit_card', 'stripe',
                            'worldline', 'sumup', 'square', 'vr_payment' => 'Card',
                            'apple_pay', 'applepay' => 'Apple Pay',
                            'google_pay', 'googlepay' => 'Google Pay',
                            'paypal', 'pay_pal' => 'PayPal',
                            'wero' => 'Wero',
                            default => 'Not recorded',
                        };
                    };

                    $transactions = [];
                    foreach ($rows as $row) {
                        $code = $normalize($row->effective_payment ?? null);
                        $methodRecorded = (
                            $code !== ''
                            && !in_array($code, $excluded, true)
                        );

                        $transactions[] = [
                            'order_id' => (int)$row->order_id,
                            'method' => $methodRecorded
                                ? $label($code)
                                : null,
                            'method_recorded' => $methodRecorded,
                            'amount' => (float)$row->effective_amount,
                            'status' => 'paid',
                            'timestamp' => (string)$row->effective_at,
                        ];
                    }

                    return [
                        'available' => true,
                        'empty' => count($transactions) === 0,
                        'transactions' => $transactions,
                        'sample_count' => count($transactions),
                        'reason' => $transactions
                            ? null
                            : 'No settled transactions available',
                        'source_mode' =>
                            'dashboard_lab_latest_five_settled_orders_v8',
                        'source' =>
                            'latest five settled orders across available history',
                    ];
                }

                private function pmdDashboardLabReviewsWithReviewer(): array
                {
                    /* PMD_DASHBOARD_LAB_RANGE_REVIEWS_V8_3_4
                     * Dashboard2 keeps aggregate review authority. Dashboard Lab
                     * extends only the latest-row presentation window from four
                     * to five real reviews for this route.
                     */
                    $payload = $this->analyticsReviews();

                    if (($payload['available'] ?? true) === false) {
                        return $payload;
                    }

                    $latest = is_array($payload['latest'] ?? null)
                        ? array_values($payload['latest'])
                        : [];
                    $columns = $this->columns('reviews');

                    if (
                        count($latest) < 5
                        && (int)($payload['count'] ?? 0) > count($latest)
                        && \Illuminate\Support\Facades\Schema::hasTable('reviews')
                    ) {
                        $orderColumn = in_array('created_at', $columns, true)
                            ? 'created_at'
                            : 'review_id';
                        $today = \Carbon\Carbon::now(
                            $this->restaurantTimezone()
                        )->toDateString();
                        $existingIds = array_fill_keys(
                            array_values(array_filter(array_map(
                                static fn ($row) =>
                                    (int)($row['review_id'] ?? 0),
                                $latest
                            ))),
                            true
                        );
                        $commentColumn = $this->firstColumn(
                            $columns,
                            ['review_text', 'comment', 'review', 'message']
                        );

                        $query = \Admin\Models\Reviews_model::query();
                        if (
                            $this->locationId()
                            && in_array('location_id', $columns, true)
                        ) {
                            $query->where('location_id', $this->locationId());
                        }

                        $rows = $query
                            ->orderByDesc($orderColumn)
                            ->get();

                        foreach ($rows as $row) {
                            if (count($latest) >= 5) {
                                break;
                            }

                            $reviewId = (int)($row->review_id ?? 0);
                            if ($reviewId <= 0 || isset($existingIds[$reviewId])) {
                                continue;
                            }

                            $rawDate = (string)($row->{$orderColumn} ?? '');
                            if (
                                $orderColumn === 'created_at'
                                && substr($rawDate, 0, 10) !== $today
                            ) {
                                continue;
                            }

                            $rating = null;
                            if (
                                in_array('quality', $columns, true)
                                && in_array('service', $columns, true)
                                && in_array('delivery', $columns, true)
                            ) {
                                $values = [
                                    (float)($row->quality ?? 0),
                                    (float)($row->service ?? 0),
                                    (float)($row->delivery ?? 0),
                                ];
                                if (array_sum($values) > 0) {
                                    $rating = round(array_sum($values) / 3, 1);
                                }
                            } elseif (in_array('rating', $columns, true)) {
                                $value = (float)($row->rating ?? 0);
                                if ($value > 0) {
                                    $rating = round($value, 1);
                                }
                            }

                            if ($rating === null) {
                                continue;
                            }

                            $comment = $commentColumn
                                ? mb_substr(
                                    strip_tags((string)($row->{$commentColumn} ?? '')),
                                    0,
                                    180
                                )
                                : '';
                            $approved = in_array('review_status', $columns, true)
                                ? (bool)$row->review_status
                                : null;
                            $status = in_array('status', $columns, true)
                                ? (string)$row->status
                                : (
                                    $approved === true
                                        ? 'approved'
                                        : ($approved === false ? 'pending' : null)
                                );
                            $starCount = max(1, min(5, (int)round($rating)));

                            $latest[] = [
                                'review_id' => $reviewId,
                                'rating' => $rating,
                                'stars' => str_repeat('★', $starCount),
                                'comment' => $comment,
                                'date' => $rawDate,
                                'time' => strlen($rawDate) >= 16
                                    ? substr($rawDate, 11, 5)
                                    : '',
                                'approved' => $approved,
                                'status' => $status,
                            ];
                            $existingIds[$reviewId] = true;
                        }
                    }

                    $latest = array_slice($latest, 0, 5);
                    $ids = array_values(array_filter(array_map(
                        static fn ($row) => (int)($row['review_id'] ?? 0),
                        $latest
                    )));

                    if ($ids) {
                        $select = ['review_id'];
                        foreach (['customer_name', 'author'] as $column) {
                            if (in_array($column, $columns, true)) {
                                $select[] = $column;
                            }
                        }

                        if (count($select) > 1) {
                            $names = [];
                            \Illuminate\Support\Facades\DB::table('reviews')
                                ->whereIn('review_id', $ids)
                                ->get($select)
                                ->each(function ($row) use (&$names): void {
                                    $name = trim((string)($row->customer_name ?? ''));
                                    if ($name === '') {
                                        $name = trim((string)($row->author ?? ''));
                                    }
                                    $names[(int)$row->review_id] = $name;
                                });

                            foreach ($latest as &$row) {
                                $row['reviewer'] =
                                    $names[(int)($row['review_id'] ?? 0)] ?? '';
                            }
                            unset($row);
                        }
                    }

                    $payload['latest'] = $latest;
                    $payload['latest_limit'] = 5;
                    $payload['source_mode'] =
                        'dashboard_lab_today_reviews_last_five_v8_3_4';

                    return $payload;
                }

                private function pmdDashboardLabUpcomingEventsPayload(): array
                {
                    $payload = $this->analyticsCalendarEvents(
                        \Carbon\Carbon::now($this->restaurantTimezone())
                    );

                    if (
                        ($payload['available'] ?? true) === false
                        || empty($payload['events'])
                        || !is_array($payload['events'])
                    ) {
                        $payload['event_source_available'] = false;
                        $payload['source_types'] = ['reservation'];
                        return $payload;
                    }

                    foreach ($payload['events'] as &$row) {
                        $tables = is_array($row['tables'] ?? null)
                            ? $row['tables']
                            : [];
                        $clean = [];

                        foreach ($tables as $label) {
                            $value = trim((string)$label);
                            $value = preg_replace(
                                '/^(?:Tische?|Tables?)\\s+/iu',
                                '',
                                $value
                            ) ?: $value;
                            if ($value !== '') {
                                $clean[] = $value;
                            }
                        }

                        $row['kind'] = 'Reservation';
                        $row['table_display'] = implode(' + ', $clean);
                    }
                    unset($row);

                    // Read-only audit found no business event/calendar table.
                    // Keep the card event-ready without inventing records.
                    $payload['event_source_available'] = false;
                    $payload['source_types'] = ['reservation'];
                    $payload['source_mode'] =
                        'dashboard_lab_upcoming_events_reservations_only_v8';

                    return $payload;
                }
            };

            $payload = $source->pmdDashboardLabAnalyticsPayload($period);

            if (
                !is_array($payload)
                || ($payload['success'] ?? false) !== true
            ) {
                throw new \RuntimeException(
                    'Dashboard Lab Analytics payload contract failed for '.
                    $period.'.'
                );
            }

            return $payload;
        } catch (\Throwable $error) {
            logger()->warning(
                'Dashboard Lab Analytics payload failed',
                [
                    'period' => $period,
                    'type' => get_class($error),
                    'message' => $error->getMessage(),
                ]
            );

            return [
                'success' => false,
                'period' => $period,
                'reason' => 'Dashboard Lab Analytics payload unavailable',
            ];
        }
    }

    private function readSelection(): array
    {
        $raw = (string)request()->cookie(
            'pmd_dashboard_lab_kpis',
            ''
        );

        /*
         * PMD_DASHBOARD_LAB_RAW_PREFERENCE_COOKIE_V1
         *
         * This cookie is intentionally created by the browser because it
         * contains only four whitelisted KPI identifiers.
         *
         * The admin web stack encrypts framework cookies, so a plaintext
         * browser preference cookie is not available through the normal
         * decrypted request()->cookie() accessor.
         *
         * Read the raw browser value only for this harmless UI preference.
         * Every value is still validated below against KPI_ORDER before use.
         */
        if ($raw === '') {
            $raw = rawurldecode(
                (string)(
                    $_COOKIE['pmd_dashboard_lab_kpis']
                    ?? ''
                )
            );
        }

        $requested = array_values(
            array_filter(
                array_map(
                    'trim',
                    explode(',', $raw)
                )
            )
        );

        $selection = [];

        foreach ($requested as $key) {
            if (
                in_array($key, self::KPI_ORDER, true)
                && !in_array($key, $selection, true)
            ) {
                $selection[] = $key;
            }

            if (count($selection) === 4) {
                break;
            }
        }

        foreach (self::KPI_DEFAULTS as $key) {
            if (!in_array($key, $selection, true)) {
                $selection[] = $key;
            }

            if (count($selection) === 4) {
                break;
            }
        }

        return array_slice($selection, 0, 4);
    }

    private function normalizeCard(string $key, array $card): array
    {
        $period = in_array(
            $key,
            ['occupancy', 'menu'],
            true
        )
            ? 'current'
            : 'today';

        $periods = $card['periods'] ?? null;

        $aggregate = $period === 'current'
            ? $periods
            : (
                is_array($periods)
                    ? ($periods[$period] ?? null)
                    : null
            );

        if (!is_array($aggregate)) {
            $aggregate = [
                'available' => false,
                'value' => null,
                'sample_count' => 0,
                'reason' => 'Source unavailable',
                'source' => 'KPI aggregate unavailable',
            ];
        }

        $available = ($aggregate['available'] ?? false) === true;
        $value = $aggregate['value'] ?? null;

        if (!$available) {
            $status = 'Source unavailable';
        } elseif ($value === null) {
            $status = (string)(
                $aggregate['reason']
                ?? 'No completed records'
            );
        } else {
            $status = 'Connected';
        }

        $samples = isset($aggregate['sample_count'])
            ? (int)$aggregate['sample_count']
            : null;

        $periodLabel = $period === 'today'
            ? 'Today'
            : 'Current';

        $description = $periodLabel
            .' · '
            .$status;

        if ($samples !== null) {
            $description .= ' · '.$samples.' samples';
        }

        return [
            'key' => $key,
            'title' => (string)($card['title'] ?? $key),
            'tone' => (string)($card['tone'] ?? 'green'),
            'icon' => (string)($card['icon'] ?? 'money'),
            'format' => (string)($card['format'] ?? 'number'),
            'period' => $period,
            'value' => $this->formatValue(
                (string)($card['format'] ?? 'number'),
                $value,
                is_array($card['currency'] ?? null)
                    ? $card['currency']
                    : []
            ),
            'description' => $description,
            'connected' => $available,
            'source' => (string)($aggregate['source'] ?? ''),
        ];
    }

    private function fallbackCard(string $key): array
    {
        $definitions = [
            'revenue' => ['Revenue', 'green', 'money', 'money'],
            'guests' => ['Guests Served', 'purple', 'users', 'number'],
            'turnover' => ['Table Turnover', 'orange', 'timer', 'minutes'],
            'channels' => ['Dine In / Take Away', 'blue', 'utensils', 'channels'],
            'kitchen' => ['Kitchen Ticket Time', 'orange', 'flame', 'minutes'],
            'occupancy' => ['Table Occupancy', 'green', 'table', 'percent'],
            'menu' => ['Menu Availability', 'red', 'menu', 'menu'],
            'tips' => ['Tips', 'green', 'star', 'money'],
        ];

        [$title, $tone, $icon, $format] =
            $definitions[$key]
            ?? [$key, 'green', 'money', 'number'];

        return [
            'key' => $key,
            'title' => $title,
            'tone' => $tone,
            'icon' => $icon,
            'format' => $format,
            'period' => in_array(
                $key,
                ['occupancy', 'menu'],
                true
            ) ? 'current' : 'today',
            'value' => '—',
            'description' => 'Source unavailable',
            'connected' => false,
            'source' => 'Dashboard Lab fallback',
        ];
    }

    /**
     * Resolve the SAME live Floor authorities already used by Reservations2,
     * but do it before Blade is returned so Dashboard Lab can paint the table
     * row immediately instead of waiting for three browser requests.
     */
    private function resolveFloorBootstrap(): array
    {
        $data = [];
        $layout = [
            'ok' => true,
            'tables' => [],
            'floor' => ['width' => 1000, 'height' => 560],
        ];
        $state = [
            'tables' => [],
            'merges' => [],
        ];
        $errors = [];

        try {
            $source = new class extends PmdWaiterDashboardV151 {
                public function pmdDashboardLabFloorData(): array
                {
                    return $this->v9CompatiblePayload();
                }
            };

            $data = $source->pmdDashboardLabFloorData();
        } catch (\Throwable $error) {
            $errors['data'] = $error->getMessage();
        }

        try {
            $source = new class extends PmdFloorV1 {
                public function pmdDashboardLabFloorState(): array
                {
                    return $this->canonicalizeState(
                        $this->readState()
                    );
                }
            };

            $state = $source->pmdDashboardLabFloorState();
        } catch (\Throwable $error) {
            $errors['state'] = $error->getMessage();
        }

        try {
            $source = new PmdOwnerDashboardCleanV1();
            $response = $source->floorLayout();

            if (is_object($response) && method_exists($response, 'getData')) {
                $decoded = $response->getData(true);
                if (is_array($decoded) && ($decoded['ok'] ?? false) === true) {
                    $layout = $decoded;
                }
            }
        } catch (\Throwable $error) {
            $errors['layout'] = $error->getMessage();
        }

        $modeRaw = strtolower(
            trim(
                rawurldecode(
                    (string)(
                        $_COOKIE['pmd_dashboard_lab_floor_mode']
                        ?? 'row'
                    )
                )
            )
        );
        $mode = $modeRaw === 'full' ? 'full' : 'row';

        $zoomRaw = rawurldecode(
            (string)(
                $_COOKIE['pmd_dashboard_lab_floor_zoom']
                ?? '1'
            )
        );
        $zoom = is_numeric($zoomRaw)
            ? max(0.4, min(1.6, (float)$zoomRaw))
            : 1.0;

        $displayTables = $this->buildFloorDisplayTables(
            $data,
            $layout,
            $state,
            $mode
        );

        AdminMenu::setContext('dashboard');

        return [
            'version' => 'dashboard-lab-exact-reservations-floor-v1',
            'server_first_paint' => true,
            'mode' => $mode,
            'zoom' => $zoom,
            'data' => $data,
            'layout' => $layout,
            'state' => $state,
            'display_tables' => $displayTables,
            'endpoints' => [
                'data' => admin_url('pmd-waiter-dashboard-v9-tenant-data'),
                'layout' => admin_url('pmd-owner-dashboard-floor-layout'),
                'state' => admin_url('pmd-floor-v1/state'),
                'order' => admin_url('waiter-pos/{table}'),
            ],
            'errors' => $errors,
        ];
    }

    private function buildFloorDisplayTables(
        array $data,
        array $layout,
        array $state,
        string $mode
    ): array {
        $rawTables = $data['tables']
            ?? ($data['sections']['floor_plan']['tables'] ?? []);

        if (!is_array($rawTables)) {
            $rawTables = [];
        }

        /* PMD_DASHBOARD_LAB_FLOOR_SERVER_NORMALIZE_V2 */
        $orders = $data['orders']
            ?? ($data['current_orders'] ?? []);

        if (!is_array($orders)) {
            $orders = [];
        }

        $layoutById = [];
        foreach (($layout['tables'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }

            $id = trim((string)(
                $item['id']
                ?? $item['table_id']
                ?? $item['table_no']
                ?? $item['table_number']
                ?? ''
            ));

            if ($id !== '') {
                $layoutById[$id] = $item;
            }
        }

        $tables = [];

        foreach ($rawTables as $index => $raw) {
            if (!is_array($raw)) {
                continue;
            }

            $id = trim((string)(
                $raw['id']
                ?? $raw['table_id']
                ?? $raw['location_table_id']
                ?? $raw['number']
                ?? $raw['table_number']
                ?? ''
            ));

            $number = trim((string)(
                $raw['number']
                ?? $raw['table_number']
                ?? $raw['table_no']
                ?? $raw['id']
                ?? $raw['table_id']
                ?? ''
            ));

            if ($id === '' || $number === '') {
                continue;
            }

            $cleanFloorKey = static function ($value): string {
                $value = preg_replace(
                    '/\s+/',
                    ' ',
                    (string)$value
                );

                return trim((string)$value);
            };

            $tableKeys = array_values(array_filter(array_map(
                $cleanFloorKey,
                [
                    $raw['id'] ?? null,
                    $raw['table_id'] ?? null,
                    $raw['number'] ?? null,
                    $raw['table_number'] ?? null,
                    $raw['table_no'] ?? null,
                    $raw['name'] ?? null,
                    $raw['label'] ?? null,
                ]
            ), static fn ($value) => $value !== ''));

            $linkedOrders = array_values(array_filter(
                $orders,
                static function ($order) use (
                    $tableKeys,
                    $cleanFloorKey
                ): bool {
                    if (!is_array($order)) {
                        return false;
                    }

                    $orderKeys = array_values(array_filter(array_map(
                        $cleanFloorKey,
                        [
                            $order['table_id'] ?? null,
                            $order['location_table_id'] ?? null,
                            $order['table_number'] ?? null,
                            $order['table_no'] ?? null,
                            $order['table_ref'] ?? null,
                            $order['table'] ?? null,
                            $order['table_label'] ?? null,
                        ]
                    ), static fn ($value) => $value !== ''));

                    return count(
                        array_intersect($tableKeys, $orderKeys)
                    ) > 0;
                }
            ));

            $linkedOrderHasNote = count(array_filter(
                $linkedOrders,
                static function ($order): bool {
                    return trim((string)(
                        $order['note']
                        ?? $order['comment']
                        ?? ''
                    )) !== '';
                }
            )) > 0;

            $custom = is_array($state['tables'][$id] ?? null)
                ? $state['tables'][$id]
                : [];

            $rawStatus = strtolower(trim((string)(
                $custom['status']
                ?? $raw['status']
                ?? $raw['latest_order_status']
                ?? ''
            )));

            $waiterCall = $rawStatus === 'waiter-call'
                || $this->floorBool($raw['waiter_call'] ?? false)
                || $this->floorBool($raw['needs_waiter'] ?? false)
                || $this->floorBool($raw['call_waiter'] ?? false);

            $cleaning = $rawStatus === 'cleaning'
                || $this->floorBool($raw['cleaning_required'] ?? false)
                || $this->floorBool($raw['needs_cleaning'] ?? false);

            $reserved = $rawStatus === 'reserved'
                || $this->floorBool($raw['reserved'] ?? false)
                || $this->floorBool($raw['is_reserved'] ?? false);

            $occupied = $rawStatus === 'occupied'
                || count($linkedOrders) > 0
                || (int)($raw['open_orders'] ?? 0) > 0;

            $note = trim((string)(
                $custom['note']
                ?? $raw['note']
                ?? $raw['comment']
                ?? ''
            ));

            $status = ($waiterCall || $note !== '' || $linkedOrderHasNote)
                ? 'attention'
                : ($cleaning
                    ? 'cleaning'
                    : ($reserved
                        ? 'reserved'
                        : ($occupied ? 'occupied' : 'available')));

            /*
             * Match Floor V1 normalize() exactly for first paint.
             * The browser engine reads raw.floor_x/raw.floor.y here;
             * using the secondary layout response on the server caused
             * a second coordinate authority and a refresh-time position swap.
             */
            $floor = is_array($raw['floor'] ?? null)
                ? $raw['floor']
                : [];

            $x = $this->floorNumber(
                $raw['floor_x']
                    ?? $floor['x']
                    ?? null,
                80 + (($index % 6) * 150)
            );

            $y = $this->floorNumber(
                $raw['floor_y']
                    ?? $floor['y']
                    ?? null,
                60 + (floor($index / 6) * 110)
            );

            // Same initial 1000x560 clamp used by Floor V1 normalize().
            $x = max(64.0, min(936.0, $x));
            $y = max(54.0, min(506.0, $y));

            $tables[$id] = [
                'id' => $id,
                'number' => $number,
                'name' => trim((string)(
                    $raw['name']
                    ?? $raw['label']
                    ?? ('Table '.$number)
                )),
                'area' => trim((string)(
                    $raw['section']
                    ?? $raw['table_section']
                    ?? $raw['table_zone']
                    ?? $raw['zone']
                    ?? $raw['floor_name']
                    ?? 'Main'
                )),
                'capacity' => (int)(
                    $raw['capacity']
                    ?? $raw['table_capacity']
                    ?? 0
                ),
                'status' => $status,
                'waiter_call' => $waiterCall,
                'cleaning' => $cleaning,
                'note' => $note,
                'open_orders' => (int)($raw['open_orders'] ?? 0),
                'x' => $x,
                'y' => $y,
                'w' => 108,
                'h' => 88,
                'is_merged' => false,
                'merge_id' => null,
                'member_ids' => [],
                'smallest_number' => is_numeric($number)
                    ? (float)$number
                    : 999999,
            ];
        }

        $handled = [];
        $display = [];
        $merges = is_array($state['merges'] ?? null)
            ? $state['merges']
            : [];

        foreach ($tables as $id => $table) {
            if (isset($handled[$id])) {
                continue;
            }

            $mergeId = null;
            $memberIds = [];

            foreach ($merges as $candidateId => $merge) {
                $ids = array_map('strval', (array)($merge['table_ids'] ?? []));
                if (in_array((string)$id, $ids, true)) {
                    $mergeId = (string)$candidateId;
                    $memberIds = $ids;
                    break;
                }
            }

            if ($mergeId === null) {
                $display[] = $table;
                $handled[$id] = true;
                continue;
            }

            $members = [];
            foreach ($memberIds as $memberId) {
                if (isset($tables[$memberId])) {
                    $members[] = $tables[$memberId];
                    $handled[$memberId] = true;
                }
            }

            if (count($members) < 2) {
                $display[] = $table;
                continue;
            }

            usort($members, static function ($left, $right) {
                return ($left['smallest_number'] <=> $right['smallest_number'])
                    ?: strnatcasecmp($left['number'], $right['number']);
            });

            $priority = [
                'available' => 1,
                'occupied' => 2,
                'reserved' => 3,
                'cleaning' => 4,
                'attention' => 5,
                'waiter-call' => 5,
            ];

            $status = 'available';
            foreach ($members as $member) {
                if (($priority[$member['status']] ?? 0) > ($priority[$status] ?? 0)) {
                    $status = $member['status'];
                }
            }

            $numbers = array_column($members, 'number');
            $display[] = [
                'id' => $members[0]['id'],
                'number' => implode(' + ', $numbers),
                'name' => 'Merged tables '.implode(', ', $numbers),
                'area' => $members[0]['area'],
                'capacity' => array_sum(array_column($members, 'capacity')),
                'status' => $status,
                'waiter_call' => count(array_filter(
                    $members,
                    static fn ($member) => $member['waiter_call']
                )) > 0,
                'cleaning' => count(array_filter(
                    $members,
                    static fn ($member) => $member['cleaning']
                )) > 0,
                'note' => implode(' · ', array_values(array_filter(
                    array_column($members, 'note')
                ))),
                'open_orders' => array_sum(array_column($members, 'open_orders')),
                'x' => array_sum(array_column($members, 'x')) / count($members),
                'y' => array_sum(array_column($members, 'y')) / count($members),
                'w' => $mode === 'row' ? 270 : 178,
                'h' => $mode === 'row' ? 104 : 146,
                'is_merged' => true,
                'merge_id' => $mergeId,
                'member_ids' => array_column($members, 'id'),
                'smallest_number' => min(array_column($members, 'smallest_number')),
            ];
        }

        if ($mode === 'row') {
            usort($display, static function ($left, $right) {
                return ($left['smallest_number'] <=> $right['smallest_number'])
                    ?: strnatcasecmp($left['number'], $right['number']);
            });

            $cursor = 24.0;
            foreach ($display as &$table) {
                $table['x'] = $cursor + ($table['w'] / 2);
                $table['y'] = 22 + ($table['h'] / 2);
                $cursor += $table['w'] + 18;
            }
            unset($table);
        }

        return array_values($display);
    }

    private function floorBool($value): bool
    {
        return in_array(
            $value,
            [true, 1, '1', 'true'],
            true
        );
    }

    private function floorNumber($value, float $fallback): float
    {
        return is_numeric($value)
            ? (float)$value
            : $fallback;
    }

    private function formatValue(
        string $format,
        $value,
        array $currency
    ): string {
        if ($value === null) {
            return '—';
        }

        if ($format === 'money') {
            $symbol = (string)($currency['symbol'] ?? '€');

            return $symbol.number_format(
                (float)$value,
                2,
                '.',
                ','
            );
        }

        if ($format === 'minutes') {
            return (string)round((float)$value).' min';
        }

        if ($format === 'channels') {
            $channels = is_array($value) ? $value : [];

            return (string)(int)($channels['dine_in'] ?? 0)
                .' / '
                .(string)(int)($channels['takeaway'] ?? 0);
        }

        if ($format === 'percent') {
            return (string)(float)$value.'%';
        }

        if ($format === 'menu') {
            $menu = is_array($value) ? $value : [];

            return (string)(int)($menu['available_now'] ?? 0)
                .' / '
                .(string)(int)($menu['total'] ?? 0);
        }

        if (is_float($value)) {
            return rtrim(
                rtrim(
                    number_format($value, 1, '.', ''),
                    '0'
                ),
                '.'
            );
        }

        return (string)$value;
    }
}
