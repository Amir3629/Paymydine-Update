<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\LocationOption;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;

/**
 * Clean Reservations workspace.
 *
 * This controller intentionally keeps the proven native reservation model,
 * permissions and list configuration, while rendering a completely isolated
 * index page at /admin/reservations2.
 */
class Reservations2 extends Reservations
{
    private const FLOOR_VIEW_OPTION = 'pmd_reservations2_floor_views';

    protected $pmdProfileEnabled = false;

    protected $pmdProfileId;

    protected $pmdProfileStartedAt;

    protected $pmdProfileIndexEndedAt;

    protected $pmdProfileQueryCount = 0;

    protected $pmdProfileQueryMs = 0.0;

    protected $pmdProfileQueries = [];

    public function __construct()
    {
        $profileRequested = (
            isset($_GET['pmd_profile'])
            && (string)$_GET['pmd_profile'] === '1'
        );

        $parentStartedAt = microtime(true);

        parent::__construct();

        $parentMs = (
            microtime(true) - $parentStartedAt
        ) * 1000;

        $this->pmdProfileEnabled =
            $profileRequested;

        if ($this->pmdProfileEnabled) {
            $this->pmdProfileStartedAt =
                isset($_SERVER['REQUEST_TIME_FLOAT'])
                    ? (float)$_SERVER['REQUEST_TIME_FLOAT']
                    : $parentStartedAt;

            $this->pmdProfileId =
                date('Ymd-His')
                . '-'
                . getmypid()
                . '-'
                . substr(
                    hash(
                        'sha256',
                        uniqid('', true)
                    ),
                    0,
                    8
                );

            $this->pmdProfileLog(
                'request.start',
                [
                    'method' =>
                        $_SERVER['REQUEST_METHOD']
                        ?? null,

                    'uri' =>
                        $_SERVER['REQUEST_URI']
                        ?? null,

                    'parent_constructor_ms' =>
                        round($parentMs, 2),

                    'php_sapi' => PHP_SAPI,
                    'php_version' => PHP_VERSION,
                ]
            );

            DB::listen(function ($query) {
                $time = isset($query->time)
                    ? (float)$query->time
                    : 0.0;

                $this->pmdProfileQueryCount++;
                $this->pmdProfileQueryMs += $time;

                $sql = preg_replace(
                    '/\s+/',
                    ' ',
                    trim((string)$query->sql)
                );

                $this->pmdProfileQueries[] = [
                    'ms' => round($time, 2),
                    'sql' => mb_substr(
                        $sql,
                        0,
                        700
                    ),
                ];

                $this->pmdProfileLog(
                    'sql.query',
                    [
                        'number' =>
                            $this->pmdProfileQueryCount,

                        'ms' =>
                            round($time, 2),

                        'sql' =>
                            mb_substr(
                                $sql,
                                0,
                                700
                            ),
                    ]
                );
            });

            register_shutdown_function(
                function () {
                    $now = microtime(true);

                    $totalMs = (
                        $now
                        - $this->pmdProfileStartedAt
                    ) * 1000;

                    $afterIndexMs = null;

                    if (
                        $this->pmdProfileIndexEndedAt
                    ) {
                        $afterIndexMs = (
                            $now
                            - $this
                                ->pmdProfileIndexEndedAt
                        ) * 1000;
                    }

                    $slowest =
                        $this->pmdProfileQueries;

                    usort(
                        $slowest,
                        function ($left, $right) {
                            return (
                                $right['ms']
                                <=>
                                $left['ms']
                            );
                        }
                    );

                    $slowest = array_slice(
                        $slowest,
                        0,
                        10
                    );

                    $fatal = error_get_last();

                    $this->pmdProfileLog(
                        'request.shutdown',
                        [
                            'total_ms' =>
                                round($totalMs, 2),

                            'after_index_ms' =>
                                $afterIndexMs === null
                                    ? null
                                    : round(
                                        $afterIndexMs,
                                        2
                                    ),

                            'query_count' =>
                                $this
                                    ->pmdProfileQueryCount,

                            'query_total_ms' =>
                                round(
                                    $this
                                        ->pmdProfileQueryMs,
                                    2
                                ),

                            'widgets_count' =>
                                is_array($this->widgets)
                                    ? count(
                                        $this->widgets
                                    )
                                    : null,

                            'memory_mb' =>
                                round(
                                    memory_get_usage(true)
                                    / 1048576,
                                    2
                                ),

                            'peak_memory_mb' =>
                                round(
                                    memory_get_peak_usage(true)
                                    / 1048576,
                                    2
                                ),

                            'http_status' =>
                                http_response_code(),

                            'slowest_queries' =>
                                $slowest,

                            'fatal_error' =>
                                $fatal,
                        ]
                    );
                }
            );
        }

        $menuStartedAt = microtime(true);

        AdminMenu::setContext(
            'reservations',
            'sales'
        );

        $this->pmdProfileStage(
            'constructor.admin_menu',
            $menuStartedAt
        );
    }

