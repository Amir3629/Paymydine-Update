<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#090d12">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter POS Final2 · PayMyDine</title>

    {{-- Functional POS engine styles first; Final2 owns the final visual authority. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=2">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v211-payment-guard.css') }}?v=211">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-standard-v22.css') }}?v=22">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-final-v2.css') }}?v=2">
</head>
<body class="pmd-waiter-final2-page">
<div
    id="pmd-waiter-final-v2"
    class="pmd-final pmd-final2"
    data-pmd-waiter-final-root
    data-pmd-waiter-final2-root
    data-data-url="{{ $dataUrl }}"
    data-overlay-url="{{ $overlayUrl }}"
    data-standalone-url="{{ $standaloneUrl }}"
    data-notifications-url="{{ $notificationsUrl }}"
    data-reservations-url="{{ $reservationsUrl }}"
    data-floor-operations-url="{{ $floorOperationsUrl }}"
    data-operations-url="{{ $operationsUrl }}"
>
    <main class="pmd-final-launcher" data-final-launcher>
        <header class="pmd-final-header">
            <div class="pmd-final-brand" aria-label="PayMyDine waiter POS">
                <span class="pmd-final-logo" aria-hidden="true">P</span>
                <div>
                    <strong>WAITER POS</strong>
                    <small data-final-user>CONNECTING…</small>
                </div>
            </div>

            <div class="pmd-final-header-actions">
                <span class="pmd-final-sync" data-final-sync><i></i><b>CONNECTING</b></span>
                <button type="button" class="pmd-final-icon-button" data-final-reservations title="Reservations" aria-label="Reservations">RES</button>
                <button type="button" class="pmd-final-icon-button has-counter" data-final-alerts title="Service alerts" aria-label="Service alerts">
                    <span aria-hidden="true">!</span><b data-final-alert-count hidden>0</b>
                </button>
                <button type="button" class="pmd-final-icon-button" data-final-theme title="Switch color mode" aria-label="Switch color mode">◐</button>
                <button type="button" class="pmd-final-icon-button" data-final-refresh title="Refresh" aria-label="Refresh">↻</button>
            </div>
        </header>

        <section class="pmd-final-commandbar" aria-label="Table filters">
            <div class="pmd-final-view-tabs" role="tablist">
                <button type="button" data-final-filter="mine" role="tab"><span>MINE</span><b data-final-count-mine>0</b></button>
                <button type="button" data-final-filter="open" role="tab" class="is-active"><span>OPEN</span><b data-final-count-open>0</b></button>
                <button type="button" data-final-filter="attention" role="tab"><span>CALLS</span><b data-final-count-attention>0</b></button>
                <button type="button" data-final-filter="free" role="tab"><span>FREE</span><b data-final-count-free>0</b></button>
                <button type="button" data-final-filter="all" role="tab"><span>ALL</span><b data-final-count-all>0</b></button>
            </div>

            <div class="pmd-final-command-actions">
                <label class="pmd-final-search">
                    <span aria-hidden="true">⌕</span>
                    <input type="search" data-final-search placeholder="TABLE / AREA / STATUS" autocomplete="off" enterkeyhint="search">
                    <button type="button" data-final-clear-search hidden aria-label="Clear search">×</button>
                </label>
                <button type="button" class="pmd-final-operations-link" data-final-floor-operations>OPERATIONS</button>
            </div>
        </section>

        <nav class="pmd-final-area-tabs" data-final-areas aria-label="Restaurant areas"></nav>

        <section class="pmd-final-status-strip" aria-label="Live service totals">
            <article><span>OPEN</span><strong data-final-stat-open>0</strong></article>
            <article><span>READY / CALLS</span><strong data-final-stat-ready>0</strong></article>
            <article><span>PAYMENT DUE</span><strong data-final-stat-due>€0.00</strong></article>
            <article><span>FREE</span><strong data-final-stat-free>0</strong></article>
        </section>

        <section class="pmd-final-table-stage" aria-label="Live tables">
            <div class="pmd-final-loading" data-final-loading>
                <span></span><span></span><span></span><span></span>
                <b>LOADING TABLES</b>
            </div>

            <div class="pmd-final-empty" data-final-empty hidden>
                <strong>NO TABLES</strong>
                <span>Change the filter or clear the search.</span>
                <button type="button" data-final-reset>SHOW ALL</button>
            </div>

            <div class="pmd-final-table-grid" data-final-table-grid></div>
        </section>

        <footer class="pmd-final-footer">
            <span data-final-updated>WAITING FOR LIVE DATA</span>
            <span>SELECT A TABLE TO START OR CONTINUE THE CHECK</span>
        </footer>
    </main>

    <aside class="pmd-final-drawer" data-final-drawer aria-hidden="true" inert>
        <button type="button" class="pmd-final-drawer-backdrop" data-final-close-drawer aria-label="Close service drawer"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="pmd-final2-drawer-title">
            <header>
                <div><small>LIVE SERVICE</small><h2 id="pmd-final2-drawer-title">ATTENTION</h2></div>
                <button type="button" data-final-close-drawer aria-label="Close">×</button>
            </header>
            <div class="pmd-final-drawer-tabs">
                <button type="button" data-final-drawer-tab="attention" class="is-active">TABLES</button>
                <button type="button" data-final-drawer-tab="notifications">ACTIVITY</button>
            </div>
            <div class="pmd-final-drawer-list" data-final-drawer-list></div>
        </section>
    </aside>

    <section class="pmd-final-pos-layer" data-final-pos-layer data-v2-pos-layer hidden aria-hidden="true">
        <div class="pmd-final-pos-loading" data-final-pos-loading>
            <span></span><strong>OPENING TABLE</strong><button type="button" data-final-cancel-pos>CANCEL</button>
        </div>
        <div class="pmd-final-pos-host" data-final-pos-host data-v2-pos-host></div>
    </section>

    <div class="pmd-final-toast" data-final-toast role="status" aria-live="polite"></div>
</div>

{{-- Proven functional engines. Final2 adds presentation only and no observer loop. --}}
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-payment-v2.js') }}?v=2"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=2"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js') }}?v=211"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v22.js') }}?v=22"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-final-v11-fixes.js') }}?v=11"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-final-v1.js') }}?v=1"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-final-v12-runtime-fixes.js') }}?v=12"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-final-v2.js') }}?v=2"></script>
</body>
</html>
