@php
    $floorBootstrap = is_array($floorBootstrap ?? null)
        ? $floorBootstrap
        : [];

    $displayTables = is_array($displayTables ?? null)
        ? $displayTables
        : [];

    $floorMode = ($floorMode ?? 'row') === 'full'
        ? 'full'
        : 'row';

    /* PMD_FLOOR_SERVER_EXTENDED_COORDINATES_V1_4_7
     * Upstream legacy display builders can still clamp first-paint x/y to the
     * old 1000x560 canvas. The canonical table payload already contains the
     * persisted floor_x/floor_y. Re-adopt only those coordinates here before
     * canvas dimensions and server DOM are calculated. Table membership,
     * status, Floor assignment, merge identity and all business data remain
     * untouched.
     */
    if ($floorMode === 'full' && $displayTables) {
        $pmdCoordinateData = is_array($floorBootstrap['data'] ?? null)
            ? $floorBootstrap['data']
            : [];
        $pmdCoordinateRows = is_array($pmdCoordinateData['tables'] ?? null)
            ? $pmdCoordinateData['tables']
            : (is_array($pmdCoordinateData['sections']['floor_plan']['tables'] ?? null)
                ? $pmdCoordinateData['sections']['floor_plan']['tables']
                : []);

        $pmdCoordinateById = [];
        $pmdCoordinateByNumber = [];

        foreach ($pmdCoordinateRows as $pmdCoordinateRow) {
            if (!is_array($pmdCoordinateRow)) continue;

            $pmdCoordinateFloor = is_array($pmdCoordinateRow['floor'] ?? null)
                ? $pmdCoordinateRow['floor']
                : [];
            $pmdRawX = $pmdCoordinateRow['floor_x'] ?? ($pmdCoordinateFloor['x'] ?? null);
            $pmdRawY = $pmdCoordinateRow['floor_y'] ?? ($pmdCoordinateFloor['y'] ?? null);
            if (!is_numeric($pmdRawX) || !is_numeric($pmdRawY)) continue;

            $pmdCoordinate = [
                'x' => max(64.0, min(10000.0, (float)$pmdRawX)),
                'y' => max(54.0, min(10000.0, (float)$pmdRawY)),
            ];

            foreach (['table_id', 'id', 'location_table_id'] as $pmdIdField) {
                $pmdId = trim((string)($pmdCoordinateRow[$pmdIdField] ?? ''));
                if ($pmdId !== '') $pmdCoordinateById[$pmdId] = $pmdCoordinate;
            }

            foreach (['table_no', 'table_number', 'number'] as $pmdNoField) {
                $pmdNo = trim((string)($pmdCoordinateRow[$pmdNoField] ?? ''));
                if ($pmdNo !== '') $pmdCoordinateByNumber[$pmdNo] = $pmdCoordinate;
            }
        }

        foreach ($displayTables as &$pmdDisplayTable) {
            if (!is_array($pmdDisplayTable)) continue;

            $pmdResolvedCoordinates = [];
            $pmdMemberIds = array_values(array_filter(array_map(
                'strval',
                (array)($pmdDisplayTable['member_ids'] ?? [])
            )));

            if (!empty($pmdDisplayTable['is_merged']) && $pmdMemberIds) {
                foreach ($pmdMemberIds as $pmdMemberId) {
                    if (isset($pmdCoordinateById[$pmdMemberId])) {
                        $pmdResolvedCoordinates[] = $pmdCoordinateById[$pmdMemberId];
                    }
                }
            } else {
                foreach (['dbTableId', 'db_table_id', 'table_id', 'id'] as $pmdIdField) {
                    $pmdId = trim((string)($pmdDisplayTable[$pmdIdField] ?? ''));
                    if ($pmdId !== '' && isset($pmdCoordinateById[$pmdId])) {
                        $pmdResolvedCoordinates[] = $pmdCoordinateById[$pmdId];
                        break;
                    }
                }

                if (!$pmdResolvedCoordinates) {
                    foreach (['number', 'table_number', 'table_no'] as $pmdNoField) {
                        $pmdNo = trim((string)($pmdDisplayTable[$pmdNoField] ?? ''));
                        if ($pmdNo !== '' && isset($pmdCoordinateByNumber[$pmdNo])) {
                            $pmdResolvedCoordinates[] = $pmdCoordinateByNumber[$pmdNo];
                            break;
                        }
                    }
                }
            }

            if ($pmdResolvedCoordinates) {
                $pmdDisplayTable['x'] = array_sum(array_column($pmdResolvedCoordinates, 'x'))
                    / count($pmdResolvedCoordinates);
                $pmdDisplayTable['y'] = array_sum(array_column($pmdResolvedCoordinates, 'y'))
                    / count($pmdResolvedCoordinates);
            }
        }
        unset($pmdDisplayTable);
    }

    $floorZoom = is_numeric($floorZoom ?? null)
        ? max(0.4, min(1.6, (float)$floorZoom))
        : 1.0;

    /* PMD_SHARED_FLOOR_MULTI_FLOOR_V1
     * Server-first active-floor filter. The full table set stays in the core
     * bootstrap; only the first painted DOM is scoped here. The coordinator
     * later adopts the exact same active floor inside the existing Floor state.
     */
    $pmdFloorRegistry = is_array($pmdCleanWorkspaceFloorRegistry ?? null)
        ? array_values($pmdCleanWorkspaceFloorRegistry)
        : [];
    if (!$pmdFloorRegistry) {
        $pmdFloorRegistry = [[
            'id' => 'main-floor-'.substr(sha1('main floor'), 0, 10),
            'name' => 'Main Floor',
            'sort' => 0,
        ]];
    }

    $pmdFloorActive = is_array($pmdCleanWorkspaceFloorActive ?? null)
        ? $pmdCleanWorkspaceFloorActive
        : $pmdFloorRegistry[0];
    $pmdFloorRegistryCount = count($pmdFloorRegistry);
    
    // PMD_EDIT_FLOOR_CUSTOM_EXISTENCE_V5_START
    /*
     * Product rule:
     *
     * Edit Floor exists only if a NON-DEFAULT Floor exists.
     *
     * The default Floor may be renamed, therefore its NAME
     * must never decide this.
     *
     * Stable identity authority = is_default.
     */
    $pmdFloorExplicitDefaultFlags = 0;
    $pmdHasCustomFloor = false;

    foreach (
        $pmdFloorRegistry
        as $pmdFloorVisibilityItem
    ) {
        if (!is_array($pmdFloorVisibilityItem)) {
            continue;
        }

        if (
            array_key_exists(
                'is_default',
                $pmdFloorVisibilityItem
            )
        ) {
            $pmdFloorExplicitDefaultFlags++;

            if (
                empty(
                    $pmdFloorVisibilityItem[
                        'is_default'
                    ]
                )
            ) {
                $pmdHasCustomFloor = true;
                break;
            }
        }
    }

    /*
     * Mixed registry compatibility:
     * flagged permanent default + unflagged extra Floor
     * means the extra row is custom.
     */
    if (
        !$pmdHasCustomFloor
        && $pmdFloorExplicitDefaultFlags > 0
        && $pmdFloorExplicitDefaultFlags
            < $pmdFloorRegistryCount
    ) {
        $pmdHasCustomFloor = true;
    }

    /*
     * Old registry compatibility only.
     * If zero entries carry the stable flag, fall back to
     * count > 1.
     */
    if ($pmdFloorExplicitDefaultFlags === 0) {
        $pmdHasCustomFloor =
            $pmdFloorRegistryCount > 1;
    }
    // PMD_EDIT_FLOOR_CUSTOM_EXISTENCE_V5_END
    $pmdShowFloorTabs = $pmdFloorRegistryCount > 1;
    $pmdFloorActiveId = trim((string)($pmdFloorActive['id'] ?? '')) ?: (string)$pmdFloorRegistry[0]['id'];
    $pmdFloorActiveName = trim((string)($pmdFloorActive['name'] ?? '')) ?: 'Main Floor';
    $pmdFloorActiveCookie = trim((string)($pmdCleanWorkspaceFloorCookie ?? ''));
    $pmdFloorTableMap = is_array($pmdCleanWorkspaceFloorTableMap ?? null)
        ? $pmdCleanWorkspaceFloorTableMap
        : ['by_id' => [], 'by_number' => [], 'by_name' => []];

    $pmdFloorKey = static function ($value): string {
        $text = preg_replace('/\s+/u', ' ', trim((string)$value)) ?: '';
        return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
    };

    $pmdResolveDisplayFloorName = static function (array $table) use ($pmdFloorTableMap, $pmdFloorKey): string {
        // PMD_SHARED_FLOOR_MULTI_FLOOR_V1_2_ASSIGNMENT_AUTHORITY
        // Legacy table floor_name/section metadata must not silently create or
        // assign PMD Floor maps. Only the explicit canonical table-id map can
        // move a table away from Main Floor.
        foreach (['dbTableId', 'db_table_id', 'table_id', 'id'] as $field) {
            $id = trim((string)($table[$field] ?? ''));
            if ($id !== '' && !empty($pmdFloorTableMap['by_id'][$id])) {
                return (string)$pmdFloorTableMap['by_id'][$id];
            }
        }

        foreach (['number', 'table_number', 'table_no'] as $field) {
            $number = $pmdFloorKey($table[$field] ?? '');
            if ($number !== '' && !empty($pmdFloorTableMap['by_number'][$number])) {
                return (string)$pmdFloorTableMap['by_number'][$number];
            }
        }

        foreach (['name', 'label', 'table_name'] as $field) {
            $name = $pmdFloorKey($table[$field] ?? '');
            if ($name !== '' && !empty($pmdFloorTableMap['by_name'][$name])) {
                return (string)$pmdFloorTableMap['by_name'][$name];
            }
        }

        return 'Main Floor';
    };

    $displayTables = array_values(array_filter($displayTables, static function ($table) use (
        $pmdResolveDisplayFloorName,
        $pmdFloorActiveName,
        $pmdFloorKey
    ): bool {
        if (!is_array($table)) return false;
        return $pmdFloorKey($pmdResolveDisplayFloorName($table)) === $pmdFloorKey($pmdFloorActiveName);
    }));

    /* PMD_FLOOR_TABLE_FEATURES_V1_4_2
     * Server-first icons come from the same canonical Floor bootstrap data.
     */
    $pmdFloorFeatureAllowed = ['near_window', 'quiet_area', 'accessible'];

    $pmdNormalizeFloorFeatures = static function ($value) use ($pmdFloorFeatureAllowed): array {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($value)) return [];

        $selected = [];
        foreach ($value as $key => $item) {
            if (!is_int($key) && !ctype_digit((string)$key)) {
                if (!$item) continue;
                $item = $key;
            }
            $item = strtolower(trim((string)$item));
            if ($item !== '' && in_array($item, $pmdFloorFeatureAllowed, true)) {
                $selected[$item] = true;
            }
        }
        return array_values(array_keys($selected));
    };

    $pmdFloorFeatureData = is_array($floorBootstrap['data'] ?? null)
        ? $floorBootstrap['data']
        : [];
    $pmdFloorFeatureRows = is_array($pmdFloorFeatureData['tables'] ?? null)
        ? $pmdFloorFeatureData['tables']
        : (is_array($pmdFloorFeatureData['sections']['floor_plan']['tables'] ?? null)
            ? $pmdFloorFeatureData['sections']['floor_plan']['tables']
            : []);

    $pmdFloorTableFeaturesById = [];
    $pmdFloorTableFeaturesByNumber = [];
    foreach ($pmdFloorFeatureRows as $pmdFloorFeatureRow) {
        if (!is_array($pmdFloorFeatureRow)) continue;
        $pmdFeatures = $pmdNormalizeFloorFeatures(
            $pmdFloorFeatureRow['features'] ?? $pmdFloorFeatureRow['table_features'] ?? []
        );
        $pmdId = trim((string)($pmdFloorFeatureRow['table_id'] ?? $pmdFloorFeatureRow['id'] ?? ''));
        if ($pmdId !== '') $pmdFloorTableFeaturesById[$pmdId] = $pmdFeatures;

        $pmdNo = trim((string)(
            $pmdFloorFeatureRow['table_no']
            ?? $pmdFloorFeatureRow['table_number']
            ?? $pmdFloorFeatureRow['number']
            ?? ''
        ));
        if ($pmdNo !== '') $pmdFloorTableFeaturesByNumber[$pmdNo] = $pmdFeatures;
    }

    $pmdFloorFeatureMeta = [
        'near_window' => ['de' => 'Am Fenster', 'en' => 'Near window'],
        'quiet_area' => ['de' => 'Ruhiger Bereich', 'en' => 'Quiet area'],
        'accessible' => ['de' => 'Barrierefrei', 'en' => 'Accessible'],
    ];

    $pmdFloorFeaturesForDisplay = static function (array $table) use (
        $pmdFloorTableFeaturesById,
        $pmdFloorTableFeaturesByNumber,
        $pmdNormalizeFloorFeatures
    ): array {
        foreach (['dbTableId', 'db_table_id', 'table_id', 'id'] as $field) {
            $id = trim((string)($table[$field] ?? ''));
            if ($id !== '' && array_key_exists($id, $pmdFloorTableFeaturesById)) {
                return array_values($pmdFloorTableFeaturesById[$id]);
            }
        }
        foreach (['number', 'table_number', 'table_no'] as $field) {
            $number = trim((string)($table[$field] ?? ''));
            if ($number !== '' && array_key_exists($number, $pmdFloorTableFeaturesByNumber)) {
                return array_values($pmdFloorTableFeaturesByNumber[$number]);
            }
        }
        return $pmdNormalizeFloorFeatures($table['features'] ?? $table['table_features'] ?? []);
    };

    /* PMD_FLOOR_INLINE_TABLE_MANAGER_V1
     * UI visibility is role-based (owner / manager only). Backend repeats the
     * same authorization independently. The save endpoint is ManagerLab so the
     * same handler is reachable from Owner DashboardLab and every clean Floor.
     */
    $pmdFloorCanManageTables = false;
    $pmdFloorTableManagerRole = '';

    try {
        $pmdFloorManagerUser = null;
        if (class_exists('\\Admin\\Facades\\AdminAuth')) {
            $pmdFloorManagerUser = \Admin\Facades\AdminAuth::getUser();
        } elseif (class_exists('AdminAuth')) {
            $pmdFloorManagerUser = \AdminAuth::getUser();
        }

        if ($pmdFloorManagerUser) {
            if (!empty($pmdFloorManagerUser->is_super_user)) {
                $pmdFloorTableManagerRole = 'owner';
            } elseif (!empty($pmdFloorManagerUser->staff_id)) {
                $pmdFloorManagerRoleRow = \Illuminate\Support\Facades\DB::table('staffs as s')
                    ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                    ->where('s.staff_id', (int)$pmdFloorManagerUser->staff_id)
                    ->select('r.code as role_code', 'r.name as role_name')
                    ->first();

                $pmdFloorManagerRoleCode = strtolower(trim((string)($pmdFloorManagerRoleRow->role_code ?? '')));
                $pmdFloorManagerRoleName = strtolower(trim((string)($pmdFloorManagerRoleRow->role_name ?? '')));

                if ($pmdFloorManagerRoleCode === 'owner' || $pmdFloorManagerRoleName === 'owner') {
                    $pmdFloorTableManagerRole = 'owner';
                } elseif ($pmdFloorManagerRoleCode === 'manager' || $pmdFloorManagerRoleName === 'manager') {
                    $pmdFloorTableManagerRole = 'manager';
                }
            }
        }
    } catch (\Throwable $e) {
        $pmdFloorTableManagerRole = '';
    }

    /*
     * PMD_FLOOR_MANAGEMENT_SURFACE_GATE_V2
     *
     * Product authority:
     * Add floor / Add table / Edit table exist only on the two
     * management Floor surfaces:
     *
     *   /admin/dashboardlab
     *   /admin/managerlab
     *
     * Role permission remains independently owner/manager.
     * Other workspaces reuse the Floor but must never render these controls.
     */
    $pmdFloorManagementSurfacePath =
        '/'.trim((string)request()->path(), '/');

    $pmdFloorManagementSurface = in_array(
        $pmdFloorManagementSurfacePath,
        [
            '/admin/dashboardlab',
            '/admin/managerlab',
        ],
        true
    );

    $pmdFloorCanManageTables =
        $pmdFloorManagementSurface
        && in_array(
            $pmdFloorTableManagerRole,
            ['owner', 'manager'],
            true
        );

    $pmdFloorTableManagerLocationId = max(0, (int)($locationId ?? 0));
    if ($pmdFloorTableManagerLocationId < 1) {
        try {
            $pmdFloorTableManagerLocationId = max(
                0,
                (int)app(\Admin\Services\PmdCleanWorkspaceSharedV1::class)->locationId()
            );
        } catch (\Throwable $e) {
            $pmdFloorTableManagerLocationId = 0;
        }
    }
    if ($pmdFloorTableManagerLocationId < 1) {
        try {
            $pmdFloorTableManagerLocationId = max(
                0,
                (int)app(\Admin\Services\PmdRoleDashboardDataV1::class)
                    ->resolveWorkspaceLocation()
            );
        } catch (\Throwable $e) {
            $pmdFloorTableManagerLocationId = 0;
        }
    }

    /*
     * PMD_FLOOR_LOCALE_FIRST_PAINT_R51
     *
     * Match the common Admin locale authority directly.
     * The common Admin head uses pmd_admin_locale first, then app locale.
     * Reading the same cookie here prevents the Floor from first-rendering
     * German while the surrounding Admin workspace is English.
     */
    $pmdFloorTableManagerLocale = strtolower(trim((string)request()->cookie(
        'pmd_admin_locale',
        app()->getLocale()
    )));

    if (!in_array($pmdFloorTableManagerLocale, ['en', 'de'], true)) {
        $pmdFloorTableManagerLocale = 'en';
    }

    $pmdFloorLayoutEditLabel = $pmdFloorTableManagerLocale === 'de'
        ? 'Layout bearbeiten'
        : 'Edit layout';
    $pmdFloorTableManagerText = $pmdFloorTableManagerLocale === 'de'
        ? [
            'add' => 'Tisch hinzufügen',
            'edit' => 'Tisch bearbeiten',
            'manage' => 'Floor-Tischverwaltung',
            'create_title' => 'Neuen Tisch erstellen',
            'edit_title' => 'Tisch bearbeiten',
            'create_subtitle' => 'Tischnummer, Floor und Plätze verwalten.',
            'edit_subtitle' => 'Tischnummer, Floor, Plätze und QR verwalten.',
            'number' => 'Tischnummer',
            'section' => 'Bereich / Zone',
            'floor' => 'Floor',
            'shape' => 'Form',
            'min' => 'Min. Gäste',
            'normal' => 'Normale Plätze',
            'max' => 'Max. Gäste',
            'extra' => 'Zusatzstühle',
            'priority' => 'Priorität',
            'reservation_priority' => 'Reservierungspriorität',
            'enabled' => 'Aktiv',
            'reservable' => 'Reservierbar',
            'visible' => 'Auf Floor sichtbar',
            'joinable' => 'Zusammenstellbar',
            'notes' => 'Interne Floor-Notiz',
            'notes_placeholder' => 'Optional, z. B. Fensterplatz oder betriebliche Hinweise',
            'cancel' => 'Abbrechen',
            'save' => 'Tisch speichern',
            'delete' => 'Tisch entfernen',
            'deleting' => 'Entfernen…',
            'delete_confirm' => 'Diesen Tisch dauerhaft entfernen? Der QR-Code dieses Tisches funktioniert danach nicht mehr.',
            'saving' => 'Speichern…',
            'loading' => 'Tischdaten werden geladen…',
            'locked' => 'POS-/Custom-Tisch: Die Nummer wird vom bestehenden POS-System verwaltet.',
            'qr' => 'QR bleibt vollständig im bestehenden PMD-Tischsystem. Dieses Fenster liest oder ändert keinen QR-Code.',
            'select_first' => 'Zuerst einen einzelnen Tisch auswählen.',
        ]
        : [
            'add' => 'Add table',
            'edit' => 'Edit table',
            'manage' => 'Floor table management',
            'create_title' => 'Create new table',
            'edit_title' => 'Edit table',
            'create_subtitle' => 'Manage table number, Floor and capacity.',
            'edit_subtitle' => 'Manage table number, Floor, capacity and QR.',
            'number' => 'Table number',
            'section' => 'Section / Zone',
            'floor' => 'Floor',
            'shape' => 'Shape',
            'min' => 'Minimum guests',
            'normal' => 'Normal seats',
            'max' => 'Maximum guests',
            'extra' => 'Extra chairs',
            'priority' => 'Priority',
            'reservation_priority' => 'Reservation priority',
            'enabled' => 'Enabled',
            'reservable' => 'Reservable',
            'visible' => 'Visible on Floor',
            'joinable' => 'Joinable',
            'notes' => 'Internal Floor note',
            'notes_placeholder' => 'Optional, for example window seat or operational notes',
            'cancel' => 'Cancel',
            'save' => 'Save table',
            'delete' => 'Remove table',
            'deleting' => 'Removing…',
            'delete_confirm' => 'Remove this table permanently? Its QR code will stop working after deletion.',
            'saving' => 'Saving…',
            'loading' => 'Loading table details…',
            'locked' => 'POS/custom table: its number is managed by the existing POS system.',
            'qr' => 'QR remains fully managed by the existing PMD table system. This card never reads or changes QR codes.',
            'select_first' => 'Select one individual table first.',
        ];

    // PMD_FLOOR_MANAGE_TEXT_V2
    $pmdFloorManageText =
        $pmdFloorTableManagerLocale === 'de'
            ? [
                'button' => 'Floor bearbeiten',
                'title' => 'Floor bearbeiten',
                'subtitle' =>
                    'Diesen Floor umbenennen oder entfernen.',
                'name' => 'Floor-Name',
                'save' => 'Namen speichern',
                'remove' => 'Floor entfernen',
                'cancel' => 'Abbrechen',
                'locked' =>
                    'Dies ist der Standard-Floor. Er kann umbenannt, aber nicht entfernt werden.',
                'confirm' =>
                    'Diesen Floor entfernen? Seine Tische werden zu Main Floor verschoben. Keine Tische werden gelöscht.',
            ]
            : [
                'button' => 'Edit floor',
                'title' => 'Edit floor',
                'subtitle' =>
                    'Rename or remove this Floor.',
                'name' => 'Floor name',
                'save' => 'Save name',
                'remove' => 'Remove floor',
                'cancel' => 'Cancel',
                'locked' =>
                    'This is the default Floor. You can rename it, but it cannot be removed.',
                'confirm' =>
                    'Remove this Floor? Its tables will move to Main Floor. No tables will be deleted.',
            ];

    $pmdFloorRegistryText = $pmdFloorTableManagerLocale === 'de'
        ? [
            'add_floor' => 'Floor hinzufügen',
            'title' => 'Neuen Floor erstellen',
            'subtitle' => 'Erstelle eine weitere Floor-Map für diesen Restaurant-Standort.',
            'name' => 'Floor-Name',
            'placeholder' => 'z. B. Erdgeschoss, Terrasse oder 1. Etage',
            'cancel' => 'Abbrechen',
            'create' => 'Floor erstellen',
            'required' => 'Bitte einen Floor-Namen eingeben.',
        ]
        : [
            'add_floor' => 'Add floor',
            'title' => 'Create new floor',
            'subtitle' => 'Create another Floor map for this restaurant location.',
            'name' => 'Floor name',
            'placeholder' => 'For example Ground floor, Terrace or First floor',
            'cancel' => 'Cancel',
            'create' => 'Create floor',
            'required' => 'Floor name is required.',
        ];

    /* PMD_FLOOR_RESERVATION_BUSY_WINDOWS_V1_2
     * Read-only windows are resolved once by PmdCleanWorkspaceControllerV1
     * using the canonical Reservations_model cancellation history authority.
     * This Blade only adopts them for deterministic first paint.
     */
    $pmdFloorReservationBusyWindows = is_array($reservationBusyWindows ?? null)
        ? array_values($reservationBusyWindows)
        : [];
    $pmdFloorReservationBusyNumbers = [];
    $pmdFloorNowMs = \Carbon\Carbon::now('Europe/Berlin')->getTimestamp() * 1000;

    foreach ($pmdFloorReservationBusyWindows as $pmdFloorReservationWindow) {
        if (!is_array($pmdFloorReservationWindow)) continue;
        $pmdFloorStartMs = (int)($pmdFloorReservationWindow['start_ms'] ?? 0);
        $pmdFloorEndMs = (int)($pmdFloorReservationWindow['end_ms'] ?? 0);
        $pmdFloorTableNo = trim((string)($pmdFloorReservationWindow['table_no'] ?? ''));
        if ($pmdFloorStartMs < 1 || $pmdFloorEndMs <= $pmdFloorStartMs) continue;
        if ($pmdFloorNowMs < $pmdFloorStartMs || $pmdFloorNowMs >= $pmdFloorEndMs) continue;
        if ($pmdFloorTableNo !== '') $pmdFloorReservationBusyNumbers[$pmdFloorTableNo] = true;
    }

    $pmdFloorDisplayIsReservationBusy = static function (array $table) use ($pmdFloorReservationBusyNumbers): bool {
        if (!$pmdFloorReservationBusyNumbers) return false;
        $numberText = trim((string)($table['number'] ?? ''));
        if ($numberText !== '' && isset($pmdFloorReservationBusyNumbers[$numberText])) return true;
        if ($numberText !== '' && preg_match_all('/\d+/', $numberText, $matches)) {
            foreach ((array)($matches[0] ?? []) as $number) {
                if (isset($pmdFloorReservationBusyNumbers[(string)$number])) return true;
            }
        }
        return false;
    };

    $stripLabel = $floorMode === 'row'
        ? 'Full Floor'
        : 'One row';

    $endpoints = is_array($floorBootstrap['endpoints'] ?? null)
        ? $floorBootstrap['endpoints']
        : [];

    $canvasWidth = 1000.0;
    $canvasHeight = $floorMode === 'row' ? 146.0 : 560.0;

    foreach ($displayTables as $table) {
        if (!is_array($table)) {
            continue;
        }

        $right = (float)($table['x'] ?? 0)
            + ((float)($table['w'] ?? 108) / 2)
            + 24;

        $bottom = (float)($table['y'] ?? 0)
            + ((float)($table['h'] ?? 88) / 2)
            + 22;

        $canvasWidth = max($canvasWidth, $right);
        $canvasHeight = max($canvasHeight, $bottom);
    }

    $canvasWidth = (int)ceil($canvasWidth);
    $canvasHeight = (int)ceil(
        $floorMode === 'row'
            ? max(146, $canvasHeight)
            : max(560, $canvasHeight)
    );

    $pmdFloorBootstrapData = is_array($floorBootstrap['data'] ?? null)
        ? $floorBootstrap['data']
        : [];
    $pmdFloorBootstrapData['pmd_reservation_busy_windows'] = $pmdFloorReservationBusyWindows;

    $floorBootstrapPayload = [
        'version' => $floorBootstrap['version']
            ?? 'dashboard-lab-exact-reservations-floor-v1',
        'data' => $pmdFloorBootstrapData,
        'layout' => $floorBootstrap['layout'] ?? [],
        'state' => $floorBootstrap['state'] ?? [
            'tables' => [],
            'merges' => [],
        ],
        'mode' => $floorMode,
        'zoom' => $floorZoom,
    ];

    $floorBootstrapJson = json_encode(
        $floorBootstrapPayload,
        JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT
    );

    if ($floorBootstrapJson === false) {
        $floorBootstrapJson = '{}';
    }

    $pmdSharedFloorMultiFloorJson = json_encode([
        'version' => 1,
        'location_id' => $pmdFloorTableManagerLocationId,
        'cookie_name' => $pmdFloorActiveCookie,
        'floors' => $pmdFloorRegistry,
        'floor_count' => $pmdFloorRegistryCount,
        'active' => [
            'id' => $pmdFloorActiveId,
            'name' => $pmdFloorActiveName,
        ],
        'table_floor_map' => $pmdFloorTableMap,
        'can_manage' => $pmdFloorCanManageTables,
        'registry_url' => $pmdFloorCanManageTables ? admin_url('managerlab') : '',
        'registry_read_url' => request()->url(),
        'text' => [
            'name_required' => $pmdFloorRegistryText['required'],
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    if ($pmdSharedFloorMultiFloorJson === false) $pmdSharedFloorMultiFloorJson = '{}';
@endphp

<section
    id="pmd-r2-shared-floor-canvas-v310"
    class="pmd-floor-v1 pmd-dashboard-lab-exact-floor-v1{{ $floorMode === 'row' ? ' is-strip-mode is-strip-calibrated' : '' }}"
    data-pmd-floor
    data-pmd-dashboard-lab-exact-floor="v1"
    data-pmd-active-floor-id="{{ $pmdFloorActiveId }}"
    data-pmd-active-floor-name="{{ $pmdFloorActiveName }}"
    data-size="large"
    data-mode="full"
    data-data-url="{{ $endpoints['data'] ?? admin_url('pmd-waiter-dashboard-v9-tenant-data') }}"
    data-layout-url="{{ $endpoints['layout'] ?? admin_url('pmd-owner-dashboard-floor-layout') }}"
    data-state-url="{{ $endpoints['state'] ?? admin_url('pmd-floor-v1/state') }}"
    data-pmd-reservation-busy-url="{{ request()->url() }}"
    data-pmd-reservation-busy-handler="onPmdFloorReservationBusyWindows"
    @if($pmdFloorCanManageTables)
    data-pmd-floor-table-manager="true"
    data-pmd-floor-table-manager-url="{{ admin_url('managerlab') }}"
    data-pmd-floor-table-manager-location="{{ $pmdFloorTableManagerLocationId }}"
    data-pmd-floor-table-manager-role="{{ $pmdFloorTableManagerRole }}"
    @endif
    data-order-url="{{ $endpoints['order'] ?? admin_url('waiter-pos/{table}') }}"
    data-floor-view-id="main-floor"
    data-floor-view-url="{{ request()->url() }}"
    data-floor-view-mode="{{ $floorMode }}"
    data-floor-full-zoom="{{ $floorZoom }}"
    data-floor-mode-cookie=""
    data-floor-zoom-cookie=""
    data-pmd-floor-view-preference="user-page-v1"
    data-pmd-floor-boot-source="server"
    data-pmd-floor-feature-locale="{{ $pmdFloorTableManagerLocale }}"
    aria-busy="false"
>
    <div
        id="pmd-r2-floor-toolbar-host-v464"
        class="pmd-dashboard-lab-exact-floor-v1__toolbar-host"
    >
        <div
            id="pmd-r2-floor-toolbar-v316"
            class="pmd-r2-floor-toolbar-v316"
            role="toolbar"
            aria-label="Floor controls"
        >
            <div
                class="pmd-shared-floor-switcher"
                data-pmd-floor-switcher
                role="tablist"
                aria-label="Floors"
                @if(!$pmdShowFloorTabs && !$pmdFloorCanManageTables) hidden @endif
            >
                @if($pmdShowFloorTabs)
                    @foreach($pmdFloorRegistry as $pmdFloorRegistryItem)
                        @php
                            $pmdFloorRegistryItemId = trim((string)($pmdFloorRegistryItem['id'] ?? ''));
                            $pmdFloorRegistryItemName = trim((string)($pmdFloorRegistryItem['name'] ?? '')) ?: 'Floor';
                            $pmdFloorRegistryItemActive = $pmdFloorRegistryItemId === $pmdFloorActiveId;
                        @endphp
                        <button
                            type="button"
                            class="pmd-shared-floor-switcher__floor{{ $pmdFloorRegistryItemActive ? ' is-active' : '' }}"
                            data-pmd-floor-switch="{{ $pmdFloorRegistryItemId }}"
                            role="tab"
                            aria-selected="{{ $pmdFloorRegistryItemActive ? 'true' : 'false' }}"
                        >{{ $pmdFloorRegistryItemName }}</button>
                    @endforeach
                @endif

                @if($pmdFloorCanManageTables)
                    <button
                        type="button"
                        class="pmd-shared-floor-switcher__add"
                        data-pmd-floor-add
                        aria-label="{{ $pmdFloorRegistryText['add_floor'] }}"
                        title="{{ $pmdFloorRegistryText['add_floor'] }}"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
                        <span>{{ $pmdFloorRegistryText['add_floor'] }}</span>
                    </button>

                    {{-- PMD_FLOOR_MANAGE_LEFT_SWITCHER_V3 --}}
                                        <!-- PMD_EDIT_FLOOR_SECOND_FLOOR_VISIBILITY_V4_SERVER -->
<button
                        type="button"
                        class="pmd-shared-floor-switcher__add pmd-shared-floor-switcher__manage"
                        data-pmd-floor-manage
                        aria-label="{{ $pmdFloorManageText['button'] }}"
                        title="{{ $pmdFloorManageText['button'] }}"
                        data-pmd-floor-manage-custom-visible="{{ $pmdHasCustomFloor ? '1' : '0' }}"
                        @if(!$pmdHasCustomFloor) hidden @endif
                        style="display:{{ $pmdHasCustomFloor ? 'inline-flex' : 'none' }}!important;visibility:{{ $pmdHasCustomFloor ? 'visible' : 'hidden' }}!important;pointer-events:{{ $pmdHasCustomFloor ? 'auto' : 'none' }}!important;"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M3 7l9-4 9 4-9 4-9-4"></path>
                            <path d="M5 12l7 3 7-3"></path>
                            <path d="M14 20l5-5"></path>
                            <path d="M17 14l3 3"></path>
                        </svg>

                        <span>
                            {{ $pmdFloorManageText['button'] }}
                        </span>
                    </button>
                @endif
            </div>
            <span
                class="pmd-shared-floor-switcher__divider"
                data-pmd-floor-switcher-divider
                aria-hidden="true"
                @if(!$pmdShowFloorTabs && !$pmdFloorCanManageTables) hidden @endif
            ></span>

            @if($pmdFloorCanManageTables)
                <button
                    type="button"
                    class="pmd-r2-floor-tool-v316 pmd-floor-table-manager__toolbar-button is-add"
                    data-pmd-floor-table-add
                    aria-label="{{ $pmdFloorTableManagerText['add'] }}"
                    title="{{ $pmdFloorTableManagerText['add'] }}"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
                    <span>{{ $pmdFloorTableManagerText['add'] }}</span>
                </button>

                <button
                    type="button"
                    class="pmd-r2-floor-tool-v316 pmd-floor-table-manager__toolbar-button is-edit"
                    data-pmd-floor-table-edit
                    aria-label="{{ $pmdFloorTableManagerText['edit'] }}"
                    title="{{ $pmdFloorTableManagerText['edit'] }}"
                    disabled
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4"></path><path d="M13.5 6.5l4 4"></path></svg>
                    <span>{{ $pmdFloorTableManagerText['edit'] }}</span>
                </button>

                <span class="pmd-floor-table-manager__toolbar-divider" aria-hidden="true"></span>
            @endif

            @php
                // PMD_FLOOR_TOGGLE_SERVER_FIRST_PAINT_R50
                $pmdFloorLayoutEditLabel = $pmdFloorTableManagerLocale === 'de'
                    ? 'Layout bearbeiten'
                    : 'Edit layout';
                $pmdFloorStripActionLabel = $floorMode === 'row'
                    ? ($pmdFloorTableManagerLocale === 'de' ? 'Gesamter Floor' : 'Full Floor')
                    : ($pmdFloorTableManagerLocale === 'de' ? 'Eine Reihe' : 'One row');
            @endphp

                        {{-- PMD_FLOOR_EDIT_SERVER_FIRST_R51 --}}
<button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="edit" aria-pressed="false" aria-label="{{ $pmdFloorLayoutEditLabel }}" title="{{ $pmdFloorLayoutEditLabel }}">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4"></path><path d="M13.5 6.5l4 4"></path></svg>
                <span>{{ $pmdFloorLayoutEditLabel }}</span>
            </button>

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="zoom-out" aria-label="Zoom out" title="Zoom out">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6"></path></svg>
            </button>

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="zoom-in" aria-label="Zoom in" title="Zoom in">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6"></path></svg>
            </button>

            {{-- PMD_FLOOR_TOGGLE_SERVER_FIRST_PAINT_R56 --}}
            
<button
                type="button"
                class="pmd-r2-floor-tool-v316"
                data-pmd-r2-tool="strip"
                aria-pressed="{{ $floorMode === 'row' ? 'true' : 'false' }}"
                aria-label="{{ $pmdFloorStripActionLabel }}"
                title="{{ $pmdFloorStripActionLabel }}"
                data-pmd-floor-toggle-icon="{{ $floorMode === 'row' ? 'expand-corners' : 'collapse' }}"
            
                data-pmd-floor-toggle-inline-square-r63=""
                style="display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:52px!important;min-width:52px!important;max-width:52px!important;inline-size:52px!important;min-inline-size:52px!important;max-inline-size:52px!important;height:52px!important;min-height:52px!important;max-height:52px!important;flex:0 0 52px!important;flex-basis:52px!important;flex-grow:0!important;flex-shrink:0!important;padding:0!important;margin:0!important;aspect-ratio:1/1!important;overflow:hidden!important;box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:52px!important;min-width:52px!important;max-width:52px!important;inline-size:52px!important;min-inline-size:52px!important;max-inline-size:52px!important;height:52px!important;min-height:52px!important;max-height:52px!important;flex:0 0 52px!important;flex-basis:52px!important;flex-grow:0!important;flex-shrink:0!important;padding:0!important;margin:0!important;aspect-ratio:1/1!important;overflow:hidden!important;"
            
                data-pmd-floor-toggle-repair-r65="">
                @if($floorMode === 'row')
                    {{-- One row active: next action is Full Floor. No arrows: open screen corners. --}}
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" style="display:block!important;width:20px!important;min-width:20px!important;max-width:20px!important;height:20px!important;min-height:20px!important;max-height:20px!important;flex:0 0 20px!important;margin:0!important;display:block!important;width:20px!important;min-width:20px!important;max-width:20px!important;height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0!important;">
                        <path d="M9 4H4v5"></path>
                        <path d="M15 4h5v5"></path>
                        <path d="M20 15v5h-5"></path>
                        <path d="M9 20H4v-5"></path>
                    </svg>
                @else
                    {{-- Full Floor active: next action compresses to One row. --}}
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 4l4.5 4.5"></path><path d="M5.75 8.5H8.5V5.75"></path>
                        <path d="M20 4l-4.5 4.5"></path><path d="M15.5 5.75V8.5h2.75"></path>
                        <path d="M4 20l4.5-4.5"></path><path d="M8.5 18.25V15.5H5.75"></path>
                        <path d="M20 20l-4.5-4.5"></path><path d="M18.25 15.5H15.5v2.75"></path>
                    </svg>
                @endif
            </button>
        </div>
    </div>

    <header class="pmd-floor-v1__header" aria-hidden="true">
        <div class="pmd-floor-v1__heading">
            <span class="pmd-floor-v1__eyebrow">Live operations</span>
            <h1>Restaurant Floor</h1>
            <p>Shared operational floor map.</p>
        </div>

        <div class="pmd-floor-v1__toolbar" role="toolbar" aria-label="Native Floor controls">
            <button type="button" data-floor-edit aria-pressed="false" title="Edit layout">Edit</button>
            <button type="button" data-floor-save hidden title="Save layout">Save</button>
            <button type="button" data-floor-merge aria-pressed="false" title="Merge tables">Merge</button>
            <button type="button" data-floor-zoom-out aria-label="Zoom out">−</button>
            <button type="button" data-floor-fit aria-label="Fit floor">Fit</button>
            <button type="button" data-floor-zoom-in aria-label="Zoom in">＋</button>
            <button type="button" data-floor-strip aria-pressed="{{ $floorMode === 'row' ? 'true' : 'false' }}" title="{{ $stripLabel }}">{{ $stripLabel }}</button>
            <button type="button" data-floor-fullscreen aria-label="Fullscreen">Fullscreen</button>
            <button type="button" data-floor-refresh aria-label="Refresh">Refresh</button>
        </div>
    </header>

    <div class="pmd-floor-v1__statusbar" aria-hidden="true">
        <div class="pmd-floor-v1__filters" role="group" aria-label="Filter tables">
            <button type="button" class="is-active" data-floor-filter="all">All <b data-floor-count="all">{{ count($displayTables) }}</b></button>
            <button type="button" data-floor-filter="available">Available <b data-floor-count="available">0</b></button>
            <button type="button" data-floor-filter="occupied">Occupied <b data-floor-count="occupied">0</b></button>
            <button type="button" data-floor-filter="reserved">Reserved <b data-floor-count="reserved">0</b></button>
            <button type="button" data-floor-filter="cleaning">Cleaning <b data-floor-count="cleaning">0</b></button>
            <button type="button" data-floor-filter="attention">Attention <b data-floor-count="attention">0</b></button>
        </div>
        <label class="pmd-floor-v1__search"><span>⌕</span><input type="search" data-floor-search placeholder="Search table or area…"></label>
    </div>

    <div class="pmd-floor-v1__stage" data-floor-stage>
        <div class="pmd-floor-v1__loading" data-floor-loading hidden>Loading live floor…</div>
        <div class="pmd-floor-v1__empty" data-floor-empty {{ count($displayTables) ? 'hidden' : '' }}>No tables match this view.</div>

        <div class="pmd-floor-v1__canvas-wrap" data-floor-scroll style="height:{{ $floorMode === 'row' ? $canvasHeight : 560 }}px;min-height:{{ $floorMode === 'row' ? $canvasHeight : 560 }}px;max-height:{{ $floorMode === 'row' ? $canvasHeight : 560 }}px">
            <div class="pmd-floor-v1__canvas" data-floor-canvas style="width:{{ $canvasWidth }}px;min-width:{{ $canvasWidth }}px;height:{{ $canvasHeight }}px;min-height:{{ $canvasHeight }}px;transform:scale({{ $floorMode === 'row' ? 1 : $floorZoom }})">
                @foreach($displayTables as $table)
                    @php
                        $status = (string)($table['status'] ?? 'available');

                        // PMD_FLOOR_R60T_SERVER_PHYSICAL_OCCUPANCY
                        $pmdOperationalStatus = strtolower(
                            trim(
                                (string)(
                                    $table['operational_status']
                                    ?? $table['table_operational_status']
                                    ?? ''
                                )
                            )
                        );

                        /*
                         * Financial settlement is not a physical
                         * table-release instruction.
                         *
                         * An explicitly occupied table stays
                         * occupied until staff sets it free.
                         */
                        if (
                            $pmdOperationalStatus === 'occupied'
                            && !in_array(
                                $status,
                                [
                                    'attention',
                                    'cleaning',
                                    'reserved',
                                ],
                                true
                            )
                        ) {
                            $status = 'occupied';
                        }

                        $pmdReservationBusyNow = $pmdFloorDisplayIsReservationBusy($table);
                        if ($pmdReservationBusyNow && !in_array($status, ['attention', 'cleaning'], true)) {
                            $status = 'occupied';
                        }
                        $rangeColor = $status === 'available'
                            ? 'free'
                            : ($status === 'occupied'
                                ? 'busy'
                                : ($status === 'reserved' ? 'rangeReservation' : ''));
                        $isMerged = !empty($table['is_merged']);
                        $pmdDisplayFeatures = $pmdFloorFeaturesForDisplay($table);
                    @endphp

                    <button
                        type="button"
                        class="pmd-floor-v1__table{{ $isMerged ? ' is-merged-card' : '' }}"
                        data-floor-table="{{ $table['id'] }}"
                        @if($isMerged)
                            data-floor-merge-id="{{ $table['merge_id'] }}"
                            data-floor-members="{{ implode(',', $table['member_ids'] ?? []) }}"
                        @endif
                        data-status="{{ $status }}"
                        @if($pmdReservationBusyNow) data-pmd-reservation-busy="true" @endif
                        @if($rangeColor !== '') data-pmd-range-color="{{ $rangeColor }}" @endif
                        style="left:{{ $table['x'] }}px;top:{{ $table['y'] }}px;width:{{ $table['w'] }}px;height:{{ $table['h'] }}px"
                        aria-label="{{ $table['name'] }}"
                    >
                        @if($isMerged || !empty($table['waiter_call']) || !empty($table['note']) || !empty($table['cleaning']))
                            <span class="pmd-floor-v1__badges">
                                @if($isMerged)<span class="pmd-floor-v1__badge is-merge" title="Merged tables">↔</span>@endif
                                @if(!empty($table['waiter_call']))<span class="pmd-floor-v1__badge is-call" title="Waiter call">♟</span>@endif
                                @if(!empty($table['note']))<span class="pmd-floor-v1__badge is-note" title="Note">✎</span>@endif
                                @if(!empty($table['cleaning']))<span class="pmd-floor-v1__badge is-clean" title="Needs cleaning">✦</span>@endif
                            </span>
                        @endif

                        <strong class="pmd-floor-v1__table-number">{{ $table['number'] }}</strong>

                        @if($pmdDisplayFeatures)
                            <span class="pmd-floor-table-features" data-pmd-floor-table-features aria-hidden="true">
                                @foreach($pmdDisplayFeatures as $pmdDisplayFeature)
                                    @php
                                        $pmdFeatureLabel = $pmdFloorFeatureMeta[$pmdDisplayFeature][$pmdFloorTableManagerLocale]
                                            ?? $pmdFloorFeatureMeta[$pmdDisplayFeature]['en']
                                            ?? $pmdDisplayFeature;
                                    @endphp
                                    <span class="pmd-floor-table-feature-icon is-{{ $pmdDisplayFeature }}" title="{{ $pmdFeatureLabel }}">
                                        @if($pmdDisplayFeature === 'near_window')
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 12h16M12 4v16"></path></svg>
                                        @elseif($pmdDisplayFeature === 'quiet_area')
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="m16 9 5 6M21 9l-5 6"></path></svg>
                                        @elseif($pmdDisplayFeature === 'accessible')
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="2"></circle><path d="M7 9h5l2 5h3M9 9v5a4 4 0 1 0 4 4M13 14l2 6h4"></path></svg>
                                        @endif
                                    </span>
                                @endforeach
                            </span>
                        @endif

                        @if(!in_array($status, ['available', 'occupied'], true))
                            <span class="pmd-floor-v1__table-meta">{{ str_replace('-', ' ', $status) }}</span>
                        @endif
                    </button>
                @endforeach
            </div>
        </div>

        <button type="button" data-floor-guide aria-label="Floor guide" aria-expanded="false" title="Floor guide">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg>
        </button>

        <aside class="pmd-floor-v1__guide" data-floor-guide-card aria-label="Floor guide" hidden>
            <p data-floor-guide-status="available"><i class="is-available"></i>Available</p>
            <p data-floor-guide-status="occupied"><i class="is-occupied"></i>Occupied / open order</p>
        </aside>
    </div>

    <aside class="pmd-floor-v1__drawer" data-floor-drawer aria-hidden="true">
        <button type="button" class="pmd-floor-v1__drawer-backdrop" data-floor-close aria-label="Close details"></button>
        <section>
            <header><div><span>Table</span><h2 data-floor-drawer-title>—</h2></div><button type="button" data-floor-close aria-label="Close">×</button></header>
            <div class="pmd-floor-v1__drawer-body">
                <div class="pmd-floor-v1__table-summary" data-floor-summary></div>
                <div class="pmd-floor-v1__actions">
                    <button type="button" data-floor-action="available">✓ Mark available</button>
                    <button type="button" data-floor-action="cleaning">✦ Needs cleaning</button>
                    <button type="button" data-floor-action="reserved">◷ Mark reserved</button>
                    <button type="button" data-floor-action="waiter-call">♟ Waiter call</button>
                    <button type="button" data-floor-action="note">✎ Add note</button>
                    <button type="button" data-floor-action="order" class="is-primary">＋ Open table</button>
                </div>
                <div class="pmd-floor-v1__note" data-floor-note hidden></div>
                <div class="pmd-floor-v1__merge-info" data-floor-merge-info hidden></div>
            </div>
        </section>
    </aside>

    @if($pmdFloorCanManageTables)
        {{-- PMD_FLOOR_MANAGE_CARD_V2 --}}
        <div
            class="pmd-floor-registry-manager"
            data-pmd-floor-manage-panel
            data-delete-confirm="{{ $pmdFloorManageText['confirm'] }}"
            hidden
            style="position:fixed!important;inset:0!important;z-index:2147483646!important;isolation:isolate!important;opacity:1!important;filter:none!important;-webkit-filter:none!important;"
        >
            <button
                type="button"
                class="pmd-floor-registry-manager__backdrop"
                data-pmd-floor-manage-close
                aria-label="{{ $pmdFloorManageText['cancel'] }}"
                style="position:fixed!important;inset:0!important;z-index:1!important;width:100vw!important;height:100vh!important;border:0!important;background:rgba(15,35,54,.42)!important;opacity:1!important;filter:none!important;-webkit-filter:none!important;"
            ></button>

            <section
                class="pmd-floor-registry-manager__card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pmd-floor-manage-title-v2"
                style="position:relative!important;z-index:2!important;background:#fff!important;background-color:#fff!important;opacity:1!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;"
            >
                <header
                    class="pmd-floor-registry-manager__header"
                >
                    <div>
                        <h2 id="pmd-floor-manage-title-v2">
                            {{ $pmdFloorManageText['title'] }}
                        </h2>

                        <p>
                            {{ $pmdFloorManageText['subtitle'] }}
                        </p>
                    </div>

                    <button
                        type="button"
                        class="pmd-floor-registry-manager__close"
                        data-pmd-floor-manage-close
                        aria-label="{{ $pmdFloorManageText['cancel'] }}"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                        >
                            <path d="M6 6l12 12"></path>
                            <path d="M18 6L6 18"></path>
                        </svg>
                    </button>
                </header>

                <div
                    class="pmd-floor-registry-manager__body"
                >
                    <label
                        class="pmd-floor-registry-manager__field"
                    >
                        <span>
                            {{ $pmdFloorManageText['name'] }}
                        </span>

                        <input
                            type="text"
                            maxlength="120"
                            autocomplete="off"
                            data-pmd-floor-manage-name
                        >
                    </label>

                    <div
                        class="pmd-floor-registry-manager__locked"
                        data-pmd-floor-manage-locked
                        hidden
                    >
                        {{ $pmdFloorManageText['locked'] }}
                    </div>

                    <div
                        class="pmd-floor-registry-manager__error"
                        data-pmd-floor-manage-error
                        hidden
                    ></div>
                </div>

                <footer
                    class="pmd-floor-registry-manager__footer"
                >
                    <button
                        type="button"
                        class="pmd-floor-registry-manager__delete"
                        data-pmd-floor-manage-delete
                    >
                        {{ $pmdFloorManageText['remove'] }}
                    </button>

                    <button
                        type="button"
                        class="pmd-floor-registry-manager__cancel"
                        data-pmd-floor-manage-close
                    >
                        {{ $pmdFloorManageText['cancel'] }}
                    </button>

                    <button
                        type="button"
                        class="pmd-floor-registry-manager__save"
                        data-pmd-floor-manage-save
                    >
                        {{ $pmdFloorManageText['save'] }}
                    </button>
                </footer>
            </section>
        </div>

        <div class="pmd-floor-registry-manager" data-pmd-floor-add-panel hidden style="position:fixed!important;inset:0!important;z-index:2147483646!important;isolation:isolate!important;opacity:1!important;filter:none!important;-webkit-filter:none!important;">
            <button type="button" class="pmd-floor-registry-manager__backdrop" data-pmd-floor-add-close aria-label="{{ $pmdFloorRegistryText['cancel'] }}" style="position:fixed!important;inset:0!important;z-index:1!important;width:100vw!important;height:100vh!important;border:0!important;background:rgba(15,35,54,.42)!important;opacity:1!important;filter:none!important;-webkit-filter:none!important;"></button>
            <section class="pmd-floor-registry-manager__card" role="dialog" aria-modal="true" aria-labelledby="pmd-floor-registry-manager-title-v1" style="position:relative!important;z-index:2!important;background:#fff!important;background-color:#fff!important;opacity:1!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;">
                <header class="pmd-floor-registry-manager__header">
                    <div>
                        <h2 id="pmd-floor-registry-manager-title-v1">{{ $pmdFloorRegistryText['title'] }}</h2>
                        <p>{{ $pmdFloorRegistryText['subtitle'] }}</p>
                    </div>
                    <button type="button" class="pmd-floor-registry-manager__close" data-pmd-floor-add-close aria-label="{{ $pmdFloorRegistryText['cancel'] }}">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                    </button>
                </header>
                <div class="pmd-floor-registry-manager__body">
                    <label class="pmd-floor-registry-manager__field">
                        <span>{{ $pmdFloorRegistryText['name'] }}</span>
                        <input type="text" maxlength="120" data-pmd-floor-add-name placeholder="{{ $pmdFloorRegistryText['placeholder'] }}" autocomplete="off">
                    </label>
                    <div class="pmd-floor-registry-manager__error" data-pmd-floor-add-error hidden></div>
                </div>
                <footer class="pmd-floor-registry-manager__footer">
                    <button type="button" class="pmd-floor-registry-manager__cancel" data-pmd-floor-add-close>{{ $pmdFloorRegistryText['cancel'] }}</button>
                    <button type="button" class="pmd-floor-registry-manager__save" data-pmd-floor-add-save>{{ $pmdFloorRegistryText['create'] }}</button>
                </footer>
            </section>
        </div>



{{-- PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_IDENTITY_READ_ONLY --}}
@php
    $pmdFloorQrRestaurantNameR3 = '';
    $pmdFloorQrRestaurantLogoR3 = '';
    try {
        $pmdFloorQrRestaurantNameR3 = trim((string)(
            \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'pmd_restaurant_identity_name')
                ->value('value')
            ?: \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'site_name')
                ->value('value')
            ?: ''
        ));
    } catch (\Throwable $error) {
        $pmdFloorQrRestaurantNameR3 = '';
    }
    if ($pmdFloorQrRestaurantNameR3 === '') {
        try {
            $pmdFloorQrRestaurantNameR3 = trim((string)(
                \Illuminate\Support\Facades\DB::table('locations')
                    ->where('location_id', (int)$pmdFloorTableManagerLocationId)
                    ->value('location_name')
                ?: ''
            ));
        } catch (\Throwable $error) {
            $pmdFloorQrRestaurantNameR3 = '';
        }
    }
    if ($pmdFloorQrRestaurantNameR3 === '') {
        $pmdFloorQrRestaurantNameR3 = ucfirst((string)(explode('.', request()->getHost())[0] ?? 'Restaurant'));
    }

    try {
        $pmdFloorQrRestaurantLogoR3 = trim((string)(
            \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'pmd_restaurant_identity_logo')
                ->value('value')
            ?: \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'site_logo')
                ->value('value')
            ?: ''
        ));
    } catch (\Throwable $error) {
        $pmdFloorQrRestaurantLogoR3 = '';
    }
    if ($pmdFloorQrRestaurantLogoR3 === '') {
        $pmdFloorQrRestaurantLogoR3 = '/brand/paymydine-logo.svg';
    } elseif (!preg_match('#^https?://#i', $pmdFloorQrRestaurantLogoR3)) {
        $pmdFloorQrLogoPathR3 = '/'.ltrim(str_replace('\\\\', '/', (string)(parse_url($pmdFloorQrRestaurantLogoR3, PHP_URL_PATH) ?: $pmdFloorQrRestaurantLogoR3)), '/');
        if (str_starts_with($pmdFloorQrLogoPathR3, '/api/media/')
            || str_starts_with($pmdFloorQrLogoPathR3, '/assets/media/')
            || str_starts_with($pmdFloorQrLogoPathR3, '/brand/')) {
            $pmdFloorQrRestaurantLogoR3 = $pmdFloorQrLogoPathR3;
        } elseif (str_starts_with($pmdFloorQrLogoPathR3, '/uploads/')) {
            $pmdFloorQrRestaurantLogoR3 = '/assets/media'.$pmdFloorQrLogoPathR3;
        } else {
            $pmdFloorQrRestaurantLogoR3 = '/api/media/'.basename($pmdFloorQrLogoPathR3);
        }
    }
