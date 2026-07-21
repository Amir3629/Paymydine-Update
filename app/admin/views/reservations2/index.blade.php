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

    window.PMD_RESERVATIONS2_REAL_WAITER_EMBED = true;
})();
</script>

@include('admin::_partials.pmd_side_menu2_single_style')
<link rel="stylesheet" href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-single-source-v1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-v1.css?v=20260719-3">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-mobile-final-v2.css?v=20260720_214338">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-header-final-v1.css?v=20260720_213918">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-waiter-reservation-v4.css?v=20260721-rsv4">

<script>
window.PMD_RESERVATIONS2_BOOT = {
    version: 'reservations2-waiter-reservation-v4',
    route: '/admin/reservations2',
    reservations: @json($pmdReservations2 ?? []),
    createUrl: '{{ admin_url('reservations/create') }}',
    editBaseUrl: '{{ admin_url('reservations/edit') }}'
};
</script>

@include('admin::_partials.pmd_side_menu2_single_menu')

<div id="pmd-reservations2" class="pmd-r2" aria-busy="true">
    <header class="pmd-r2__hero">
        <div>
            <h1>Reservations</h1>
            <p>Bookings and live floor assignments</p>
        </div>
        <div class="pmd-r2__hero-actions">
            <a class="btn btn-primary pmd-r2__new" href="{{ admin_url('reservations/create') }}">
                <span aria-hidden="true">＋</span>
                New reservation
            </a>
        </div>
    </header>

    <main
        id="pmd-waiter-dashboard-root"
        class="pmd-reservations2-waiter-content"
        data-pmd-reservations2-waiter-content
        aria-busy="true"
    >
        <div class="pmd-r2-waiter-boot">Loading reservation floor…</div>
    </main>
</div>

<script src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260718-4"></script>
<script src="/app/admin/assets/js/pmd-reservations2-exact-layout-v1.js?v=20260719-1" defer></script>
<script src="/app/admin/assets/js/pmd-reservations2-v1.js?v=20260718-1"></script>
<script src="/app/admin/assets/js/pmd-reservations2-waiter-reservation-v4.js?v=20260721-rsv4"></script>
