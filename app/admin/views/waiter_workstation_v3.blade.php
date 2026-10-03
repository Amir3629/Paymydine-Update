<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#080d13">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter Workstation · PayMyDine</title>

    {{-- Only the proven functional POS foundation plus one V3 visual authority. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=3">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-workstation-v3.css') }}?v=300">
</head>
<body class="pmd-w3-page">
<div
    id="pmd-waiter-workstation-v3"
    class="pmd-w3"
    data-pmd-waiter-workstation-v3
    data-data-url="{{ $dataUrl }}"
    data-overlay-url="{{ $overlayUrl }}"
    data-notifications-url="{{ $notificationsUrl }}"
    data-reservations-url="{{ $reservationsUrl }}"
    data-floor-operations-url="{{ $floorOperationsUrl }}"
>
    <main class="pmd-w3-launcher" data-w3-launcher>
        <header class="pmd-w3-header">
            <div class="pmd-w3-brand">
                <span class="pmd-w3-logo" aria-hidden="true">P</span>
                <div>
                    <strong>WAITER WORKSTATION</strong>
                    <small data-w3-user>CONNECTING</small>
                </div>
            </div>

            <div class="pmd-w3-header-actions">
                <span class="pmd-w3-live" data-w3-live><i></i><b>CONNECTING</b></span>
                <button type="button" data-w3-reservations>RESERVATIONS</button>
                <button type="button" class="has-badge" data-w3-alerts>ALERTS <b data-w3-alert-count hidden>0</b></button>
                <button type="button" data-w3-refresh aria-label="Refresh">↻</button>
            </div>
        </header>

        <section class="pmd-w3-commandbar">
            <nav class="pmd-w3-filters" aria-label="Table status filters">
                <button type="button" data-w3-filter="mine"><span>MY TABLES</span><b data-w3-count-mine>0</b></button>
                <button type="button" data-w3-filter="open" class="is-active"><span>OPEN</span><b data-w3-count-open>0</b></button>
                <button type="button" data-w3-filter="attention"><span>ATTENTION</span><b data-w3-count-attention>0</b></button>
                <button type="button" data-w3-filter="free"><span>FREE</span><b data-w3-count-free>0</b></button>
                <button type="button" data-w3-filter="all"><span>ALL</span><b data-w3-count-all>0</b></button>
            </nav>

            <div class="pmd-w3-command-actions">
                <label class="pmd-w3-search">
                    <span aria-hidden="true">⌕</span>
                    <input type="search" data-w3-search placeholder="TABLE, AREA OR STATUS" autocomplete="off" enterkeyhint="search">
                    <button type="button" data-w3-clear-search hidden aria-label="Clear search">×</button>
                </label>
                <button type="button" class="pmd-w3-ops" data-w3-operations>TABLE OPERATIONS</button>
            </div>
        </section>

        <nav class="pmd-w3-areas" data-w3-areas aria-label="Restaurant areas"></nav>

        <section class="pmd-w3-stats" aria-label="Live service totals">
            <article><span>OPEN CHECKS</span><strong data-w3-stat-open>0</strong></article>
            <article><span>READY / CALLS</span><strong data-w3-stat-ready>0</strong></article>
            <article><span>PAYMENT DUE</span><strong data-w3-stat-due>€0.00</strong></article>
            <article><span>FREE TABLES</span><strong data-w3-stat-free>0</strong></article>
        </section>

        <section class="pmd-w3-stage" aria-label="Restaurant tables">
            <div class="pmd-w3-loading" data-w3-loading><i></i><b>LOADING TABLES</b></div>
            <div class="pmd-w3-empty" data-w3-empty hidden>
                <strong>NO TABLES MATCH</strong>
                <span>Clear search or choose another filter.</span>
                <button type="button" data-w3-reset>SHOW ALL</button>
            </div>
            <div class="pmd-w3-table-grid" data-w3-grid></div>
        </section>

        <footer class="pmd-w3-footer">
            <span data-w3-updated>WAITING FOR LIVE DATA</span>
            <span>TAP A TABLE TO START OR CONTINUE ITS CHECK</span>
        </footer>
    </main>

    <aside class="pmd-w3-drawer" data-w3-drawer hidden aria-hidden="true">
        <button type="button" class="pmd-w3-drawer-backdrop" data-w3-close-drawer aria-label="Close"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="pmd-w3-drawer-title">
            <header>
                <div><small>LIVE SERVICE</small><h2 id="pmd-w3-drawer-title">ATTENTION</h2></div>
                <button type="button" data-w3-close-drawer aria-label="Close">×</button>
            </header>
            <nav>
                <button type="button" data-w3-drawer-tab="attention" class="is-active">TABLES</button>
                <button type="button" data-w3-drawer-tab="notifications">ACTIVITY</button>
            </nav>
            <div class="pmd-w3-drawer-list" data-w3-drawer-list></div>
        </section>
    </aside>

    {{-- The table is fetched and mounted off-screen first. The launcher only hides after a successful mount. --}}
    <section class="pmd-w3-pos-layer" data-w3-pos-layer hidden aria-hidden="true">
        <div class="pmd-w3-pos-host" data-w3-pos-host></div>
    </section>

    <div class="pmd-w3-toast" data-w3-toast role="status" aria-live="polite"></div>
</div>

{{-- No legacy final-page decorators, guards, reopen timers or MutationObservers are loaded here. --}}
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-payment-v2.js') }}?v=3"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=3"></script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-workstation-v3.js') }}?v=300"></script>
</body>
</html>
