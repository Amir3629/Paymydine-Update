<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservation-workspace-v2.css?v=2-20260717"
>

@php
    $workspaceData = $pmdReservationWorkspaceData ?? [
        'reservations' => [],
        'tables' => [],
        'areas' => [],
        'stats' => [
            'today' => 0,
            'guests' => 0,
            'active' => 0,
            'assigned_tables' => 0,
        ],
    ];
@endphp

<div
    id="pmd-reservation-workspace-v2"
    data-reservation-workspace
>
    <script
        type="application/json"
        data-reservation-workspace-data
    >{!! json_encode(
        $workspaceData,
        JSON_HEX_TAG |
        JSON_HEX_APOS |
        JSON_HEX_AMP |
        JSON_HEX_QUOT
    ) !!}</script>

    <header class="pmd-rv2-topbar">
        <div class="pmd-rv2-title">
            <strong>Reservations</strong>
            <span>Bookings, walk-ins and floor assignments</span>
        </div>

        <div class="pmd-rv2-date-controls">
            <button type="button" data-rv2-prev-date>‹</button>

            <input
                type="date"
                value="{{ $workspaceData['date'] ?? date('Y-m-d') }}"
                data-rv2-date
            >

            <button type="button" data-rv2-next-date>›</button>
            <button type="button" data-rv2-today>Today</button>
        </div>

        <div class="pmd-rv2-actions">
            <button type="button" data-rv2-refresh>
                Refresh
            </button>

            <a
                href="{{ admin_url('reservations/create') }}"
                class="is-primary"
            >
                + New reservation
            </a>
        </div>
    </header>

    <section class="pmd-rv2-layout">
        <aside class="pmd-rv2-sidebar">
            <div class="pmd-rv2-tabs">
                <button
                    type="button"
                    class="is-active"
                    data-rv2-tab="reservations"
                >
                    Reservations
                </button>

                <button
                    type="button"
                    data-rv2-tab="waitlist"
                >
                    Waitlist
                </button>

                <button
                    type="button"
                    data-rv2-tab="servers"
                >
                    Servers
                </button>
            </div>

            <div class="pmd-rv2-search-row">
                <input
                    type="search"
                    placeholder="Search guest, table or note…"
                    data-rv2-search
                >

                <button type="button" data-rv2-clear-search>
                    ×
                </button>
            </div>

            <div
                class="pmd-rv2-reservation-list"
                data-rv2-reservation-list
            ></div>

            <footer class="pmd-rv2-sidebar-footer">
                <a href="{{ admin_url('reservations/create') }}">
                    + Add walk-in
                </a>

                <button type="button" data-rv2-waitlist>
                    Add to waitlist
                </button>
            </footer>
        </aside>

        <main class="pmd-rv2-floor-panel">
            <nav
                class="pmd-rv2-area-tabs"
                data-rv2-area-tabs
            ></nav>

            <div class="pmd-rv2-floor-scroll">
                <div
                    class="pmd-rv2-floor-canvas"
                    data-rv2-floor
                ></div>
            </div>

            <div class="pmd-rv2-legend">
                <span><i class="is-free"></i>Available</span>
                <span><i class="is-reserved"></i>Reserved</span>
                <span><i class="is-seated"></i>Seated</span>
                <span><i class="is-selected"></i>Selected</span>
            </div>
        </main>
    </section>
</div>

<div class="pmd-rv2-legacy">
    <div class="row-fluid">
        {!! $this->renderList() !!}
    </div>
</div>

<script src="/app/admin/assets/js/pmd-reservation-workspace-v2.js?v=2-20260717"></script>
