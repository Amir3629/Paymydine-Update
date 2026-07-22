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

<!-- PMD_R2_FLOOR_TOOLBAR_V313_START -->

<script>
(function () {
    'use strict';

    var floor = document.getElementById(
        'pmd-r2-shared-floor-canvas-v310'
    );

    if (!floor) {
        return;
    }

    var statusbar = floor.querySelector(
        '.pmd-floor-v1__statusbar'
    );

    if (!statusbar) {
        return;
    }

    var oldToolbar = statusbar.querySelector(
        '[data-pmd-r2-floor-toolbar-v313]'
    );

    if (oldToolbar) {
        oldToolbar.remove();
    }

    var toolbar = document.createElement('div');

    toolbar.className =
        'pmd-floor-v1__secondary-toolbar ' +
        'pmd-r2-floor-toolbar-v313';

    toolbar.setAttribute(
        'data-floor-secondary-toolbar',
        ''
    );

    toolbar.setAttribute(
        'data-pmd-r2-floor-toolbar-v313',
        ''
    );

    toolbar.setAttribute(
        'role',
        'toolbar'
    );

    toolbar.setAttribute(
        'aria-label',
        'Reservation Floor controls'
    );

    toolbar.innerHTML = [
        '<button type="button" ',
        'data-floor-edit ',
        'aria-pressed="false" ',
        'title="Edit layout">',
        '<i class="ti ti-edit ',
        'pmd-tabler-icon" ',
        'style="--pmd-icon-size:17px" ',
        'aria-hidden="true"></i>',
        '<span>Edit</span>',
        '</button>',

        '<button type="button" ',
        'data-floor-save ',
        'hidden ',
        'title="Save layout">',
        '<i class="ti ti-check ',
        'pmd-tabler-icon" ',
        'style="--pmd-icon-size:17px" ',
        'aria-hidden="true"></i>',
        '<span>Save</span>',
        '</button>',

        '<button type="button" ',
        'data-floor-zoom-out ',
        'aria-label="Zoom out" ',
        'title="Zoom out">',
        '<i class="ti ti-zoom-out ',
        'pmd-tabler-icon" ',
        'style="--pmd-icon-size:17px" ',
        'aria-hidden="true"></i>',
        '</button>',

        '<button type="button" ',
        'data-floor-fit ',
        'aria-label="Full Floor map" ',
        'title="Full Floor map">',
        '<i class="ti ti-focus-centered ',
        'pmd-tabler-icon" ',
        'style="--pmd-icon-size:17px" ',
        'aria-hidden="true"></i>',
        '</button>',

        '<button type="button" ',
        'data-floor-zoom-in ',
        'aria-label="Zoom in" ',
        'title="Zoom in">',
        '<i class="ti ti-zoom-in ',
        'pmd-tabler-icon" ',
        'style="--pmd-icon-size:17px" ',
        'aria-hidden="true"></i>',
        '</button>',

        '<button type="button" ',
        'class="pmd-floor-v1__tool" ',
        'data-floor-strip ',
        'aria-pressed="false" ',
        'title="Show tables in one row">',
        '<i class="ti ti-table-row ',
        'pmd-tabler-icon" ',
        'style="--pmd-icon-size:17px" ',
        'aria-hidden="true"></i>',
        '<span>One row</span>',
        '</button>'
    ].join('');

    statusbar.appendChild(toolbar);

    document.documentElement.classList.add(
        'pmd-r2-floor-v313-controls-seeded'
    );
})();
</script>

<!-- PMD_R2_FLOOR_TOOLBAR_V313_END -->

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


<!-- PMD_R2_EXACT_FLOOR_V5_START -->
<!-- PMD_R2_EXACT_FLOOR_V5_END -->


<!-- PMD_R2_CONTENT_BOUNDARIES_V51_START -->
<!-- PMD_R2_CONTENT_BOUNDARIES_V51_END -->


<!-- PMD_R2_BEHAVIOR_ONLY_V7_START -->

<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-reservations2-behavior-only-v7.css?v=20260721_161339"
>

<script
  src="/app/admin/assets/js/pmd-reservations2-behavior-only-v7.js?v=20260721_161339"
></script>

<!-- PMD_R2_BEHAVIOR_ONLY_V7_END -->


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


<!-- PMD_R2_PRUNE_V305_START -->

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservations2-prune-v305.css?v=20260722_114756"
>

<script
    src="/app/admin/assets/js/pmd-reservations2-prune-v305.js?v=20260722_114756"
    defer
></script>

<!-- PMD_R2_PRUNE_V305_END -->


<!-- PMD_R2_REMOVE_WAITER_ROOT_V306_START -->

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservations2-remove-waiter-root-v306.css?v=20260722_115443"
>

<script
    src="/app/admin/assets/js/pmd-reservations2-remove-waiter-root-v306.js?v=20260722_115443"
    defer
></script>

<!-- PMD_R2_REMOVE_WAITER_ROOT_V306_END -->


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
      href="{{ asset('app/admin/assets/css/pmd-reservations2-floor-toolbar-v316.css') }}?v=20260722_194958">
<script defer
        src="{{ asset('app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js') }}?v=20260722_194958"></script>
<!-- PMD_R2_FLOOR_TOOLBAR_V316_END -->
