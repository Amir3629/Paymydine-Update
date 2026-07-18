<?php

namespace Admin\Controllers;

use Admin\ActivityTypes\StatusUpdated;
use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Admin\Models\Tables_model;
use Carbon\Carbon;
use Exception;
use Igniter\Flame\Exception\ApplicationException;

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

        $this->vars['statusesOptions'] = Statuses_model::getDropdownOptionsForReservation();
        $this->vars['pmdReservationWorkspace'] = $this->buildPmdReservationWorkspaceData();
    }

    protected function buildPmdReservationWorkspaceData()
    {
        $locationId = $this->getLocationId();
        $today = Carbon::now()->toDateString();
        $statusMap = Statuses_model::isForReservation()->get()->keyBy('status_id');

        $reservationQuery = Reservations_model::with(['tables'])->orderBy('reserve_date', 'desc')->orderBy('reserve_time', 'asc');
        if ($locationId) {
            $reservationQuery->where('location_id', $locationId);
        }

        $reservations = $reservationQuery->limit(200)->get();
        $todayReservations = $reservations->filter(function ($reservation) use ($today) {
            return optional($reservation->reserve_date)->toDateString() === $today;
        });

        $serializedReservations = $reservations->map(function ($reservation) use ($statusMap) {
            $status = $statusMap->get((int)$reservation->status_id);
            $tables = $reservation->tables ?: collect();
            $tableLabels = $tables->map(function ($table) {
                return trim((string)($table->table_no ?: $table->table_name ?: $table->table_id));
            })->filter()->values();

            return [
                'id' => (int)$reservation->reservation_id,
                'customer_name' => trim((string)$reservation->customer_name) ?: 'Guest',
                'guest_count' => (int)$reservation->guest_num,
                'date' => optional($reservation->reserve_date)->toDateString(),
                'time' => $reservation->reserve_time ? Carbon::parse($reservation->reserve_time)->format('H:i') : '',
                'status_id' => (int)$reservation->status_id,
                'status' => $status ? (string)$status->status_name : 'Reserved',
                'status_color' => $status ? (string)$status->status_color : '#2563eb',
                'table_ids' => $tables->pluck('table_id')->map(fn($id) => (int)$id)->values()->all(),
                'table_label' => $tableLabels->isNotEmpty() ? $tableLabels->implode(', ') : '',
                'edit_url' => admin_url('reservations/edit/'.$reservation->reservation_id),
            ];
        })->values();

        $tableQuery = Tables_model::isEnabled()->orderBy('floor_sort')->orderBy('priority')->orderBy('table_id');
        if ($locationId) {
            $tableQuery->whereHas('locations', function ($query) use ($locationId) {
                $query->where('locations.location_id', $locationId);
            });
        }

        $tables = $tableQuery->get();
        if ($tables->isEmpty() && $locationId) {
            $tables = Tables_model::isEnabled()->orderBy('floor_sort')->orderBy('priority')->orderBy('table_id')->get();
        }

        $activeReservationsByTable = [];
        foreach ($serializedReservations as $reservation) {
            if ($reservation['date'] !== $today) {
                continue;
            }
            foreach ($reservation['table_ids'] as $tableId) {
                $activeReservationsByTable[$tableId][] = $reservation;
            }
        }

        $serializedTables = $tables->values()->map(function ($table, $index) use ($activeReservationsByTable) {
            $area = trim((string)($table->floor_name ?: $table->table_section ?: 'Main Floor'));
            $hasSavedPosition = $table->floor_x !== null && $table->floor_y !== null;
            $fallbackX = 40 + (($index % 4) * 180);
            $fallbackY = 40 + (floor($index / 4) * 140);
            $tableReservations = $activeReservationsByTable[(int)$table->table_id] ?? [];
            $operationalStatus = strtolower(trim((string)($table->operational_status ?: 'available')));
            $state = count($tableReservations) ? 'reserved' : 'free';
            if (in_array($operationalStatus, ['occupied', 'seated', 'busy'], true)) $state = 'occupied';
            if (in_array($operationalStatus, ['needs_cleaning', 'cleaning', 'dirty'], true)) $state = 'needs-cleaning';

            return [
                'id' => (int)$table->table_id,
                'number' => (string)($table->table_no ?: $table->table_name ?: $table->table_id),
                'name' => (string)($table->table_name ?: 'Table '.$table->table_id),
                'capacity' => (int)($table->preferred_capacity ?: $table->max_capacity ?: $table->min_capacity),
                'area' => $area ?: 'Main Floor',
                'x' => (float)($hasSavedPosition ? $table->floor_x : $fallbackX),
                'y' => (float)($hasSavedPosition ? $table->floor_y : $fallbackY),
                'w' => (float)($table->floor_width ?: 132),
                'h' => (float)($table->floor_height ?: 92),
                'shape' => (string)($table->floor_shape ?: 'rectangle'),
                'state' => $state,
                'operational_status' => $operationalStatus,
                'reservations' => $tableReservations,
            ];
        })->values();

        return [
            'today' => $today,
            'create_url' => admin_url('reservations/create'),
            'reservations' => $serializedReservations,
            'tables' => $serializedTables,
            'areas' => $serializedTables->pluck('area')->unique()->values()->all(),
            'kpis' => [
                'today_reservations' => $todayReservations->count(),
                'guests_today' => $todayReservations->sum('guest_num'),
                'pending_active' => $todayReservations->filter(fn($r) => !$r->isCanceled())->count(),
                'assigned_tables' => $serializedReservations->filter(fn($r) => !empty($r['table_ids']))->count(),
            ],
        ];
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
}
