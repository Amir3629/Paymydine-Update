<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Locations_model;
use Admin\Models\Tables_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD Ownerboard
 *
 * Clean owner dashboard surface.
 * HTML requests do NOT inherit Dashboard2 or Reservations2.
 * Dashboard2 remains JSON data authority only for KPI + analytics.
 */
class Ownerboard extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-ownerboard-page'
        );

        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-ownerboard-v1.css');
        $this->addJs('js/pmd-ownerboard-v1.js');

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        if ((string)request()->query('pmd_floor') === '1') {
            return response()->json(
                $this->ownerboardFloorPayload()
            );
        }

        if (
            request()->isMethod('post')
            && (string)request()->query('pmd_floor_save') === '1'
        ) {
            return response()->json(
                $this->saveOwnerboardFloor()
            );
        }

        Template::setTitle('Dashboard');
        Template::setHeading('Dashboard');

        $locale = strtolower(
            (string)request()->cookie(
                'pmd_admin_locale',
                app()->getLocale()
            )
        );

        $this->vars['pmdOwnerboardLocale'] =
            str_starts_with($locale, 'de')
                ? 'de'
                : 'en';

        $this->vars['pmdOwnerboardEndpoints'] = [
            'kpis' => '/admin/dashboard2?pmd_kpis=1',
            'analytics' => '/admin/dashboard2?pmd_analytics=1',
            'floor' => '/admin/ownerboard?pmd_floor=1',
            'floorSave' => '/admin/ownerboard?pmd_floor_save=1',
        ];

        return $this->makeView('ownerboard/index');
    }

    protected function currentLocationId(): ?int
    {
        try {
            if ($location = AdminLocation::current()) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $error) {
        }

        try {
            $locationId = (int)AdminLocation::getSession('id');

            if ($locationId > 0) {
                return $locationId;
            }
        } catch (\Throwable $error) {
        }

        try {
            if (
                function_exists('is_single_location')
                && is_single_location()
            ) {
                $locationId = (int)params(
                    'default_location_id'
                );

                if ($locationId > 0) {
                    $location = Locations_model::isEnabled()
                        ->find($locationId);

                    if ($location) {
                        AdminLocation::setCurrent($location);
                        return (int)$location->location_id;
                    }
                }
            }
        } catch (\Throwable $error) {
        }

        try {
            $user = AdminAuth::getUser();

            if (!$user) {
                return null;
            }

            $staff = $user->staff;
            $locations = $staff
                ? $staff->locations
                    ->where('location_status', true)
                    ->values()
                : collect();

            if ($locations->count() !== 1) {
                return null;
            }

            $locationId = (int)$locations->first()->location_id;

            if ($locationId < 1) {
                return null;
            }

            $location = Locations_model::isEnabled()
                ->find($locationId);

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

            return (int)$location->location_id;
        } catch (\Throwable $error) {
            return null;
        }
    }

    protected function scopedTablesQuery(int $locationId)
    {
        $query = Tables_model::query()->isEnabled();

        try {
            $query->whereHasLocation($locationId);
        } catch (\Throwable $error) {
            try {
                $query->whereHasOrDoesntHaveLocation($locationId);
            } catch (\Throwable $ignored) {
            }
        }

        return $query;
    }

    protected function ownerboardFloorPayload(): array
    {
        $locationId = $this->currentLocationId();

        if (!$locationId) {
            return [
                'ok' => false,
                'tables' => [],
                'reason' => 'Active location unavailable',
            ];
        }

        $query = $this->scopedTablesQuery($locationId);

        if (Schema::hasColumn('tables', 'visible_on_floor_plan')) {
            $query->where('visible_on_floor_plan', 1);
        }

        if (Schema::hasColumn('tables', 'priority')) {
            $query->orderBy('priority');
        }

        $tables = $query->orderBy('table_id')->get();
        $tableIds = $tables->pluck('table_id')->map(fn ($id) => (int)$id)->all();
        $latestStatus = [];

        if (
            $tableIds
            && Schema::hasTable('pmd_table_status_history')
            && Schema::hasColumn('pmd_table_status_history', 'table_id')
            && Schema::hasColumn('pmd_table_status_history', 'new_status')
            && Schema::hasColumn('pmd_table_status_history', 'created_at')
        ) {
            $rows = DB::table('pmd_table_status_history as h')
                ->joinSub(
                    DB::table('pmd_table_status_history')
                        ->selectRaw('table_id, MAX(created_at) AS max_created_at')
                        ->whereIn('table_id', $tableIds)
                        ->groupBy('table_id'),
                    'latest',
                    function ($join) {
                        $join->on('latest.table_id', '=', 'h.table_id')
                            ->on('latest.max_created_at', '=', 'h.created_at');
                    }
                )
                ->whereIn('h.table_id', $tableIds)
                ->get(['h.table_id', 'h.new_status']);

            foreach ($rows as $row) {
                $latestStatus[(int)$row->table_id] =
                    strtolower(trim((string)$row->new_status));
            }
        }

        $payload = [];

        foreach ($tables as $table) {
            $id = (int)$table->table_id;
            $status = $latestStatus[$id]
                ?? strtolower(trim((string)($table->operational_status ?? 'available')));

            $busy = in_array($status, [
                'occupied',
                'busy',
                'reserved',
                'seated',
                'cleaning',
            ], true);

            $name = trim((string)($table->table_name ?? ''));
            $number = trim((string)($table->table_no ?? ''));

            $payload[] = [
                'id' => $id,
                'name' => $name !== '' ? $name : 'Table '.$id,
                'number' => $number !== '' ? $number : (string)$id,
                'status' => $status !== '' ? $status : 'available',
                'busy' => $busy,
                'x' => (float)($table->floor_x ?? 0),
                'y' => (float)($table->floor_y ?? 0),
                'width' => (float)($table->floor_width ?? 140),
                'height' => (float)($table->floor_height ?? 90),
                'shape' => (string)($table->floor_shape ?? 'rectangle'),
            ];
        }

        return [
            'ok' => true,
            'version' => 'ownerboard-floor-v1.1',
            'tables' => $payload,
        ];
    }

    protected function saveOwnerboardFloor(): array
    {
        $user = AdminAuth::getUser();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if (
            !$user->hasPermission('Admin.Reservations')
            && !$user->hasPermission('Admin.Dashboard')
        ) {
            abort(403, 'Unauthorized.');
        }

        $locationId = $this->currentLocationId();
        $positions = (array)request()->input('positions', []);

        if (!$locationId || !$positions) {
            return ['ok' => false, 'saved' => 0];
        }

        $allowedIds = $this->scopedTablesQuery($locationId)
            ->pluck('table_id')
            ->map(fn ($id) => (int)$id)
            ->all();

        $allowed = array_fill_keys($allowedIds, true);
        $saved = 0;

        DB::transaction(function () use ($positions, $allowed, &$saved) {
            foreach ($positions as $position) {
                $id = (int)($position['id'] ?? 0);

                if ($id < 1 || !isset($allowed[$id])) {
                    continue;
                }

                $x = max(0, min(10000, (float)($position['x'] ?? 0)));
                $y = max(0, min(10000, (float)($position['y'] ?? 0)));

                DB::table('tables')
                    ->where('table_id', $id)
                    ->update([
                        'floor_x' => $x,
                        'floor_y' => $y,
                    ]);

                $saved++;
            }
        });

        return ['ok' => true, 'saved' => $saved];
    }
}

