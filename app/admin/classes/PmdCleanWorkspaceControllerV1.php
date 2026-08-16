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
     * authority. This manager NEVER sets, regenerates or clears qr_code. The
     * existing token may be read after save solely for Owner/Manager display;
     * generation remains exclusively owned by Tables_model.
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
        /**
         * PMD_SHARED_FLOOR_ROLE_LOCATION_V1_4_16
         * One location identity for every Shared Floor role surface.
         * PmdCleanWorkspaceSharedV1 remains first authority. The existing
         * DashboardLab workspace resolver is used only when a native role
         * shell has no resolved clean-workspace location yet.
         */
        $locationId = 0;

        try {
            /** @var PmdCleanWorkspaceSharedV1 $shared */
            $shared = app(PmdCleanWorkspaceSharedV1::class);
            $locationId = max(0, (int)$shared->locationId());
        } catch (\Throwable $e) {
            $locationId = 0;
        }

        if ($locationId < 1) {
            try {
                $locationId = max(
                    0,
                    (int)app(\Admin\Services\PmdRoleDashboardDataV1::class)
                        ->resolveWorkspaceLocation()
                );
            } catch (\Throwable $e) {
                $locationId = 0;
            }
        }

        return $locationId;
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

    /* PMD_FLOOR_TABLE_CARD_V1_4_FEATURES
     * Exactly three practical features are managed by the compact card.
     * Any older/other table_features values remain preserved on edit.
     */
    protected function pmdFloorTableManagerManagedFeatureKeys(): array
    {
        return ['near_window', 'quiet_area', 'accessible'];
    }

    protected function pmdFloorTableManagerFeatureArray($value): array
    {
        if ($value instanceof \Illuminate\Support\Collection) {
            $value = $value->all();
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [];
        }

        if (!is_array($value)) return [];

        $out = [];
        foreach ($value as $feature) {
            $feature = strtolower(trim((string)$feature));
            if ($feature !== '') $out[$feature] = true;
        }
        return array_values(array_keys($out));
    }

    protected function pmdFloorTableManagerManagedFeatures($value): array
    {
        $all = $this->pmdFloorTableManagerFeatureArray($value);
        $allowed = $this->pmdFloorTableManagerManagedFeatureKeys();
        return array_values(array_filter($allowed, static function ($feature) use ($all) {
            return in_array($feature, $all, true);
        }));
    }

    protected function pmdFloorTableFeatureMap(array $displayTables): array
    {
        $ids = [];
        foreach ($displayTables as $row) {
            if (!is_array($row)) continue;
            foreach (['dbTableId', 'db_table_id', 'table_id', 'id'] as $key) {
                $id = (int)($row[$key] ?? 0);
                if ($id > 0) {
                    $ids[$id] = true;
                    break;
                }
            }
        }
        if (!$ids) return [];

        try {
            $map = [];
            $rows = \Admin\Models\Tables_model::query()
                ->whereIn('table_id', array_map('intval', array_keys($ids)))
                ->get(['table_id', 'table_features']);

            foreach ($rows as $table) {
                $tableId = (int)($table->table_id ?? 0);
                if ($tableId < 1) continue;
                $map[(string)$tableId] = $this->pmdFloorTableManagerManagedFeatures(
                    $table->table_features ?? []
                );
            }
            return $map;
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function pmdFloorTableManagerSerialize(
        \Admin\Models\Tables_model $table,
        int $locationId
    ): array {
        $posLabel = trim((string)($table->pos_table_label ?? ''));
        $rawTableNo = trim((string)($table->getRawOriginal('table_no') ?? ''));

        $pmdAssignedFloorName = 'Main Floor';
        try {
            $pmdAssignedFloorName = app(\Admin\Services\PmdSharedFloorRegistryV1::class)
                ->floorNameForTable($locationId, (int)($table->table_id ?? 0));
        } catch (\Throwable $e) {
        }

        $pmdCapacity = max(1, (int)(
            $table->preferred_capacity
            ?? $table->max_capacity
            ?? $table->min_capacity
            ?? 1
        ));

        $pmdQrCode = trim((string)($table->qr_code ?? ''));
        $pmdQrTargetUrl = '';
        $pmdQrImageUrl = '';

        if ($pmdQrCode !== '') {
            $pmdDisplayedNo = $posLabel !== '' ? $posLabel : $rawTableNo;
            $pmdRouteTable = ctype_digit($pmdDisplayedNo) && (int)$pmdDisplayedNo > 0
                ? (int)$pmdDisplayedNo
                : max(1, (int)($table->table_id ?? 0));
            $pmdUpdatedTimestamp = strtotime((string)($table->updated_at ?? '')) ?: time();
            $pmdQrTargetUrl = rtrim(request()->getSchemeAndHttpHost(), '/')
                .'/table/'.rawurlencode((string)$pmdRouteTable)
                .'?'.http_build_query([
                    'location' => $locationId,
                    'guest' => $pmdCapacity,
                    'date' => date('Y-m-d', $pmdUpdatedTimestamp),
                    'time' => date('H:i', $pmdUpdatedTimestamp),
                    'qr' => $pmdQrCode,
                    'table' => $pmdRouteTable,
                ]);
            $pmdQrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='
                .rawurlencode($pmdQrTargetUrl);
        }

        return [
            'table_id' => (int)($table->table_id ?? 0),
            'table_no' => $posLabel !== '' ? $posLabel : $rawTableNo,
            'table_name' => trim((string)($table->table_name ?? '')),
            'pos_table_label' => $posLabel,
            'number_locked' => $posLabel !== '',
            'min_capacity' => max(0, (int)($table->min_capacity ?? 0)),
            'max_capacity' => max(0, (int)($table->max_capacity ?? 0)),
            'preferred_capacity' => $pmdCapacity,
            'extra_capacity' => max(0, (int)($table->extra_capacity ?? 0)),
            'priority' => max(0, (int)($table->priority ?? 0)),
            'table_status' => (bool)($table->table_status ?? true),
            'is_joinable' => (bool)($table->is_joinable ?? true),
            'reservable' => (bool)($table->reservable ?? true),
            'visible_on_floor_plan' => (bool)($table->visible_on_floor_plan ?? true),
            'floor_name' => $pmdAssignedFloorName,
            'table_section' => trim((string)($table->table_section ?? '')) ?: 'Main',
            'floor_shape' => trim((string)($table->floor_shape ?? '')) ?: 'rectangle',
            'floor_notes' => (string)($table->floor_notes ?? ''),
            'reservation_priority' => max(0, (int)($table->reservation_priority ?? 0)),
            'floor_x' => is_numeric($table->floor_x ?? null) ? (float)$table->floor_x : null,
            'floor_y' => is_numeric($table->floor_y ?? null) ? (float)$table->floor_y : null,
            'qr_code' => $pmdQrCode,
            'qr_target_url' => $pmdQrTargetUrl,
            'qr_image_url' => $pmdQrImageUrl,
            'table_features' => $this->pmdFloorTableManagerManagedFeatures($table->table_features ?? []),
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

        $activeFloorName = 'Main Floor';
        try {
            $registryService = app(\Admin\Services\PmdSharedFloorRegistryV1::class);
            $registry = $registryService->snapshot($locationId);
            $activeFloor = $registryService->activeFloor(
                (array)($registry['floors'] ?? []),
                (string)request()->cookie((string)($registry['cookie_name'] ?? ''), '')
            );
            $activeFloorName = trim((string)($activeFloor['name'] ?? '')) ?: 'Main Floor';
        } catch (\Throwable $e) {
        }

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
                    'floor_name' => $activeFloorName,
                    'table_section' => 'Main',
                    'floor_shape' => 'rectangle',
                    'floor_notes' => '',
                    'reservation_priority' => 0,
                    'floor_x' => null,
                    'floor_y' => null,
                    'qr_code' => '',
                    'qr_target_url' => '',
                    'qr_image_url' => '',
                    'table_features' => [],
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

    public function onPmdFloorTableManagerQrDownload()
    {
        $this->pmdAssertCanManageFloorTables();

        $locationId = $this->pmdFloorTableManagerLocationId();
        $requestedLocationId = max(0, (int)request()->input('location_id', 0));
        if ($requestedLocationId > 0 && $locationId > 0 && $requestedLocationId !== $locationId) {
            return response()->json(['ok' => false, 'message' => 'Active Floor location changed.'], 409);
        }

        $tableId = max(0, (int)request()->input('table_id', 0));
        $table = $tableId > 0 ? \Admin\Models\Tables_model::query()->find($tableId) : null;
        if (!$table) {
            return response()->json(['ok' => false, 'message' => 'Table not found.'], 404);
        }

        $this->pmdFloorTableManagerAssertLocation($table, $locationId);
        $serialized = $this->pmdFloorTableManagerSerialize($table, $locationId);
        $imageUrl = trim((string)($serialized['qr_image_url'] ?? ''));
        $qrCode = trim((string)($serialized['qr_code'] ?? ''));
        if ($imageUrl === '' || $qrCode === '') {
            return response()->json(['ok' => false, 'message' => 'This table does not have a QR code yet.'], 404);
        }

        $context = stream_context_create([
            'http' => [
                'timeout' => 8,
                'user_agent' => 'PayMyDine Admin QR Download/1.0',
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);

        $png = @file_get_contents($imageUrl, false, $context);
        if (!is_string($png) || $png === '') {
            return response()->json([
                'ok' => false,
                'message' => 'QR image could not be prepared for download. Please try again.',
            ], 502);
        }

        $displayNo = trim((string)($serialized['table_no'] ?? $tableId));
        $safeNo = preg_replace('/[^A-Za-z0-9_-]+/', '-', $displayNo) ?: (string)$tableId;

        return response()->json([
            'ok' => true,
            'filename' => 'paymydine-table-'.$safeNo.'-qr.png',
            'mime' => 'image/png',
            'data_url' => 'data:image/png;base64,'.base64_encode($png),
            'qr_authority' => 'Tables_model',
            'qr_regenerated' => false,
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
            'table_features' => ['nullable', 'array', 'max:3'],
            'table_features.*' => ['string', 'in:near_window,quiet_area,accessible'],
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

        $floorNameInput = trim((string)($payload['floor_name'] ?? '')) ?: 'Main Floor';
        try {
            $registryService = app(\Admin\Services\PmdSharedFloorRegistryV1::class);
            $registrySnapshot = $registryService->snapshot($locationId);
            $floorMatch = $registryService->findByName(
                (array)($registrySnapshot['floors'] ?? []),
                $floorNameInput
            );
        } catch (\Throwable $e) {
            $floorMatch = null;
        }

        if (!$floorMatch) {
            return response()->json([
                'ok' => false,
                'message' => 'Please choose an existing Floor. Use + Add floor to create a new one.',
                'errors' => [
                    'floor_name' => ['Choose an existing Floor.'],
                ],
            ], 422);
        }

        // PMD_FLOOR_TABLE_CARD_V1_3_SINGLE_CAPACITY
        $preferredCapacity = max(1, (int)($payload['preferred_capacity'] ?? 1));
        $minCapacity = 1;
        $maxCapacity = $preferredCapacity;

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
        $table->extra_capacity = 0;
        $table->priority = max(0, (int)($payload['priority'] ?? 0));
        $table->table_status = (bool)$payload['table_status'];
        $table->is_joinable = (bool)$payload['is_joinable'];
        $table->reservable = (bool)$payload['reservable'];
        $table->visible_on_floor_plan = (bool)$payload['visible_on_floor_plan'];
        // PMD_SHARED_FLOOR_MULTI_FLOOR_V1_2_ASSIGNMENT_AUTHORITY
        // Do not overwrite legacy tables.floor_name. The explicit PMD Floor
        // assignment is persisted by canonical table_id after Tables_model saves.
        if ($isCreate && trim((string)($table->floor_name ?? '')) === '') {
            $table->floor_name = 'Main Floor';
        }
        $table->table_section = trim((string)($payload['table_section'] ?? '')) ?: 'Main';
        $table->floor_shape = trim((string)($payload['floor_shape'] ?? 'rectangle')) ?: 'rectangle';
        $table->floor_notes = trim((string)($payload['floor_notes'] ?? ''));

        $pmdExistingFeatures = $this->pmdFloorTableManagerFeatureArray($table->table_features ?? []);
        $pmdManagedFeatureKeys = $this->pmdFloorTableManagerManagedFeatureKeys();
        $pmdPreservedFeatures = array_values(array_filter($pmdExistingFeatures, static function ($feature) use ($pmdManagedFeatureKeys) {
            return !in_array($feature, $pmdManagedFeatureKeys, true);
        }));
        $pmdSelectedFeatures = $this->pmdFloorTableManagerManagedFeatures($payload['table_features'] ?? []);
        $table->table_features = array_values(array_unique(array_merge($pmdPreservedFeatures, $pmdSelectedFeatures)));

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
         * Do not set, regenerate or clear qr_code here. Tables_model owns
         * generation. pmdFloorTableManagerSerialize() may read the saved token
         * afterward only to display the canonical QR to Owner/Manager.
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

        $pmdRegistryAfterSave = null;
        try {
            $freshTableId = (int)($table->table_id ?? 0);
            $pmdRegistryAfterSave = app(\Admin\Services\PmdSharedFloorRegistryV1::class)->assignTable(
                $locationId,
                $freshTableId,
                (string)($floorMatch['id'] ?? $floorMatch['name'] ?? 'Main Floor')
            );
        } catch (\Throwable $e) {
            logger()->error('PMD shared Floor table assignment failed', [
                'location_id' => $locationId,
                'table_id' => (int)($table->table_id ?? 0),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'ok' => false,
                'message' => 'Table saved, but its Floor assignment could not be persisted. Refresh before retrying.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'mode' => $isCreate ? 'create' : 'edit',
            'message' => $isCreate ? 'Table created.' : 'Table updated.',
            'table' => $this->pmdFloorTableManagerSerialize($table->fresh(), $locationId),
            'registry' => $pmdRegistryAfterSave,
            'qr_untouched' => true,
            'qr_read_only' => true,
            'qr_authority' => 'Tables_model',
        ]);
    }

    /**
     * PMD_SHARED_FLOOR_MULTI_FLOOR_V1
     * Location-scoped floor registry. PMD table-to-floor assignment is stored
     * by canonical table_id in LocationOption; legacy tables.floor_name remains
     * untouched metadata and is not the new Floor identity authority.
     */
    protected function pmdSharedFloorRegistrySnapshot(int $locationId): array
    {
        try {
            return app(\Admin\Services\PmdSharedFloorRegistryV1::class)
                ->snapshot($locationId);
        } catch (\Throwable $e) {
            return [
                'version' => 1,
                'location_id' => max(0, $locationId),
                'cookie_name' => 'pmd_shared_floor_active_'.max(0, $locationId),
                'floors' => [[
                    'id' => 'main-floor-'.substr(sha1('main floor'), 0, 10),
                    'name' => 'Main Floor',
                    'sort' => 0,
                ]],
                'table_floor_map' => [
                    'by_id' => [],
                    'by_number' => [],
                    'by_name' => [],
                ],
            ];
        }
    }

    public function onPmdFloorRegistryCreate()
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

        $validator = \Illuminate\Support\Facades\Validator::make(request()->all(), [
            'name' => ['required', 'string', 'max:120'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => 'Please enter a valid floor name.',
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        try {
            $result = app(\Admin\Services\PmdSharedFloorRegistryV1::class)
                ->createFloor($locationId, (string)request()->input('name'));
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            logger()->error('PMD shared Floor registry create failed', [
                'location_id' => $locationId,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'ok' => false,
                'message' => 'Floor could not be created.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Floor created.',
            'floor' => $result['floor'] ?? null,
            'registry' => $result['registry'] ?? [],
        ]);
    }

    public function onPmdFloorRegistrySnapshot()
    {
        $locationId = $this->pmdFloorTableManagerLocationId();
        $requestedLocationId = max(0, (int)request()->input('location_id', 0));
        if ($requestedLocationId > 0 && $locationId > 0 && $requestedLocationId !== $locationId) {
            return response()->json([
                'ok' => false,
                'message' => 'Active Floor location changed. Refresh the page and try again.',
            ], 409);
        }

        try {
            $registry = app(\Admin\Services\PmdSharedFloorRegistryV1::class)
                ->snapshot($locationId);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'Floor registry could not be loaded.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'registry' => $registry,
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
            $this->addCss('css/pmd-shared-floor-multi-floor-v1.css');
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

        if ($this->pmdUsesFloor()) {
            $this->addJs('js/pmd-shared-floor-multi-floor-v1.js');
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

        $pmdSharedFloorLocationId = $this->pmdUsesFloor()
            ? $this->pmdFloorTableManagerLocationId()
            : 0;

        $floorRegistrySnapshot = $this->pmdUsesFloor()
            ? $this->pmdSharedFloorRegistrySnapshot($pmdSharedFloorLocationId)
            : [
                'cookie_name' => '',
                'floors' => [],
                'table_floor_map' => ['by_id' => [], 'by_number' => [], 'by_name' => []],
            ];

        $floorRegistryService = app(\Admin\Services\PmdSharedFloorRegistryV1::class);
        $floorActiveCookieValue = (string)request()->cookie(
            (string)($floorRegistrySnapshot['cookie_name'] ?? ''),
            ''
        );
        $floorActive = $this->pmdUsesFloor()
            ? $floorRegistryService->activeFloor(
                (array)($floorRegistrySnapshot['floors'] ?? []),
                $floorActiveCookieValue
            )
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
        $this->vars['pmdCleanWorkspaceLocationId'] = $pmdSharedFloorLocationId;
        $this->vars['pmdCleanWorkspaceReservationBusyWindows'] = $this->pmdUsesFloor()
            ? $this->pmdFloorReservationBusyWindows($pmdSharedFloorLocationId)
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
        $this->vars['pmdCleanWorkspaceFloorRegistry'] = $floorRegistrySnapshot['floors'] ?? [];
        $this->vars['pmdCleanWorkspaceFloorActive'] = $floorActive;
        $this->vars['pmdCleanWorkspaceFloorTableMap'] = $floorRegistrySnapshot['table_floor_map'] ?? [];
        $this->vars['pmdCleanWorkspaceFloorCookie'] = $floorRegistrySnapshot['cookie_name'] ?? '';

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