@endphp
<div
    data-pmd-floor-qr-studio-identity-r3
    data-pmd-restaurant-name="{{ $pmdFloorQrRestaurantNameR3 }}"
    data-pmd-restaurant-logo="{{ $pmdFloorQrRestaurantLogoR3 }}"
    hidden
></div>

        <div
            class="pmd-floor-table-manager"
            data-pmd-floor-table-manager-panel
            data-create-title="{{ $pmdFloorTableManagerText['create_title'] }}"
            data-edit-title="{{ $pmdFloorTableManagerText['edit_title'] }}"
            data-create-subtitle="{{ $pmdFloorTableManagerText['create_subtitle'] }}"
            data-edit-subtitle="{{ $pmdFloorTableManagerText['edit_subtitle'] }}"
            data-save-label="{{ $pmdFloorTableManagerText['save'] }}"
            data-saving-label="{{ $pmdFloorTableManagerText['saving'] }}"
            data-delete-label="{{ $pmdFloorTableManagerText['delete'] }}"
            data-deleting-label="{{ $pmdFloorTableManagerText['deleting'] }}"
            data-delete-confirm="{{ $pmdFloorTableManagerText['delete_confirm'] }}"
            data-loading-label="{{ $pmdFloorTableManagerText['loading'] }}"
            data-qr-downloading-label="{{ $pmdFloorTableManagerLocale === 'de' ? 'QR wird vorbereitet…' : 'Preparing QR…' }}"
            data-select-first="{{ $pmdFloorTableManagerText['select_first'] }}"
            hidden
        >
            <button type="button" class="pmd-floor-table-manager__backdrop" data-pmd-floor-table-manager-close aria-label="{{ $pmdFloorTableManagerText['cancel'] }}"></button>

            <section class="pmd-floor-table-manager__card" role="dialog" aria-modal="true" aria-labelledby="pmd-floor-table-manager-title-v1">
                <header class="pmd-floor-table-manager__header">
                    <div class="pmd-floor-table-manager__heading">
                        <span class="pmd-floor-table-manager__eyebrow">{{ $pmdFloorTableManagerText['manage'] }}</span>
                        <h2 id="pmd-floor-table-manager-title-v1" data-pmd-floor-table-manager-title>{{ $pmdFloorTableManagerText['create_title'] }}</h2>
                        <p data-pmd-floor-table-manager-subtitle>{{ $pmdFloorTableManagerText['create_subtitle'] }}</p>
                    </div>

                    <button type="button" class="pmd-floor-table-manager__close" data-pmd-floor-table-manager-close aria-label="{{ $pmdFloorTableManagerText['cancel'] }}">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                    </button>
                </header>

                <div class="pmd-floor-table-manager__loading" data-pmd-floor-table-manager-loading hidden>{{ $pmdFloorTableManagerText['loading'] }}</div>

                <form class="pmd-floor-table-manager__form" data-pmd-floor-table-manager-form data-pmd-floor-table-minimal-v13 data-pmd-floor-single="{{ $pmdShowFloorTabs ? 'false' : 'true' }}" novalidate>
                    <input type="hidden" data-pmd-floor-table-field="table_id" value="0">

                    {{-- Compatibility-only state. These fields are intentionally not visible.
                         Existing backend semantics are preserved while the Owner/Manager card
                         exposes only the practical inputs requested for daily Floor work. --}}
                    <div data-pmd-floor-table-manager-hidden hidden>
                        <input type="hidden" data-pmd-floor-table-field="table_section" value="Main">
                        <input type="hidden" data-pmd-floor-table-field="floor_shape" value="rectangle">
                        <input type="hidden" data-pmd-floor-table-field="min_capacity" value="1">
                        <input type="hidden" data-pmd-floor-table-field="max_capacity" value="2">
                        <input type="hidden" data-pmd-floor-table-field="extra_capacity" value="0">
                        <input type="hidden" data-pmd-floor-table-field="priority" value="0">
                        <input type="hidden" data-pmd-floor-table-field="reservation_priority" value="0">
                        <input type="checkbox" data-pmd-floor-table-field="table_status" checked>
                        <input type="checkbox" data-pmd-floor-table-field="reservable" checked>
                        <input type="checkbox" data-pmd-floor-table-field="visible_on_floor_plan" checked>
                        <input type="checkbox" data-pmd-floor-table-field="is_joinable" checked>
                    </div>

                    <div class="pmd-floor-table-manager__minimal-grid">
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['number'] }}</span>
                            <input type="number" min="1" step="1" inputmode="numeric" data-pmd-floor-table-field="table_no" required>
                            <small data-pmd-floor-table-number-lock hidden>{{ $pmdFloorTableManagerText['locked'] }}</small>
                        </label>

                        <label
                            class="pmd-floor-table-manager__field"
                            data-pmd-floor-table-floor-field
                            @if(!$pmdShowFloorTabs) hidden @endif
                        >
                            <span>{{ $pmdFloorTableManagerText['floor'] }}</span>
                            <select data-pmd-floor-table-field="floor_name" required>
                                @foreach($pmdFloorRegistry as $pmdFloorRegistryItem)
                                    <option value="{{ $pmdFloorRegistryItem['name'] }}">{{ $pmdFloorRegistryItem['name'] }}</option>
                                @endforeach
                            </select>
                        </label>

                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerLocale === 'de' ? 'Plätze' : 'Capacity' }}</span>
                            <input type="number" min="1" max="999" step="1" inputmode="numeric" data-pmd-floor-table-field="preferred_capacity" required>
                        </label>
                    </div>

                    <fieldset class="pmd-floor-table-manager__features" data-pmd-floor-table-features-picker>
                        <legend>{{ $pmdFloorTableManagerLocale === 'de' ? 'Tischmerkmale' : 'Table features' }}</legend>
                        <div class="pmd-floor-table-manager__feature-options">
                            <label class="pmd-floor-table-manager__feature-option">
                                <input type="checkbox" value="near_window" data-pmd-floor-table-feature>
                                <span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 12h16M12 4v16"></path></svg>
                                    <b>{{ $pmdFloorTableManagerLocale === 'de' ? 'Am Fenster' : 'Near window' }}</b>
                                </span>
                            </label>
                            <label class="pmd-floor-table-manager__feature-option">
                                <input type="checkbox" value="quiet_area" data-pmd-floor-table-feature>
                                <span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="m16 9 5 6M21 9l-5 6"></path></svg>
                                    <b>{{ $pmdFloorTableManagerLocale === 'de' ? 'Ruhiger Bereich' : 'Quiet area' }}</b>
                                </span>
                            </label>
                            <label class="pmd-floor-table-manager__feature-option">
                                <input type="checkbox" value="accessible" data-pmd-floor-table-feature>
                                <span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="2"></circle><path d="M7 9h5l2 5h3M9 9v5a4 4 0 1 0 4 4M13 14l2 6h4"></path></svg>
                                    <b>{{ $pmdFloorTableManagerLocale === 'de' ? 'Barrierefrei' : 'Accessible' }}</b>
                                </span>
                            </label>
                        </div>
                    </fieldset>

                    <label class="pmd-floor-table-manager__field is-notes">
                        <span>{{ $pmdFloorTableManagerText['notes'] }}</span>
                        <textarea rows="2" maxlength="1000" data-pmd-floor-table-field="floor_notes" placeholder="{{ $pmdFloorTableManagerText['notes_placeholder'] }}"></textarea>
                    </label>

                    <section class="pmd-floor-table-manager__qr-preview" data-pmd-floor-table-qr-preview aria-label="QR Code">
                        <div class="pmd-floor-table-manager__qr-pending" data-pmd-floor-table-qr-pending>
                            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><path d="M14 14h2v2h-2zM18 14h2v6h-6v-2M16 18h2"></path></svg>
                            <div>
                                <strong>{{ $pmdFloorTableManagerLocale === 'de' ? 'QR-Code' : 'QR code' }}</strong>
                                <span>{{ $pmdFloorTableManagerLocale === 'de' ? 'Wird beim ersten Speichern automatisch erstellt.' : 'Created automatically on the first save.' }}</span>
                            </div>
                        </div>

                        <div class="pmd-floor-table-manager__qr-content" data-pmd-floor-table-qr-content hidden>
                            <img data-pmd-floor-table-qr-image alt="QR Code">
                            <div class="pmd-floor-table-manager__qr-copy">
                                <strong>{{ $pmdFloorTableManagerLocale === 'de' ? 'QR-Code dieses Tisches' : 'This table QR code' }}</strong>
                                <span>{{ $pmdFloorTableManagerLocale === 'de' ? 'Öffnet das Kundenmenü für genau diesen Tisch.' : 'Opens the customer menu for this exact table.' }}</span>
                                <code data-pmd-floor-table-qr-code></code>
                                <div class="pmd-floor-table-manager__qr-actions">
                                    <a data-pmd-floor-table-qr-link target="_blank" rel="noopener noreferrer">{{ $pmdFloorTableManagerLocale === 'de' ? 'Kundenmenü öffnen' : 'Open customer menu' }}</a>
                                    <button type="button" data-pmd-floor-table-qr-download data-pmd-floor-qr-template-trigger-r3="1">{{ $pmdFloorTableManagerLocale === 'de' ? 'Design wählen & herunterladen' : 'Choose design & download' }}</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div class="pmd-floor-table-manager__error" data-pmd-floor-table-manager-error hidden></div>
                </form>

                {{-- PMD_FLOOR_TABLE_DELETE_R36B --}}
                <footer class="pmd-floor-table-manager__footer">
                    {{-- PMD_FLOOR_TABLE_VISUAL_R36C --}}
                    <button
                        type="button"
                        class="pmd-floor-table-manager__delete"
                        data-pmd-floor-table-manager-delete
                        hidden
                        style="margin-right:auto!important;align-items:center!important;justify-content:center!important;min-height:48px!important;height:48px!important;padding:0 20px!important;border:1px solid #d98d99!important;border-radius:12px!important;background:#fff!important;background-image:none!important;color:#a12638!important;font-size:15px!important;line-height:1!important;font-weight:800!important;box-shadow:none!important;text-shadow:none!important;appearance:none!important;-webkit-appearance:none!important;cursor:pointer!important;"
                    >{{ $pmdFloorTableManagerText['delete'] }}</button>

                    <div class="pmd-floor-table-manager__footer-actions">
                        <button type="button" class="pmd-floor-table-manager__cancel" data-pmd-floor-table-manager-close>{{ $pmdFloorTableManagerText['cancel'] }}</button>
                        <button type="button" class="pmd-floor-table-manager__save" data-pmd-floor-table-manager-save>{{ $pmdFloorTableManagerText['save'] }}</button>
                    </div>
                </footer>
            </section>
        </div>
    @endif

    <div class="pmd-floor-v1__toast" data-floor-toast role="status"></div>
