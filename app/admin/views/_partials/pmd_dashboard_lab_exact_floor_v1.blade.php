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

    $floorZoom = is_numeric($floorZoom ?? null)
        ? max(0.4, min(1.6, (float)$floorZoom))
        : 1.0;

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

    $pmdFloorCanManageTables = in_array($pmdFloorTableManagerRole, ['owner', 'manager'], true);
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

    $pmdFloorTableManagerLocale = strtolower((string)app()->getLocale());
    $pmdFloorTableManagerLocale = strpos($pmdFloorTableManagerLocale, 'de') === 0 ? 'de' : 'en';
    $pmdFloorTableManagerText = $pmdFloorTableManagerLocale === 'de'
        ? [
            'add' => 'Tisch hinzufügen',
            'edit' => 'Tisch bearbeiten',
            'manage' => 'Floor-Tischverwaltung',
            'create_title' => 'Neuen Tisch erstellen',
            'edit_title' => 'Tisch bearbeiten',
            'create_subtitle' => 'Praktische Tischdaten direkt im Floor verwalten.',
            'edit_subtitle' => 'Ausgewählten Tisch bearbeiten, ohne die Floor-Seite zu verlassen.',
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
            'create_subtitle' => 'Manage the practical table details directly on the Floor.',
            'edit_subtitle' => 'Edit the selected table without leaving this Floor page.',
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
            'saving' => 'Saving…',
            'loading' => 'Loading table details…',
            'locked' => 'POS/custom table: its number is managed by the existing POS system.',
            'qr' => 'QR remains fully managed by the existing PMD table system. This card never reads or changes QR codes.',
            'select_first' => 'Select one individual table first.',
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
@endphp

<section
    id="pmd-r2-shared-floor-canvas-v310"
    class="pmd-floor-v1 pmd-dashboard-lab-exact-floor-v1{{ $floorMode === 'row' ? ' is-strip-mode is-strip-calibrated' : '' }}"
    data-pmd-floor
    data-pmd-dashboard-lab-exact-floor="v1"
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
    data-floor-view-mode="{{ $floorMode }}"
    data-floor-full-zoom="{{ $floorZoom }}"
    data-floor-mode-cookie="pmd_dashboard_lab_floor_mode"
    data-floor-zoom-cookie="pmd_dashboard_lab_floor_zoom"
    data-pmd-floor-boot-source="server"
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

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="edit" aria-pressed="false" title="Edit layout">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4"></path><path d="M13.5 6.5l4 4"></path></svg>
                <span>Edit</span>
            </button>

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="zoom-out" aria-label="Zoom out" title="Zoom out">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6"></path></svg>
            </button>

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="fit" aria-label="Full Floor" title="Full Floor">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
            </button>

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="zoom-in" aria-label="Zoom in" title="Zoom in">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6"></path></svg>
            </button>

            <button type="button" class="pmd-r2-floor-tool-v316" data-pmd-r2-tool="strip" aria-pressed="{{ $floorMode === 'row' ? 'true' : 'false' }}" aria-label="{{ $stripLabel }}" title="{{ $stripLabel }}">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 12h18"></path></svg>
                <span>{{ $stripLabel }}</span>
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
            <p data-floor-guide-status="range-reservation"><i class="is-range-reservation"></i>Reserved in selected date range</p>
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
        <div
            class="pmd-floor-table-manager"
            data-pmd-floor-table-manager-panel
            data-create-title="{{ $pmdFloorTableManagerText['create_title'] }}"
            data-edit-title="{{ $pmdFloorTableManagerText['edit_title'] }}"
            data-create-subtitle="{{ $pmdFloorTableManagerText['create_subtitle'] }}"
            data-edit-subtitle="{{ $pmdFloorTableManagerText['edit_subtitle'] }}"
            data-save-label="{{ $pmdFloorTableManagerText['save'] }}"
            data-saving-label="{{ $pmdFloorTableManagerText['saving'] }}"
            data-loading-label="{{ $pmdFloorTableManagerText['loading'] }}"
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

                <form class="pmd-floor-table-manager__form" data-pmd-floor-table-manager-form novalidate>
                    <input type="hidden" data-pmd-floor-table-field="table_id" value="0">

                    <div class="pmd-floor-table-manager__grid is-top">
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['number'] }}</span>
                            <input type="number" min="1" step="1" inputmode="numeric" data-pmd-floor-table-field="table_no" required>
                            <small data-pmd-floor-table-number-lock hidden>{{ $pmdFloorTableManagerText['locked'] }}</small>
                        </label>

                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['section'] }}</span>
                            <input type="text" maxlength="120" data-pmd-floor-table-field="table_section" placeholder="Main">
                        </label>

                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['floor'] }}</span>
                            <input type="text" maxlength="120" data-pmd-floor-table-field="floor_name" placeholder="Main Floor">
                        </label>

                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['shape'] }}</span>
                            <select data-pmd-floor-table-field="floor_shape">
                                <option value="rectangle">Rectangle</option>
                                <option value="round">Round</option>
                                <option value="booth">Booth</option>
                                <option value="bar">Bar</option>
                                <option value="custom">Custom</option>
                            </select>
                        </label>
                    </div>

                    <div class="pmd-floor-table-manager__capacity">
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['min'] }}</span>
                            <input type="number" min="0" step="1" inputmode="numeric" data-pmd-floor-table-field="min_capacity" required>
                        </label>
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['normal'] }}</span>
                            <input type="number" min="0" step="1" inputmode="numeric" data-pmd-floor-table-field="preferred_capacity">
                        </label>
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['max'] }}</span>
                            <input type="number" min="0" step="1" inputmode="numeric" data-pmd-floor-table-field="max_capacity" required>
                        </label>
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['extra'] }}</span>
                            <input type="number" min="0" step="1" inputmode="numeric" data-pmd-floor-table-field="extra_capacity">
                        </label>
                    </div>

                    <div class="pmd-floor-table-manager__grid is-priority">
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['priority'] }}</span>
                            <input type="number" min="0" max="9999" step="1" inputmode="numeric" data-pmd-floor-table-field="priority">
                        </label>
                        <label class="pmd-floor-table-manager__field">
                            <span>{{ $pmdFloorTableManagerText['reservation_priority'] }}</span>
                            <input type="number" min="0" max="9999" step="1" inputmode="numeric" data-pmd-floor-table-field="reservation_priority">
                        </label>
                    </div>

                    <div class="pmd-floor-table-manager__switches">
                        <label class="pmd-floor-table-manager__switch"><input type="checkbox" data-pmd-floor-table-field="table_status"><span>{{ $pmdFloorTableManagerText['enabled'] }}</span></label>
                        <label class="pmd-floor-table-manager__switch"><input type="checkbox" data-pmd-floor-table-field="reservable"><span>{{ $pmdFloorTableManagerText['reservable'] }}</span></label>
                        <label class="pmd-floor-table-manager__switch"><input type="checkbox" data-pmd-floor-table-field="visible_on_floor_plan"><span>{{ $pmdFloorTableManagerText['visible'] }}</span></label>
                        <label class="pmd-floor-table-manager__switch"><input type="checkbox" data-pmd-floor-table-field="is_joinable"><span>{{ $pmdFloorTableManagerText['joinable'] }}</span></label>
                    </div>

                    <label class="pmd-floor-table-manager__field is-notes">
                        <span>{{ $pmdFloorTableManagerText['notes'] }}</span>
                        <textarea rows="3" maxlength="1000" data-pmd-floor-table-field="floor_notes" placeholder="{{ $pmdFloorTableManagerText['notes_placeholder'] }}"></textarea>
                    </label>

                    <div class="pmd-floor-table-manager__qr-note">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><path d="M14 14h2v2h-2zM18 14h2v6h-6v-2M16 18h2"></path></svg>
                        <span>{{ $pmdFloorTableManagerText['qr'] }}</span>
                    </div>

                    <div class="pmd-floor-table-manager__error" data-pmd-floor-table-manager-error hidden></div>
                </form>

                <footer class="pmd-floor-table-manager__footer">
                    <button type="button" class="pmd-floor-table-manager__cancel" data-pmd-floor-table-manager-close>{{ $pmdFloorTableManagerText['cancel'] }}</button>
                    <button type="button" class="pmd-floor-table-manager__save" data-pmd-floor-table-manager-save>{{ $pmdFloorTableManagerText['save'] }}</button>
                </footer>
            </section>
        </div>
    @endif

    <div class="pmd-floor-v1__toast" data-floor-toast role="status"></div>
</section>

<script type="application/json" id="pmd-dashboard-lab-exact-floor-bootstrap-v1">{!! $floorBootstrapJson !!}</script>
