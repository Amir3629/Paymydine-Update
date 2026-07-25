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

    document.documentElement.classList.add('pmd-r2-runtime-booting');
    window.PMD_RESERVATIONS2_RUNTIME_CLEANUP = true;
    window.PMD_RESERVATIONS2_REAL_WAITER_EMBED = false;
})();
</script>

@include('admin::_partials.pmd_side_menu2_single_style')
<link rel="stylesheet" href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-single-source-v1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-v1.css?v=20260719-3">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-mobile-final-v2.css?v=20260720_214338">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-header-final-v1.css?v=20260720_213918">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-runtime-cleanup-v1.css?v=1.0.0">

<script>
window.PMD_RESERVATIONS2_BOOT = {
    version: 'reservations2-runtime-cleanup-v1',
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

    <!-- PMD_R2_SHARED_FLOOR_CANVAS_V310_START -->

    @include('admin::_partials.pmd_floor_map_v1', [
        'floorId' => 'pmd-r2-shared-floor-canvas-v310',
        'floorSize' => 'large',
        'floorMode' => 'full',
        'dataUrl' => admin_url(
            'pmd-waiter-dashboard-v9-tenant-data'
        ),
        'layoutUrl' => admin_url(
            'pmd-owner-dashboard-floor-layout'
        ),
        'stateUrl' => admin_url(
            'pmd-floor-v1/state'
        ),
        'orderUrl' => admin_url(
            'waiter-pos/{table}'
        ),
    ])

    <!-- PMD_R2_SHARED_FLOOR_CANVAS_V310_END -->
</div>

<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-floor-v1.css?v=pmd-r2-v310"
>
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-floor-v1-stable-v11.css?v=pmd-r2-v310"
>
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-floor-v1-native-smart-v20.css?v=pmd-r2-v310"
>
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-reservations2-floor-canvas-v310.css?v=20260722_125201"
>

<script
  src="/app/admin/assets/js/pmd-floor-v1.js?v=pmd-r2-v310"
  defer
></script>
<script
  src="/app/admin/assets/js/pmd-floor-v1-stable-v11.js?v=pmd-r2-v310"
  defer
></script>

<script src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260718-4"></script>
<script src="/app/admin/assets/js/pmd-reservations2-v1.js?v=20260718-1"></script>

<!-- PMD_R2_MOBILE_HAMBURGER_V301_START -->
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservations2-mobile-hamburger-v301.css?v=20260722_111424"
>
<script
    src="/app/admin/assets/js/pmd-reservations2-mobile-hamburger-v301.js?v=20260722_111424"
    defer
></script>
<!-- PMD_R2_MOBILE_HAMBURGER_V301_END -->

<!-- PMD_R2_RESERVATION_KPIS_V307_START -->
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservations2-kpis-v307.css?v=20260722_120725"
>
<script
    src="/app/admin/assets/js/pmd-reservations2-kpis-v307.js?v=20260722_120725"
    defer
></script>
<!-- PMD_R2_RESERVATION_KPIS_V307_END -->

<!-- PMD_R2_FLOOR_RESERVATION_V312_START -->
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-reservations2-floor-reservation-v312.css?v=20260722_135939"
>
<script
  src="/app/admin/assets/js/pmd-reservations2-floor-reservation-v312.js?v=20260722_135939"
  defer
></script>
<!-- PMD_R2_FLOOR_RESERVATION_V312_END -->

<!-- PMD_R2_FLOOR_TOOLBAR_V316_START -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-reservations2-floor-toolbar-v316.css') }}?v=20260722_235352">
<script defer
        src="{{ asset('app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js') }}?v=20260722_235352"></script>
<!-- PMD_R2_FLOOR_TOOLBAR_V316_END -->

<!-- PMD_R2_DATE_POPOVER_V318_START -->
<link
    rel="stylesheet"
    href="{{ asset('app/admin/assets/css/pmd-reservations2-date-popover-v318.css') }}?v=20260722_230938"
>
<script
    defer
    src="{{ asset('app/admin/assets/js/pmd-reservations2-date-popover-v318.js') }}?v=20260722_230938"
></script>
<!-- PMD_R2_DATE_POPOVER_V318_END -->

<!-- PMD_R2_EMBEDDED_CALENDAR_TOGGLE_V1_START -->
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css?v=1.19.0-20260724_223035"
>
<script
  src="/app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js?v=1.16.0-20260724_212035"
></script>
<!-- PMD_R2_EMBEDDED_CALENDAR_TOGGLE_V1_END -->

<script
  src="/app/admin/assets/js/pmd-reservations2-runtime-cleanup-v1.js?v=1.0.0"
  defer
></script>
