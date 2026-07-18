<script>
document.documentElement.classList.add('pmd-r2-sidebar-page');
</script>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-sidebar-v1.css?v=20260718-1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-v1.css?v=20260718-1">

<script>
window.PMD_RESERVATIONS2_BOOT = {
    version: 'reservations2-v1',
    route: '/admin/reservations2',
    reservations: @json($pmdReservations2 ?? []),
    createUrl: '{{ admin_url('reservations/create') }}',
    editBaseUrl: '{{ admin_url('reservations/edit') }}'
};
</script>

<aside class="pmd-r2-sidebar" aria-label="Admin navigation">
    <a class="pmd-r2-sidebar__brand" href="{{ admin_url('dashboard') }}" aria-label="PayMyDine dashboard">
        <svg viewBox="0 0 64 64" aria-hidden="true" style="width:44px;height:44px">
            <defs>
                <linearGradient id="pmd-r2-logo-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#8eea26"/>
                    <stop offset="1" stop-color="#00a88d"/>
                </linearGradient>
            </defs>
            <path d="M15 11h22c10 0 17 7 17 16s-7 16-17 16H27v10H15V11Z" fill="url(#pmd-r2-logo-gradient)"/>
            <path d="M27 22h10c3 0 5 2 5 5s-2 5-5 5H27V22Z" fill="#071712"/>
        </svg>
    </a>

    <nav class="pmd-r2-sidebar__nav">
        <a class="pmd-r2-sidebar__item" data-route="dashboard" data-label="Dashboard" href="{{ admin_url('dashboard') }}" aria-label="Dashboard">
            <svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item" data-route="orders" data-label="Orders" href="{{ admin_url('orders') }}" aria-label="Orders">
            <svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item is-active" data-route="reservations2" data-label="Reservations" href="{{ admin_url('reservations2') }}" aria-label="Reservations" aria-current="page">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M8 14h3M13 14h3M8 17h3"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item" data-route="coupons" data-label="Coupons & Gifts" href="{{ admin_url('coupons') }}" aria-label="Coupons and gifts">
            <svg viewBox="0 0 24 24"><path d="m3 12 9-9 9 9-9 9-9-9Z"/><circle cx="9" cy="9" r="1.5"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item" data-route="restaurant" data-label="Restaurant" href="{{ admin_url('restaurant') }}" aria-label="Restaurant">
            <svg viewBox="0 0 24 24"><path d="M6 3v8M3 3v5a3 3 0 0 0 6 0V3M6 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item" data-route="kitchen" data-label="Kitchen Display" href="{{ admin_url('dashboardkitchen') }}" aria-label="Kitchen display">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item" data-route="design" data-label="Design" href="{{ admin_url('themes') }}" aria-label="Design">
            <svg viewBox="0 0 24 24"><path d="m14 4 6 6L9 21H3v-6L14 4Z"/><path d="m12 6 6 6"/></svg>
        </a>

        <a class="pmd-r2-sidebar__item" data-route="system" data-label="System" href="{{ admin_url('settings') }}" aria-label="System">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2H10V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
        </a>
    </nav>

    <div class="pmd-r2-sidebar__footer">
        <a class="pmd-r2-sidebar__profile" href="{{ admin_url('staffs/edit/1') }}" aria-label="Chef Admin profile" title="Chef Admin — Owner">
            <span class="pmd-r2-sidebar__avatar"></span>
        </a>
    </div>
</aside>

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
            <div><span>Today reservations</span><strong data-pmd-r2-kpi="today">0</strong></div>
            <i aria-hidden="true">▣</i>
        </article>
        <article class="pmd-r2-kpi">
            <div><span>Guests today</span><strong data-pmd-r2-kpi="guests">0</strong></div>
            <i aria-hidden="true">♙</i>
        </article>
        <article class="pmd-r2-kpi">
            <div><span>Pending / active</span><strong data-pmd-r2-kpi="active">0</strong></div>
            <i aria-hidden="true">◎</i>
        </article>
        <article class="pmd-r2-kpi">
            <div><span>Assigned tables</span><strong data-pmd-r2-kpi="tables">0</strong></div>
            <i aria-hidden="true">▦</i>
        </article>
    </section>

    <section class="pmd-r2__workspace">
        <aside class="pmd-r2__list-panel">
            <div class="pmd-r2__panel-head">
                <div><h2>Reservations</h2><span data-pmd-r2-count>0 reservations</span></div>
            </div>
            <div class="pmd-r2__filters">
                <label class="pmd-r2__search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search guest, table or status…" data-pmd-r2-search></label>
                <button type="button" class="pmd-r2__clear" data-pmd-r2-clear aria-label="Clear search">×</button>
            </div>
            <div class="pmd-r2__cards" data-pmd-r2-cards></div>
            <div class="pmd-r2__pager"><span data-pmd-r2-page-dots>● ○ ○</span><button type="button" data-pmd-r2-next aria-label="Next reservations">›</button></div>
        </aside>

        <section class="pmd-r2__floor-panel">
            <div class="pmd-r2__panel-head pmd-r2__floor-head">
                <div><h2>Restaurant Floor</h2><span>Select a table to view or create reservations</span></div>
                <button type="button" class="btn btn-default" data-pmd-r2-refresh><span aria-hidden="true">↻</span>Refresh</button>
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

<script src="/app/admin/assets/js/pmd-reservations2-sidebar-v1.js?v=20260718-1"></script>
<script src="/app/admin/assets/js/pmd-reservations2-v1.js?v=20260718-1"></script>
