<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminAuth;
use Admin\Models\LocationOption;
use Admin\Models\Locations_model;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Admin\Models\Tables_model;
use Admin\Services\ReservationComposerService;
use Admin\Services\PmdSharedFloorRegistryV1;
use Carbon\Carbon;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
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
                'item' => $this->floorViewOptionKey($user),
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

            $user = AdminAuth::getUser();

            if (!$user) {
                return $default;
            }

            $record = LocationOption::findRecord(
                $this->floorViewOptionKey($user),
                $location
            );

            // Preserve the existing location preference as a migration
            // fallback until this user saves a personalized preference.
            if (!$record) {
                $record = LocationOption::findRecord(
                    self::FLOOR_VIEW_OPTION,
                    $location
                );
            }

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

    protected function floorViewOptionKey($user): string
    {
        $userId = (int)($user->user_id ?? $user->getKey());

        return self::FLOOR_VIEW_OPTION.'_user_'.$userId;
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

    /**
     * PMD_RESERVATION_COMPOSER_FUTURE_ONLY_SERVER_GUARD_V1
     * New reservations may not be checked/saved in the past. Existing
     * historical reservations remain editable; this guard applies only when
     * reservation_id is absent/zero. Europe/Berlin is the booking authority.
     */
    protected function pmdGuardComposerCreateNotPast(array $data): void
    {
        if ((int)($data['reservation_id'] ?? 0) > 0) {
            return;
        }

        $date = trim((string)($data['reserve_date'] ?? ''));
        $time = trim((string)($data['reserve_time'] ?? ''));

        if (
            !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || !preg_match('/^([01]\d|2[0-3]):[0-5]\d/', $time)
        ) {
            return;
        }

        try {
            $requested = Carbon::createFromFormat(
                '!Y-m-d H:i',
                $date.' '.substr($time, 0, 5),
                'Europe/Berlin'
            );
        } catch (Throwable $error) {
            return;
        }

        if ($requested->lt(Carbon::now('Europe/Berlin')->startOfMinute())) {
            throw ValidationException::withMessages([
                'reserve_time' => 'Reservation date and time cannot be in the past.',
            ]);
        }
    }

    /**
     * PMD_RESERVATION_COMPOSER_BOOKING_INTEGRITY_V1
     * Same PMD Settings working_hours authority + reservation overlap guard.
     * No new table status source and no database mutation.
     */
    protected function pmdComposerLocationId(array $data): int
    {
        $locationId = (int)($data['location_id'] ?? 0);
        if ($locationId > 0) {
            return $locationId;
        }

        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) {
                return (int)$location->location_id;
            }
        } catch (Throwable $error) {
        }

        try {
            $locationId = (int)AdminLocation::getSession('id');
            if ($locationId > 0) {
                return $locationId;
            }
        } catch (Throwable $error) {
        }

        try {
            $defaultId = (int)params('default_location_id');
            if ($defaultId > 0) {
                return $defaultId;
            }
        } catch (Throwable $error) {
        }

        return 1;
    }

    protected function pmdComposerOpeningHours(int $locationId): array
    {
        if ($locationId < 1) {
            return [];
        }

        try {
            return DB::table('working_hours')
                ->where('location_id', $locationId)
                ->where('type', 'opening')
                ->orderBy('weekday')
                ->get()
                ->map(function ($row) {
                    return [
                        'weekday' => (int)$row->weekday,
                        'enabled' => (bool)$row->status,
                        'opening_time' => substr((string)$row->opening_time, 0, 5),
                        'closing_time' => substr((string)$row->closing_time, 0, 5),
                    ];
                })
                ->filter(function ($row) {
                    return $row['weekday'] >= 0 && $row['weekday'] <= 6;
                })
                ->values()
                ->all();
        } catch (Throwable $error) {
            // No configured policy must not invent a closed restaurant.
            return [];
        }
    }

    protected function pmdComposerOpeningWindowAllows(array $data): bool
    {
        $hours = $this->pmdComposerOpeningHours($this->pmdComposerLocationId($data));
        if (!$hours) {
            return true;
        }

        $date = trim((string)($data['reserve_date'] ?? ''));
        $time = substr(trim((string)($data['reserve_time'] ?? '')), 0, 5);
        $duration = max(1, (int)($data['duration'] ?? 45));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
            return true;
        }

        try {
            $requestedStart = Carbon::createFromFormat('!Y-m-d H:i', $date.' '.$time, 'Europe/Berlin');
        } catch (Throwable $error) {
            return true;
        }
        $requestedEnd = $requestedStart->copy()->addMinutes($duration);

        $byWeekday = [];
        foreach ($hours as $row) {
            $byWeekday[(int)$row['weekday']] = $row;
        }

        $candidates = [
            $requestedStart->copy()->startOfDay(),
            $requestedStart->copy()->subDay()->startOfDay(),
        ];

        foreach ($candidates as $serviceDate) {
            // Carbon: Monday=1 ... Sunday=7; PMD Settings: Monday=0 ... Sunday=6.
            $weekday = ((int)$serviceDate->isoWeekday()) - 1;
            $row = $byWeekday[$weekday] ?? null;
            if (!$row || empty($row['enabled'])) {
                continue;
            }

            $opening = (string)($row['opening_time'] ?? '');
            $closing = (string)($row['closing_time'] ?? '');
            if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $opening)
                || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $closing)) {
                continue;
            }

            $windowStart = Carbon::createFromFormat(
                '!Y-m-d H:i',
                $serviceDate->format('Y-m-d').' '.$opening,
                'Europe/Berlin'
            );
            $windowEnd = Carbon::createFromFormat(
                '!Y-m-d H:i',
                $serviceDate->format('Y-m-d').' '.$closing,
                'Europe/Berlin'
            );

            if ($opening === $closing) {
                $windowStart = $serviceDate->copy();
                $windowEnd = $serviceDate->copy()->addDay();
            } elseif ($windowEnd->lte($windowStart)) {
                $windowEnd->addDay();
            }

            if ($requestedStart->gte($windowStart) && $requestedEnd->lte($windowEnd)) {
                return true;
            }
        }

        return false;
    }

    protected function pmdGuardComposerOpeningHours(array $data): void
    {
        if ((int)($data['reservation_id'] ?? 0) > 0) {
            return;
        }

        if (!$this->pmdComposerOpeningWindowAllows($data)) {
            throw ValidationException::withMessages([
                'reserve_time' => 'Reservation time must be inside the restaurant opening hours.',
            ]);
        }
    }

    protected function pmdComposerConflictingTableIds(array $data): array
    {
        $locationId = $this->pmdComposerLocationId($data);
        $date = trim((string)($data['reserve_date'] ?? ''));
        $time = substr(trim((string)($data['reserve_time'] ?? '')), 0, 5);
        $duration = max(1, (int)($data['duration'] ?? 45));
        $currentReservationId = (int)($data['reservation_id'] ?? 0);

        if ($locationId < 1
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
            return [];
        }

        try {
            $requestedStart = Carbon::createFromFormat('!Y-m-d H:i', $date.' '.$time, 'Europe/Berlin');
        } catch (Throwable $error) {
            return [];
        }
        $requestedEnd = $requestedStart->copy()->addMinutes($duration);
        $dateCandidates = [
            $requestedStart->format('Y-m-d'),
            $requestedStart->copy()->subDay()->format('Y-m-d'),
        ];

        $query = Reservations_model::query()
            ->with(['tables', 'location'])
            ->where('location_id', $locationId)
            ->whereIn('reserve_date', array_values(array_unique($dateCandidates)))
            ->where('status_id', '>=', 1);

        if ($currentReservationId > 0) {
            $query->where('reservation_id', '!=', $currentReservationId);
        }

        $canceledStatusId = (int)setting('canceled_reservation_status');
        if ($canceledStatusId > 0) {
            $query->where('status_id', '!=', $canceledStatusId);
        }

        $blocked = [];
        foreach ($query->get() as $reservation) {
            $attributes = $reservation->getAttributes();
            $existingDate = substr((string)($attributes['reserve_date'] ?? ''), 0, 10);
            $existingTime = substr((string)($attributes['reserve_time'] ?? ''), 0, 5);
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $existingDate)
                || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $existingTime)) {
                continue;
            }

            try {
                $existingStart = Carbon::createFromFormat(
                    '!Y-m-d H:i',
                    $existingDate.' '.$existingTime,
                    'Europe/Berlin'
                );
            } catch (Throwable $error) {
                continue;
            }
            $existingDuration = max(1, (int)($reservation->duration ?: 45));
            $existingEnd = $existingStart->copy()->addMinutes($existingDuration);

            if ($requestedStart->lt($existingEnd) && $requestedEnd->gt($existingStart)) {
                foreach ($reservation->tables as $table) {
                    $tableId = (int)$table->table_id;
                    if ($tableId > 0) {
                        $blocked[$tableId] = true;
                    }
                }
            }
        }

        $ids = array_map('intval', array_keys($blocked));
        sort($ids, SORT_NUMERIC);
        return $ids;
    }

    protected function pmdPositiveTableIds($values): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', (array)$values), function ($id) {
            return $id > 0;
        })));
        sort($ids, SORT_NUMERIC);
        return $ids;
    }


    /**
     * PMD_RESERVATION_TABLE_POLICY_RESPONSE_TRANSPORT_V1_0_3
     *
     * ReservationComposerService may return either a plain array or an
     * Illuminate/Symfony JsonResponse depending on the live runtime path.
     * Policy code must operate on the JSON payload in BOTH cases and then
     * preserve the original response transport/status/headers.
     */
    protected function pmdComposerResponsePayload($response): ?array
    {
        if (is_array($response)) {
            return $response;
        }

        if (!is_object($response)) {
            return null;
        }

        try {
            if (method_exists($response, 'getData')) {
                $data = $response->getData(true);
                if (is_array($data)) {
                    return $data;
                }
            }
        } catch (Throwable $error) {
        }

        try {
            if (method_exists($response, 'getContent')) {
                $decoded = json_decode((string)$response->getContent(), true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        } catch (Throwable $error) {
        }

        return null;
    }

    protected function pmdComposerResponseApplyPayload($response, array $payload)
    {
        if (is_array($response)) {
            return $payload;
        }

        if (is_object($response) && method_exists($response, 'setData')) {
            try {
                $response->setData($payload);
                return $response;
            } catch (Throwable $error) {
            }
        }

        if (is_object($response) && method_exists($response, 'setContent')) {
            try {
                $response->setContent(json_encode(
                    $payload,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ));
                return $response;
            } catch (Throwable $error) {
            }
        }

        // Defensive fallback only. Normal live paths are array or JSON response objects.
        return $payload;
    }

    protected function pmdComposerManagedFeatureKeys(): array
    {
        return ['near_window', 'quiet_area', 'accessible'];
    }

    protected function pmdComposerNormalizeFeatures($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [$value];
        } elseif ($value instanceof \Illuminate\Support\Collection) {
            $value = $value->all();
        }

        if (!is_array($value)) {
            return [];
        }

        $allowed = array_fill_keys($this->pmdComposerManagedFeatureKeys(), true);
        $out = [];
        foreach ($value as $feature) {
            $feature = strtolower(trim((string)$feature));
            if ($feature !== '' && isset($allowed[$feature])) {
                $out[$feature] = true;
            }
        }
        return array_values(array_keys($out));
    }

    protected function pmdComposerRequestedFeatures(array $data): array
    {
        return $this->pmdComposerNormalizeFeatures(
            $data['pmd_table_features']
                ?? $data['pmd_table_features[]']
                ?? []
        );
    }

    protected function pmdComposerFloorRegistryContext(int $locationId): array
    {
        try {
            $snapshot = app(PmdSharedFloorRegistryV1::class)->snapshot($locationId);
        } catch (Throwable $error) {
            $snapshot = [];
        }

        $floors = [];
        $mainId = 'main-floor';
        $mainName = 'Main Floor';
        foreach ((array)($snapshot['floors'] ?? []) as $floor) {
            if (!is_array($floor)) continue;
            $id = trim((string)($floor['id'] ?? ''));
            $name = trim((string)($floor['name'] ?? ''));
            if ($id === '' || $name === '') continue;
            $floors[$id] = ['id' => $id, 'name' => $name];
            if (strcasecmp($name, 'Main Floor') === 0) {
                $mainId = $id;
                $mainName = $name;
            }
        }

        if (!isset($floors[$mainId])) {
            $floors[$mainId] = ['id' => $mainId, 'name' => $mainName];
        }

        $assignments = [];
        foreach ((array)($snapshot['table_assignments'] ?? []) as $tableId => $floorId) {
            $tableId = (int)$tableId;
            $floorId = trim((string)$floorId);
            if ($tableId > 0 && $floorId !== '' && isset($floors[$floorId])) {
                $assignments[$tableId] = $floorId;
            }
        }

        return [
            'floors' => $floors,
            'assignments' => $assignments,
            'main_id' => $mainId,
            'main_name' => $mainName,
        ];
    }

    protected function pmdComposerTableMeta(int $locationId, array $tableIds): array
    {
        $ids = $this->pmdPositiveTableIds($tableIds);
        if (!$ids) return [];

        $floorContext = $this->pmdComposerFloorRegistryContext($locationId);
        $floors = (array)$floorContext['floors'];
        $assignments = (array)$floorContext['assignments'];
        $mainId = (string)$floorContext['main_id'];
        $mainName = (string)$floorContext['main_name'];

        try {
            $rows = Tables_model::query()
                ->whereIn('table_id', $ids)
                ->get();
        } catch (Throwable $error) {
            return [];
        }

        $meta = [];
        foreach ($rows as $table) {
            $id = (int)($table->table_id ?? 0);
            if ($id < 1) continue;

            $floorId = (string)($assignments[$id] ?? $mainId);
            $floor = $floors[$floorId] ?? ['id' => $mainId, 'name' => $mainName];
            $features = $this->pmdComposerNormalizeFeatures($table->table_features ?? []);
            $rawReservable = $table->reservable;

            $meta[$id] = [
                'table_id' => $id,
                'table_name' => trim((string)($table->table_name ?? '')) ?: ('Table '.$id),
                'min_capacity' => max(0, (int)($table->min_capacity ?? 0)),
                'max_capacity' => max(0, (int)($table->max_capacity ?? 0)),
                'preferred_capacity' => max(0, (int)($table->preferred_capacity ?? 0)),
                'priority' => max(0, (int)($table->priority ?? 0)),
                'reservation_priority' => max(0, (int)($table->reservation_priority ?? 0)),
                'is_joinable' => (bool)($table->is_joinable ?? false),
                'table_status' => (bool)($table->table_status ?? true),
                'reservable' => $rawReservable === null ? true : (bool)$rawReservable,
                'features' => $features,
                'floor_id' => (string)($floor['id'] ?? $mainId),
                'floor_name' => trim((string)($floor['name'] ?? $mainName)) ?: $mainName,
            ];
        }
        return $meta;
    }

    protected function pmdComposerFeatureOptions(array $meta): array
    {
        $labels = [
            'near_window' => 'Near window',
            'quiet_area' => 'Quiet area',
            'accessible' => 'Accessible',
        ];
        $counts = array_fill_keys($this->pmdComposerManagedFeatureKeys(), 0);

        foreach ($meta as $row) {
            if (!is_array($row) || empty($row['table_status']) || empty($row['reservable'])) continue;
            foreach ((array)($row['features'] ?? []) as $feature) {
                if (isset($counts[$feature])) $counts[$feature]++;
            }
        }

        $out = [];
        foreach ($this->pmdComposerManagedFeatureKeys() as $feature) {
            if (($counts[$feature] ?? 0) < 1) continue;
            $out[] = [
                'key' => $feature,
                'label' => $labels[$feature] ?? $feature,
                'count' => (int)$counts[$feature],
            ];
        }
        return $out;
    }

    protected function pmdComposerTableMatchesFeatures(array $table, array $features): bool
    {
        if (!$features) return true;
        $owned = array_fill_keys((array)($table['features'] ?? []), true);
        foreach ($features as $feature) {
            if (!isset($owned[$feature])) return false;
        }
        return true;
    }

    protected function pmdComposerCombinationScore(array $rows, int $guestCount): array
    {
        $capacity = 0;
        $priority = 0;
        $ids = [];
        foreach ($rows as $row) {
            $capacity += max(0, (int)($row['max_capacity'] ?? 0));
            $priority += max(0, (int)($row['reservation_priority'] ?? $row['priority'] ?? 0));
            $ids[] = (int)($row['table_id'] ?? 0);
        }
        sort($ids, SORT_NUMERIC);
        return [count($rows), max(0, $capacity - $guestCount), $priority, implode(',', $ids)];
    }

    protected function pmdComposerBestMerge(array $rows, int $guestCount, array $anchorRows = []): array
    {
        $guestCount = max(1, $guestCount);
        $anchorIds = [];
        $baseCapacity = 0;
        foreach ($anchorRows as $row) {
            $id = (int)($row['table_id'] ?? 0);
            if ($id > 0) $anchorIds[$id] = true;
            $baseCapacity += max(0, (int)($row['max_capacity'] ?? 0));
        }

        if ($anchorRows && $baseCapacity >= $guestCount) {
            return $anchorRows;
        }

        $pool = array_values(array_filter($rows, function ($row) use ($anchorIds) {
            $id = (int)($row['table_id'] ?? 0);
            return $id > 0
                && !isset($anchorIds[$id])
                && !empty($row['is_joinable'])
                && max(0, (int)($row['max_capacity'] ?? 0)) > 0;
        }));

        usort($pool, function ($a, $b) {
            $priority = ((int)($a['reservation_priority'] ?? $a['priority'] ?? 0))
                <=> ((int)($b['reservation_priority'] ?? $b['priority'] ?? 0));
            if ($priority !== 0) return $priority;
            $capacity = ((int)($b['max_capacity'] ?? 0)) <=> ((int)($a['max_capacity'] ?? 0));
            if ($capacity !== 0) return $capacity;
            return ((int)($a['table_id'] ?? 0)) <=> ((int)($b['table_id'] ?? 0));
        });
        $pool = array_slice($pool, 0, 14);

        $best = null;
        $bestScore = null;
        $maxAdditional = 4;
        $count = count($pool);

        $search = function ($index, $chosen, $capacity) use (&$search, &$best, &$bestScore, $pool, $count, $maxAdditional, $guestCount, $anchorRows) {
            $all = array_merge($anchorRows, $chosen);
            if ($capacity >= $guestCount && count($all) >= 2) {
                $score = $this->pmdComposerCombinationScore($all, $guestCount);
                $better = $bestScore === null;
                if (!$better) {
                    for ($i = 0; $i < 4; $i++) {
                        if ($score[$i] == $bestScore[$i]) continue;
                        $better = $score[$i] < $bestScore[$i];
                        break;
                    }
                }
                if ($better) {
                    $bestScore = $score;
                    $best = $all;
                }
                return;
            }
            if ($index >= $count || count($chosen) >= $maxAdditional) return;

            for ($i = $index; $i < $count; $i++) {
                $row = $pool[$i];
                $next = $chosen;
                $next[] = $row;
                $search(
                    $i + 1,
                    $next,
                    $capacity + max(0, (int)($row['max_capacity'] ?? 0))
                );
            }
        };

        $search(0, [], $baseCapacity);
        return $best ?: [];
    }

    protected function pmdComposerBestFloorPlan(array $rows, int $guestCount, array $anchorIds = []): array
    {
        $guestCount = max(1, $guestCount);
        $byId = [];
        foreach ($rows as $row) {
            $id = (int)($row['table_id'] ?? 0);
            if ($id > 0) $byId[$id] = $row;
        }

        $anchorIds = $this->pmdPositiveTableIds($anchorIds);
        $anchorRows = [];
        $anchorComplete = true;
        foreach ($anchorIds as $id) {
            if (!isset($byId[$id])) {
                $anchorComplete = false;
                break;
            }
            $anchorRows[] = $byId[$id];
        }

        if ($anchorIds && $anchorComplete) {
            if (count($anchorRows) === 1) {
                $row = $anchorRows[0];
                if ((int)$row['min_capacity'] <= $guestCount && (int)$row['max_capacity'] >= $guestCount) {
                    return ['rows' => $anchorRows, 'kind' => 'keep', 'anchor_kept' => true];
                }
            } else {
                $capacity = array_sum(array_map(function ($row) {
                    return max(0, (int)($row['max_capacity'] ?? 0));
                }, $anchorRows));
                $anchorJoinable = !array_filter($anchorRows, function ($row) {
                    return empty($row['is_joinable']);
                });
                if ($capacity >= $guestCount && $anchorJoinable) {
                    return ['rows' => $anchorRows, 'kind' => 'keep-merge', 'anchor_kept' => true];
                }
            }

            $allJoinable = !array_filter($anchorRows, function ($row) {
                return empty($row['is_joinable']);
            });
            if ($allJoinable) {
                $expanded = $this->pmdComposerBestMerge($rows, $guestCount, $anchorRows);
                if ($expanded) {
                    return ['rows' => $expanded, 'kind' => 'expand', 'anchor_kept' => true];
                }
            }
        }

        $single = array_values(array_filter($rows, function ($row) use ($guestCount) {
            return (int)($row['min_capacity'] ?? 0) <= $guestCount
                && (int)($row['max_capacity'] ?? 0) >= $guestCount;
        }));
        usort($single, function ($a, $b) use ($guestCount) {
            $aw = max(0, (int)$a['max_capacity'] - $guestCount);
            $bw = max(0, (int)$b['max_capacity'] - $guestCount);
            if ($aw !== $bw) return $aw <=> $bw;
            $ap = (int)($a['reservation_priority'] ?? $a['priority'] ?? 0);
            $bp = (int)($b['reservation_priority'] ?? $b['priority'] ?? 0);
            if ($ap !== $bp) return $ap <=> $bp;
            return (int)$a['table_id'] <=> (int)$b['table_id'];
        });
        if ($single) {
            return [
                'rows' => [$single[0]],
                'kind' => $anchorIds ? 'replace' : 'single',
                'anchor_kept' => false,
            ];
        }

        $merged = $this->pmdComposerBestMerge($rows, $guestCount, []);
        if ($merged) {
            return [
                'rows' => $merged,
                'kind' => $anchorIds ? 'replace-merge' : 'merge',
                'anchor_kept' => false,
            ];
        }

        return ['rows' => [], 'kind' => 'none', 'anchor_kept' => false];
    }

    protected function pmdComposerRecommendationPlan(
        array $availableIds,
        int $guestCount,
        array $data,
        array $anchorIds = []
    ): array {
        $locationId = $this->pmdComposerLocationId($data);
        $requiredFeatures = $this->pmdComposerRequestedFeatures($data);
        $anchorIds = $this->pmdPositiveTableIds($anchorIds);
        $candidateIds = $this->pmdPositiveTableIds(array_merge($availableIds, $anchorIds));
        $meta = $this->pmdComposerTableMeta($locationId, $candidateIds);

        $eligible = [];
        foreach ($meta as $id => $row) {
            if (empty($row['table_status']) || empty($row['reservable'])) continue;
            if (!$this->pmdComposerTableMatchesFeatures($row, $requiredFeatures)) continue;
            $eligible[$id] = $row;
        }

        $preferredFloorId = trim((string)($data['pmd_floor_id'] ?? ''));
        $preferredFloorName = trim((string)($data['pmd_floor_name'] ?? ''));
        $floorLocked = !empty($data['pmd_floor_locked']);
        $anchorFloorId = '';
        $anchorFloorName = '';
        $anchorFloors = [];

        foreach ($anchorIds as $id) {
            $row = $meta[$id] ?? null;
            if (!$row) continue;
            $fid = (string)($row['floor_id'] ?? '');
            if ($fid !== '') $anchorFloors[$fid] = (string)($row['floor_name'] ?? 'Main Floor');
        }
        if (count($anchorFloors) === 1) {
            $anchorFloorId = (string)array_key_first($anchorFloors);
            $anchorFloorName = (string)$anchorFloors[$anchorFloorId];
            $preferredFloorId = $anchorFloorId;
            $preferredFloorName = $anchorFloorName;
            $floorLocked = true;
        } elseif (count($anchorFloors) > 1) {
            return [
                'ids' => [],
                'kind' => 'cross-floor-selection',
                'floor_id' => '',
                'floor_name' => '',
                'anchor_kept' => false,
                'required_features' => $requiredFeatures,
                'message' => 'Selected tables are on different Floors. Tables can only be combined inside one Floor.',
            ];
        }

        $groups = [];
        foreach ($eligible as $row) {
            $floorId = (string)($row['floor_id'] ?? 'main-floor');
            if ($floorLocked && $preferredFloorId !== '' && $floorId !== $preferredFloorId) continue;
            if (!isset($groups[$floorId])) {
                $groups[$floorId] = [
                    'id' => $floorId,
                    'name' => (string)($row['floor_name'] ?? 'Main Floor'),
                    'rows' => [],
                ];
            }
            $groups[$floorId]['rows'][] = $row;
        }

        $ordered = [];
        if ($preferredFloorId !== '' && isset($groups[$preferredFloorId])) {
            $ordered[] = $groups[$preferredFloorId];
            unset($groups[$preferredFloorId]);
        }
        foreach ($groups as $group) $ordered[] = $group;

        foreach ($ordered as $group) {
            $groupAnchorIds = [];
            if ($anchorIds && (!$anchorFloorId || $anchorFloorId === $group['id'])) {
                $groupAnchorIds = $anchorIds;
            }
            $plan = $this->pmdComposerBestFloorPlan($group['rows'], $guestCount, $groupAnchorIds);
            $rows = (array)($plan['rows'] ?? []);
            if (!$rows) continue;

            $ids = array_values(array_map(function ($row) {
                return (int)$row['table_id'];
            }, $rows));
            $names = array_values(array_map(function ($row) {
                return (string)$row['table_name'];
            }, $rows));
            $kind = (string)($plan['kind'] ?? 'single');
            $anchorKept = !empty($plan['anchor_kept']);

            if ($anchorIds) {
                if ($kind === 'keep' || $kind === 'keep-merge') {
                    $message = implode(' + ', $names).' still fits '.$guestCount.' guest'.($guestCount === 1 ? '' : 's').' on '.$group['name'].'.';
                } elseif ($kind === 'expand') {
                    $addedNames = [];
                    foreach ($rows as $row) {
                        if (!in_array((int)$row['table_id'], $anchorIds, true)) {
                            $addedNames[] = (string)$row['table_name'];
                        }
                    }
                    $message = 'Keep the selected table'.(count($anchorIds) > 1 ? 's' : '').' and add '.implode(' + ', $addedNames).' on '.$group['name'].' for '.$guestCount.' guests.';
                } else {
                    $message = 'The selected table no longer fits this request. Suggested on '.$group['name'].': '.implode(' + ', $names).'.';
                }
            } else {
                $message = 'Suggested on '.$group['name'].': '.implode(' + ', $names).'.';
            }

            return [
                'ids' => $ids,
                'kind' => $kind,
                'floor_id' => (string)$group['id'],
                'floor_name' => (string)$group['name'],
                'anchor_kept' => $anchorKept,
                'required_features' => $requiredFeatures,
                'message' => $message,
            ];
        }

        $featureSuffix = $requiredFeatures ? ' with the selected table preferences' : '';
        $floorSuffix = $floorLocked && ($preferredFloorName || $anchorFloorName)
            ? ' on '.($preferredFloorName ?: $anchorFloorName)
            : '';
        return [
            'ids' => [],
            'kind' => 'none',
            'floor_id' => $preferredFloorId,
            'floor_name' => $preferredFloorName,
            'anchor_kept' => false,
            'required_features' => $requiredFeatures,
            'message' => 'No same-Floor table or merge matches '.$guestCount.' guest'.($guestCount === 1 ? '' : 's').$featureSuffix.$floorSuffix.'.',
        ];
    }

    protected function pmdFilterComposerAvailabilityConflicts($response, array $data)
    {
        $payload = $this->pmdComposerResponsePayload($response);
        if (!is_array($payload)
            || !isset($payload['availability'])
            || !is_array($payload['availability'])) {
            return $response;
        }

        $availability = $payload['availability'];
        $blocked = $this->pmdComposerConflictingTableIds($data);
        $blockedMap = array_fill_keys($blocked, true);
        $mode = (string)($data['assignment_mode'] ?? ($availability['assignmentMode'] ?? 'auto'));
        $requested = $this->pmdPositiveTableIds(
            $data['tables'] ?? ($availability['requestedTableIds'] ?? [])
        );
        $locationId = $this->pmdComposerLocationId($data);
        $requiredFeatures = $this->pmdComposerRequestedFeatures($data);

        foreach (['availableTableIds', 'manualAvailableTableIds'] as $key) {
            if (!isset($availability[$key]) || !is_array($availability[$key])) continue;
            $ids = array_values(array_filter(
                $this->pmdPositiveTableIds($availability[$key]),
                function ($id) use ($blockedMap) { return !isset($blockedMap[$id]); }
            ));
            $meta = $this->pmdComposerTableMeta($locationId, $ids);
            $floorLocked = !empty($data['pmd_floor_locked']);
            $floorId = trim((string)($data['pmd_floor_id'] ?? ''));
            $ids = array_values(array_filter($ids, function ($id) use ($meta, $requiredFeatures, $floorLocked, $floorId) {
                $row = $meta[$id] ?? null;
                if (!$row || empty($row['table_status']) || empty($row['reservable'])) return false;
                if (!$this->pmdComposerTableMatchesFeatures($row, $requiredFeatures)) return false;
                if ($floorLocked && $floorId !== '' && (string)$row['floor_id'] !== $floorId) return false;
                return true;
            }));
            $availability[$key] = $ids;
        }

        $manualIds = $this->pmdPositiveTableIds(
            $availability['manualAvailableTableIds']
                ?? $availability['availableTableIds']
                ?? []
        );
        $plan = $this->pmdComposerRecommendationPlan(
            $manualIds,
            max(1, (int)($data['guest_num'] ?? 1)),
            $data,
            $mode === 'choose' ? $requested : []
        );

        // One recommendation authority for every Composer state. Even while a
        // Floor-selected table is in CHOOSE mode, the visible Auto suggestion
        // must remain same-Floor and feature-aware; never leak a cross-Floor
        // recommendation from the older canonical allocator.
        $recommended = $this->pmdPositiveTableIds($plan['ids'] ?? []);

        if ($mode === 'choose') {
            $availability['pmdSelectedTableSuggestionIds'] = $this->pmdPositiveTableIds($plan['ids'] ?? []);
            $availability['pmdSelectedTableSuggestionKind'] = (string)($plan['kind'] ?? 'none');
            $availability['pmdSelectedTableCanKeep'] = !empty($plan['anchor_kept']);
        }

        $availability['recommendedTableIds'] = $recommended;
        $availability['blockedTableIds'] = $blocked;
        $availability['pmdFloorAware'] = true;
        $availability['pmdRecommendationFloorId'] = (string)($plan['floor_id'] ?? '');
        $availability['pmdRecommendationFloorName'] = (string)($plan['floor_name'] ?? '');
        $availability['pmdRequiredFeatures'] = array_values((array)($plan['required_features'] ?? $requiredFeatures));
        $availability['pmdPolicyMessage'] = (string)($plan['message'] ?? '');

        if ($mode === 'choose') {
            $selectedMeta = $this->pmdComposerTableMeta($locationId, $requested);
            $selectedFloors = [];
            $selectedFeatureMismatch = false;
            foreach ($requested as $id) {
                $row = $selectedMeta[$id] ?? null;
                if (!$row) continue;
                $selectedFloors[(string)$row['floor_id']] = true;
                if (!$this->pmdComposerTableMatchesFeatures($row, $requiredFeatures)) {
                    $selectedFeatureMismatch = true;
                }
            }
            $selectionKind = (string)($plan['kind'] ?? 'none');
            $selectionStillFits = in_array($selectionKind, ['keep', 'keep-merge'], true);
            if (array_intersect($requested, $blocked)
                || count($selectedFloors) > 1
                || $selectedFeatureMismatch
                || !$selectionStillFits) {
                $availability['available'] = false;
            }
        } elseif (!$recommended) {
            $availability['available'] = false;
        } else {
            $availability['available'] = true;
        }

        $payload['availability'] = $availability;
        return $this->pmdComposerResponseApplyPayload($response, $payload);
    }

    protected function pmdGuardComposerSelectedTables(array $data): void
    {
        $mode = (string)($data['assignment_mode'] ?? 'auto');
        if ($mode !== 'choose') return;

        $selected = $this->pmdPositiveTableIds($data['tables'] ?? []);
        if (!$selected) return;

        $blocked = $this->pmdComposerConflictingTableIds($data);
        if (array_intersect($selected, $blocked)) {
            throw ValidationException::withMessages([
                'tables' => 'One or more selected tables are already reserved during this reservation time.',
            ]);
        }

        $meta = $this->pmdComposerTableMeta($this->pmdComposerLocationId($data), $selected);
        $floors = [];
        $requiredFeatures = $this->pmdComposerRequestedFeatures($data);
        foreach ($selected as $id) {
            $row = $meta[$id] ?? null;
            if (!$row) continue;
            $floors[(string)$row['floor_id']] = true;
            if (!$this->pmdComposerTableMatchesFeatures($row, $requiredFeatures)) {
                throw ValidationException::withMessages([
                    'tables' => 'The selected table does not match the requested table preferences.',
                ]);
            }
        }

        if (count($floors) > 1) {
            throw ValidationException::withMessages([
                'tables' => 'Selected tables must be on the same Floor. Cross-Floor table merges are not allowed.',
            ]);
        }

        if (count($selected) > 1) {
            foreach ($selected as $id) {
                if (empty($meta[$id]['is_joinable'])) {
                    throw ValidationException::withMessages([
                        'tables' => 'One or more selected tables cannot be joined for a reservation.',
                    ]);
                }
            }
        }
    }

    protected function pmdPrepareAutoAssignment(array $data): array
    {
        if ((string)($data['assignment_mode'] ?? 'auto') !== 'auto') {
            return $data;
        }

        $response = app(ReservationComposerService::class)->availability($data);
        $response = $this->pmdFilterComposerAvailabilityConflicts($response, $data);
        $payload = $this->pmdComposerResponsePayload($response) ?? [];
        $availability = isset($payload['availability']) && is_array($payload['availability'])
            ? $payload['availability']
            : [];
        $recommended = $this->pmdPositiveTableIds($availability['recommendedTableIds'] ?? []);

        if (!$recommended) {
            throw ValidationException::withMessages([
                'tables' => 'No conflict-free table is available for this reservation time.',
            ]);
        }

        // Let the existing canonical save service persist the exact conflict-free
        // recommendation as an explicit table choice. No second allocation engine.
        $data['assignment_mode'] = 'choose';
        $data['tables'] = $recommended;
        return $data;
    }

    public function onLoadReservationComposer()
    {
        $data = request()->all();
        $response = app(ReservationComposerService::class)->load($data);
        $payload = $this->pmdComposerResponsePayload($response);

        if (is_array($payload)) {
            $locationId = $this->pmdComposerLocationId($data);
            if ($locationId < 1) {
                $locationId = (int)($payload['locationId'] ?? $payload['location_id'] ?? 0);
            }
            $payload['pmdOpeningHours'] = $this->pmdComposerOpeningHours($locationId);

            $tableIds = [];
            foreach ((array)($payload['tables'] ?? []) as $table) {
                if (is_array($table)) {
                    $tableIds[] = (int)($table['table_id'] ?? 0);
                } elseif (is_object($table)) {
                    $tableIds[] = (int)($table->table_id ?? 0);
                }
            }
            $tableMeta = $this->pmdComposerTableMeta($locationId, $tableIds);
            $payload['pmdTableMeta'] = $tableMeta;
            $payload['pmdTableFeatureOptions'] = $this->pmdComposerFeatureOptions($tableMeta);
            $payload['pmdFloorAwareTableFinder'] = true;
            $payload['pmdPolicyTransportNormalized'] = !is_array($response);

            return $this->pmdComposerResponseApplyPayload($response, $payload);
        }

        return $response;
    }

    public function onCheckReservationAvailability()
    {
        $data = request()->all();
        $this->pmdGuardComposerCreateNotPast($data);
        $this->pmdGuardComposerOpeningHours($data);

        $response = app(ReservationComposerService::class)->availability($data);
        return $this->pmdFilterComposerAvailabilityConflicts($response, $data);
    }

    public function onSaveReservationComposer()
    {
        $data = request()->all();
        $this->pmdGuardComposerCreateNotPast($data);
        $this->pmdGuardComposerOpeningHours($data);
        $this->pmdGuardComposerSelectedTables($data);
        $data = $this->pmdPrepareAutoAssignment($data);

        return app(ReservationComposerService::class)->save($data);
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
