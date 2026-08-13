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

    $floorBootstrapPayload = [
        'version' => $floorBootstrap['version']
            ?? 'dashboard-lab-exact-reservations-floor-v1',
        'data' => $floorBootstrap['data'] ?? [],
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

    <div class="pmd-floor-v1__toast" data-floor-toast role="status"></div>
</section>

<script type="application/json" id="pmd-dashboard-lab-exact-floor-bootstrap-v1">{!! $floorBootstrapJson !!}</script>
