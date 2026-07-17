<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#11151a">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter POS · PayMyDine</title>

    {{-- Proven ordering/payment engine styles. V2.x layers only extend the isolated waiter page. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=2">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-dashboard-new-v1.css') }}?v=2">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v21.css') }}?v=21">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v211-payment-guard.css') }}?v=211">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v22.css') }}?v=22">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v221-theme.css') }}?v=221">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v23-operational-polish.css') }}?v=23-20260716_120010">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v231-category-dark-fix.css') }}?v=231-20260716_123909">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-launcher-v232-service-rail.css') }}?v=2321-20260716">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-launcher-v233-unified-ui.css') }}?v=233-20260716">
</head>
<body class="pmd-waiter-new-page pmd-waiter-standard-v2-page pmd-waiter-standard-v21-page pmd-waiter-standard-v211-page pmd-waiter-standard-v221-page pmd-waiter-standard-v22-page pmd-waiter-standard-v23-page">
<div
    id="pmd-waiter-standard-v2"
    class="pmd-waiter-standard-v2"
    data-pmd-waiter-v2-root
    data-data-url="{{ $dataUrl }}"
    data-overlay-url="{{ $overlayUrl }}"
    data-standalone-url="{{ $standaloneUrl }}"
    data-floor-operations-url="{{ $floorOperationsUrl }}"
>
    <main class="pmd-v2-launcher" data-v2-launcher>
        <header class="pmd-v2-topbar">
            <div class="pmd-v2-brand">
                <span class="pmd-v2-brand-key" aria-hidden="true">P</span>
                <div>
                    <strong>WAITER POS</strong>
                    <small data-v2-user>Live service</small>
                </div>
            </div>

            <div class="pmd-v2-top-actions">
                <span class="pmd-v2-live" data-v2-sync><i></i><b>CONNECTING</b></span>
                <button type="button" data-v2-alerts aria-label="Service alerts">
                    <span>!</span><b data-v2-alert-count hidden>0</b>
                </button>
            </div>
        </header>

            <div class="pmd-v2-mode-keys" role="tablist" aria-label="Table views">
                <button type="button" data-v2-filter="mine" role="tab">
                    <span>MY TABLES</span><b data-v2-count-mine>0</b>
                </button>
                <button type="button" data-v2-filter="all" role="tab" class="is-active">
                    <span>ALL</span><b data-v2-count-all>0</b>
                </button>
                <button type="button" data-v2-filter="open" role="tab">
                    <span>OPEN</span><b data-v2-count-open>0</b>
                </button>
                <button type="button" data-v2-filter="call" role="tab">
                    <span>WAITER CALLS</span><b data-v2-count-call>0</b>
                </button>
                <button type="button" data-v2-filter="note" role="tab">
                    <span>NOTES</span><b data-v2-count-note>0</b>
                </button>
            </div>

        <section class="pmd-v2-command">

            <label class="pmd-v2-search">
                <span aria-hidden="true">⌕</span>
                <input type="search" data-v2-search placeholder="TABLE OR AREA" autocomplete="off" enterkeyhint="search">
                <button type="button" data-v2-clear-search hidden aria-label="Clear search">×</button>
            </label>
        </section>

        <nav class="pmd-v2-area-keys" data-v2-areas aria-label="Restaurant areas"></nav>

        <section class="pmd-v2-table-stage" aria-label="Restaurant tables">
            <div class="pmd-v2-loading" data-v2-loading>
                <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>

            <div class="pmd-v2-empty" data-v2-empty hidden>
                <strong>NO TABLES</strong>
                <span>Change the view or clear the search.</span>
                <button type="button" data-v2-reset>SHOW ALL</button>
            </div>

            <div class="pmd-v2-table-grid" data-v2-table-grid></div>
        </section>

        <footer class="pmd-v2-footer">
            <span data-v2-updated>Loading live tables…</span>
            <a href="{{ $floorOperationsUrl }}">FLOOR OPERATIONS</a>
        </footer>
    </main>

    <aside class="pmd-v2-alert-drawer" data-v2-alert-drawer aria-hidden="true">
        <button type="button" class="pmd-v2-drawer-backdrop" data-v2-close-alerts aria-label="Close alerts"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="pmd-v2-alert-title">
            <header>
                <div>
                    <small>LIVE SERVICE</small>
                    <h2 id="pmd-v2-alert-title">ATTENTION</h2>
                </div>
                <button type="button" data-v2-close-alerts aria-label="Close alerts">×</button>
            </header>
            <div data-v2-alert-list></div>
        </section>
    </aside>

    <section class="pmd-v2-pos-layer" data-v2-pos-layer hidden aria-hidden="true">
        <div class="pmd-v2-pos-loading" data-v2-pos-loading>
            <span></span>
            <strong>OPENING TABLE</strong>
            <button type="button" data-v2-cancel-pos>CANCEL</button>
        </div>
        <div class="pmd-v2-pos-host" data-v2-pos-host></div>
    </section>

    <div class="pmd-v2-toast" data-v2-toast role="status" aria-live="polite"></div>
</div>

{{-- Only the isolated stable POS engine and versioned waiter layers are loaded. --}}
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-payment-v2.js') }}?v=2"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=2"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-dashboard-new-v1.js') }}?v=2321-20260716"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v21.js') }}?v=21"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js') }}?v=211"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v22.js') }}?v=22"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v221-theme.js') }}?v=221"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v23-operational-polish.js') }}?v=23-20260716_120010"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js') }}?v=231-20260716_123909"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-launcher-v233-unified-ui.js') }}?v=233-20260716"></script>
</body>
</html>
