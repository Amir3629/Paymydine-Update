@php
    $floorId = $floorId ?? 'pmd-floor-map';
    $floorSize = $floorSize ?? 'standard';
    $floorMode = $floorMode ?? 'full';
    $dataUrl = $dataUrl ?? admin_url('pmd-waiter-dashboard-v9-tenant-data');
    $layoutUrl = $layoutUrl ?? admin_url('pmd-owner-dashboard-floor-layout');
    $stateUrl = $stateUrl ?? admin_url('pmd-floor-v1/state');
    $orderUrl = $orderUrl ?? admin_url('waiter-pos/{table}');
@endphp

<section
    id="{{ $floorId }}"
    class="pmd-floor-v1"
    data-pmd-floor
    data-size="{{ $floorSize }}"
    data-mode="{{ $floorMode }}"
    data-data-url="{{ $dataUrl }}"
    data-layout-url="{{ $layoutUrl }}"
    data-state-url="{{ $stateUrl }}"
    data-order-url="{{ $orderUrl }}"
    aria-busy="true"
>

    {{-- PMD_R2_REAL_NATIVE_TOOLBAR_V33 --}}
    @if ($floorId === 'pmd-r2-shared-floor-canvas-v310')
        <style id="pmd-r2-real-native-toolbar-v33-style">
            /*
             * Reserve transparent space above the bordered Floor section.
             */
            #pmd-r2-shared-floor-canvas-v310 {
                position: relative !important;
                margin-top: 62px !important;
                overflow: visible !important;
            }

            /*
             * Real controls: inside the Floor root for native JS binding,
             * but visually above and outside its border.
             */
            #pmd-r2-shared-floor-canvas-v310
            > .pmd-r2-real-native-toolbar-v33 {
                display: flex !important;
                justify-content: flex-end !important;
                align-items: center !important;
                flex-wrap: nowrap !important;
                gap: 8px !important;

                position: absolute !important;
                top: -54px !important;
                right: 0 !important;
                left: 0 !important;
                z-index: 80 !important;

                width: 100% !important;
                height: 44px !important;
                min-height: 44px !important;

                box-sizing: border-box !important;

                margin: 0 !important;
                padding: 0 !important;

                overflow: visible !important;

                background: transparent !important;
                border: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                outline: 0 !important;
            }

            #pmd-r2-shared-floor-canvas-v310
            > .pmd-r2-real-native-toolbar-v33
            > button {
                display: inline-flex !important;
                justify-content: center !important;
                align-items: center !important;

                width: auto !important;
                min-width: 42px !important;
                height: 42px !important;

                margin: 0 !important;
                padding: 0 14px !important;

                font-family: inherit !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                line-height: 1 !important;
                white-space: nowrap !important;

                color: #10243a !important;
                background: #ffffff !important;

                border: 1px solid #cfe0ed !important;
                border-radius: 13px !important;

                box-shadow: none !important;
                outline: 0 !important;

                cursor: pointer !important;
                pointer-events: auto !important;
                appearance: none !important;
            }

            #pmd-r2-shared-floor-canvas-v310
            > .pmd-r2-real-native-toolbar-v33
            > button:hover {
                background: #f7fafc !important;
            }

            #pmd-r2-shared-floor-canvas-v310
            > .pmd-r2-real-native-toolbar-v33
            > button:active {
                transform: translateY(1px);
            }

            /*
             * Hide the old internal header/status rows only on Reservations.
             * The real Floor stage and cards beneath the include remain intact.
             */
            #pmd-r2-shared-floor-canvas-v310
            > .pmd-floor-v1__header,

            #pmd-r2-shared-floor-canvas-v310
            > .pmd-floor-v1__statusbar {
                display: none !important;
                visibility: hidden !important;

                width: 0 !important;
                height: 0 !important;
                min-height: 0 !important;

                margin: 0 !important;
                padding: 0 !important;

                border: 0 !important;
                overflow: hidden !important;
            }

            #pmd-r2-shared-floor-canvas-v310
            > .pmd-floor-v1__stage {
                margin-top: 0 !important;
            }

            .pmd-r2-v33-label-de {
                display: none;
            }

            html[lang^="de"]
            .pmd-r2-v33-label-en {
                display: none;
            }

            html[lang^="de"]
            .pmd-r2-v33-label-de {
                display: inline;
            }

            @media (max-width: 900px) {
                #pmd-r2-shared-floor-canvas-v310 {
                    margin-top: 56px !important;
                }

                #pmd-r2-shared-floor-canvas-v310
                > .pmd-r2-real-native-toolbar-v33 {
                    top: -49px !important;
                    height: 40px !important;
                    gap: 5px !important;
                }

                #pmd-r2-shared-floor-canvas-v310
                > .pmd-r2-real-native-toolbar-v33
                > button {
                    min-width: 38px !important;
                    height: 38px !important;
                    padding: 0 10px !important;
                    font-size: 12px !important;
                }
            }
        </style>

        <div
            class="pmd-r2-real-native-toolbar-v33"
            role="toolbar"
            aria-label="Reservation Floor controls"
            data-pmd-real-native-toolbar="v33"
        >
            <button
                type="button"
                data-floor-edit
                aria-pressed="false"
                title="Edit Floor layout"
            >
                <span class="pmd-r2-v33-label-en">Edit</span>
                <span class="pmd-r2-v33-label-de">Bearbeiten</span>
            </button>

            <button
                type="button"
                data-floor-zoom-out
                aria-label="Zoom out"
                title="Zoom out"
            >−</button>

            <button
                type="button"
                data-floor-fit
                aria-label="Full Floor"
                title="Full Floor"
            >Full Floor</button>

            <button
                type="button"
                data-floor-zoom-in
                aria-label="Zoom in"
                title="Zoom in"
            >+</button>

            <button
                type="button"
                data-floor-strip
                aria-pressed="false"
                title="Show tables in one row"
            >
                <span class="pmd-r2-v33-label-en">One row</span>
                <span class="pmd-r2-v33-label-de">Eine Reihe</span>
            </button>

            <button
                type="button"
                data-floor-save
                hidden
                aria-hidden="true"
                tabindex="-1"
            >Save</button>
        </div>
    @endif

    <header class="pmd-floor-v1__header">
        <div class="pmd-floor-v1__heading">
            <span class="pmd-floor-v1__eyebrow">Live operations</span>
            <h1>Restaurant Floor</h1>
            <p>One shared floor map for reservations, waiters and operations.</p>
        </div>

        <div class="pmd-floor-v1__toolbar" role="toolbar" aria-label="Floor controls">
            <button type="button" data-floor-guide aria-label="Floor guide" title="Guide">ⓘ</button>
            <button type="button" data-floor-edit aria-pressed="false" title="Edit layout">✎ <span>Edit</span></button>
            <button type="button" data-floor-save hidden title="Save layout">✓ <span>Save</span></button>
            <button type="button" data-floor-merge aria-pressed="false" title="Merge tables">⇄ <span>Merge</span></button>
            <button type="button" data-floor-zoom-out aria-label="Zoom out" title="Zoom out">−</button>
            <button type="button" data-floor-fit aria-label="Fit floor" title="Fit">⌗</button>
            <button type="button" data-floor-zoom-in aria-label="Zoom in" title="Zoom in">＋</button>
            <button type="button" data-floor-fullscreen aria-label="Fullscreen" title="Fullscreen">⛶</button>
            <button type="button" data-floor-refresh aria-label="Refresh" title="Refresh">↻</button>
        </div>
    </header>

    <div class="pmd-floor-v1__statusbar">
        <div class="pmd-floor-v1__filters" role="group" aria-label="Filter tables">
            <button type="button" class="is-active" data-floor-filter="all">All <b data-floor-count="all">0</b></button>
            <button type="button" data-floor-filter="available"><i class="is-available"></i>Available <b data-floor-count="available">0</b></button>
            <button type="button" data-floor-filter="occupied"><i class="is-occupied"></i>Occupied <b data-floor-count="occupied">0</b></button>
            <button type="button" data-floor-filter="reserved"><i class="is-reserved"></i>Reserved <b data-floor-count="reserved">0</b></button>
            <button type="button" data-floor-filter="cleaning"><i class="is-cleaning"></i>Cleaning <b data-floor-count="cleaning">0</b></button>
            <button type="button" data-floor-filter="attention"><i class="is-attention"></i>Attention <b data-floor-count="attention">0</b></button>
        </div>
        <label class="pmd-floor-v1__search"><span>⌕</span><input type="search" data-floor-search placeholder="Search table or area…"></label>
    </div>

    <div class="pmd-floor-v1__stage" data-floor-stage>
        <div class="pmd-floor-v1__loading" data-floor-loading>Loading live floor…</div>
        <div class="pmd-floor-v1__empty" data-floor-empty hidden>No tables match this view.</div>
        <div class="pmd-floor-v1__canvas-wrap" data-floor-scroll>
            <div class="pmd-floor-v1__canvas" data-floor-canvas></div>
        </div>

        <aside
            class="pmd-floor-v1__guide"
            data-floor-guide-card
            aria-label="Floor guide"
            hidden
        >
            <p data-floor-guide-status="available">
                <i class="is-available"></i>
                Available
            </p>

            <p data-floor-guide-status="range-reservation">
                <i class="is-range-reservation"></i>
                Reserved in selected date range
            </p>

            <p data-floor-guide-status="occupied">
                <i class="is-occupied"></i>
                Occupied / open order
            </p>
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