</section>

<script type="application/json" id="pmd-shared-floor-multi-floor-bootstrap-v1">{!! $pmdSharedFloorMultiFloorJson !!}</script>
<script type="application/json" id="pmd-dashboard-lab-exact-floor-bootstrap-v1">{!! $floorBootstrapJson !!}</script>

<style id="pmd-floor-qr-template-studio-r3-style">
/* PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE */
/* PMD_TABLE_QR_TEMPLATE_STUDIO_V1 */
.pmd-table-qr-studio-v1 {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
    margin-left: 2rem;
}

.pmd-table-qr-studio-v1__preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 176px;
    min-height: 176px;
    padding: 12px;
    border: 1px solid #dce6ed;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(24, 48, 70, .08);
}

.pmd-table-qr-studio-v1__preview img {
    display: block;
    width: 150px;
    height: 150px;
    object-fit: contain;
    image-rendering: pixelated;
}

.pmd-table-qr-studio-v1__actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.pmd-table-qr-studio-v1__actions strong {
    color: #17324d;
    font-size: 15px;
    font-weight: 800;
}

.pmd-table-qr-studio-v1__actions span {
    max-width: 300px;
    color: #708395;
    font-size: 13px;
    line-height: 1.45;
}

.pmd-table-qr-studio-v1__button {
    appearance: none;
    border: 1px solid #173f67;
    border-radius: 10px;
    background: #173f67;
    color: #fff;
    padding: 11px 16px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(23, 63, 103, .16);
    transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}