    public function initialize()
    {
        $startedAt = microtime(true);

        $result = parent::initialize();

        $this->pmdProfileStage(
            'controller.initialize',
            $startedAt,
            [
                'widgets_count' =>
                    is_array($this->widgets)
                        ? count($this->widgets)
                        : null,

                'widget_aliases' =>
                    is_array($this->widgets)
                        ? array_keys($this->widgets)
                        : [],
            ]
        );

        return $result;
    }

    public function index()
    {
        $indexStartedAt = microtime(true);

        $startedAt = microtime(true);

        $this
            ->asExtension('ListController')
            ->index();

        $this->pmdProfileStage(
            'index.list_controller',
            $startedAt,
            [
                'widgets_count' =>
                    is_array($this->widgets)
                        ? count($this->widgets)
                        : null,

                'widget_aliases' =>
                    is_array($this->widgets)
                        ? array_keys($this->widgets)
                        : [],
            ]
        );

        $startedAt = microtime(true);

        $this->vars['statusesOptions'] =
            Statuses_model::
                getDropdownOptionsForReservation();

        $this->vars['pmdFloorView'] =
            $this->readFloorViewPreference('main-floor');

        $this->vars['pmdCanceledReservationStatusId'] =
            (int)setting('canceled_reservation_status');

        $this->pmdProfileStage(
            'index.status_options',
            $startedAt,
            [
                'status_count' =>
                    is_countable(
                        $this->vars[
                            'statusesOptions'
                        ]
                    )
                        ? count(
                            $this->vars[
                                'statusesOptions'
                            ]
                        )
                        : null,
            ]
        );

        $startedAt = microtime(true);

        /*
         * PMD_RESERVATIONS_N1_FIX_V22
         *
         * The old collection was passed directly to Blade @json().
         * During serialization, every reservation lazily loaded:
         * location, location options, tables, status and location media.
         *
         * Eager-load only the data required by the Reservations UI and
         * convert every model to a compact plain payload without serializing
         * the complete Location model.
         */
        $reservations =
            Reservations_model::query()
                ->with([
                    'location.all_options',
                    'tables',
                    'status',
                ])
                ->orderBy(
                    'reservation_id',
                    'desc'
                )
                ->orderBy('reserve_date')
                ->orderBy('reserve_time')
                ->limit(1500)
                ->get();

        $this->vars['pmdReservations2'] =
            $reservations
                ->map(function ($reservation) {
                    /*
                     * attributesToArray() contains the model's casts and
                     * appended attributes, but does not serialize complete
                     * loaded relations.
                     *
                     * Because the relations above are already loaded,
                     * duration, table_name and status_name cause no N+1.
                     */
                    $payload =
                        $reservation
                            ->attributesToArray();

                    $payload['tables'] =
                        $reservation
                            ->tables
                            ->map(function ($table) {
                                return [
                                    'table_id' =>
                                        (int)$table->table_id,

                                    'table_name' =>
                                        $table->table_name,

                                    'table_number' =>
                                        $table->table_name,

                                    'name' =>
                                        $table->table_name,
                                ];
                            })
                            ->values()
                            ->all();

                    $payload['status'] =
                        $reservation->status
                            ? [
                                'status_id' =>
                                    (int)$reservation
                                        ->status
                                        ->status_id,

                                'status_name' =>
                                    $reservation
                                        ->status
                                        ->status_name,

                                'status_color' =>
                                    $reservation
                                        ->status
                                        ->status_color,
                            ]
                            : null;

                    $payload['location'] =
                        $reservation->location
                            ? [
                                'location_id' =>
                                    (int)$reservation
                                        ->location
                                        ->location_id,

                                'location_name' =>
                                    $reservation
                                        ->location
                                        ->location_name,
                            ]
                            : null;

                    return $payload;
                })
                ->values()
                ->all();

        $this->pmdProfileStage(
            'index.reservations_query',
            $startedAt,
            [
                'reservation_count' =>
                    count(
                        $this->vars[
                            'pmdReservations2'
                        ]
                    ),
            ]
        );

        $this->pmdProfileStage(
            'index.total',
            $indexStartedAt,
            [
                'query_count_so_far' =>
                    $this->pmdProfileQueryCount,

                'query_total_ms_so_far' =>
                    round(
                        $this->pmdProfileQueryMs,
                        2
                    ),
            ]
        );

        $this->pmdProfileIndexEndedAt =
            microtime(true);
    }

