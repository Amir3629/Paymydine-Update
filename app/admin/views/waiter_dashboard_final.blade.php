<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0f1720">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter Workstation · PayMyDine</title>

    {{-- Proven functional engine styles only. Final presentation is owned by one stylesheet below. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=2">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-final-v1.css') }}?v=1">
</head>
<body class="pmd-waiter-final-page">
<div
    id="pmd-waiter-final-v1"
    class="pmd-final"
    data-pmd-waiter-final-root
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
            <div class="pmd-final-brand" aria-label="PayMyDine waiter workstation">
                <span class="pmd-final-logo" aria-hidden="true">P</span>
                <div>
                    <strong>WAITER WORKSTATION</strong>
                    <small data-final-user>Connecting to live service…</small>
                </div>
            </div>

            <div class="pmd-final-header-actions">
                <span class="pmd-final-sync" data-final-sync><i></i><b>CONNECTING</b></span>
                <button type="button" class="pmd-final-icon-button" data-final-reservations title="Reservations" aria-label="Open reservations">R</button>
                <button type="button" class="pmd-final-icon-button has-counter" data-final-alerts title="Notifications and service alerts" aria-label="Open notifications">
                    <span aria-hidden="true">!</span><b data-final-alert-count hidden>0</b>
                </button>
                <button type="button" class="pmd-final-icon-button" data-final-theme title="Switch color mode" aria-label="Switch color mode">◐</button>
                <button type="button" class="pmd-final-icon-button" data-final-refresh title="Refresh" aria-label="Refresh live data">↻</button>
            </div>
        </header>

        <section class="pmd-final-commandbar" aria-label="Table filters">
            <div class="pmd-final-view-tabs" role="tablist">
                <button type="button" data-final-filter="mine" role="tab"><span>MY TABLES</span><b data-final-count-mine>0</b></button>
                <button type="button" data-final-filter="open" role="tab" class="is-active"><span>OPEN</span><b data-final-count-open>0</b></button>
                <button type="button" data-final-filter="attention" role="tab"><span>ATTENTION</span><b data-final-count-attention>0</b></button>
                <button type="button" data-final-filter="free" role="tab"><span>FREE</span><b data-final-count-free>0</b></button>
                <button type="button" data-final-filter="all" role="tab"><span>ALL</span><b data-final-count-all>0</b></button>
            </div>

            <div class="pmd-final-command-actions">
                <label class="pmd-final-search">
                    <span aria-hidden="true">⌕</span>
                    <input type="search" data-final-search placeholder="TABLE, AREA OR STATUS" autocomplete="off" enterkeyhint="search">
                    <button type="button" data-final-clear-search hidden aria-label="Clear search">×</button>
                </label>
                <button type="button" class="pmd-final-operations-link" data-final-floor-operations>TABLE OPERATIONS</button>
            </div>
        </section>

        <nav class="pmd-final-area-tabs" data-final-areas aria-label="Restaurant areas"></nav>

        <section class="pmd-final-status-strip" aria-label="Live service totals">
            <article><span>OPEN CHECKS</span><strong data-final-stat-open>0</strong></article>
            <article><span>READY / CALLS</span><strong data-final-stat-ready>0</strong></article>
            <article><span>PAYMENT DUE</span><strong data-final-stat-due>€0.00</strong></article>
            <article><span>FREE TABLES</span><strong data-final-stat-free>0</strong></article>
        </section>

        <section class="pmd-final-table-stage" aria-label="Live tables">
            <div class="pmd-final-loading" data-final-loading>
                <span></span><span></span><span></span><span></span>
                <b>LOADING LIVE TABLES</b>
            </div>

            <div class="pmd-final-empty" data-final-empty hidden>
                <strong>NO MATCHING TABLES</strong>
                <span>Change the filters or clear the search.</span>
                <button type="button" data-final-reset>SHOW ALL TABLES</button>
            </div>

            <div class="pmd-final-table-grid" data-final-table-grid></div>
        </section>

        <footer class="pmd-final-footer">
            <span data-final-updated>Waiting for live data…</span>
            <span>Tap a table to open ordering. Long-running operational tools remain under TABLE OPERATIONS.</span>
        </footer>
    </main>

    <aside class="pmd-final-drawer" data-final-drawer aria-hidden="true">
        <button type="button" class="pmd-final-drawer-backdrop" data-final-close-drawer aria-label="Close notification drawer"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="pmd-final-drawer-title">
            <header>
                <div>
                    <small>LIVE SERVICE</small>
                    <h2 id="pmd-final-drawer-title">NOTIFICATIONS</h2>
                </div>
                <button type="button" data-final-close-drawer aria-label="Close notifications">×</button>
            </header>
            <div class="pmd-final-drawer-tabs">
                <button type="button" data-final-drawer-tab="attention" class="is-active">TABLE ATTENTION</button>
                <button type="button" data-final-drawer-tab="notifications">ACTIVITY</button>
            </div>
            <div class="pmd-final-drawer-list" data-final-drawer-list></div>
        </section>
    </aside>

    <section class="pmd-final-pos-layer" data-final-pos-layer hidden aria-hidden="true">
        <div class="pmd-final-pos-loading" data-final-pos-loading>
            <span></span>
            <strong>OPENING TABLE</strong>
            <button type="button" data-final-cancel-pos>CANCEL</button>
        </div>
        <div class="pmd-final-pos-host" data-final-pos-host></div>
    </section>

    <div class="pmd-final-toast" data-final-toast role="status" aria-live="polite"></div>
</div>

{{-- Proven application engines. No V2.2.1 visual/theme decorator is loaded. --}}
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-payment-v2.js') }}?v=2"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=2"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js') }}?v=211"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v21.js') }}?v=21"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-standard-v22.js') }}?v=22"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-final-v1.js') }}?v=1"></script>
</body>
</html>
