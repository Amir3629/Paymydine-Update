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

        <aside class="pmd-floor-v1__guide" data-floor-guide-card hidden>
            <div><strong>Floor guide</strong><button type="button" data-floor-guide-close aria-label="Close">×</button></div>
            <p><i class="is-available"></i> Available</p>
            <p><i class="is-occupied"></i> Occupied / open order</p>
            <p><i class="is-reserved"></i> Reserved</p>
            <p><i class="is-cleaning"></i> Needs cleaning</p>
            <p><i class="is-attention"></i> Waiter call, note or ready item</p>
            <small>Edit mode lets you drag tables. Merge mode joins selected tables.</small>
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
