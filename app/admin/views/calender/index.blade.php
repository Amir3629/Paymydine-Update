<script>
(function () {
    var state = 'collapsed';
    try {
        state = localStorage.getItem('pmd.sideMenu2.state') === 'expanded'
            ? 'expanded'
            : 'collapsed';
    } catch (error) {}
    document.documentElement.classList.add(
        state === 'expanded' ? 'pmd-sm2-expanded' : 'pmd-sm2-collapsed'
    );
})();
</script>

@include('admin::_partials.pmd_side_menu2_single_style')
<link rel="stylesheet" href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260724-calendar-v1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-year-calendar-v1.css?v=20260724-1">

<script>
window.PMD_YEAR_CALENDAR_BOOT = {
    version: '1.0.0',
    route: '/admin/calender',
    year: @json($calendarYear),
    today: @json(now()->format('Y-m-d')),
    reservations: @json($calendarReservations ?? []),
    events: @json($calendarEvents ?? []),
    reports: @json($calendarReports ?? []),
    reservationCreateUrl: @json(admin_url('reservations/create')),
    reservationEditBaseUrl: @json(admin_url('reservations/edit'))
};
</script>

@include('admin::_partials.pmd_side_menu2_single_menu')

<div id="pmd-year-calendar" class="pmd-yc" aria-busy="true">
    <header class="pmd-yc__header">
        <div class="pmd-yc__title-wrap">
            <span class="pmd-yc__eyebrow">Operations calendar</span>
            <h1><span data-pmd-yc-year>{{ $calendarYear }}</span> Year overview</h1>
            <p>Reservations, Germany events and daily performance in one calendar.</p>
        </div>

        <div class="pmd-yc__header-actions" role="toolbar" aria-label="Calendar controls">
            <button type="button" data-pmd-yc-prev aria-label="Previous year">←</button>
            <button type="button" class="pmd-yc__today" data-pmd-yc-today>Today</button>
            <button type="button" data-pmd-yc-next aria-label="Next year">→</button>
            <a href="{{ admin_url('reservations/create') }}" class="pmd-yc__new">＋ New reservation</a>
        </div>
    </header>

    <section class="pmd-yc__summary" aria-label="Year summary">
        <article><span>Reservations</span><strong data-pmd-yc-reservation-total>0</strong><small>For this year</small></article>
        <article><span>Busy days</span><strong data-pmd-yc-busy-days>0</strong><small>With bookings</small></article>
        <article><span>Events</span><strong data-pmd-yc-event-total>0</strong><small>Germany & local</small></article>
        <article><span>Today</span><strong data-pmd-yc-today-label>—</strong><small>Open day report</small></article>
    </section>

    <div class="pmd-yc__toolbar">
        <div class="pmd-yc__legend" aria-label="Calendar legend">
            <span><i class="is-reservation">R</i>Reservation</span>
            <span><i class="is-football">⚽</i>Football</span>
            <span><i class="is-event">★</i>Germany event</span>
            <span><i class="is-report">€</i>Day report</span>
        </div>
        <div class="pmd-yc__filters" role="group" aria-label="Calendar filters">
            <button type="button" class="is-active" data-pmd-yc-filter="all">All</button>
            <button type="button" data-pmd-yc-filter="reservations">Reservations</button>
            <button type="button" data-pmd-yc-filter="events">Events</button>
            <button type="button" data-pmd-yc-filter="reports">Reports</button>
        </div>
    </div>

    <main class="pmd-yc__months" data-pmd-yc-months aria-live="polite"></main>
</div>

<div class="pmd-yc-drawer" data-pmd-yc-drawer aria-hidden="true">
    <button type="button" class="pmd-yc-drawer__backdrop" data-pmd-yc-close tabindex="-1" aria-label="Close day details"></button>
    <aside class="pmd-yc-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="pmd-yc-drawer-title">
        <div class="pmd-yc-drawer__head">
            <div>
                <span data-pmd-yc-drawer-kicker>Day overview</span>
                <h2 id="pmd-yc-drawer-title" data-pmd-yc-drawer-title>—</h2>
            </div>
            <button type="button" data-pmd-yc-close aria-label="Close">×</button>
        </div>
        <div class="pmd-yc-drawer__body" data-pmd-yc-drawer-body></div>
    </aside>
</div>

<script src="/app/admin/assets/js/pmd-year-calendar-v1.js?v=20260724-1"></script>
