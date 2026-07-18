<?php

namespace Admin\Controllers;

use Admin\ActivityTypes\StatusUpdated;
use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Exception;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Reservations extends \Admin\Classes\AdminController
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
    ];

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('reservations', 'sales');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();

        $this->vars['statusesOptions'] = \Admin\Models\Statuses_model::getDropdownOptionsForReservation();

        /*
         * PMD Reservation Workspace V2
         * Read-only data for the operational list + floor map.
         */
        $this->vars['pmdReservationWorkspaceData'] =
            $this->pmdReservationWorkspaceData();
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

    /**
     * Read-only data contract for the PMD reservation workspace.
     *
     * This intentionally uses schema inspection because installations may
     * contain slightly different reservation and table column names.
     */
    protected function pmdReservationWorkspaceData()
    {
        $result = [
            'generated_at' => date('c'),
            'date' => date('Y-m-d'),
            'reservations' => [],
            'tables' => [],
            'areas' => [],
            'stats' => [
                'today' => 0,
                'guests' => 0,
                'active' => 0,
                'assigned_tables' => 0,
            ],
            'sources' => [
                'reservations' => Schema::hasTable('reservations')
                    ? 'reservations'
                    : null,
                'tables' => Schema::hasTable('tables')
                    ? 'tables'
                    : null,
                'reservation_tables' => Schema::hasTable('reservation_tables')
                    ? 'reservation_tables'
                    : null,
            ],
        ];

        try {
            if (Schema::hasTable('reservations')) {
                $columns = Schema::getColumnListing('reservations');

                $pick = function (array $names) use ($columns) {
                    foreach ($names as $name) {
                        if (in_array($name, $columns, true))
                            return $name;
                    }

                    return null;
                };

                $idColumn = $pick(['reservation_id', 'id']);
                $dateColumn = $pick([
                    'reserve_date',
                    'reservation_date',
                    'booking_date',
                    'date',
                    'created_at',
                ]);
                $timeColumn = $pick([
                    'reserve_time',
                    'reservation_time',
                    'booking_time',
                    'time',
                ]);
                $firstNameColumn = $pick([
                    'first_name',
                    'customer_first_name',
                    'guest_first_name',
                ]);
                $lastNameColumn = $pick([
                    'last_name',
                    'customer_last_name',
                    'guest_last_name',
                ]);
                $nameColumn = $pick([
                    'customer_name',
                    'guest_name',
                    'name',
                ]);
                $guestColumn = $pick([
                    'guest_num',
                    'guests',
                    'party_size',
                    'covers',
                    'number_of_guests',
                ]);
                $tableColumn = $pick([
                    'table_id',
                    'restaurant_table_id',
                ]);
                $statusColumn = $pick([
                    'status_id',
                    'status',
                    'reservation_status',
                    'state',
                ]);
                $noteColumn = $pick([
                    'comment',
                    'notes',
                    'note',
                    'special_requests',
                ]);
                $locationColumn = $pick([
                    'location_id',
                ]);

                $query = DB::table('reservations');

                if ($locationColumn && $this->getLocationId()) {
                    $query->where($locationColumn, $this->getLocationId());
                }

                if ($dateColumn) {
                    $query->whereDate($dateColumn, '>=', date('Y-m-d'));
                    $query->orderBy($dateColumn);
                }

                if ($timeColumn)
                    $query->orderBy($timeColumn);

                if ($idColumn)
                    $query->orderBy($idColumn);

                $rows = $query->limit(250)->get();

                $pivotMap = [];

                if (
                    Schema::hasTable('reservation_tables') &&
                    $idColumn
                ) {
                    $pivotColumns =
                        Schema::getColumnListing('reservation_tables');

                    if (
                        in_array('reservation_id', $pivotColumns, true) &&
                        in_array('table_id', $pivotColumns, true)
                    ) {
                        $reservationIds = $rows
                            ->pluck($idColumn)
                            ->filter()
                            ->values()
                            ->all();

                        if ($reservationIds) {
                            $pivotRows = DB::table('reservation_tables')
                                ->whereIn('reservation_id', $reservationIds)
                                ->get();

                            foreach ($pivotRows as $pivotRow) {
                                $pivotMap[(string)$pivotRow->reservation_id][] =
                                    (string)$pivotRow->table_id;
                            }
                        }
                    }
                }

                foreach ($rows as $row) {
                    $array = (array)$row;

                    $id = $idColumn
                        ? (string)($array[$idColumn] ?? '')
                        : '';

                    $firstName = $firstNameColumn
                        ? trim((string)($array[$firstNameColumn] ?? ''))
                        : '';

                    $lastName = $lastNameColumn
                        ? trim((string)($array[$lastNameColumn] ?? ''))
                        : '';

                    $name = trim($firstName.' '.$lastName);

                    if (!$name && $nameColumn)
                        $name = trim((string)($array[$nameColumn] ?? ''));

                    if (!$name)
                        $name = 'Guest';

                    $date = $dateColumn
                        ? (string)($array[$dateColumn] ?? '')
                        : date('Y-m-d');

                    $time = $timeColumn
                        ? substr((string)($array[$timeColumn] ?? ''), 0, 5)
                        : '';

                    $guests = $guestColumn
                        ? max(1, (int)($array[$guestColumn] ?? 1))
                        : 1;

                    $status = $statusColumn
                        ? strtolower(trim((string)($array[$statusColumn] ?? '')))
                        : '';

                    $notes = $noteColumn
                        ? trim((string)($array[$noteColumn] ?? ''))
                        : '';

                    $tableIds = [];

                    if ($tableColumn && !empty($array[$tableColumn]))
                        $tableIds[] = (string)$array[$tableColumn];

                    if ($id && isset($pivotMap[$id]))
                        $tableIds = array_merge(
                            $tableIds,
                            $pivotMap[$id]
                        );

                    $tableIds = array_values(array_unique($tableIds));

                    $isToday = $date &&
                        substr($date, 0, 10) === date('Y-m-d');

                    $isSeated =
                        strpos($status, 'seat') !== false ||
                        strpos($status, 'arriv') !== false ||
                        strpos($status, 'check') !== false;

                    $isCancelled =
                        strpos($status, 'cancel') !== false ||
                        strpos($status, 'declin') !== false ||
                        strpos($status, 'no show') !== false ||
                        strpos($status, 'noshow') !== false;

                    if ($isToday && !$isCancelled) {
                        $result['stats']['today']++;
                        $result['stats']['guests'] += $guests;

                        if ($isSeated)
                            $result['stats']['active']++;

                        if ($tableIds)
                            $result['stats']['assigned_tables'] += count($tableIds);
                    }

                    $result['reservations'][] = [
                        'id' => $id,
                        'date' => substr($date, 0, 10),
                        'time' => $time ?: '--:--',
                        'name' => $name,
                        'guests' => $guests,
                        'status' => $status ?: 'pending',
                        'notes' => $notes,
                        'table_ids' => $tableIds,
                        'group' => $isSeated
                            ? 'seated'
                            : ($isCancelled ? 'completed' : 'upcoming'),
                        'edit_url' => $id
                            ? admin_url('reservations/edit/'.$id)
                            : null,
                    ];
                }
            }
        }
        catch (\Throwable $exception) {
            $result['reservation_error'] = $exception->getMessage();
        }

        try {
            if (Schema::hasTable('tables')) {
                $columns = Schema::getColumnListing('tables');

                $pick = function (array $names) use ($columns) {
                    foreach ($names as $name) {
                        if (in_array($name, $columns, true))
                            return $name;
                    }

                    return null;
                };

                $idColumn = $pick(['table_id', 'id']);
                $numberColumn = $pick([
                    'table_no',
                    'table_number',
                    'number',
                ]);
                $nameColumn = $pick([
                    'table_name',
                    'name',
                    'pos_table_label',
                ]);
                $statusColumn = $pick([
                    'table_status',
                    'status',
                    'is_enabled',
                ]);
                $minCapacityColumn = $pick([
                    'min_capacity',
                ]);
                $maxCapacityColumn = $pick([
                    'max_capacity',
                    'capacity',
                ]);
                $areaColumn = $pick([
                    'table_section',
                    'section',
                    'area_name',
                    'area',
                    'location',
                ]);
                $xColumn = $pick([
                    'floor_x',
                    'position_x',
                    'x',
                ]);
                $yColumn = $pick([
                    'floor_y',
                    'position_y',
                    'y',
                ]);
                $widthColumn = $pick([
                    'floor_width',
                    'width',
                ]);
                $heightColumn = $pick([
                    'floor_height',
                    'height',
                ]);
                $shapeColumn = $pick([
                    'floor_shape',
                    'shape',
                ]);
                $priorityColumn = $pick([
                    'priority',
                    'sort_order',
                ]);
                $visibleColumn = $pick([
                    'visible_on_floor_plan',
                ]);

                $query = DB::table('tables');

                if ($statusColumn)
                    $query->where($statusColumn, 1);

                if ($visibleColumn)
                    $query->where($visibleColumn, 1);

                if ($priorityColumn)
                    $query->orderBy($priorityColumn);

                if ($idColumn)
                    $query->orderBy($idColumn);

                $rows = $query->limit(300)->get();

                $areas = [];

                foreach ($rows as $index => $row) {
                    $array = (array)$row;

                    $id = $idColumn
                        ? (string)($array[$idColumn] ?? $index + 1)
                        : (string)($index + 1);

                    $number = $numberColumn
                        ? trim((string)($array[$numberColumn] ?? ''))
                        : '';

                    $name = $nameColumn
                        ? trim((string)($array[$nameColumn] ?? ''))
                        : '';

                    if (!$number)
                        $number = preg_replace('/^table\s*/i', '', $name);

                    if (!$number)
                        $number = $id;

                    if (!$name)
                        $name = 'Table '.$number;

                    $area = $areaColumn
                        ? trim((string)($array[$areaColumn] ?? ''))
                        : '';

                    if (!$area)
                        $area = 'Main dining';

                    $areas[] = $area;

                    $maxCapacity = $maxCapacityColumn
                        ? (int)($array[$maxCapacityColumn] ?? 0)
                        : 0;

                    $minCapacity = $minCapacityColumn
                        ? (int)($array[$minCapacityColumn] ?? 0)
                        : 0;

                    $capacity = $maxCapacity ?: $minCapacity ?: 4;

                    $x = $xColumn
                        ? (float)($array[$xColumn] ?? 0)
                        : 0;

                    $y = $yColumn
                        ? (float)($array[$yColumn] ?? 0)
                        : 0;

                    if ($x <= 0 && $y <= 0) {
                        $column = $index % 5;
                        $gridRow = (int)floor($index / 5);

                        $x = 75 + ($column * 155) + (($gridRow % 2) * 28);
                        $y = 65 + ($gridRow * 145);
                    }

                    $shape = $shapeColumn
                        ? strtolower((string)($array[$shapeColumn] ?? ''))
                        : '';

                    if (
                        strpos($shape, 'round') === false &&
                        strpos($shape, 'circle') === false &&
                        strpos($shape, 'square') === false &&
                        strpos($shape, 'diamond') === false
                    ) {
                        $shape = $index % 3 === 0
                            ? 'square'
                            : 'round';
                    }

                    $result['tables'][] = [
                        'id' => $id,
                        'number' => $number,
                        'name' => $name,
                        'area' => $area,
                        'capacity' => $capacity,
                        'x' => $x,
                        'y' => $y,
                        'width' => $widthColumn
                            ? max(64, (float)($array[$widthColumn] ?? 86))
                            : 86,
                        'height' => $heightColumn
                            ? max(64, (float)($array[$heightColumn] ?? 86))
                            : 86,
                        'shape' => $shape,
                    ];
                }

                $result['areas'] = array_values(array_unique($areas));
            }
        }
        catch (\Throwable $exception) {
            $result['table_error'] = $exception->getMessage();
        }

        return $result;
    }

}