    public function floorViewPreference()
    {
        $user = $this->getUser();

        if (!$user || !$user->hasPermission('Admin.Reservations')) {
            abort(403);
        }

        $payload = request()->json()->all() ?: request()->all();
        $floorId = trim((string)($payload['floor_id'] ?? ''));
        $zoom = filter_var($payload['zoom'] ?? null, FILTER_VALIDATE_FLOAT);
        $layoutMode = (string)($payload['layout_mode'] ?? '');

        if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $floorId)) {
            return response()->json(['ok' => false, 'message' => 'Invalid floor_id'], 422);
        }

        if ($zoom === false || $zoom < 0.4 || $zoom > 1.6) {
            return response()->json(['ok' => false, 'message' => 'Invalid zoom'], 422);
        }

        if (!in_array($layoutMode, ['full', 'row'], true)) {
            return response()->json(['ok' => false, 'message' => 'Invalid layout_mode'], 422);
        }

        $options = LocationOption::onLocation();
        $views = $options->get(self::FLOOR_VIEW_OPTION, []);
        $views = is_array($views) ? $views : [];
        $views[$floorId] = [
            'floor_id' => $floorId,
            'zoom' => round((float)$zoom, 1),
            'layout_mode' => $layoutMode,
        ];
        $options->set(self::FLOOR_VIEW_OPTION, $views);

        return response()->json(['ok' => true, 'floor_view' => $views[$floorId]]);
    }

    protected function readFloorViewPreference(string $floorId): array
    {
        $views = LocationOption::onLocation()->get(self::FLOOR_VIEW_OPTION, []);
        $saved = is_array($views) ? ($views[$floorId] ?? []) : [];
        $zoom = isset($saved['zoom']) ? (float)$saved['zoom'] : 1.0;
        $layoutMode = (string)($saved['layout_mode'] ?? 'full');

        return [
            'floor_id' => $floorId,
            'zoom' => max(0.4, min(1.6, $zoom)),
            'layout_mode' => in_array($layoutMode, ['full', 'row'], true)
                ? $layoutMode
                : 'full',
        ];
    }

    public function index_onDelete()
    {
        if (
            !$this
                ->getUser()
                ->hasPermission(
                    'Admin.DeleteReservations'
                )
        ) {
            throw new ApplicationException(
                lang(
                    'admin::lang.'
                    . 'alert_user_restricted'
                )
            );
        }

        return $this
            ->asExtension(
                'Admin\Actions\ListController'
            )
            ->index_onDelete();
    }

    protected function pmdProfileStage(
        $stage,
        $startedAt,
        array $extra = []
    ) {
        if (!$this->pmdProfileEnabled) {
            return;
        }

        $extra['ms'] = round(
            (
                microtime(true)
                - $startedAt
            ) * 1000,
            2
        );

        $this->pmdProfileLog(
            $stage,
            $extra
        );
    }

    protected function pmdProfileLog(
        $stage,
        array $data = []
    ) {
        if (!$this->pmdProfileEnabled) {
            return;
        }

        $record = [
            'timestamp' =>
                date('Y-m-d H:i:s.u'),

            'request_id' =>
                $this->pmdProfileId,

            'stage' =>
                $stage,

            'elapsed_ms' =>
                round(
                    (
                        microtime(true)
                        - $this->pmdProfileStartedAt
                    ) * 1000,
                    2
                ),

            'data' =>
                $data,
        ];

        @file_put_contents(
            storage_path(
                'logs/'
                . 'pmd-reservations-profile.log'
            ),
            json_encode(
                $record,
                JSON_UNESCAPED_SLASHES
                | JSON_UNESCAPED_UNICODE
            )
            . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
