@php
    $pmd = $pmdReservationWorkspace ?? ['reservations' => [], 'tables' => [], 'areas' => [], 'kpis' => [], 'create_url' => admin_url('reservations/create')];
    $kpis = $pmd['kpis'] ?? [];
@endphp

<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-reservations-native-v1.css') }}?v={{ time() }}">

<div id="pmd-reservations-workspace" data-pmd-reservations='@json($pmd)'>
    <section class="pmd-reservations-header">
        <div>
            <h1>Reservations</h1>
            <p>Bookings and live floor assignments</p>
        </div>
        <div class="pmd-reservations-actions">
            <a class="pmd-reservations-btn pmd-reservations-btn-muted" href="{{ admin_url('reservations') }}">Refresh</a>
            <a class="pmd-reservations-btn pmd-reservations-btn-primary" href="{{ $pmd['create_url'] ?? admin_url('reservations/create') }}">New reservation</a>
        </div>
    </section>

    <section class="pmd-reservations-kpis" aria-label="Reservation metrics">
        <article><span>Today Reservations</span><strong>{{ (int)($kpis['today_reservations'] ?? 0) }}</strong></article>
        <article><span>Guests Today</span><strong>{{ (int)($kpis['guests_today'] ?? 0) }}</strong></article>
        <article><span>Pending / Active</span><strong>{{ (int)($kpis['pending_active'] ?? 0) }}</strong></article>
        <article><span>Assigned Tables</span><strong>{{ (int)($kpis['assigned_tables'] ?? 0) }}</strong></article>
    </section>

    <section class="pmd-reservations-shell">
        <aside class="pmd-reservations-list" aria-label="Reservations list">
            <div class="pmd-reservations-panel-head">
                <div><h2>Reservations</h2><span data-pmd-total>{{ count($pmd['reservations'] ?? []) }} total</span></div>
            </div>
            <div class="pmd-reservations-search">
                <input type="search" data-pmd-search placeholder="Search name, ID, table, status" aria-label="Search reservations">
                <button type="button" data-pmd-clear-search>Clear</button>
            </div>
            <div class="pmd-reservation-card-stage" data-pmd-card-stage></div>
            <div class="pmd-reservation-carousel-controls">
                <button type="button" data-pmd-prev aria-label="Previous reservation">Previous</button>
                <div data-pmd-dots class="pmd-reservation-dots" aria-label="Reservation pagination"></div>
                <button type="button" data-pmd-next aria-label="Next reservation">Next</button>
            </div>
        </aside>

        <main class="pmd-reservations-floor-panel" aria-label="Reservation floor">
            <div class="pmd-reservations-panel-head">
                <div><h2>Reservation Floor</h2><span>{{ count($pmd['tables'] ?? []) }} tables</span></div>
            </div>
            <div class="pmd-reservation-area-tabs" data-pmd-area-tabs role="tablist"></div>
            <div class="pmd-reservation-floor" data-pmd-floor></div>
        </main>
    </section>

    <div class="pmd-reservation-modal" data-pmd-modal hidden>
        <div class="pmd-reservation-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-reservation-modal-title">
            <button type="button" class="pmd-reservation-modal-close" data-pmd-modal-close aria-label="Close table reservation panel">×</button>
            <div data-pmd-modal-body></div>
        </div>
    </div>
</div>

<script defer src="{{ asset('app/admin/assets/js/pmd-reservations-native-v1.js') }}?v={{ time() }}"></script>
