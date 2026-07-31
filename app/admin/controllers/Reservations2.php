<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminAuth;
use Admin\Models\LocationOption;
use Admin\Models\Locations_model;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Admin\Services\ReservationComposerService;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Clean Reservations workspace.
 *
 * This controller intentionally keeps the proven native reservation model,
 * permissions and list configuration, while rendering a completely isolated
 * index page at /admin/reservations2.
 */
class Reservations2 extends Reservations
{
    private const FLOOR_VIEW_OPTION = 'pmd_reservations2_floor_view_main_floor';

    private const FLOOR_VIEW_ID = 'main-floor';

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
            $this->readFloorViewPreference();

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

    public function onSaveFloorViewPreference()
    {
        $user = AdminAuth::getUser();

        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (!$user->hasPermission('Admin.Reservations')) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        try {
            $location = $this->resolveFloorViewLocation($user);
        } catch (Throwable $exception) {
            $this->logFloorViewFailure('location resolution', $exception);

            return response()->json([
                'ok' => false,
                'message' => 'Active location could not be resolved.',
            ], 500);
        }

        if (!$location) {
            return response()->json([
                'ok' => false,
                'message' => 'No active location is selected.',
            ], 409);
        }

        $floorId = trim((string)request()->input('floor_id'));
        $mode = trim((string)request()->input('layout_mode'));
        $zoom = request()->input('full_floor_zoom');

        if ($floorId !== self::FLOOR_VIEW_ID) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor.',
            ], 422);
        }

        if (!in_array($mode, ['full', 'row'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor layout mode.',
            ], 422);
        }

        if (!is_numeric($zoom) || (float)$zoom < 0.4 || (float)$zoom > 1.6) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor zoom.',
            ], 422);
        }

        $value = [
            'floor_id' => self::FLOOR_VIEW_ID,
            'layout_mode' => $mode,
            'full_floor_zoom' => round((float)$zoom, 2),
        ];

        try {
            LocationOption::query()->updateOrCreate([
                'location_id' => (int)$location->location_id,
                'item' => self::FLOOR_VIEW_OPTION,
            ], [
                'value' => $value,
            ]);
        } catch (Throwable $exception) {
            $this->logFloorViewFailure('write', $exception, $location);

            return response()->json([
                'ok' => false,
                'message' => 'Floor view preference could not be saved.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'view' => $value,
        ]);
    }

    protected function readFloorViewPreference(): array
    {
        $default = $this->defaultFloorViewPreference();
        $location = null;

        try {
            $location = $this->resolveFloorViewLocation();

            if (!$location) {
                return $default;
            }

            $record = LocationOption::findRecord(
                self::FLOOR_VIEW_OPTION,
                $location
            );

            if (!$record || !is_array($record->value)) {
                return $default;
            }

            $value = $record->value;
            $floorId = (string)($value['floor_id'] ?? '');
            $mode = (string)($value['layout_mode'] ?? '');
            $zoom = $value['full_floor_zoom'] ?? null;

            if (
                $floorId !== self::FLOOR_VIEW_ID
                || !in_array($mode, ['full', 'row'], true)
                || !is_numeric($zoom)
                || (float)$zoom < 0.4
                || (float)$zoom > 1.6
            ) {
                return $default;
            }

            return [
                'floor_id' => self::FLOOR_VIEW_ID,
                'layout_mode' => $mode,
                'full_floor_zoom' => round((float)$zoom, 2),
            ];
        } catch (Throwable $exception) {
            $this->logFloorViewFailure('read', $exception, $location);

            return $default;
        }
    }

    protected function defaultFloorViewPreference(): array
    {
        return [
            'floor_id' => self::FLOOR_VIEW_ID,
            'layout_mode' => 'full',
            'full_floor_zoom' => 1.0,
        ];
    }

    protected function resolveFloorViewLocation($user = null)
    {
        if ($location = AdminLocation::current()) {
            return $location;
        }

        $user = $user ?: AdminAuth::getUser();

        if (!$user) {
            return null;
        }

        $locationId = (int)AdminLocation::getSession('id');

        if (!$locationId && is_single_location()) {
            $locationId = (int)params('default_location_id');
        }

        if (!$locationId) {
            $staff = $user->staff;
            $accessibleLocations = $staff
                ? $staff
                    ->locations
                    ->where('location_status', true)
                    ->values()
                : collect();

            if ($accessibleLocations->count() === 1) {
                $locationId = (int)$accessibleLocations
                    ->first()
                    ->location_id;
            }
        }

        if (!$locationId) {
            return null;
        }

        $location = Locations_model::isEnabled()->find($locationId);

        if (
            !$location
            || (
                !$user->isSuperUser()
                && !$user->hasLocationAccess($location)
            )
        ) {
            return null;
        }

        AdminLocation::setCurrent($location);

        return $location;
    }

    protected function logFloorViewFailure($operation, Throwable $exception, $location = null): void
    {
        Log::warning('Reservations2 Floor view preference '.$operation.' failed.', [
            'tenant_id' => request()->attributes->get('tenant_id'),
            'location_id' => $location ? (int)$location->location_id : null,
            'floor_id' => self::FLOOR_VIEW_ID,
            'exception_class' => get_class($exception),
            'exception_message' => $exception->getMessage(),
        ]);
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

    public function index_onLoadReservationComposer()
    {
        return app(ReservationComposerService::class)->load(request()->all());
    }

    public function index_onCheckReservationAvailability()
    {
        return app(ReservationComposerService::class)->availability(request()->all());
    }

    public function index_onSaveReservationComposer()
    {
        return app(ReservationComposerService::class)->save(request()->all());
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
