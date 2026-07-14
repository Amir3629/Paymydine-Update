<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#07111f">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter POS · PayMyDine</title>

    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-dashboard-new-v1.css') }}?v=1">

    {{-- Existing production POS engine styles. They are used only after a table opens. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=27">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-product-details-v3.css') }}?v=27">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-polish-v26.css') }}?v=27">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-simple-v27.css') }}?v=27">
</head>
<body class="pmd-waiter-new-page">
<div
    id="pmd-waiter-new"
    class="pmd-waiter-new"
    data-pmd-waiter-new-root
    data-data-url="{{ $dataUrl }}"
    data-overlay-url="{{ $overlayUrl }}"
    data-standalone-url="{{ $standaloneUrl }}"
    data-floor-operations-url="{{ $floorOperationsUrl }}"
>
    <main class="pmd-waiter-launcher" data-waiter-launcher>
        <header class="pmd-waiter-header">
            <div class="pmd-waiter-brand">
                <span class="pmd-waiter-brand-mark" aria-hidden="true">P</span>
                <div>
                    <strong>Waiter POS</strong>
                    <span data-waiter-user>PayMyDine service</span>
                </div>
            </div>

            <div class="pmd-waiter-header-actions">
                <span class="pmd-waiter-sync-state" data-sync-state>
                    <i aria-hidden="true"></i>
                    <span>Connecting</span>
                </span>

                <button
                    type="button"
                    class="pmd-waiter-icon-button"
                    data-open-alerts
                    aria-label="Open service alerts"
                    title="Service alerts"
                >
                    <span aria-hidden="true">!</span>
                    <b data-alert-count hidden>0</b>
                </button>

                <button
                    type="button"
                    class="pmd-waiter-icon-button"
                    data-refresh
                    aria-label="Refresh tables"
                    title="Refresh tables"
                >↻</button>
            </div>
        </header>

        <section class="pmd-waiter-command-bar" aria-label="Table controls">
            <div class="pmd-waiter-tabs" role="tablist" aria-label="Table views">
                <button type="button" class="is-active" data-table-filter="mine" role="tab" aria-selected="true">
                    My tables <span data-count-mine>0</span>
                </button>
                <button type="button" data-table-filter="all" role="tab" aria-selected="false">
                    All <span data-count-all>0</span>
                </button>
                <button type="button" data-table-filter="open" role="tab" aria-selected="false">
                    Open <span data-count-open>0</span>
                </button>
                <button type="button" data-table-filter="attention" role="tab" aria-selected="false">
                    Attention <span data-count-attention>0</span>
                </button>
            </div>

            <label class="pmd-waiter-search">
                <span aria-hidden="true">⌕</span>
                <input
                    type="search"
                    data-table-search
                    placeholder="Search table"
                    autocomplete="off"
                    enterkeyhint="search"
                >
                <button type="button" data-clear-search aria-label="Clear search" hidden>×</button>
            </label>
        </section>

        <nav class="pmd-waiter-sections" data-table-sections aria-label="Restaurant areas"></nav>

        <section class="pmd-waiter-summary" aria-label="Current service summary">
            <div>
                <span>Open checks</span>
                <strong data-summary-open>0</strong>
            </div>
            <div>
                <span>Ready / attention</span>
                <strong data-summary-attention>0</strong>
            </div>
            <div>
                <span>Payment due</span>
                <strong data-summary-due>€0.00</strong>
            </div>
        </section>

        <section class="pmd-waiter-table-area" aria-label="Tables">
            <div class="pmd-waiter-loading" data-table-loading>
                <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>

            <div class="pmd-waiter-empty" data-table-empty hidden>
                <strong>No matching tables</strong>
                <span>Change the filter or clear the search.</span>
                <button type="button" data-reset-filters>Show all tables</button>
            </div>

            <div class="pmd-waiter-table-grid" data-table-grid></div>
        </section>

        <footer class="pmd-waiter-footer">
            <span data-last-updated>Waiting for table data…</span>
            <a href="{{ $floorOperationsUrl }}">Floor operations</a>
        </footer>

        <nav class="pmd-waiter-mobile-nav" aria-label="Waiter quick actions">
            <button type="button" class="is-active" data-mobile-view="mine">
                <span aria-hidden="true">▦</span>
                <b>My tables</b>
            </button>
            <button type="button" data-mobile-view="open">
                <span aria-hidden="true">≡</span>
                <b>Open checks</b>
            </button>
            <button type="button" data-open-alerts>
                <span aria-hidden="true">!</span>
                <b>Attention</b>
                <i data-mobile-alert-count hidden>0</i>
            </button>
            <a href="{{ $floorOperationsUrl }}">
                <span aria-hidden="true">⌂</span>
                <b>Operations</b>
            </a>
        </nav>
    </main>

    <aside class="pmd-waiter-alert-drawer" data-alert-drawer aria-hidden="true">
        <button type="button" class="pmd-waiter-drawer-backdrop" data-close-alerts aria-label="Close alerts"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="pmd-waiter-alert-title">
            <header>
                <div>
                    <span>LIVE SERVICE</span>
                    <h2 id="pmd-waiter-alert-title">Needs attention</h2>
                </div>
                <button type="button" data-close-alerts aria-label="Close alerts">×</button>
            </header>
            <div class="pmd-waiter-alert-list" data-alert-list></div>
        </section>
    </aside>

    <section class="pmd-waiter-pos-layer" data-new-pos-layer hidden aria-hidden="true">
        <div class="pmd-waiter-pos-loading" data-new-pos-loading>
            <span class="pmd-waiter-spinner" aria-hidden="true"></span>
            <strong>Opening table…</strong>
            <button type="button" data-cancel-pos-load>Cancel</button>
        </div>
        <div class="pmd-waiter-pos-host" data-new-pos-host></div>
    </section>

    <div class="pmd-waiter-toast" data-waiter-toast role="status" aria-live="polite"></div>
</div>

{{-- Existing production POS modules; this page mounts them only after a table is selected. --}}
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-payment-v2.js') }}?v=27"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js') }}?v=27"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=27"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-product-details-v3.js') }}?v=27"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-simple-v27.js') }}?v=27"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-dashboard-new-v1.js') }}?v=1"></script>
</body>
</html>