.pmd-table-qr-studio-v1__button:hover,
.pmd-table-qr-studio-v1__button:focus-visible {
    background: #0f355d;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(23, 63, 103, .2);
    outline: none;
}

html.pmd-qr-template-modal-open-v1,
html.pmd-qr-template-modal-open-v1 body {
    overflow: hidden !important;
}

.pmd-qr-template-modal-v1 {
    position: fixed;
    inset: 0;
    z-index: 2147482000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    background: rgba(6, 20, 32, .58);
    backdrop-filter: blur(8px);
    opacity: 0;
    visibility: hidden;
    transition: opacity .16s ease, visibility .16s ease;
}

.pmd-qr-template-modal-v1.is-open {
    opacity: 1;
    visibility: visible;
}

.pmd-qr-template-dialog-v1 {
    width: min(1240px, 96vw);
    max-height: 92vh;
    overflow: auto;
    border: 1px solid rgba(220, 231, 239, .95);
    border-radius: 24px;
    background: #f6f9fb;
    box-shadow: 0 28px 90px rgba(3, 18, 31, .28);
}

.pmd-qr-template-header-v1 {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 24px 28px 22px;
    border-bottom: 1px solid #dfe8ee;
    background: rgba(255, 255, 255, .96);
    backdrop-filter: blur(16px);
}

