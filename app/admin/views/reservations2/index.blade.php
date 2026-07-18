<script>
document.documentElement.classList.add('pmd-r2-no-sidebar');
</script>

<style id="pmd-r2-no-sidebar-style">
html.pmd-r2-no-sidebar .sidebar,
html.pmd-r2-no-sidebar #navSidebar,
html.pmd-r2-no-sidebar .sidebar-overlay,
html.pmd-r2-no-sidebar [data-toggle="sidebar"] {
    display: none !important;
}

html.pmd-r2-no-sidebar body,
html.pmd-r2-no-sidebar .page-wrapper,
html.pmd-r2-no-sidebar .page-content,
html.pmd-r2-no-sidebar main,
html.pmd-r2-no-sidebar .content-wrapper {
    margin-left: 0 !important;
    padding-left: 0 !important;
}

html.pmd-r2-no-sidebar .navbar-top,
html.pmd-r2-no-sidebar .navbar-fixed-top {
    left: 0 !important;
    width: 100% !important;
    margin-left: 0 !important;
}

html.pmd-r2-no-sidebar #pmd-reservations2 {
    margin-left: 0 !important;
}
</style>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-v1.css?v=20260718-2">

<script>
window.PMD_RESERVATIONS2_BOOT = {
    version: 'reservations2-v1',
    route: '/admin/reservations2',
    reservations: @json($pmdReservations2 ?? []),
    createUrl: '{{ admin_url('reservations/create') }}',
    editBaseUrl: '{{ admin_url('reservations/edit') }}'
};
</script>

<div id="pmd-reservations2" class="pmd-r2" aria-busy="true">
    <header class="pmd-r2__hero">
        <div>
            <h1>Reservations</h1>
            <p>Bookings and live floor assignments</p>
        </div>

        <div class="pmd-r2__hero-actions">
            <button type="button" class="btn btn-default pmd-r2__refresh" data-pmd-r2-refresh>
                <span aria-hidden="true">↻</span>
                Refresh
            </button>
            <a class="btn btn-primary pmd-r2__new" href="{{ admin_url('reservations/create') }}">
                <span aria-hidden="true">＋</span>
                New reservation
            </a>
        </div>
    </header>

    <section class="pmd-r2__kpis" aria-label="Reservation summary">
        <article class="pmd-r2-kpi">
            <div>
                <span>Today reservations</span>
                <strong data-pmd-r2-kpi="today">0</strong>
            </div>
            <i aria-hidden="true">▣</i>
        </article>

        <article class="pmd-r2-kpi">
            <div>
                <span>Guests today</span>
                <strong data-pmd-r2-kpi="guests">0</strong>
            </div>
            <i aria-hidden="true">♙</i>
        </article>

        <article class="pmd-r2-kpi">
            <div>
                <span>Pending / active</span>
                <strong data-pmd-r2-kpi="active">0</strong>
            </div>
            <i aria-hidden="true">◎</i>
        </article>

        <article class="pmd-r2-kpi">
            <div>
                <span>Assigned tables</span>
                <strong data-pmd-r2-kpi="tables">0</strong>
            </div>
            <i aria-hidden="true">▦</i>
        </article>
    </section>

    <section class="pmd-r2__workspace">
        <aside class="pmd-r2__list-panel">
            <div class="pmd-r2__panel-head">
                <div>
                    <h2>Reservations</h2>
                    <span data-pmd-r2-count>0 reservations</span>
                </div>
            </div>

            <div class="pmd-r2__filters">
                <label class="pmd-r2__search">
                    <span aria-hidden="true">⌕</span>
                    <input type="search" placeholder="Search guest, table or status…" data-pmd-r2-search>
                </label>
                <button type="button" class="pmd-r2__clear" data-pmd-r2-clear aria-label="Clear search">×</button>
            </div>

            <div class="pmd-r2__cards" data-pmd-r2-cards></div>

            <div class="pmd-r2__pager">
                <span data-pmd-r2-page-dots>● ○ ○</span>
                <button type="button" data-pmd-r2-next aria-label="Next reservations">›</button>
            </div>
        </aside>

        <section class="pmd-r2__floor-panel">
            <div class="pmd-r2__panel-head pmd-r2__floor-head">
                <div>
                    <h2>Restaurant Floor</h2>
                    <span>Select a table to view or create reservations</span>
                </div>
                <button type="button" class="btn btn-default" data-pmd-r2-refresh>
                    <span aria-hidden="true">↻</span>
                    Refresh
                </button>
            </div>

            <div class="pmd-r2-floor" data-pmd-r2-floor></div>

            <div class="pmd-r2__legend" aria-label="Floor status legend">
                <span><i class="is-free"></i>Free</span>
                <span><i class="is-reserved"></i>Reserved</span>
                <span><i class="is-occupied"></i>Occupied</span>
                <span><i class="is-cleaning"></i>Needs cleaning</span>
            </div>
        </section>
    </section>
</div>

<div class="pmd-r2-source" aria-hidden="true">
    {!! $this->renderList() !!}
</div>

<script src="/app/admin/assets/js/pmd-reservations2-v1.js?v=20260718-2"></script>
