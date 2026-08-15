<?php

namespace Admin\Classes;

use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdCleanWorkspaceFinanceV1;

/**
 * Shared controller shell for the new clean PMD workspaces.
 *
 * Contract:
 * - one server-rendered header/KPI/Floor shell
 * - no Dashboard2/Reservations2 browser runtime
 * - no Analytics/content below the Floor at this stage
 */
abstract class PmdCleanWorkspaceControllerV1 extends AdminController
{
    abstract protected function pmdWorkspaceKey(): string;
    abstract protected function pmdKpiMode(): string;
    abstract protected function pmdKpiDefaults(): array;

    protected function pmdUsesFloor(): bool
    {
        return true;
    }

    protected function pmdAfterFloorPartial(): ?string
    {
        return null;
    }

    protected function pmdBelowFloorPartial(): ?string
    {
        return null;
    }

    protected function pmdPrepareWorkspaceVars(
        PmdCleanWorkspaceSharedV1 $shared,
        string $locale,
        array $floorBootstrap
    ): void {
    }

    protected function pmdMenuContext(): array
    {
        return ['dashboard'];
    }

    /**
     * PMD_FLOOR_RESERVATION_BUSY_WINDOWS_V1_1
     * Read-only reservation occupancy contribution for the shared clean Floor.
     * The canonical Reservations_model::isCanceled() status-history rule is used
     * so a cancelled reservation never contributes a busy window.
     */
    protected function pmdFloorReservationBusyWindows(int $locationId): array
    {
        $locationId = max(0, $locationId);
        if ($locationId < 1) return [];

        try {
            if (
                !\Illuminate\Support\Facades\Schema::hasTable('reservations')
                || !\Illuminate\Support\Facades\Schema::hasTable('reservation_tables')
                || !\Illuminate\Support\Facades\Schema::hasTable('tables')
            ) {
                return [];
            }

            $now = \Carbon\Carbon::now('Europe/Berlin');
            $reservations = \Admin\Models\Reservations_model::with('tables')
                ->where('location_id', $locationId)
                ->whereBetween('reserve_date', [
                    $now->copy()->subDay()->toDateString(),
                    $now->copy()->addDay()->toDateString(),
                ])
                ->get();

            $windows = [];
            $seen = [];

            foreach ($reservations as $reservation) {
                if (!$reservation || $reservation->isCanceled()) continue;

                $date = substr(trim((string)$reservation->getOriginal('reserve_date')), 0, 10);
                $time = substr(trim((string)$reservation->getOriginal('reserve_time')), 0, 8);
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;
                if (!preg_match('/^\d{2}:\d{2}(?::\d{2})?$/', $time)) continue;
                if (strlen($time) === 5) $time .= ':00';

                try {
                    $start = \Carbon\Carbon::createFromFormat(
                        'Y-m-d H:i:s',
                        $date.' '.$time,
                        'Europe/Berlin'
                    );
                } catch (\Throwable $e) {
                    continue;
                }

                if (!$start) continue;
                $duration = max(1, (int)($reservation->duration ?? 0));
                $end = $start->copy()->addMinutes($duration);

                foreach ($reservation->tables as $table) {
                    if (!$table) continue;
                    $tableId = (int)($table->table_id ?? 0);
                    $tableNo = trim((string)($table->table_no ?? ''));
                    if ($tableId < 1 && $tableNo === '') continue;

                    $key = implode(':', [
                        (int)($reservation->reservation_id ?? 0),
                        $tableId,
                        $start->getTimestamp(),
                    ]);
                    if (isset($seen[$key])) continue;
                    $seen[$key] = true;

                    $windows[] = [
                        'reservation_id' => (int)($reservation->reservation_id ?? 0),
                        'table_id' => $tableId,
                        'table_no' => $tableNo,
                        'start_ms' => $start->getTimestamp() * 1000,
                        'end_ms' => $end->getTimestamp() * 1000,
                    ];
                }
            }

            return $windows;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Event-driven refresh authority for reservation busy windows.
     * Used only on Floor refresh/focus and at the next reservation start/end.
     */
    public function onPmdFloorReservationBusyWindows()
    {
        /** @var PmdCleanWorkspaceSharedV1 $shared */
        $shared = app(PmdCleanWorkspaceSharedV1::class);
        $locationId = (int)$shared->locationId();

        return response()->json([
            'success' => true,
            'location_id' => $locationId,
            'windows' => $this->pmdFloorReservationBusyWindows($locationId),
        ]);
    }

    /**
     * PMD_FLOOR_INLINE_TABLE_MANAGER_V1
     *
     * One shared backend for the owner/manager Floor table card.
     * The UI lives in the exact shared Floor partial, while all mutations go
     * through the canonical Tables_model so its existing lifecycle remains the
     * authority. In particular this code NEVER reads/writes qr_code; a new
     * table therefore receives a QR only through the pre-existing model hook.
     */
    protected function pmdFloorTableManagerRole(): string
    {
        try {
            $user = \Admin\Facades\AdminAuth::getUser();
            if (!$user) return '';

            if (!empty($user->is_super_user)) {
                return 'owner';
            }

            $staffId = (int)($user->staff_id ?? 0);
            if ($staffId < 1) return '';

            $row = \Illuminate\Support\Facades\DB::table('staffs as s')
                ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                ->where('s.staff_id', $staffId)
                ->select('r.code as role_code', 'r.name as role_name')
                ->first();

            $code = strtolower(trim((string)($row->role_code ?? '')));
            $name = strtolower(trim((string)($row->role_name ?? '')));

            if ($code === 'owner' || $name === 'owner') return 'owner';
            if ($code === 'manager' || $name === 'manager') return 'manager';
        } catch (\Throwable $e) {
            return '';
        }

        return '';
    }

    protected function pmdCanManageFloorTables(): bool
    {
        return in_array(
            $this->pmdFloorTableManagerRole(),
            ['owner', 'manager'],
            true
        );
    }

    protected function pmdAssertCanManageFloorTables(): void
    {
        if (!$this->pmdCanManageFloorTables()) {
            abort(403, 'Only owner or manager accounts can manage Floor tables.');
        }
    }

    protected function pmdFloorTableManagerLocationId(): int
    {
        /** @var PmdCleanWorkspaceSharedV1 $shared */
        $shared = app(PmdCleanWorkspaceSharedV1::class);
        return max(0, (int)$shared->locationId());
    }

    protected function pmdFloorTableManagerLocationIds(\Admin\Models\Tables_model $table): array
    {
        $ids = [];

        try {
            foreach ($table->locations as $location) {
                $id = (int)($location->location_id ?? 0);
                if ($id > 0) $ids[$id] = true;
            }
        } catch (\Throwable $e) {
            // Legacy rows may not have a locationable relation. Fall back to
            // the direct location_id column when the tenant schema has it.
        }

        try {
            $rawLocationId = (int)($table->getRawOriginal('location_id') ?? 0);
            if ($rawLocationId > 0) $ids[$rawLocationId] = true;
        } catch (\Throwable $e) {
        }

        return array_map('intval', array_keys($ids));
    }

    protected function pmdFloorTableManagerAssertLocation(
        \Admin\Models\Tables_model $table,
        int $locationId
    ): void {
        if ($locationId < 1) return;

        $ids = $this->pmdFloorTableManagerLocationIds($table);
        if ($ids && !in_array($locationId, $ids, true)) {
            abort(404, 'Table is not available in the active location.');
        }
    }

    protected function pmdFloorTableManagerSerialize(
        \Admin\Models\Tables_model $table,
        int $locationId
    ): array {
        $posLabel = trim((string)($table->pos_table_label ?? ''));
        $rawTableNo = trim((string)($table->getRawOriginal('table_no') ?? ''));

        return [
            'table_id' => (int)($table->table_id ?? 0),
            'table_no' => $posLabel !== '' ? $posLabel : $rawTableNo,
            'table_name' => trim((string)($table->table_name ?? '')),
            'pos_table_label' => $posLabel,
            'number_locked' => $posLabel !== '',
            'min_capacity' => max(0, (int)($table->min_capacity ?? 0)),
            'max_capacity' => max(0, (int)($table->max_capacity ?? 0)),
            'preferred_capacity' => $table->preferred_capacity === null
                ? null
                : max(0, (int)$table->preferred_capacity),
            'extra_capacity' => max(0, (int)($table->extra_capacity ?? 0)),
            'priority' => max(0, (int)($table->priority ?? 0)),
            'table_status' => (bool)($table->table_status ?? true),
            'is_joinable' => (bool)($table->is_joinable ?? true),
            'reservable' => (bool)($table->reservable ?? true),
            'visible_on_floor_plan' => (bool)($table->visible_on_floor_plan ?? true),
            'floor_name' => trim((string)($table->floor_name ?? '')) ?: 'Main Floor',
            'table_section' => trim((string)($table->table_section ?? '')) ?: 'Main',
            'floor_shape' => trim((string)($table->floor_shape ?? '')) ?: 'rectangle',
            'floor_notes' => (string)($table->floor_notes ?? ''),
            'reservation_priority' => max(0, (int)($table->reservation_priority ?? 0)),
            'location_id' => $locationId,
            'location_ids' => $this->pmdFloorTableManagerLocationIds($table),
        ];
    }

    protected function pmdFloorTableManagerNextNumber(): int
    {
        $max = 0;

        try {
            foreach (\Illuminate\Support\Facades\DB::table('tables')->pluck('table_no') as $value) {
                $text = trim((string)$value);
                if ($text !== '' && ctype_digit($text)) {
                    $max = max($max, (int)$text);
                }
            }
        } catch (\Throwable $e) {
        }

        return max(1, $max + 1);
    }

    public function onPmdFloorTableManagerLoad()
    {
        $this->pmdAssertCanManageFloorTables();

        $locationId = $this->pmdFloorTableManagerLocationId();
        $requestedLocationId = max(0, (int)request()->input('location_id', 0));
        if ($requestedLocationId > 0 && $locationId > 0 && $requestedLocationId !== $locationId) {
            abort(403, 'Active Floor location changed. Refresh the page and try again.');
        }

        $tableId = max(0, (int)request()->input('table_id', 0));

        if ($tableId < 1) {
            return response()->json([
                'ok' => true,
                'mode' => 'create',
                'role' => $this->pmdFloorTableManagerRole(),
                'table' => [
                    'table_id' => 0,
                    'table_no' => (string)$this->pmdFloorTableManagerNextNumber(),
                    'table_name' => '',
                    'pos_table_label' => '',
                    'number_locked' => false,
                    'min_capacity' => 1,
                    'max_capacity' => 2,
                    'preferred_capacity' => 2,
                    'extra_capacity' => 0,
                    'priority' => 0,
                    'table_status' => true,
                    'is_joinable' => true,
                    'reservable' => true,
                    'visible_on_floor_plan' => true,
                    'floor_name' => 'Main Floor',
                    'table_section' => 'Main',
                    'floor_shape' => 'rectangle',
                    'floor_notes' => '',
                    'reservation_priority' => 0,
                    'location_id' => $locationId,
                    'location_ids' => $locationId > 0 ? [$locationId] : [],
                ],
            ]);
        }

        $table = \Admin\Models\Tables_model::query()->find($tableId);
        if (!$table) abort(404, 'Table not found.');

        $this->pmdFloorTableManagerAssertLocation($table, $locationId);

        return response()->json([
            'ok' => true,
            'mode' => 'edit',
            'role' => $this->pmdFloorTableManagerRole(),
            'table' => $this->pmdFloorTableManagerSerialize($table, $locationId),
        ]);
    }

    public function onPmdFloorTableManagerSave()
    {
        $this->pmdAssertCanManageFloorTables();

        $locationId = $this->pmdFloorTableManagerLocationId();
        $requestedLocationId = max(0, (int)request()->input('location_id', 0));
        if ($requestedLocationId > 0 && $locationId > 0 && $requestedLocationId !== $locationId) {
            return response()->json([
                'ok' => false,
                'message' => 'Active Floor location changed. Refresh the page and try again.',
            ], 409);
        }

        $payload = request()->input('table', []);
        if (!is_array($payload)) $payload = [];

        $tableId = max(0, (int)($payload['table_id'] ?? 0));
        $isCreate = $tableId < 1;

        $table = $isCreate
            ? new \Admin\Models\Tables_model
            : \Admin\Models\Tables_model::query()->find($tableId);

        if (!$table) {
            return response()->json([
                'ok' => false,
                'message' => 'Table not found.',
            ], 404);
        }

        if (!$isCreate) {
            $this->pmdFloorTableManagerAssertLocation($table, $locationId);
        }

        $posLabel = trim((string)($table->pos_table_label ?? ''));
        $numberLocked = !$isCreate && $posLabel !== '';

        $rules = [
            'min_capacity' => ['required', 'integer', 'min:0'],
            'max_capacity' => ['required', 'integer', 'min:0'],
            'preferred_capacity' => ['nullable', 'integer', 'min:0'],
            'extra_capacity' => ['nullable', 'integer', 'min:0'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'table_status' => ['required', 'boolean'],
            'is_joinable' => ['required', 'boolean'],
            'reservable' => ['required', 'boolean'],
            'visible_on_floor_plan' => ['required', 'boolean'],
            'floor_name' => ['nullable', 'string', 'max:120'],
            'table_section' => ['nullable', 'string', 'max:120'],
            'floor_shape' => ['required', 'in:rectangle,round,booth,bar,custom'],
            'floor_notes' => ['nullable', 'string', 'max:1000'],
            'reservation_priority' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];

        if (!$numberLocked) {
            $rules['table_no'] = ['required', 'integer', 'min:1'];
        }

        $validator = \Illuminate\Support\Facades\Validator::make($payload, $rules);
        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => 'Please check the highlighted table fields.',
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $minCapacity = max(0, (int)($payload['min_capacity'] ?? 0));
        $maxCapacity = max(0, (int)($payload['max_capacity'] ?? 0));
        $preferredCapacity = array_key_exists('preferred_capacity', $payload)
            && $payload['preferred_capacity'] !== ''
            && $payload['preferred_capacity'] !== null
                ? max(0, (int)$payload['preferred_capacity'])
                : null;

        $errors = [];
        if ($maxCapacity < $minCapacity) {
            $errors['max_capacity'][] = 'Maximum capacity must be greater than or equal to minimum capacity.';
        }
        if (
            $preferredCapacity !== null
            && ($preferredCapacity < $minCapacity || $preferredCapacity > $maxCapacity)
        ) {
            $errors['preferred_capacity'][] = 'Normal seats must be between minimum and maximum capacity.';
        }

        if (!$numberLocked) {
            $tableNo = (int)($payload['table_no'] ?? 0);
            $duplicate = \Illuminate\Support\Facades\DB::table('tables')
                ->where('table_no', $tableNo)
                ->when(!$isCreate, function ($query) use ($tableId) {
                    $query->where('table_id', '<>', $tableId);
                })
                ->exists();

            if ($duplicate) {
                $errors['table_no'][] = 'This table number already exists.';
            }
        }

        if ($errors) {
            return response()->json([
                'ok' => false,
                'message' => 'Please check the highlighted table fields.',
                'errors' => $errors,
            ], 422);
        }

        if (!$numberLocked) {
            $table->table_no = (int)$payload['table_no'];
        }

        $table->min_capacity = $minCapacity;
        $table->max_capacity = $maxCapacity;
        $table->preferred_capacity = $preferredCapacity ?? $maxCapacity;
        $table->extra_capacity = max(0, (int)($payload['extra_capacity'] ?? 0));
        $table->priority = max(0, (int)($payload['priority'] ?? 0));
        $table->table_status = (bool)$payload['table_status'];
        $table->is_joinable = (bool)$payload['is_joinable'];
        $table->reservable = (bool)$payload['reservable'];
        $table->visible_on_floor_plan = (bool)$payload['visible_on_floor_plan'];
        $table->floor_name = trim((string)($payload['floor_name'] ?? '')) ?: 'Main Floor';
        $table->table_section = trim((string)($payload['table_section'] ?? '')) ?: 'Main';
        $table->floor_shape = trim((string)($payload['floor_shape'] ?? 'rectangle')) ?: 'rectangle';
        $table->floor_notes = trim((string)($payload['floor_notes'] ?? ''));
        $table->reservation_priority = max(0, (int)($payload['reservation_priority'] ?? 0));

        if (
            $isCreate
            && $locationId > 0
            && \Illuminate\Support\Facades\Schema::hasColumn('tables', 'location_id')
        ) {
            // Compatibility with tenants that also retain the direct column.
            $table->setAttribute('location_id', $locationId);
        }

        /*
         * QR GUARANTEE:
         * Do not read, set, regenerate or clear qr_code here. Tables_model owns
         * its existing QR lifecycle. This save deliberately leaves that system
         * byte-for-byte and behaviorally untouched.
         */
        $table->save();

        if ($isCreate && $locationId > 0) {
            try {
                $table->locations()->syncWithoutDetaching([$locationId]);
            } catch (\Throwable $e) {
                // If this tenant uses only tables.location_id, the direct
                // column above already keeps the table scoped correctly.
            }
        }

        return response()->json([
            'ok' => true,
            'mode' => $isCreate ? 'create' : 'edit',
            'message' => $isCreate ? 'Table created.' : 'Table updated.',
            'table' => $this->pmdFloorTableManagerSerialize($table->fresh(), $locationId),
            'qr_untouched' => true,
        ]);
    }

    public function __construct()
    {
        parent::__construct();

        $key = $this->pmdWorkspaceKey();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-dashboard-lab-page'
            .' pmd-clean-workspace-page pmd-clean-workspace-'.$key
        );

        // Exact same proven shell and KPI visual authorities as Dashboard Lab.
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-reservations2-kpis-v307.css');
        $this->addCss('css/pmd-dashboard-lab-v1.css');

        // Exact same proven shared Floor visual authorities as Dashboard Lab.
        if ($this->pmdUsesFloor()) {
            $this->addCss('css/pmd-floor-v1.css');
            $this->addCss('css/pmd-floor-v1-stable-v11.css');
            $this->addCss('css/pmd-floor-v1-native-smart-v20.css');
            $this->addCss('css/pmd-reservations2-floor-canvas-v310.css');
            $this->addCss('css/pmd-reservations2-floor-toolbar-v316.css');
            $this->addCss('css/pmd-reservations2-floor-reservation-v312.css');
            $this->addCss('css/pmd-dashboard-lab-exact-floor-v1.css');
        }

        // Generic clean-workspace KPI chooser. Zero boot fetch/layout writes.
        $this->addJs('js/pmd-clean-workspace-kpis-v1.js');

        // Existing proven Floor interaction runtime. Initial geometry is Blade.
        // PMD_RESERVATIONSLAB_PARSER_SYNC_FLOOR_BOOT_V1
        // ReservationsLab loads this SAME runtime directly after its server-rendered
        // Floor DOM so the browser never paints the pre-hydration Floor in English.
        // Other clean workspaces keep the normal asset-pipeline load order.
        if (
            $this->pmdUsesFloor()
            && !request()->is('admin/reservationslab*')
            && !request()->is('admin/cashierlab*')
        ) {
            $this->addJs('js/pmd-dashboard-lab-exact-floor-v1.js');
        }

        $this->applyMenuContext();
    }

    public function index()
    {
        /** @var PmdCleanWorkspaceSharedV1 $shared */
        $shared = app(PmdCleanWorkspaceSharedV1::class);
        $locale = $shared->locale();

        /*
         * PMD_CLEAN_WORKSPACE_REQUEST_COOKIE_LOCALE_V3
         * Use Laravel's decrypted request cookie, matching the official
         * language-switch route and global Admin i18n boot authority.
         */
        $adminLocale = strtolower(trim((string)request()->cookie(
            'pmd_admin_locale',
            ''
        )));

        if (preg_match('/^(en|de)(?:[-_][a-z0-9]+)?$/i', $adminLocale, $match)) {
            $locale = strtolower($match[1]);
        } else {
            $locale = strtolower(trim((string)$locale));
            $locale = strpos($locale, 'de') === 0 ? 'de' : 'en';
        }

        app()->setLocale($locale);

        if (app()->bound('translator.localization')) {
            app('translator.localization')->setLocale($locale, false);
        }

        $key = $this->pmdWorkspaceKey();
        $title = $this->pmdWorkspaceTitle($locale);

        Template::setTitle($title);
        Template::setHeading($title);

        // Floor is resolved once and reused by Reservations KPI calculations.
        $floorBootstrap = $this->pmdUsesFloor()
            ? $shared->floorBootstrap()
            : [];

        $mode = $this->pmdKpiMode();

        if ($mode === 'reservations') {
            $kpiOrder = PmdCleanWorkspaceSharedV1::RESERVATION_KPI_ORDER;
            $kpiCards = $shared->reservationKpiCards($floorBootstrap, $locale);
        } elseif ($mode === 'cashier') {
            /** @var PmdCleanWorkspaceFinanceV1 $finance */
            $finance = app(PmdCleanWorkspaceFinanceV1::class);
            $kpiOrder = PmdCleanWorkspaceFinanceV1::CASHIER_KPI_ORDER;
            $kpiCards = $finance->cashierCards($shared->locationId(), $locale);
        } elseif ($mode === 'accountant') {
            /** @var PmdCleanWorkspaceFinanceV1 $finance */
            $finance = app(PmdCleanWorkspaceFinanceV1::class);
            $kpiOrder = PmdCleanWorkspaceFinanceV1::ACCOUNTANT_KPI_ORDER;
            $kpiCards = $finance->accountantCards($shared->locationId(), $locale);
        } else {
            $kpiOrder = PmdCleanWorkspaceSharedV1::OWNER_KPI_ORDER;
            $kpiCards = $shared->ownerKpiCards($locale);
        }

        $cookieName = 'pmd_'.$key.'_lab_kpis';
        $selection = $shared->readSelection(
            $cookieName,
            $kpiOrder,
            $this->pmdKpiDefaults()
        );

        $this->vars['pmdCleanWorkspaceKey'] = $key;
        $this->vars['pmdCleanWorkspaceTitle'] = $title;
        $this->vars['pmdCleanWorkspacePath'] = '/admin/'.$key.'lab';
        $this->vars['pmdCleanWorkspaceLocale'] = $locale;
        // PMD_CLEAN_WORKSPACE_LOCATION_CONTEXT_V1
        // One explicit location identity for shared Floor reservation-busy reads.
        $this->vars['pmdCleanWorkspaceLocationId'] = (int)$shared->locationId();
        $this->vars['pmdCleanWorkspaceReservationBusyWindows'] = $this->pmdUsesFloor()
            ? $this->pmdFloorReservationBusyWindows((int)$shared->locationId())
            : [];
        $this->vars['pmdCleanWorkspaceKpiCookie'] = $cookieName;
        $this->vars['pmdCleanWorkspaceKpiStorage'] = 'pmd:clean:'.$key.':kpis:v1';
        $this->vars['pmdCleanWorkspaceKpiCards'] = $kpiCards;
        $this->vars['pmdCleanWorkspaceKpiSelection'] = $selection;
        $this->vars['pmdCleanWorkspaceKpiOrder'] = $kpiOrder;
        $authorityMap = [
            'reservations' => 'reservations-server-first-paint',
            'cashier' => 'cashier-finance-server-first-paint',
            'accountant' => 'accountant-finance-server-first-paint',
            'owner' => 'dashboard2-server-first-paint',
        ];
        $this->vars['pmdCleanWorkspaceKpiAuthority'] = $authorityMap[$mode]
            ?? 'clean-workspace-server-first-paint';
        $this->vars['pmdCleanWorkspaceKpiAriaLabel'] = $mode === 'reservations'
            ? $shared->text('Reservation KPIs', 'Reservierungs-KPIs', $locale)
            : ($mode === 'cashier'
                ? $shared->text('Cashier KPIs', 'Kassen-KPIs', $locale)
                : ($mode === 'accountant'
                    ? $shared->text('Accounting KPIs', 'Buchhaltungs-KPIs', $locale)
                    : $shared->text('Workspace KPIs', 'Workspace-KPIs', $locale)));

        $this->vars['pmdCleanWorkspaceText'] = [
            'choose_kpi' => $shared->text('Choose KPI', 'KPI auswählen', $locale),
            'visible' => $shared->text('Visible in this card', 'In dieser Karte sichtbar', $locale),
            'already_visible' => $shared->text('Already visible', 'Bereits sichtbar', $locale),
            'show_here' => $shared->text('Show in this card', 'In dieser Karte anzeigen', $locale),
        ];

        $this->vars['pmdCleanWorkspaceUsesFloor'] = $this->pmdUsesFloor();
        $this->vars['pmdCleanWorkspaceAfterFloorPartial'] = $this->pmdAfterFloorPartial();
        $this->vars['pmdCleanWorkspaceBelowFloorPartial'] = $this->pmdBelowFloorPartial();
        $this->vars['pmdCleanWorkspaceFloorBootstrap'] = $floorBootstrap;
        $this->vars['pmdCleanWorkspaceFloorDisplayTables'] = $floorBootstrap['display_tables'] ?? [];
        $this->vars['pmdCleanWorkspaceFloorMode'] = $floorBootstrap['mode'] ?? 'row';
        $this->vars['pmdCleanWorkspaceFloorZoom'] = $floorBootstrap['zoom'] ?? 1.0;

        $this->pmdPrepareWorkspaceVars($shared, $locale, $floorBootstrap);

        // Dashboard2/Floor data controllers may change AdminMenu context.
        $this->applyMenuContext();

        return $this->makeView($key.'lab/index');
    }

    protected function pmdWorkspaceTitle(string $locale): string
    {
        $key = $this->pmdWorkspaceKey();

        $titles = [
            'reservations' => ['Reservations', 'Reservierungen'],
            'cashier' => ['Cashier', 'Kasse'],
            'manager' => ['Manager', 'Manager'],
            'accountant' => ['Accountant', 'Buchhaltung'],
        ];

        $title = $titles[$key] ?? [ucfirst($key), ucfirst($key)];
        return $locale === 'de' ? $title[1] : $title[0];
    }

    private function applyMenuContext(): void
    {
        $context = $this->pmdMenuContext();

        if (count($context) >= 2) {
            AdminMenu::setContext($context[0], $context[1]);
            return;
        }

        AdminMenu::setContext($context[0] ?? 'dashboard');
    }
}