.pmd-qr-template-kicker-v1 {
    display: inline-block;
    margin-bottom: 7px;
    color: #16815f;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .14em;
}

.pmd-qr-template-header-v1 h2 {
    margin: 0;
    color: #132f4a;
    font-size: 26px;
    line-height: 1.15;
    font-weight: 900;
}

.pmd-qr-template-header-v1 p {
    margin: 7px 0 0;
    color: #6d8091;
    font-size: 14px;
}

.pmd-qr-template-close-v1 {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1px solid #d8e3ea;
    border-radius: 13px;
    background: #fff;
    color: #193550;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
}

.pmd-qr-template-grid-v1 {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 18px;
    padding: 24px;
}

.pmd-qr-template-loading-v1 {
    grid-column: 1 / -1;
    padding: 70px 20px;
    color: #708395;
    text-align: center;
    font-size: 15px;
    font-weight: 700;
}

.pmd-qr-template-card-v1 {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid #dbe5eb;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 9px 24px rgba(22, 47, 70, .07);
    transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.pmd-qr-template-card-v1:hover {
    transform: translateY(-2px);
    border-color: #b9cbd7;
    box-shadow: 0 16px 34px rgba(22, 47, 70, .12);
}

.pmd-qr-template-preview-v1 {
    padding: 14px;
    background:
        linear-gradient(45deg, #f2f5f7 25%, transparent 25%),
        linear-gradient(-45deg, #f2f5f7 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f2f5f7 75%),
        linear-gradient(-45deg, transparent 75%, #f2f5f7 75%);
    background-size: 18px 18px;
    background-position: 0 0, 0 9px, 9px -9px, -9px 0;
}

.pmd-qr-template-preview-v1 canvas {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(12, 33, 50, .12);
}

.pmd-qr-template-card-info-v1 {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    padding: 14px 14px 10px;
}

.pmd-qr-template-number-v1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #edf4f7;
    color: #31506a;
    font-size: 11px;
    font-weight: 900;
}

.pmd-qr-template-card-info-v1 h3 {
    margin: 1px 0 4px;
    color: #18344e;
    font-size: 14px;
    font-weight: 900;
}

.pmd-qr-template-card-info-v1 p {
    margin: 0;
    color: #788b9b;
    font-size: 11px;
    line-height: 1.42;
}

.pmd-qr-template-download-v1 {
    appearance: none;
    margin: auto 14px 14px;
    border: 1px solid #c8d7e1;
    border-radius: 10px;
    background: #fff;
    color: #173f67;
    padding: 10px 12px;
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    transition: background .16s ease, color .16s ease, border-color .16s ease;
}

.pmd-qr-template-download-v1:hover,
.pmd-qr-template-download-v1:focus-visible {
    border-color: #173f67;
    background: #173f67;
    color: #fff;
    outline: none;
}

@media (max-width: 1100px) {
    .pmd-qr-template-grid-v1 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .pmd-table-qr-studio-v1 {
        margin-left: 0;
        align-items: flex-start;
    }

    .pmd-qr-template-modal-v1 {
        padding: 10px;
    }

    .pmd-qr-template-dialog-v1 {
        width: 100%;
        max-height: 96vh;
        border-radius: 18px;
    }

    .pmd-qr-template-header-v1 {
        padding: 18px;
    }

    .pmd-qr-template-header-v1 h2 {
        font-size: 21px;
    }

    .pmd-qr-template-grid-v1 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        padding: 14px;
    }
}

@media (max-width: 480px) {
    .pmd-qr-template-grid-v1 {
        grid-template-columns: 1fr;
    }
}

.pmd-qr-template-modal-v1{z-index:2147483647!important;}
</style>

<script id="pmd-floor-qr-template-studio-r3-runtime">
/* PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE */
/* PMD_TABLE_QR_TEMPLATE_STUDIO_V1
 * Presentation-only table QR template selector.
 * The existing table URL / QR payload authority is not changed here.
 */
(function () {
    'use strict';

    const ROOT_SELECTOR = '[data-pmd-qr-template-studio-v1]';
    const MODAL_ID = 'pmd-qr-template-modal-v1';

    const templates = [
        {
            id: 'classic',
            name: 'Classic White',
            description: 'Clean, bright and easy to print.',
            background: '#eef4f8',
            panel: '#ffffff',
            text: '#12314f',
            muted: '#6f8193',
            accent: '#1f5b91',
            qrPanel: '#ffffff',
            border: '#d7e2ea',
            decor: 'classic',
            centerBadge: true,
        },
        {
            id: 'midnight',
            name: 'Midnight',
            description: 'Premium dark table card.',
            background: '#071b18',
            panel: '#0d2a25',
            text: '#ffffff',
            muted: '#b3c8c1',
            accent: '#8de64e',
            qrPanel: '#ffffff',
            border: '#25443d',
            decor: 'midnight',
            centerBadge: true,
        },
        {
            id: 'emerald',
            name: 'Emerald',
            description: 'Fresh PayMyDine green style.',
            background: '#e7f7ef',
            panel: '#ffffff',
            text: '#103d32',
            muted: '#66867d',
            accent: '#0f8a68',
            qrPanel: '#ffffff',
            border: '#cce8da',
            decor: 'emerald',
            centerBadge: true,
        },
        {
            id: 'bistro',
            name: 'Warm Bistro',
            description: 'Warm restaurant table presentation.',
            background: '#f8efe1',
            panel: '#fffaf2',
            text: '#4b2b27',
            muted: '#8d7169',
            accent: '#a9473d',
            qrPanel: '#ffffff',
            border: '#ead5bf',
            decor: 'bistro',
            centerBadge: true,
        },
        {
            id: 'ocean',
            name: 'Ocean Blue',
            description: 'Modern blue hospitality card.',
            background: '#e8f3ff',
            panel: '#ffffff',
            text: '#173a63',
            muted: '#6f87a2',
            accent: '#2674c7',
            qrPanel: '#ffffff',
            border: '#c9ddf3',
            decor: 'ocean',
            centerBadge: true,
        },
        {
            id: 'mono',
            name: 'Maximum Scan',
            description: 'Black and white, no center overlay.',
            background: '#ffffff',
            panel: '#ffffff',
            text: '#111111',
            muted: '#606060',
            accent: '#111111',
            qrPanel: '#ffffff',
            border: '#111111',
            decor: 'mono',
            centerBadge: false,
        },
        {
            id: 'gold',
            name: 'Gold Dining',
            description: 'Elegant dark and gold finish.',
            background: '#171714',
            panel: '#22221d',
            text: '#fff8e3',
            muted: '#c8bea2',
            accent: '#d4ad4f',
            qrPanel: '#fffdf7',
            border: '#5a4a25',
            decor: 'gold',
            centerBadge: true,
        },
        {
            id: 'coral',
            name: 'Coral Welcome',
            description: 'Friendly and colourful.',
            background: '#fff0eb',
            panel: '#fffaf8',
            text: '#502f31',
            muted: '#8e6e6c',
            accent: '#ef715f',
            qrPanel: '#ffffff',
            border: '#f3cec5',
            decor: 'coral',
            centerBadge: true,
        },
        {
            id: 'tent',
            name: 'Table Tent',
            description: 'Bold header for counter or table stands.',
            background: '#eaf0f5',
            panel: '#ffffff',
            text: '#15324d',
            muted: '#708497',
            accent: '#15324d',
            qrPanel: '#ffffff',
            border: '#d1dde7',
            decor: 'tent',
            centerBadge: true,
        },
        {
            id: 'botanical',
            name: 'Botanical',
            description: 'Soft natural restaurant style.',
            background: '#f0f3e9',
            panel: '#fbfcf7',
            text: '#31432f',
            muted: '#788773',
            accent: '#718b62',
            qrPanel: '#ffffff',
            border: '#d8e0cf',
            decor: 'botanical',
            centerBadge: false,
        },
    ];

    function roundedRect(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    function fillRounded(ctx, x, y, width, height, radius, fill, stroke, lineWidth) {
        roundedRect(ctx, x, y, width, height, radius);
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth || 1;
            ctx.stroke();
        }
    }

    function loadImage(src) {
        return new Promise((resolve) => {
            if (!src) {
                resolve(null);
                return;
            }
            const image = new Image();
            if (!String(src).startsWith('data:')) image.crossOrigin = 'anonymous';
            image.onload = function () { resolve(image); };
            image.onerror = function () { resolve(null); };
            image.src = src;
        });
    }

    function drawImageContain(ctx, image, x, y, width, height) {
        if (!image || !image.naturalWidth || !image.naturalHeight) return false;
        const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const w = image.naturalWidth * ratio;
        const h = image.naturalHeight * ratio;
        ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
        return true;
    }

    function initials(value) {
        const parts = String(value || 'Restaurant').trim().split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'R';
    }

    function fitText(ctx, text, maxWidth, startSize, minSize, weight) {
        let size = startSize;
        while (size > minSize) {
            ctx.font = `${weight || 700} ${size}px Arial, Helvetica, sans-serif`;
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 2;
        }
        return size;
    }

    function drawLogoBadge(ctx, image, restaurantName, x, y, size, accent, shape) {
        const radius = shape === 'circle' ? size / 2 : size * 0.28;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.12)';
        ctx.shadowBlur = size * 0.12;
        ctx.shadowOffsetY = size * 0.04;
        fillRounded(ctx, x, y, size, size, radius, '#ffffff', 'rgba(18,49,79,.08)', Math.max(1, size * 0.012));
        ctx.shadowColor = 'transparent';
        const inset = size * 0.17;
        roundedRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius * 0.6);
        ctx.clip();
        if (!drawImageContain(ctx, image, x + inset, y + inset, size - inset * 2, size - inset * 2)) {
            ctx.fillStyle = accent;
            ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `800 ${size * 0.26}px Arial, Helvetica, sans-serif`;
            ctx.fillText(initials(restaurantName), x + size / 2, y + size / 2);
        }
        ctx.restore();
    }

    function drawDecor(ctx, config, w, h) {
        if (config.decor === 'midnight') {
            ctx.fillStyle = 'rgba(141,230,78,.09)';
            ctx.beginPath();
            ctx.arc(w * .88, h * .08, w * .22, 0, Math.PI * 2);
            ctx.fill();
        } else if (config.decor === 'emerald') {
            ctx.fillStyle = 'rgba(15,138,104,.09)';
            ctx.beginPath();
            ctx.arc(w * .08, h * .92, w * .24, 0, Math.PI * 2);
            ctx.fill();
        } else if (config.decor === 'bistro') {
            ctx.strokeStyle = 'rgba(169,71,61,.16)';
            ctx.lineWidth = w * .012;
            ctx.beginPath();
            ctx.arc(w * .91, h * .1, w * .14, 0, Math.PI * 2);
            ctx.stroke();
        } else if (config.decor === 'ocean') {
            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0, 'rgba(38,116,199,.10)');
            gradient.addColorStop(1, 'rgba(38,116,199,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        } else if (config.decor === 'gold') {
            ctx.strokeStyle = 'rgba(212,173,79,.28)';
            ctx.lineWidth = w * .006;
            ctx.strokeRect(w * .035, h * .028, w * .93, h * .944);
        } else if (config.decor === 'coral') {
            ctx.fillStyle = 'rgba(239,113,95,.10)';
            ctx.beginPath();
            ctx.arc(w * .08, h * .12, w * .18, 0, Math.PI * 2);
            ctx.fill();
        } else if (config.decor === 'botanical') {
            ctx.fillStyle = 'rgba(113,139,98,.10)';
            [[.06,.12,.12],[.94,.16,.09],[.08,.88,.14],[.92,.9,.11]].forEach(([x,y,r]) => {
                ctx.beginPath();
                ctx.ellipse(w*x, h*y, w*r, w*r*.48, -.55, 0, Math.PI*2);
                ctx.fill();
            });
        }
    }

    function drawTemplate(canvas, config, data, assets) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = config.background;
        ctx.fillRect(0, 0, w, h);
        drawDecor(ctx, config, w, h);

        const margin = w * .07;
        const panelX = margin;
        const panelY = h * .045;
        const panelW = w - margin * 2;
        const panelH = h * .91;
        const panelRadius = w * .035;

        ctx.save();
        ctx.shadowColor = config.decor === 'mono' ? 'transparent' : 'rgba(22,42,58,.10)';
        ctx.shadowBlur = w * .035;
        ctx.shadowOffsetY = w * .014;
        fillRounded(ctx, panelX, panelY, panelW, panelH, panelRadius, config.panel, config.border, w * .0018);
        ctx.restore();

        if (config.decor === 'tent') {
            ctx.save();
            roundedRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
            ctx.clip();
            ctx.fillStyle = config.accent;
            ctx.fillRect(panelX, panelY, panelW, h * .175);
            ctx.restore();
        }

        const headerDark = config.decor === 'tent';
        const titleColor = headerDark ? '#ffffff' : config.text;
        const mutedColor = headerDark ? 'rgba(255,255,255,.76)' : config.muted;

        const logoSize = w * .105;
        const logoX = panelX + w * .055;
        const logoY = panelY + h * .045;
        drawLogoBadge(ctx, assets.logo, data.restaurantName, logoX, logoY, logoSize, config.accent, config.decor === 'gold' ? 'circle' : 'rounded');

        const textX = logoX + logoSize + w * .035;
        const textMax = panelX + panelW - textX - w * .045;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = titleColor;
        const restaurantFont = fitText(ctx, data.restaurantName, textMax, w * .044, w * .025, 800);
        ctx.font = `800 ${restaurantFont}px Arial, Helvetica, sans-serif`;
        ctx.fillText(data.restaurantName, textX, logoY + logoSize * .48);
        ctx.fillStyle = mutedColor;
        ctx.font = `600 ${w * .019}px Arial, Helvetica, sans-serif`;
        ctx.fillText('SCAN • ORDER • ENJOY', textX, logoY + logoSize * .78);

        const qrSize = w * .57;
        const qrX = (w - qrSize) / 2;
        const qrY = h * .305;
        const qrPad = w * .032;

        ctx.textAlign = 'center';
        ctx.fillStyle = config.accent;
        ctx.font = `800 ${w * .024}px Arial, Helvetica, sans-serif`;
        ctx.fillText('SCAN TO VIEW MENU', w / 2, qrY - h * .035);

        ctx.save();
        ctx.shadowColor = config.decor === 'mono' ? 'transparent' : 'rgba(15,28,40,.12)';
        ctx.shadowBlur = w * .024;
        ctx.shadowOffsetY = w * .008;
        fillRounded(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, w * .026, config.qrPanel, config.border, w * .002);
        ctx.restore();

        if (assets.qr) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(assets.qr, qrX, qrY, qrSize, qrSize);
            ctx.restore();
        }

        if (config.centerBadge) {
            const badgeSize = qrSize * .145;
            const badgeX = qrX + (qrSize - badgeSize) / 2;
            const badgeY = qrY + (qrSize - badgeSize) / 2;
            // Keep the badge deliberately small. The QR finder corners are never touched.
            drawLogoBadge(ctx, assets.logo, data.restaurantName, badgeX, badgeY, badgeSize, config.accent, 'rounded');
        }

        const tableY = qrY + qrSize + h * .082;
        ctx.fillStyle = config.text;
        const tableFont = fitText(ctx, data.tableName, panelW * .72, w * .052, w * .031, 800);
        ctx.font = `800 ${tableFont}px Arial, Helvetica, sans-serif`;
        ctx.fillText(data.tableName, w / 2, tableY);

        ctx.fillStyle = config.muted;
        ctx.font = `500 ${w * .021}px Arial, Helvetica, sans-serif`;
        ctx.fillText('Point your camera at the QR code to open the menu', w / 2, tableY + h * .045);

        const footerY = panelY + panelH - h * .065;
        ctx.fillStyle = config.muted;
        ctx.font = `600 ${w * .018}px Arial, Helvetica, sans-serif`;
        ctx.fillText('Powered by', w / 2, footerY - h * .018);
        ctx.fillStyle = config.text;
        ctx.font = `800 ${w * .027}px Arial, Helvetica, sans-serif`;
        ctx.fillText('PayMyDine', w / 2, footerY + h * .018);
    }

    function safeFilename(value) {
        return String(value || 'restaurant')
            .trim()
            .replace(/[^a-z0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 70) || 'restaurant';
    }

    function makeButton(label, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        return button;
    }

    function getData(root) {
        return {
            qrSrc: root.getAttribute('data-pmd-qr-src') || '',
            restaurantName: root.getAttribute('data-pmd-restaurant-name') || 'Restaurant',
            restaurantLogo: root.getAttribute('data-pmd-restaurant-logo') || '',
            tableName: root.getAttribute('data-pmd-table-name') || 'Table',
        };
    }

    function createModal(root, data) {
        let modal = document.getElementById(MODAL_ID);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'pmd-qr-template-modal-v1';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Choose QR design');

        const dialog = document.createElement('div');
        dialog.className = 'pmd-qr-template-dialog-v1';
        modal.appendChild(dialog);

        const header = document.createElement('div');
        header.className = 'pmd-qr-template-header-v1';
        header.innerHTML = '<div><span class="pmd-qr-template-kicker-v1">TABLE QR</span><h2>Choose your QR design</h2><p>Pick one of 10 print-ready designs. Your table link stays exactly the same.</p></div>';
        const close = makeButton('×', 'pmd-qr-template-close-v1');
        close.setAttribute('aria-label', 'Close');
        header.appendChild(close);
        dialog.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'pmd-qr-template-grid-v1';
        dialog.appendChild(grid);

        const loading = document.createElement('div');
        loading.className = 'pmd-qr-template-loading-v1';
        loading.textContent = 'Preparing 10 designs…';
        grid.appendChild(loading);

        function closeModal() {
            modal.classList.remove('is-open');
            document.documentElement.classList.remove('pmd-qr-template-modal-open-v1');
            setTimeout(() => modal.remove(), 160);
        }

        close.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
        document.addEventListener('keydown', function onKey(event) {
            if (event.key === 'Escape' && document.getElementById(MODAL_ID)) {
                document.removeEventListener('keydown', onKey);
                closeModal();
            }
        });

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('is-open'));
        document.documentElement.classList.add('pmd-qr-template-modal-open-v1');

        Promise.all([loadImage(data.qrSrc), loadImage(data.restaurantLogo)]).then(([qr, logo]) => {
            grid.innerHTML = '';
            const assets = { qr, logo };

            templates.forEach((template, index) => {
                const card = document.createElement('article');
                card.className = 'pmd-qr-template-card-v1';
                card.setAttribute('data-template-id', template.id);

                const previewWrap = document.createElement('div');
                previewWrap.className = 'pmd-qr-template-preview-v1';
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 400;
                canvas.setAttribute('aria-label', `${template.name} preview`);
                previewWrap.appendChild(canvas);
                card.appendChild(previewWrap);

                const info = document.createElement('div');
                info.className = 'pmd-qr-template-card-info-v1';
                info.innerHTML = `<div class="pmd-qr-template-number-v1">${String(index + 1).padStart(2, '0')}</div><div><h3>${template.name}</h3><p>${template.description}</p></div>`;
                card.appendChild(info);

                const download = makeButton('Download this design', 'pmd-qr-template-download-v1');
                card.appendChild(download);

                drawTemplate(canvas, template, data, assets);

                download.addEventListener('click', () => {
                    const exportCanvas = document.createElement('canvas');
                    exportCanvas.width = 1200;
                    exportCanvas.height = 1600;
                    drawTemplate(exportCanvas, template, data, assets);
                    const link = document.createElement('a');
                    link.download = `${safeFilename(data.restaurantName)}-${safeFilename(data.tableName)}-${template.id}-qr.png`;
                    link.href = exportCanvas.toDataURL('image/png', 1);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                });

                grid.appendChild(card);
            });
        });

        return modal;
    }

    function init(root) {
        if (!root || root.dataset.pmdQrTemplateReady === '1') return;
        root.dataset.pmdQrTemplateReady = '1';
        const data = getData(root);
        const open = root.querySelector('[data-pmd-qr-template-open-v1]');
        if (!open) return;
        open.addEventListener('click', function () {
            createModal(root, data);
        });
    }

    function boot() {
        document.querySelectorAll(ROOT_SELECTOR).forEach(init);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.PMDQrTemplateStudioV1 = {
        boot,
        templates: templates.map(({ id, name }) => ({ id, name })),
    };
})();


