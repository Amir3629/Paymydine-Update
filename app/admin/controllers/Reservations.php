<?php

namespace Admin\Controllers;

use Admin\ActivityTypes\StatusUpdated;
use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Facades\AdminLocation;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Admin\Models\Tables_model;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdReservationsScheduleV1;
use Admin\Services\ReservationComposerService;
use Admin\Services\PmdSharedFloorRegistryV1;
use Carbon\Carbon;
use Exception;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/** Canonical PayMyDine Reservations workspace and reservation write surface. */
class Reservations extends PmdCleanWorkspaceControllerV1
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\CalendarController',
        'Admin\Actions\FormController',
        'Admin\Actions\AssigneeController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Reservations_model',
            'title' => 'lang:admin::lang.reservations.text_title',
            'emptyMessage' => 'lang:admin::lang.reservations.text_empty',
            'defaultSort' => ['reservation_id', 'DESC'],
            'configFile' => 'reservations_model',
        ],
    ];

    public $calendarConfig = [
        'calender' => [
            'title' => 'lang:admin::lang.reservations.text_title',
            'emptyMessage' => 'lang:admin::lang.reservations.text_no_booking',
            'popoverPartial' => 'reservations/calendar_popover',
            'configFile' => 'reservations_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.reservations.text_form_name',
        'model' => 'Admin\Models\Reservations_model',
        'request' => 'Admin\Requests\Reservation',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'reservations/edit/{reservation_id}',
            'redirectClose' => 'reservations',
            'redirectNew' => 'reservations/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'reservations/edit/{reservation_id}',
            'redirectClose' => 'reservations',
            'redirectNew' => 'reservations/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'reservations',
        ],
        'delete' => [
            'redirect' => 'reservations',
        ],
        'configFile' => 'reservations_model',
    ];


    protected $requiredPermissions = [
        'Admin.Reservations',
        'Admin.AssignReservations',
        'Admin.DeleteReservations',
        'PMD.Workspace.Cashier',
    ];

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-reservations-schedule-v1.css');
        $this->addCss('css/pmd-cashier-lab-orders-v1.css');
        $this->addJs('js/pmd-reservations-table-card-filter-v1.js');
    }

    protected function pmdWorkspaceKey(): string { return 'reservations'; }
    protected function pmdWorkspacePath(): string { return '/admin/reservations'; }
    protected function pmdWorkspaceView(): string { return 'reservations/index'; }
    protected function pmdKpiMode(): string { return 'reservations'; }
    protected function pmdKpiDefaults(): array
    {
        return ['reservations_today', 'upcoming_arrivals', 'available_tables', 'table_occupancy'];
    }
    protected function pmdMenuContext(): array { return ['reservations', 'sales']; }
    protected function pmdAfterFloorPartial(): ?string { return 'admin::_partials.pmd_reservations_schedule_v1'; }
    protected function pmdBelowFloorPartial(): ?string { return 'admin::_partials.pmd_reservations_cards_v1'; }

    protected function pmdPrepareWorkspaceVars(
        PmdCleanWorkspaceSharedV1 $shared,
        string $locale,
        array $floorBootstrap
    ): void {
        $locationId = $shared->locationId();

        $schedule =
            app(PmdReservationsScheduleV1::class)
                ->payload($locationId, $locale);

        $this->vars['pmdReservationsSchedule'] =
            $schedule;

        /*
         * PMD_RESERVATION_COMPOSER_SERVER_PRIMER_R11
         *
         * Build the normal New-reservation payload while the Reservations page
         * itself is rendering. The browser therefore receives date, canonical
         * time, table catalogue and first recommendation in the HTML response.
         * Opening the modal no longer needs to wait for an Ajax primer.
         */
        $activeFloor = (array)(
            $this->vars['pmdCleanWorkspaceFloorActive']
            ?? []
        );

        $bootstrapContext = [
            'mode' => 'create',
            'source' => 'server-first-paint',
            'selected_date' => (string)(
                $schedule['today']
                ?? Carbon::now('Europe/Berlin')->toDateString()
            ),
            'selected_time' => '',
            'table_ids' => [],
            'location_id' => $locationId,
            'pmd_floor_id' => trim((string)(
                $activeFloor['id']
                ?? ''
            )),
            'pmd_floor_name' => trim((string)(
                $activeFloor['name']
                ?? ''
            )),
            'pmd_floor_locked' => 0,
        ];

        $this->vars['pmdReservationComposerInitialCreate'] =
            null;

        if ((string)request()->query('pmd_live', '') !== '1') {
            try {
                $this->vars['pmdReservationComposerInitialCreate'] =
                    $this->pmdComposerBuildLoadPayload(
                        $bootstrapContext
                    );
            } catch (Throwable $error) {
                $this->vars['pmdReservationComposerInitialCreate'] =
                    null;
            }
        }
    }

    public function index_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteReservations'))
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));

        return $this->asExtension('Admin\Actions\ListController')->index_onDelete();
    }

    public function index_onUpdateStatus()
    {
        $model = Reservations_model::find((int)post('recordId'));
        $status = Statuses_model::find((int)post('statusId'));
        if (!$model || !$status)
            return;

        if ($record = $model->addStatusHistory($status))
            StatusUpdated::log($record, $this->getUser());

        flash()->success(sprintf(lang('admin::lang.alert_success'), lang('admin::lang.statuses.text_form_name').' updated'))->now();

        return $this->redirectBack();
    }

    public function edit_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteReservations'))
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));

        return $this->asExtension('Admin\Actions\FormController')->edit_onDelete();
    }

    public function calendarGenerateEvents($startAt, $endAt)
    {
        return Reservations_model::listCalendarEvents(
            $startAt, $endAt, $this->getLocationId()
        );
    }

    public function calendarUpdateEvent($eventId, $startAt, $endAt)
    {
        if (!$reservation = Reservations_model::find($eventId))
            throw new Exception(lang('admin::lang.reservations.alert_no_reservation_found'));

        $startAt = make_carbon($startAt);
        $endAt = make_carbon($endAt);

        $reservation->duration = $startAt->diffInMinutes($endAt);
        $reservation->reserve_date = $startAt->toDateString();
        $reservation->reserve_time = $startAt->toTimeString();

        $reservation->save();
    }

    public function formExtendQuery($query)
    {
        $query->with([
            'status_history' => function ($q) {
                $q->orderBy('created_at', 'desc');
            },
            'status_history.staff',
            'status_history.status',
        ]);
    }

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

    protected function pmdComposerCanonicalCreateDateTime(
        int $locationId,
        string $date,
        string $time,
        int $duration
    ): array {
        $duration = max(1, $duration);
        $hours = $this->pmdComposerOpeningHours($locationId);
        $now = Carbon::now('Europe/Berlin');

        $rawMinutes =
            ((int)$now->hour * 60)
            + (int)$now->minute
            + ((int)$now->second > 0 ? 1 : 0);

        $minimumMinutes =
            (int)(ceil($rawMinutes / 15) * 15);

        $minimumDate =
            $now->toDateString();

        if ($minimumMinutes >= 1440) {
            $minimumDate =
                $now->copy()->addDay()->toDateString();
            $minimumMinutes = 0;
        }

        if (
            !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || $date < $minimumDate
        ) {
            $date = $minimumDate;
        }

        $byWeekday = [];
        foreach ($hours as $row) {
            $weekday = (int)($row['weekday'] ?? -1);
            if ($weekday >= 0 && $weekday <= 6) {
                $byWeekday[$weekday] = $row;
            }
        }

        $clockMinutes = static function (string $value): ?int {
            if (!preg_match(
                '/^([01]\d|2[0-3]):([0-5]\d)$/',
                substr(trim($value), 0, 5),
                $match
            )) {
                return null;
            }

            return
                ((int)$match[1] * 60)
                + (int)$match[2];
        };

        $openingAllows = function (
            string $candidateDate,
            int $minute
        ) use (
            $hours,
            $byWeekday,
            $clockMinutes,
            $duration
        ): bool {
            if (!$hours) {
                return true;
            }

            try {
                $requestedStart =
                    Carbon::createFromFormat(
                        '!Y-m-d H:i',
                        $candidateDate.' '
                        .sprintf(
                            '%02d:%02d',
                            intdiv($minute, 60),
                            $minute % 60
                        ),
                        'Europe/Berlin'
                    );
            } catch (Throwable $error) {
                return false;
            }

            $requestedEnd =
                $requestedStart
                    ->copy()
                    ->addMinutes($duration);

            foreach ([
                $requestedStart->copy()->startOfDay(),
                $requestedStart->copy()->subDay()->startOfDay(),
            ] as $serviceDate) {
                $weekday =
                    ((int)$serviceDate->isoWeekday()) - 1;

                $row =
                    $byWeekday[$weekday]
                    ?? null;

                if (
                    !$row
                    || empty($row['enabled'])
                ) {
                    continue;
                }

                $opening =
                    substr(
                        (string)($row['opening_time'] ?? ''),
                        0,
                        5
                    );

                $closing =
                    substr(
                        (string)($row['closing_time'] ?? ''),
                        0,
                        5
                    );

                if (
                    $clockMinutes($opening) === null
                    || $clockMinutes($closing) === null
                ) {
                    continue;
                }

                $windowStart =
                    Carbon::createFromFormat(
                        '!Y-m-d H:i',
                        $serviceDate->format('Y-m-d')
                        .' '.$opening,
                        'Europe/Berlin'
                    );

                $windowEnd =
                    Carbon::createFromFormat(
                        '!Y-m-d H:i',
                        $serviceDate->format('Y-m-d')
                        .' '.$closing,
                        'Europe/Berlin'
                    );

                if ($opening === $closing) {
                    $windowStart =
                        $serviceDate->copy();
                    $windowEnd =
                        $serviceDate
                            ->copy()
                            ->addDay();
                } elseif ($windowEnd->lte($windowStart)) {
                    $windowEnd->addDay();
                }

                if (
                    $requestedStart->gte($windowStart)
                    && $requestedEnd->lte($windowEnd)
                ) {
                    return true;
                }
            }

            return false;
        };

        $allowed = [];
        for ($minute = 0; $minute < 1440; $minute += 15) {
            if (
                $date === $minimumDate
                && $minute < $minimumMinutes
            ) {
                continue;
            }

            if (!$openingAllows($date, $minute)) {
                continue;
            }

            $allowed[] = $minute;
        }

        if (!$allowed) {
            return [
                'date' => $date,
                'time' => '',
            ];
        }

        $target =
            $clockMinutes($time);

        $selected =
            $allowed[0];

        if ($target !== null) {
            $bestDistance =
                abs($selected - $target);

            foreach ($allowed as $candidate) {
                $distance =
                    abs($candidate - $target);

                if ($distance < $bestDistance) {
                    $selected = $candidate;
                    $bestDistance = $distance;
                }
            }
        }

        return [
            'date' => $date,
            'time' => sprintf(
                '%02d:%02d',
                intdiv($selected, 60),
                $selected % 60
            ),
        ];
    }

    protected function pmdComposerDecorateLoadPayload(
        array $payload,
        array $data
    ): array {
        $locationId =
            $this->pmdComposerLocationId($data);

        if ($locationId < 1) {
            $locationId = (int)(
                $payload['locationId']
                ?? $payload['location_id']
                ?? 0
            );
        }

        $openingHours =
            $this->pmdComposerOpeningHours(
                $locationId
            );

        $payload['pmdOpeningHours'] =
            $openingHours;

        $tableIds = [];
        foreach ((array)($payload['tables'] ?? []) as $table) {
            if (is_array($table)) {
                $tableIds[] =
                    (int)($table['table_id'] ?? 0);
            } elseif (is_object($table)) {
                $tableIds[] =
                    (int)($table->table_id ?? 0);
            }
        }

        $tableMeta =
            $this->pmdComposerTableMeta(
                $locationId,
                $tableIds
            );

        $payload['pmdTableMeta'] =
            $tableMeta;

        $payload['pmdTableFeatureOptions'] =
            $this->pmdComposerFeatureOptions(
                $tableMeta
            );

        $payload['pmdFloorAwareTableFinder'] = true;

        $isEdit =
            (int)($data['reservation_id'] ?? 0) > 0
            || is_array($payload['reservation'] ?? null);

        if ($isEdit) {
            return $payload;
        }

        $values =
            is_array($payload['defaults'] ?? null)
                ? $payload['defaults']
                : [];

        $date =
            trim((string)(
                $data['selected_date']
                ?? $values['reserve_date']
                ?? Carbon::now('Europe/Berlin')->toDateString()
            ));

        $requestedTime =
            substr(
                trim((string)(
                    $data['selected_time']
                    ?? $values['reserve_time']
                    ?? ''
                )),
                0,
                5
            );

        $duration =
            max(
                1,
                (int)($values['duration'] ?? 45)
            );

        $canonical =
            $this->pmdComposerCanonicalCreateDateTime(
                $locationId,
                $date,
                $requestedTime,
                $duration
            );

        $values['reserve_date'] =
            $canonical['date'];

        $values['reserve_time'] =
            $canonical['time'];

        $values['duration'] =
            $duration;

        $values['guest_num'] =
            max(
                1,
                (int)($values['guest_num'] ?? 1)
            );

        $values['location_id'] =
            $locationId;

        $payload['defaults'] =
            $values;

        $contextTableIds =
            $this->pmdPositiveTableIds(
                $data['table_ids']
                ?? []
            );

        $initialAvailabilityInput =
            array_merge(
                $data,
                [
                    'guest_num' =>
                        $values['guest_num'],
                    'reserve_date' =>
                        $values['reserve_date'],
                    'reserve_time' =>
                        $values['reserve_time'],
                    'duration' =>
                        $duration,
                    'assignment_mode' =>
                        $contextTableIds
                            ? 'choose'
                            : 'auto',
                    'tables' =>
                        $contextTableIds,
                    'pmd_table_features' =>
                        $this->pmdComposerNormalizeFeatures(
                            $values['pmd_table_features']
                            ?? []
                        ),
                    'location_id' =>
                        $locationId,
                ]
            );

        unset(
            $initialAvailabilityInput[
                'reservation_id'
            ]
        );

        $payload['pmdInitialAvailability'] =
            null;

        $payload['pmdInitialAvailabilityInput'] =
            $initialAvailabilityInput;

        $payload['pmdServerPrimerContext'] = [
            'selected_date' =>
                $values['reserve_date'],
            'selected_time' => '',
            'floor_id' =>
                trim((string)(
                    $data['pmd_floor_id']
                    ?? ''
                )),
            'floor_name' =>
                trim((string)(
                    $data['pmd_floor_name']
                    ?? ''
                )),
            'floor_locked' =>
                !empty($data['pmd_floor_locked'])
                    ? 1
                    : 0,
            'table_ids' =>
                $contextTableIds,
        ];

        if ($values['reserve_time'] === '') {
            return $payload;
        }

        try {
            $initialAvailabilityResponse =
                app(ReservationComposerService::class)
                    ->availability(
                        $initialAvailabilityInput
                    );

            $initialAvailabilityResponse =
                $this->pmdFilterComposerAvailabilityConflicts(
                    $initialAvailabilityResponse,
                    $initialAvailabilityInput
                );

            $initialAvailabilityPayload =
                $this->pmdComposerResponsePayload(
                    $initialAvailabilityResponse
                );

            if (
                is_array($initialAvailabilityPayload)
                && isset(
                    $initialAvailabilityPayload[
                        'availability'
                    ]
                )
                && is_array(
                    $initialAvailabilityPayload[
                        'availability'
                    ]
                )
            ) {
                $payload['pmdInitialAvailability'] =
                    $initialAvailabilityPayload[
                        'availability'
                    ];
            }
        } catch (Throwable $error) {
            // The normal event-driven availability request remains fallback.
        }

        return $payload;
    }

    protected function pmdComposerBuildLoadPayload(
        array $data
    ): ?array {
        $response =
            app(ReservationComposerService::class)
                ->load($data);

        $payload =
            $this->pmdComposerResponsePayload(
                $response
            );

        if (!is_array($payload)) {
            return null;
        }

        return
            $this->pmdComposerDecorateLoadPayload(
                $payload,
                $data
            );
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

        $response =
            app(ReservationComposerService::class)
                ->load($data);

        $payload =
            $this->pmdComposerResponsePayload(
                $response
            );

        if (!is_array($payload)) {
            return $response;
        }

        $payload =
            $this->pmdComposerDecorateLoadPayload(
                $payload,
                $data
            );

        $payload['pmdPolicyTransportNormalized'] =
            !is_array($response);

        return
            $this->pmdComposerResponseApplyPayload(
                $response,
                $payload
            );
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


}