(function () {
    'use strict';
    if (window.PMDFloorQrTemplateStudioR3) return;

    function closestButton(target) {
        if (!target) return null;
        if (target.closest) return target.closest('[data-pmd-floor-table-qr-download]');
        return null;
    }

    function csrfToken() {
        var node = document.querySelector('meta[name="csrf-token"]');
        return node && node.content ? node.content : '';
    }

    function showError(panel, message) {
        var box = panel && panel.querySelector('[data-pmd-floor-table-manager-error]');
        if (box) {
            box.hidden = false;
            box.textContent = message || 'QR design could not be prepared.';
            return;
        }
        window.alert(message || 'QR design could not be prepared.');
    }

    function openStudio(payload, panel, tableId) {
        var identity = document.querySelector('[data-pmd-floor-qr-studio-identity-r3]');
        var tableNoField = panel && panel.querySelector('[data-pmd-floor-table-field="table_no"]');
        var tableNo = tableNoField ? String(tableNoField.value || '').trim() : '';
        var restaurantName = identity ? identity.getAttribute('data-pmd-restaurant-name') || 'Restaurant' : 'Restaurant';
        var restaurantLogo = identity ? identity.getAttribute('data-pmd-restaurant-logo') || '' : '';
        var tableName = tableNo ? ('Table ' + tableNo) : ('Table ' + tableId);

        var adapter = document.createElement('div');
        adapter.hidden = true;
        adapter.setAttribute('data-pmd-qr-template-studio-v1', '1');
        adapter.setAttribute('data-pmd-qr-src', payload.data_url || '');
        adapter.setAttribute('data-pmd-restaurant-name', restaurantName);
        adapter.setAttribute('data-pmd-restaurant-logo', restaurantLogo);
        adapter.setAttribute('data-pmd-table-name', tableName);

        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.setAttribute('data-pmd-qr-template-open-v1', '1');
        adapter.appendChild(trigger);
        document.body.appendChild(adapter);

        if (!window.PMDQrTemplateStudioV1 || typeof window.PMDQrTemplateStudioV1.boot !== 'function') {
            adapter.remove();
            throw new Error('QR Template Studio runtime is unavailable.');
        }

        window.PMDQrTemplateStudioV1.boot();
        trigger.click();
        setTimeout(function () { adapter.remove(); }, 0);
    }

    function fetchQr(button) {
        var panel = button.closest('[data-pmd-floor-table-manager-panel]');
        var root = document.querySelector('[data-pmd-floor-table-manager="true"]');
        var tableIdField = panel && panel.querySelector('[data-pmd-floor-table-field="table_id"]');
        var tableId = Number(tableIdField ? tableIdField.value : 0) || 0;
        var locationId = Number(root ? root.getAttribute('data-pmd-floor-table-manager-location') : 0) || 0;
        var url = root ? root.getAttribute('data-pmd-floor-table-manager-url') : '';
        if (!url) url = window.location.href;
        if (tableId < 1) throw new Error('Save the table first, then choose a QR design.');

        var originalText = button.textContent;
        button.disabled = true;
        button.textContent = document.documentElement.lang === 'de' ? 'Designs werden vorbereitet…' : 'Preparing designs…';
        button.dataset.pmdQrStudioBusyR3 = '1';

        var headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-IGNITER-REQUEST-HANDLER': 'onPmdFloorTableManagerQrDownload'
        };
        var token = csrfToken();
        if (token) headers['X-CSRF-TOKEN'] = token;

        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: headers,
            body: JSON.stringify({ location_id: locationId, table_id: tableId })
        }).then(function (response) {
            return response.text().then(function (body) {
                var payload = {};
                try { payload = body ? JSON.parse(body) : {}; }
                catch (error) { payload = { message: body }; }
                if (!response.ok || payload.ok === false) {
                    throw new Error(payload.message || body || ('HTTP ' + response.status));
                }
                if (!payload.data_url) throw new Error('QR download data is unavailable.');
                openStudio(payload, panel, tableId);
                return payload;
            });
        }).catch(function (error) {
            showError(panel, error && error.message ? error.message : String(error));
            throw error;
        }).finally(function () {
            button.disabled = false;
            button.textContent = originalText;
            delete button.dataset.pmdQrStudioBusyR3;
        });
    }

    document.addEventListener('click', function (event) {
        var button = closestButton(event.target);
        if (!button) return;
        // Capture-phase interception prevents the legacy Floor JS direct-download
        // listener from running. The same existing backend handler is reused below.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (button.dataset.pmdQrStudioBusyR3 === '1') return;
        try {
            fetchQr(button).catch(function () {});
        } catch (error) {
            var panel = button.closest('[data-pmd-floor-table-manager-panel]');
            showError(panel, error && error.message ? error.message : String(error));
        }
    }, true);

    window.PMDFloorQrTemplateStudioR3 = {
        version: '3.0.0',
        backendHandler: 'onPmdFloorTableManagerQrDownload',
        templates: 10
    };
    console.info('[PMD Floor QR Template Studio R3] Ready', window.PMDFloorQrTemplateStudioR3);
})();

</script>

