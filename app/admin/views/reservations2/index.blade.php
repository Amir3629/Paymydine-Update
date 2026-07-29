<!-- PMD_R2_V6_PREPAINT_START -->

{{-- PMD_RESERVATIONS_LEGACY_WAITER_IFRAME_DISABLED_V14
     The legacy /admin/dashboardwaiter iframe was disabled because the
     endpoint returns 404 and loads an unnecessary second dashboard.
--}}
<style id="pmd-r2-v6-prepaint">
html.pmd-r2-v6-booting #pmd-reservations2 {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: none !important;
  animation: none !important;
}
html.pmd-r2-v6-ready #pmd-reservations2 {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  transition: none !important;
  animation: none !important;
}
</style>
<script id="pmd-r2-v6-prepaint-script">
(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (path !== '/admin/reservations2') return;
  if (window.PMDR2AuthorityGuardV6) return;

  var html = document.documentElement;
  var observer = null;
  var done = false;

  html.classList.add('pmd-r2-v6-booting');

  function countTables() {
    return document.querySelectorAll(
      '#pmd-r2-shared-floor-canvas-v310 [data-table], ' +
      '#pmd-r2-shared-floor-canvas-v310 .pmd-floor-v1__table, ' +
      '#pmd-r2-shared-floor-canvas-v310 .pmd-w5-table'
    ).length;
  }

  function isFinalReady() {
    return Boolean(
      document.getElementById('pmd-reservations2') &&
      document.getElementById('pmd-r2-shared-floor-canvas-v310') &&
      document.getElementById('pmd-r2-date-button-v430') &&
      document.getElementById('pmd-r2-calendar-toggle-v1') &&
      countTables() > 0
    );
  }

  function reveal(reason) {
    if (done) return;
    done = true;
    if (observer) observer.disconnect();

    html.classList.remove(
      'pmd-r2-v6-booting',
      'pmd-dashboard-booting',
      'pmd-waiter-dashboard-active'
    );
    html.classList.add('pmd-r2-v6-ready');

    var root = document.getElementById('pmd-reservations2');
    if (root) {
      root.style.setProperty('visibility', 'visible', 'important');
      root.style.setProperty('opacity', '1', 'important');
      root.style.setProperty('pointer-events', 'auto', 'important');
      root.style.setProperty('transition', 'none', 'important');
      root.style.setProperty('animation', 'none', 'important');
    }

    console.info('[PMD Reservations2 Authority Guard V6] Final UI revealed', {
      reason: reason,
      tables: countTables(),
      waiterRoot: Boolean(document.getElementById('pmd-waiter-dashboard-root'))
    });
  }

  function check() {
    if (isFinalReady()) reveal('final-authority-ready');
  }

  observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['id', 'class', 'hidden', 'aria-busy']
  });

  document.addEventListener('DOMContentLoaded', check, { once: true });
  window.setTimeout(function () {
    reveal('safety-timeout');
  }, 5000);

  window.PMDR2AuthorityGuardV6 = {
    version: '6.0.0',
    audit: function () {
      return {
        version: '6.0.0',
        ready: done,
        booting: html.classList.contains('pmd-r2-v6-booting'),
        tables: countTables(),
        waiterRoot: Boolean(document.getElementById('pmd-waiter-dashboard-root')),
        dateButton: Boolean(document.getElementById('pmd-r2-date-button-v430')),
        calendarToggle: Boolean(document.getElementById('pmd-r2-calendar-toggle-v1'))
      };
    }
  };
})();
</script>
<!-- PMD_R2_V6_PREPAINT_END -->
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
    editBaseUrl: '{{ admin_url('reservations/edit') }}',
    canceledStatusId: {{ (int)setting('canceled_reservation_status') }}
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
        'viewPreference' => $pmdFloorView ?? [
            'floor_id' => 'main-floor',
            'layout_mode' => 'full',
            'full_floor_zoom' => 1.0,
        ],
        'viewPreferenceUrl' => admin_url('reservations2'),
    ])

    <!-- PMD_R2_SHARED_FLOOR_CANVAS_V310_END -->

<!-- PMD_R2_WAITER_CARDS_V1_BEGIN -->

<link
    rel="stylesheet"
<!-- PMD_DISABLED_MISSING_ASSET pmd-reservations-waiter-cards-v1.css | href="/app/admin/assets/css/pmd-reservations-waiter-cards-v1.css?v=20260725-1" -->
>

<section
    id="pmd-r2-waiter-cards-v1"
    aria-label="Live waiter table cards"
>
    <div class="pmd-r2-waiter-cards-v1__shell">

        <header class="pmd-r2-waiter-cards-v1__header">
            <div class="pmd-r2-waiter-cards-v1__heading">
                <h2>Live Tables & Orders</h2>
                <p>
                    The same live table cards and actions used by
                    the Waiter Dashboard
                </p>
            </div>

            <div class="pmd-r2-waiter-cards-v1__actions">
                <button
                    type="button"
                    class="pmd-r2-waiter-cards-v1__button"
                    data-pmd-r2-waiter-cards-refresh
                >
                    Refresh
                </button>
            </div>
        </header>

        <div
            class="pmd-r2-waiter-cards-v1__viewport"
            data-pmd-r2-waiter-cards-viewport
        >
            <div
                class="pmd-r2-waiter-cards-v1__loading"
                data-pmd-r2-waiter-cards-loading
            >
                <div class="pmd-r2-waiter-cards-v1__loading-inner">
                    <div class="pmd-r2-waiter-cards-v1__spinner"></div>
                    Loading live Waiter Dashboard cards…
                </div>
            </div>

            <div
                class="pmd-r2-waiter-cards-v1__error"
                data-pmd-r2-waiter-cards-error
                hidden
            >
                <div class="pmd-r2-waiter-cards-v1__error-inner">
                    <strong
                        class="pmd-r2-waiter-cards-v1__error-title"
                    >
                        Waiter cards unavailable
                    </strong>

                    <span
                        data-pmd-waiter-cards-error-message
                    >
                        The Waiter Dashboard card area could not
                        be loaded.
                    </span>
                </div>
            </div>

            <iframe
                id="pmd-r2-waiter-cards-frame-v1"
                class="pmd-r2-waiter-cards-v1__frame"
                data-pmd-disabled-src="/admin/dashboardwaiter?pmd_reservations_cards=1" src="about:blank"
                title="Live Waiter Dashboard table cards"
                loading="eager"
            ></iframe>
        </div>
    </div>
</section>

<script
<!-- PMD_DISABLED_MISSING_ASSET pmd-reservations-waiter-cards-v1.js | src="/app/admin/assets/js/pmd-reservations-waiter-cards-v1.js?v=20260725-1" -->
    defer
></script>

<!-- PMD_R2_WAITER_CARDS_V1_END -->

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
  href="/app/admin/assets/css/pmd-reservations2-floor-canvas-v310.css?v=kpi-direct-20260727_183227"
>

<script
  src="/app/admin/assets/js/pmd-floor-v1.js?v=20260729_d1-auth-v1"
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
    src="/app/admin/assets/js/pmd-reservations2-prune-v305.js?v=20260722_233803"
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
    src="/app/admin/assets/js/pmd-reservations2-kpis-v307.js?v=20260729_b1-kpi-stable-v1"
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

{{-- PMD_R2_TOOLBAR_ABOVE_FLOOR_V29_2 --}}
<style id="pmd-r2-toolbar-above-floor-v292-style">
  /*
   * Hide the original toolbar row before the first browser paint.
   */
  #pmd-r2-floor-toolbar-host-v464 {
    visibility: hidden !important;
    opacity: 0 !important;

    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;
    pointer-events: none !important;

    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  /*
   * Transparent row immediately above the Floor map.
   */
  #pmd-r2-toolbar-above-floor-shell-v292 {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;

    width: 100% !important;
    min-height: 42px !important;

    box-sizing: border-box !important;

    margin: 18px 0 14px !important;
    padding: 0 !important;

    position: relative !important;
    z-index: 30 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  /* PMD-specific specificity is required to override the legacy toolbar skin above. */
  #pmd-r2-toolbar-above-floor-shell-v292
  #pmd-r2-floor-toolbar-v316 {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;

    width: auto !important;
    height: auto !important;

    margin: 0 !important;
    padding: 0 !important;

    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-toolbar-above-floor-shell-v292
  .pmd-r2-floor-tool-v316 {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: auto !important;
    min-width: 42px !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 14px !important;

    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    white-space: nowrap !important;

    background: #fff !important;
    border: 1px solid #cfe0ed !important;
    border-radius: 13px !important;
    box-shadow: none !important;
  }

  #pmd-r2-toolbar-above-floor-shell-v292
  .pmd-r2-floor-tool-v316:hover {
    background: #f7fafc !important;
  }

  #pmd-r2-toolbar-above-floor-shell-v292
  .pmd-r2-floor-tool-v316 > svg {
    width: 19px !important;
    height: 19px !important;
    flex: 0 0 19px !important;
  }

  @media (max-width: 900px) {
    #pmd-r2-toolbar-above-floor-shell-v292 {
      gap: 5px !important;
      margin: 12px 0 10px !important;
    }

    #pmd-r2-toolbar-above-floor-shell-v292
    .pmd-r2-floor-tool-v316 {
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
    }
  }
</style>

<script defer
        src="{{ asset('app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js') }}?v=20260729_d1-floor-colors-v1"></script>

<script id="pmd-r2-toolbar-above-floor-v29-2-script">
(function () {
  'use strict';

  var ROOT_ID = 'pmd-reservations2';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var HOST_ID = 'pmd-r2-floor-toolbar-host-v464';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var SHELL_ID = 'pmd-r2-toolbar-above-floor-shell-v292';

  var mounted = false;

  function mount() {
    var root = document.getElementById(ROOT_ID);
    var floor = document.getElementById(FLOOR_ID);
    var host = document.getElementById(HOST_ID);
    var toolbar = document.getElementById(TOOLBAR_ID);

    if (!root || !floor || !host || !toolbar) {
      return false;
    }

    var shell = document.getElementById(SHELL_ID);

    if (!shell) {
      shell = document.createElement('div');
      shell.id = SHELL_ID;
      shell.setAttribute(
        'data-pmd-toolbar-location',
        'above-floor-v29-2'
      );
    }

    /*
     * Place the transparent toolbar row directly before the Floor frame.
     */
    if (
      shell.parentElement !== root ||
      shell.nextElementSibling !== floor
    ) {
      root.insertBefore(shell, floor);
    }

    if (toolbar.parentElement !== shell) {
      shell.appendChild(toolbar);
    }

    host.style.setProperty(
      'display',
      'none',
      'important'
    );

    host.setAttribute('aria-hidden', 'true');

    toolbar.setAttribute(
      'data-pmd-toolbar-location',
      'above-floor-v29-2'
    );

    mounted = true;
    return true;
  }

  function boot() {
    mount();

    /*
     * Only a few bounded retries.
     * No MutationObserver and no endless loop.
     */
    [20, 80, 180, 400, 800].forEach(function (delay) {
      window.setTimeout(function () {
        if (!mounted || !document.getElementById(SHELL_ID)) {
          mount();
        }
      }, delay);
    });
  }

  boot();

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  }

  window.addEventListener(
    'load',
    boot,
    { once: true }
  );
})();
</script>

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
<script id="pmd-r2-stability-v3-early">document.documentElement.classList.add('pmd-r2-stability-v3-active');</script>
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-stability-v3.css?v=20260729_date-cards-v2">
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css?v=20260729_date-cards-v2"
>
<script
  src="/app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js?v=20260729_date-cards-v2"
></script>
<script defer src="/app/admin/assets/js/pmd-reservations2-stability-v3.js?v=20260729_date-cards-v2"></script>
<!-- PMD_R2_EMBEDDED_CALENDAR_TOGGLE_V1_END -->

{{-- PMD_RESERVATIONS_CANONICAL_BROWSER_URL_V1_BEGIN --}}
<script>
(function () {
    'use strict';

    var currentPath = String(
        window.location.pathname || ''
    ).replace(/\/+$/, '');

    if (currentPath !== '/admin/reservations2') {
        return;
    }

    var canonicalUrl =
        '/admin/reservations' +
        window.location.search +
        window.location.hash;

    window.history.replaceState(
        window.history.state,
        document.title,
        canonicalUrl
    );

    console.info(
        '[PMD Reservations Canonical URL V1] Browser URL changed to',
        canonicalUrl
    );
})();
</script>
{{-- PMD_RESERVATIONS_CANONICAL_BROWSER_URL_V1_END --}}

{{-- PMD_RESERVATIONS_SCROLL_UNLOCK_V1_BEGIN --}}
<style id="pmd-reservations-scroll-unlock-v1">
html,
body {
    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;
    overflow-y: auto !important;
}

body {
    position: relative !important;
}

#pmd-reservations2,
.pmd-r2 {
    height: auto !important;
    min-height: 100vh !important;
    max-height: none !important;
    overflow: visible !important;
}
</style>

<script>
(function () {
    'use strict';

    function unlockReservationsScroll() {
        var html = document.documentElement;
        var body = document.body;
        var root = document.getElementById('pmd-reservations2');

        if (html) {
            html.style.setProperty(
                'overflow-y',
                'auto',
                'important'
            );

            html.style.setProperty(
                'height',
                'auto',
                'important'
            );

            html.style.setProperty(
                'max-height',
                'none',
                'important'
            );
        }

        if (body) {
            body.style.setProperty(
                'overflow-y',
                'auto',
                'important'
            );

            body.style.setProperty(
                'height',
                'auto',
                'important'
            );

            body.style.setProperty(
                'max-height',
                'none',
                'important'
            );
        }

        if (root) {
            root.style.setProperty(
                'height',
                'auto',
                'important'
            );

            root.style.setProperty(
                'max-height',
                'none',
                'important'
            );

            root.style.setProperty(
                'overflow',
                'visible',
                'important'
            );
        }
    }

    unlockReservationsScroll();

    window.addEventListener(
        'load',
        unlockReservationsScroll
    );

    setTimeout(unlockReservationsScroll, 100);
    setTimeout(unlockReservationsScroll, 500);
    setTimeout(unlockReservationsScroll, 1500);

    console.info(
        '[PMD Reservations Scroll Unlock V1] Active'
    );
})();
</script>
{{-- PMD_RESERVATIONS_SCROLL_UNLOCK_V1_END --}}

<!-- PMD_FINAL_FLOOR_UI_V466_BEGIN -->
<script
    src="{{ asset('app/admin/assets/js/pmd-reservations2-final-floor-ui-v466.js') }}?v=20260726_082858"
    defer
></script>
<!-- PMD_FINAL_FLOOR_UI_V466_END -->
<!-- PMD_KPI_TABLE_COLORS_V467_BEGIN -->
<script
    src="/app/admin/assets/js/pmd-reservations2-kpi-table-colors-v467.js?v=inline-semantic-20260727_184517"
    defer
></script>
<!-- PMD_KPI_TABLE_COLORS_V467_END -->


<!-- PMD_ONE_ROW_HIDE_CONTROLS_V1 -->
<style>
/*
 * Presentation only:
 * hide Edit/Save, zoom-out, Full Floor/Fit and zoom-in
 * while the native floor engine is in One row mode.
 *
 * The One row control itself remains visible.
 */
[data-pmd-floor] [data-pmd-r2-tool="edit"],
[data-pmd-floor] [data-pmd-r2-tool="zoom-out"],
[data-pmd-floor] [data-pmd-r2-tool="fit"],
[data-pmd-floor] [data-pmd-r2-tool="zoom-in"] {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
    transition:
        opacity 180ms ease,
        visibility 180ms ease,
        transform 180ms ease;
}

[data-pmd-floor].is-strip-mode
    [data-pmd-r2-tool="edit"],
[data-pmd-floor].is-strip-mode
    [data-pmd-r2-tool="zoom-out"],
[data-pmd-floor].is-strip-mode
    [data-pmd-r2-tool="fit"],
[data-pmd-floor].is-strip-mode
    [data-pmd-r2-tool="zoom-in"] {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transform: translateY(-5px) !important;
}
</style>
<!-- PMD_ONE_ROW_HIDE_CONTROLS_V1_END -->
<!-- PMD_FLOOR_NO_JUMP_EXPANDED_AREA_V2 -->
<style>
/*
 * During a repeated One-row transition, hide only the canvas
 * until the canonical strip geometry has been restored.
 */
[data-pmd-floor].pmd-strip-restoring-v2
[data-floor-canvas] {
    visibility: hidden !important;
}
</style>

<script>
(function () {
    'use strict';

    var root = document.querySelector(
        '[data-pmd-floor]'
    );

    if (!root) return;

    var scroll = root.querySelector(
        '[data-floor-scroll]'
    );

    var canvas = root.querySelector(
        '[data-floor-canvas]'
    );

    if (!scroll || !canvas) return;

    var canonicalStrip = null;
    var enteringStripWithCache = false;
    var transitionId = 0;

    function tables() {
        return Array.prototype.slice.call(
            root.querySelectorAll(
                '[data-floor-table]'
            )
        );
    }

    function captureStripGeometry() {
        return {
            canvasStyle:
                canvas.getAttribute('style'),

            scrollStyle:
                scroll.getAttribute('style'),

            tables:
                tables().map(function (table) {
                    return {
                        id:
                            table.getAttribute(
                                'data-floor-table'
                            ),

                        style:
                            table.getAttribute(
                                'style'
                            )
                    };
                })
        };
    }

    function restoreElementStyle(
        element,
        styleValue
    ) {
        if (styleValue === null) {
            element.removeAttribute('style');
        } else {
            element.setAttribute(
                'style',
                styleValue
            );
        }
    }

    function restoreCanonicalStrip() {
        if (
            !canonicalStrip ||
            !root.classList.contains(
                'is-strip-mode'
            )
        ) {
            return false;
        }

        var byId = {};

        canonicalStrip.tables.forEach(
            function (item) {
                byId[item.id] = item.style;
            }
        );

        tables().forEach(function (table) {
            var id =
                table.getAttribute(
                    'data-floor-table'
                );

            if (
                !Object.prototype.hasOwnProperty.call(
                    byId,
                    id
                )
            ) {
                return;
            }

            restoreElementStyle(
                table,
                byId[id]
            );
        });

        restoreElementStyle(
            canvas,
            canonicalStrip.canvasStyle
        );

        restoreElementStyle(
            scroll,
            canonicalStrip.scrollStyle
        );

        scroll.scrollLeft = 0;
        scroll.scrollTop = 0;

        return true;
    }

    function fullFloorDimensions() {
        /*
         * Use the real visible floor width, not the old
         * hardcoded 1000px canvas width.
         */
        var width = Math.max(
            1000,
            scroll.clientWidth
        );

        /*
         * Root contains the toolbar above the floor.
         * Calculate the remaining visible vertical area.
         */
        var rootRect =
            root.getBoundingClientRect();

        var scrollRect =
            scroll.getBoundingClientRect();

        var remainingHeight =
            rootRect.bottom -
            scrollRect.top -
            12;

        var height = Math.max(
            560,
            Math.round(remainingHeight)
        );

        return {
            width: width,
            height: height
        };
    }

    function expandFullFloorArea() {
        if (
            root.classList.contains(
                'is-strip-mode'
            )
        ) {
            return;
        }

        var size =
            fullFloorDimensions();

        var floorState =
            root.__pmdFloorV1 &&
            root.__pmdFloorV1.getState
                ? root.__pmdFloorV1.getState()
                : null;

        var currentZoom =
            floorState &&
            Number.isFinite(
                Number(floorState.zoom)
            )
                ? Number(floorState.zoom)
                : 1;

        scroll.style.setProperty(
            '--floor-zoom',
            String(currentZoom)
        );

        scroll.style.height =
            size.height + 'px';

        scroll.style.minHeight =
            size.height + 'px';

        scroll.style.maxHeight =
            size.height + 'px';

        scroll.style.overflow = 'auto';

        canvas.style.width =
            size.width + 'px';

        canvas.style.minWidth =
            size.width + 'px';

        canvas.style.height =
            size.height + 'px';

        canvas.style.minHeight =
            size.height + 'px';

        canvas.style.transform =
            'scale(1)';

        canvas.style.transformOrigin =
            '0 0';
    }

    function finishStripTransition(id) {
        if (
            id !== transitionId ||
            !root.classList.contains(
                'is-strip-mode'
            )
        ) {
            return;
        }

        if (canonicalStrip) {
            restoreCanonicalStrip();

            root.classList.remove(
                'pmd-strip-restoring-v2'
            );
        }
    }

    function scheduleCachedStripRestore() {
        var id = ++transitionId;

        /*
         * Restore before the browser paints the wrong
         * repeated One-row geometry.
         */
        requestAnimationFrame(function () {
            restoreCanonicalStrip();

            requestAnimationFrame(
                function () {
                    finishStripTransition(id);
                }
            );
        });

        [
            0,
            20,
            50,
            90,
            150
        ].forEach(function (delay) {
            setTimeout(function () {
                finishStripTransition(id);
            }, delay);
        });
    }

    function scheduleFirstStripCapture() {
        var id = ++transitionId;

        /*
         * Only the first One-row activation needs to wait
         * for the native engine, because there is no cached
         * canonical geometry yet.
         */
        setTimeout(function () {
            if (
                id !== transitionId ||
                !root.classList.contains(
                    'is-strip-mode'
                ) ||
                canonicalStrip
            ) {
                return;
            }

            canonicalStrip =
                captureStripGeometry();

            console.log(
                '[PMD V2] Canonical One-row geometry captured'
            );
        }, 500);
    }

    function scheduleFullExpansion() {
        /*
         * Intentionally empty.
         *
         * The real pmd-floor-v1 engine now owns Full Floor width,
         * height, zoom and drag bounds.
         *
         * This V2 patch remains responsible only for the excellent
         * no-flash One-row restoration.
         *
         * Writing canvas.style.width/height here would remove the
         * engine's inline !important priority and allow legacy CSS
         * to force the canvas back to 1000x560.
         */
    }

    /*
     * Capture phase runs before the native One-row handler.
     * On repeated entries, hide the canvas before the native
     * incorrect intermediate geometry becomes visible.
     */
    root.addEventListener(
        'click',
        function (event) {
            var stripButton =
                event.target.closest(
                    '[data-pmd-r2-tool="strip"],' +
                    '[data-floor-strip]'
                );

            if (!stripButton) return;

            var entering =
                !root.classList.contains(
                    'is-strip-mode'
                );

            enteringStripWithCache =
                entering &&
                Boolean(canonicalStrip);

            if (enteringStripWithCache) {
                root.classList.add(
                    'pmd-strip-restoring-v2'
                );
            }
        },
        true
    );

    var previousStrip =
        root.classList.contains(
            'is-strip-mode'
        );

    var observer = new MutationObserver(
        function () {
            var currentStrip =
                root.classList.contains(
                    'is-strip-mode'
                );

            if (
                currentStrip ===
                previousStrip
            ) {
                return;
            }

            if (currentStrip) {
                if (
                    canonicalStrip ||
                    enteringStripWithCache
                ) {
                    scheduleCachedStripRestore();
                } else {
                    scheduleFirstStripCapture();
                }
            } else {
                root.classList.remove(
                    'pmd-strip-restoring-v2'
                );

                scheduleFullExpansion();
            }

            enteringStripWithCache = false;
            previousStrip = currentStrip;
        }
    );

    observer.observe(root, {
        attributes: true,
        attributeFilter: ['class']
    });

    /*
     * Ensure the initial Full Floor uses all available area.
     */
    if (!previousStrip) {
        scheduleFullExpansion();
    }

    window.addEventListener(
        'resize',
        function () {
            if (
                !root.classList.contains(
                    'is-strip-mode'
                )
            ) {
                expandFullFloorArea();
            }
        }
    );

    console.log(
        '[PMD V2] No-jump strip and expanded drag area active'
    );
})();
</script>
<!-- PMD_FLOOR_NO_JUMP_EXPANDED_AREA_V2_END -->




{{-- PMD_R2_PROVEN_BODY_TOOLBAR_V34_1 --}}
<style id="pmd-r2-proven-body-toolbar-v34-1-style">
  /*
   * Real space between KPI cards and Floor.
   */
  #pmd-r2-shared-floor-canvas-v310 {
    margin-top: 64px !important;
  }

  /*
   * Mounted directly on BODY, exactly like the successful Console test.
   */
  #pmd-body-floor-toolbar-v341 {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;

    position: absolute !important;
    z-index: 2147483647 !important;

    width: auto !important;
    height: 44px !important;

    margin: 0 !important;
    padding: 0 !important;

    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-body-floor-toolbar-v341 > button {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: auto !important;
    min-width: 42px !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 14px !important;

    color: #10243a !important;
    background: #ffffff !important;

    border: 1px solid #cfe0ed !important;
    border-radius: 13px !important;
    box-shadow: none !important;
    outline: 0 !important;

    font-family: inherit !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    white-space: nowrap !important;

    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    cursor: pointer !important;
    appearance: none !important;
  }

  #pmd-body-floor-toolbar-v341 > button:hover {
    background: #f7fafc !important;
  }

  #pmd-body-floor-toolbar-v341 > button:active {
    transform: translateY(1px);
  }

  /* PMD-specific: override the toolbar's forced inline-flex for state-hidden controls. */
  #pmd-body-floor-toolbar-v341 > button[hidden] {
    display: none !important;
  }

  #pmd-body-floor-toolbar-v341 > button > svg {
    width: 17px;
    height: 17px;
    flex: 0 0 17px;
  }

  #pmd-body-floor-toolbar-v341
  > button[aria-pressed="true"] {
    background: #eef6fb !important;
    border-color: #9fc5df !important;
  }

  @media (max-width: 900px) {
    #pmd-r2-shared-floor-canvas-v310 {
      margin-top: 56px !important;
    }

    #pmd-body-floor-toolbar-v341 {
      height: 40px !important;
      gap: 5px !important;
    }

    #pmd-body-floor-toolbar-v341 > button {
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
    }
  }
</style>

<script id="pmd-r2-proven-body-toolbar-v34-1-script">
(function () {
  'use strict';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var BAR_ID =
    'pmd-body-floor-toolbar-v341';

  var SPACE_BELOW_BUTTONS = 10;
  var attempts = 0;
  var maxAttempts = 80;
  var booted = false;

  var controls = [
    {
      key: 'edit',
      en: 'Edit',
      de: 'Bearbeiten',
      selector: '[data-floor-edit]'
    },
    {
      key: 'zoom-out',
      en: 'Zoom out',
      de: 'Verkleinern',
      icon: 'minus',
      selector: '[data-floor-zoom-out]'
    },
    {
      key: 'zoom-in',
      en: 'Zoom in',
      de: 'Vergrößern',
      icon: 'plus',
      selector: '[data-floor-zoom-in]'
    },
    {
      key: 'strip',
      en: 'One row',
      de: 'Eine Reihe',
      selector: '[data-floor-strip]'
    }
  ];

  function isGerman() {
    return String(
      document.documentElement.lang || ''
    ).toLowerCase().indexOf('de') === 0;
  }

  function zoomIcon(type) {
    var operator = type === 'plus'
      ? '<path d="M9 6.8v4.4M6.8 9h4.4" />'
      : '<path d="M6.8 9h4.4" />';

    return [
      '<svg viewBox="0 0 18 18" fill="none" ',
      'stroke="currentColor" stroke-width="1.8" ',
      'stroke-linecap="round" stroke-linejoin="round" ',
      'aria-hidden="true" focusable="false">',
      '<circle cx="9" cy="9" r="5.5" />',
      operator,
      '<path d="m13.2 13.2 3.1 3.1" />',
      '</svg>'
    ].join('');
  }

  function getFloor() {
    return document.getElementById(
      FLOOR_ID
    );
  }

  function findNative(
    floor,
    selector
  ) {
    var elements =
      floor.querySelectorAll(selector);

    for (
      var index = 0;
      index < elements.length;
      index += 1
    ) {
      if (
        elements[index] instanceof
        HTMLButtonElement
      ) {
        return elements[index];
      }
    }

    return null;
  }

  function place(
    floor,
    bar
  ) {
    if (
      !document.body.contains(floor) ||
      !document.body.contains(bar)
    ) {
      return;
    }

    var floorRect =
      floor.getBoundingClientRect();

    var barRect =
      bar.getBoundingClientRect();

    var top =
      window.scrollY +
      floorRect.top -
      barRect.height -
      SPACE_BELOW_BUTTONS;

    var left =
      window.scrollX +
      floorRect.right -
      barRect.width;

    bar.style.setProperty(
      'top',
      Math.round(top) + 'px',
      'important'
    );

    bar.style.setProperty(
      'left',
      Math.round(left) + 'px',
      'important'
    );
  }

  function syncStates(
    floor,
    bar
  ) {
    controls.forEach(function (control) {
      var nativeButton =
        findNative(
          floor,
          control.selector
        );

      var visibleButton =
        bar.querySelector(
          '[data-pmd-floor-action="' +
          control.key +
          '"]'
        );

      if (
        !nativeButton ||
        !visibleButton
      ) {
        return;
      }

      var pressed =
        nativeButton.getAttribute(
          'aria-pressed'
        );

      if (control.key === 'edit') {
        var instance =
          floor.__pmdFloorV1;

        var floorState =
          instance && instance.getState
            ? instance.getState()
            : null;

        var editing = Boolean(
          floorState && floorState.editing
        );

        var editLabel = isGerman()
          ? 'Bearbeiten'
          : 'Edit';

        var saveLabel = isGerman()
          ? 'Speichern'
          : 'Save';

        visibleButton.textContent =
          editing
            ? saveLabel
            : editLabel;

        visibleButton.setAttribute(
          'aria-pressed',
          editing ? 'true' : 'false'
        );

        visibleButton.setAttribute(
          'aria-label',
          editing
            ? 'Save floor layout'
            : 'Edit floor layout'
        );

        visibleButton.title =
          editing
            ? 'Save floor layout'
            : 'Edit floor layout';

        visibleButton.classList.toggle(
          'is-active',
          editing
        );

        visibleButton.disabled = Boolean(
          floorState && floorState.saving
        );

        visibleButton.hidden = Boolean(
          floorState && floorState.stripMode
        );

        visibleButton.tabIndex =
          visibleButton.hidden ? -1 : 0;

        visibleButton.setAttribute(
          'aria-hidden',
          visibleButton.hidden ? 'true' : 'false'
        );

        return;
      }

      if (control.key === 'strip') {
        var modeInstance =
          floor.__pmdFloorV1;

        var modeState =
          modeInstance && modeInstance.getState
            ? modeInstance.getState()
            : null;

        var rowMode = Boolean(
          modeState && modeState.stripMode
        );

        var modeLabel = rowMode
          ? 'Full Floor'
          : (isGerman() ? 'Eine Reihe' : 'One Row');

        visibleButton.textContent = modeLabel;
        visibleButton.setAttribute(
          'aria-label',
          modeLabel
        );
        visibleButton.title = modeLabel;
        visibleButton.setAttribute(
          'aria-pressed',
          rowMode ? 'true' : 'false'
        );
      }

      var floorInstance =
        floor.__pmdFloorV1;

      var currentState =
        floorInstance && floorInstance.getState
          ? floorInstance.getState()
          : null;

      var hiddenInRow = Boolean(
        currentState &&
        currentState.stripMode &&
        (
          control.key === 'edit' ||
          control.key === 'zoom-out' ||
          control.key === 'zoom-in'
        )
      );

      visibleButton.hidden = hiddenInRow;
      visibleButton.tabIndex = hiddenInRow ? -1 : 0;
      visibleButton.setAttribute(
        'aria-hidden',
        hiddenInRow ? 'true' : 'false'
      );

      if (pressed !== null) {
        visibleButton.setAttribute(
          'aria-pressed',
          pressed
        );
      }

      visibleButton.disabled =
        Boolean(nativeButton.disabled);

      visibleButton.style.setProperty(
        'opacity',
        nativeButton.disabled
          ? '0.45'
          : '1',
        'important'
      );
    });
  }

  function createBar(floor) {
    var old =
      document.getElementById(BAR_ID);

    if (old) {
      old.remove();
    }

    var bar =
      document.createElement('div');

    bar.id = BAR_ID;
    bar.setAttribute('role', 'toolbar');

    controls.forEach(function (control) {
      var button =
        document.createElement('button');

      button.type = 'button';

      var label = isGerman()
        ? control.de
        : control.en;

      if (control.icon) {
        button.innerHTML =
          zoomIcon(control.icon);

        button.setAttribute(
          'aria-label',
          label
        );

        button.title = label;
      } else {
        button.textContent = label;
      }

      button.setAttribute(
        'data-pmd-floor-action',
        control.key
      );

      button.addEventListener(
        'click',
        function () {
          if (control.key === 'edit') {
            var instance =
              floor.__pmdFloorV1;

            if (
              !instance ||
              !instance.getState ||
              !instance.setEditing ||
              !instance.saveLayout
            ) {
              console.error(
                '[PMD V34.1] Floor editor API unavailable'
              );

              return;
            }

            var editing = Boolean(
              instance.getState().editing
            );

            if (!editing) {
              instance.setEditing(true);
              syncStates(floor, bar);
              return;
            }

            button.disabled = true;

            Promise.resolve(
              instance.saveLayout()
            ).then(function () {
              syncStates(floor, bar);
            });

            return;
          }

          var nativeButton =
            findNative(
              floor,
              control.selector
            );

          if (!nativeButton) {
            console.error(
              '[PMD V34.1] Native control missing:',
              control.key
            );

            return;
          }

          nativeButton.click();

          window.setTimeout(
            function () {
              syncStates(
                floor,
                bar
              );
            },
            60
          );
        }
      );

      bar.appendChild(button);
    });

    document.body.appendChild(bar);

    floor.querySelectorAll(
      '.pmd-floor-v1__toolbar button, ' +
      '[data-pmd-r2-floor-toolbar-v313] button, ' +
      '#pmd-r2-floor-toolbar-v316 button'
    ).forEach(function (nativeButton) {
      nativeButton.tabIndex = -1;
      nativeButton.setAttribute(
        'aria-hidden',
        'true'
      );
    });

    return bar;
  }

  function boot() {
    if (booted) {
      return;
    }

    attempts += 1;

    var floor = getFloor();

    if (!floor) {
      if (attempts < maxAttempts) {
        window.setTimeout(
          boot,
          100
        );
      }

      return;
    }

    var available = controls.filter(
      function (control) {
        return Boolean(
          findNative(
            floor,
            control.selector
          )
        );
      }
    ).length;

    if (available < controls.length) {
      if (attempts < maxAttempts) {
        window.setTimeout(
          boot,
          100
        );
      }

      return;
    }

    booted = true;

    var bar =
      createBar(floor);

    syncStates(
      floor,
      bar
    );

    function schedulePlace() {
      window.requestAnimationFrame(
        function () {
          place(
            floor,
            bar
          );
        }
      );
    }

    window.addEventListener(
      'resize',
      schedulePlace
    );

    window.addEventListener(
      'scroll',
      schedulePlace,
      { passive: true }
    );

    schedulePlace();

    [
      50,
      150,
      350,
      700,
      1200,
      2000
    ].forEach(function (delay) {
      window.setTimeout(
        schedulePlace,
        delay
      );
    });

    window.PMD_REPOSITION_FLOOR_TOOLBAR =
      schedulePlace;

    console.info(
      '[PMD Reservations V34.1] ' +
      'Floor toolbar mounted successfully'
    );
  }

  boot();

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  }

  window.addEventListener(
    'load',
    boot,
    { once: true }
  );
})();
</script>



{{-- PMD_R2_V34_3_REAL_POSITION_FIX --}}
<style id="pmd-r2-v34-3-real-position-style">
    /*
     * Reserve real layout space between KPI cards and Floor.
     * This does not move or wrap the Floor DOM.
     */
    #pmd-r2-shared-floor-canvas-v310 {
        margin-top: 64px !important;
    }

    /*
     * The existing V34.1 toolbar remains frameless.
     */
    #pmd-body-floor-toolbar-v341 {
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        outline: 0 !important;
    }

    @media (max-width: 900px) {
        #pmd-r2-shared-floor-canvas-v310 {
            margin-top: 58px !important;
        }
    }
</style>

<script id="pmd-r2-v34-3-real-position-script">
(function () {
    'use strict';

    var FLOOR_ID =
        'pmd-r2-shared-floor-canvas-v310';

    var BAR_ID =
        'pmd-body-floor-toolbar-v341';

    var DESKTOP_GAP = 64;
    var MOBILE_GAP = 58;
    var SPACE_BELOW_BUTTONS = 10;

    var resizeFrame = 0;

    function getReservedGap() {
        return window.innerWidth <= 900
            ? MOBILE_GAP
            : DESKTOP_GAP;
    }

    function placeToolbar() {
        var floor =
            document.getElementById(FLOOR_ID);

        var bar =
            document.getElementById(BAR_ID);

        if (!floor || !bar) {
            return false;
        }

        /*
         * Reapply as inline !important because old Floor scripts may
         * rewrite layout styles after page initialization.
         */
        floor.style.setProperty(
            'margin-top',
            getReservedGap() + 'px',
            'important'
        );

        var floorRect =
            floor.getBoundingClientRect();

        var barRect =
            bar.getBoundingClientRect();

        var top =
            window.scrollY +
            floorRect.top -
            barRect.height -
            SPACE_BELOW_BUTTONS;

        var left =
            window.scrollX +
            floorRect.right -
            barRect.width;

        bar.style.setProperty(
            'position',
            'absolute',
            'important'
        );

        bar.style.setProperty(
            'top',
            Math.round(top) + 'px',
            'important'
        );

        bar.style.setProperty(
            'left',
            Math.round(left) + 'px',
            'important'
        );

        bar.style.setProperty(
            'right',
            'auto',
            'important'
        );

        bar.style.setProperty(
            'z-index',
            '2147483647',
            'important'
        );

        bar.style.setProperty(
            'visibility',
            'visible',
            'important'
        );

        bar.style.setProperty(
            'opacity',
            '1',
            'important'
        );

        return true;
    }

    function schedulePlace() {
        if (resizeFrame) {
            window.cancelAnimationFrame(
                resizeFrame
            );
        }

        resizeFrame =
            window.requestAnimationFrame(
                function () {
                    resizeFrame = 0;
                    placeToolbar();
                }
            );
    }

    function boot() {
        placeToolbar();

        /*
         * Bounded retries only while old page scripts finish booting.
         * No MutationObserver and no endless interval.
         */
        [
            20,
            80,
            180,
            400,
            800,
            1400,
            2500
        ].forEach(function (delay) {
            window.setTimeout(
                placeToolbar,
                delay
            );
        });
    }

    window.addEventListener(
        'resize',
        schedulePlace
    );

    window.addEventListener(
        'scroll',
        schedulePlace,
        { passive: true }
    );

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            { once: true }
        );
    } else {
        boot();
    }

    window.addEventListener(
        'load',
        placeToolbar,
        { once: true }
    );

    window.PMDR2ToolbarPositionV343 = {
        place: placeToolbar,

        audit: function () {
            var floor =
                document.getElementById(
                    FLOOR_ID
                );

            var bar =
                document.getElementById(
                    BAR_ID
                );

            if (!floor || !bar) {
                return {
                    floorExists: Boolean(floor),
                    toolbarExists: Boolean(bar)
                };
            }

            var floorRect =
                floor.getBoundingClientRect();

            var barRect =
                bar.getBoundingClientRect();

            return {
                floorExists: true,
                toolbarExists: true,

                floorMarginTop:
                    getComputedStyle(
                        floor
                    ).marginTop,

                toolbarBottom:
                    Math.round(
                        barRect.bottom
                    ),

                floorTop:
                    Math.round(
                        floorRect.top
                    ),

                spaceBetween:
                    Math.round(
                        floorRect.top -
                        barRect.bottom
                    ),

                toolbarAboveFloor:
                    barRect.bottom <=
                    floorRect.top
            };
        }
    };
})();
</script>




{{-- PMD_R2_HOUR_LAYOUT_V38_BEGIN --}}
<style id="pmd-r2-hour-layout-v38-style">
    :root {
        --pmd-r2-structure-gap-v38: 14px;
        --pmd-r2-control-gap-v38: 8px;
        --pmd-r2-hour-side-inset-v38: 12px;
    }

    /*
     * These rules activate only when the real Hour Timeline
     * is visible and V38 adds the active class.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;

        margin-bottom: 0 !important;
        padding-bottom:
            var(--pmd-r2-structure-gap-v38) !important;
    }

    /*
     * Floor controls are not relevant in Hour View.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    #pmd-body-floor-toolbar-v341,

    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-toolbar-v38="true"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;

        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;
        pointer-events: none !important;
    }

    /*
     * The legacy Floor stage reserves approximately 640px.
     * Collapse only that stage while Hour View is active.
     *
     * Never hide the shared Floor shell because Hour content
     * is rendered inside it.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-floor-stage-v38="true"] {
        display: none !important;

        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    /*
     * The shared shell wraps the actual visible Hour content.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-floor-shell-v38="true"] {
        display: block !important;

        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;

        margin-bottom:
            var(--pmd-r2-structure-gap-v38) !important;

        padding-bottom: 0 !important;

        overflow: visible !important;
    }

    /*
     * Calendar/Hour surface receives its height from content.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-calendar-v38="true"] {
        display: block !important;

        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;

        margin-bottom: 0 !important;
        padding-bottom: 0 !important;

        overflow: visible !important;
    }

    /*
     * Align the Hour Header and Timeline with the KPI cards.
     * Audit showed the Hour surface was 12px wider per side.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-header-v38="true"],

    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-grid-v38="true"] {
        width: calc(100% - 24px) !important;
        max-width: calc(100% - 24px) !important;

        margin-left:
            var(--pmd-r2-hour-side-inset-v38) !important;

        margin-right:
            var(--pmd-r2-hour-side-inset-v38) !important;

        box-sizing: border-box !important;
    }

    /*
     * Structural spacing:
     * KPI → Hour Header → Timeline.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-header-v38="true"] {
        margin-top:
            var(--pmd-r2-structure-gap-v38) !important;

        margin-bottom:
            var(--pmd-r2-structure-gap-v38) !important;

        column-gap:
            var(--pmd-r2-control-gap-v38) !important;

        row-gap:
            var(--pmd-r2-control-gap-v38) !important;
    }

    /*
     * The actual Timeline determines the final height.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    [data-pmd-hour-grid-v38="true"] {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;

        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
    }

    /*
     * Remove obsolete generated bottom spacer.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active::after {
        display: none !important;
        content: none !important;
    }

    @media (max-width: 900px) {
        #pmd-reservations2.pmd-r2-hour-layout-v38-active
        [data-pmd-hour-header-v38="true"],

        #pmd-reservations2.pmd-r2-hour-layout-v38-active
        [data-pmd-hour-grid-v38="true"] {
            width: 100% !important;
            max-width: 100% !important;

            margin-left: 0 !important;
            margin-right: 0 !important;
        }
    }
</style>

<script id="pmd-r2-hour-layout-v38-script">
(function () {
    'use strict';

    var ROOT_ID =
        'pmd-reservations2';

    var FLOOR_ID =
        'pmd-r2-shared-floor-canvas-v310';

    var CALENDAR_ID =
        'pmd-r2-calendar-surface-v160';

    var TOOLBAR_ID =
        'pmd-body-floor-toolbar-v341';

    var ACTIVE_CLASS =
        'pmd-r2-hour-layout-v38-active';

    var root = null;
    var currentFloor = null;
    var currentCalendar = null;
    var currentHeader = null;
    var currentGrid = null;
    var currentStage = null;
    var currentToolbar = null;

    function visible(element) {
        if (!(element instanceof Element)) {
            return false;
        }

        var rect =
            element.getBoundingClientRect();

        var style =
            window.getComputedStyle(element);

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity || 1) > 0
        );
    }

    function removeAttribute(
        element,
        attribute
    ) {
        if (element) {
            element.removeAttribute(
                attribute
            );
        }
    }

    function clearState() {
        if (root) {
            root.classList.remove(
                ACTIVE_CLASS
            );
        }

        removeAttribute(
            currentFloor,
            'data-pmd-hour-floor-shell-v38'
        );

        removeAttribute(
            currentCalendar,
            'data-pmd-hour-calendar-v38'
        );

        removeAttribute(
            currentHeader,
            'data-pmd-hour-header-v38'
        );

        removeAttribute(
            currentGrid,
            'data-pmd-hour-grid-v38'
        );

        removeAttribute(
            currentStage,
            'data-pmd-floor-stage-v38'
        );

        removeAttribute(
            currentToolbar,
            'data-pmd-hour-toolbar-v38'
        );

        currentFloor = null;
        currentCalendar = null;
        currentHeader = null;
        currentGrid = null;
        currentStage = null;
        currentToolbar = null;
    }

    function apply() {
        root =
            document.getElementById(
                ROOT_ID
            );

        var floor =
            document.getElementById(
                FLOOR_ID
            );

        var calendar =
            document.getElementById(
                CALENDAR_ID
            );

        if (
            !root ||
            !floor ||
            !calendar
        ) {
            clearState();
            return false;
        }

        var grid =
            calendar.querySelector(
                '.pmd-r2-day-board__timeline'
            );

        var header =
            calendar.querySelector(
                '.pmd-r2-day-view__header'
            );

        /*
         * Activate only if the real Hour Timeline is visible.
         * Month mode and Floor mode remain untouched.
         */
        if (
            !grid ||
            !header ||
            !visible(grid)
        ) {
            clearState();
            return false;
        }

        var stage =
            floor.querySelector(
                ':scope > .pmd-floor-v1__stage'
            );

        var toolbar =
            document.getElementById(
                TOOLBAR_ID
            );

        clearState();

        currentFloor = floor;
        currentCalendar = calendar;
        currentHeader = header;
        currentGrid = grid;
        currentStage = stage;
        currentToolbar = toolbar;

        root.classList.add(
            ACTIVE_CLASS
        );

        floor.setAttribute(
            'data-pmd-hour-floor-shell-v38',
            'true'
        );

        calendar.setAttribute(
            'data-pmd-hour-calendar-v38',
            'true'
        );

        header.setAttribute(
            'data-pmd-hour-header-v38',
            'true'
        );

        grid.setAttribute(
            'data-pmd-hour-grid-v38',
            'true'
        );

        if (stage) {
            stage.setAttribute(
                'data-pmd-floor-stage-v38',
                'true'
            );
        }

        if (toolbar) {
            toolbar.setAttribute(
                'data-pmd-hour-toolbar-v38',
                'true'
            );
        }

        return true;
    }

    function scheduleApply() {
        [
            0,
            30,
            80,
            160,
            300,
            550,
            900
        ].forEach(function (delay) {
            window.setTimeout(
                apply,
                delay
            );
        });
    }

    function boot() {
        root =
            document.getElementById(
                ROOT_ID
            );

        if (!root) {
            return;
        }

        scheduleApply();

        /*
         * Calendar cells and view buttons change the active screen.
         * Use only bounded retries after real user interaction.
         */
        root.addEventListener(
            'click',
            function () {
                scheduleApply();
            },
            true
        );

        window.addEventListener(
            'pageshow',
            scheduleApply
        );

        window.addEventListener(
            'resize',
            function () {
                window.requestAnimationFrame(
                    apply
                );
            }
        );

        window.PMD_R2_APPLY_HOUR_LAYOUT_V38 =
            apply;

        console.log(
            '[PMD V38] Hour spacing and bottom-gap rules active.'
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {
                once: true
            }
        );
    } else {
        boot();
    }
})();
</script>
{{-- PMD_R2_HOUR_LAYOUT_V38_END --}}


{{-- PMD_R2_HOUR_BOTTOM_V38_1_BEGIN --}}
<style id="pmd-r2-hour-bottom-v38-1-style">
    /*
     * V38.1
     *
     * Audit:
     * - final Hour row bottom: 1520px
     * - Calendar bottom: 1521px
     * - document/root bottom: 2147px
     * - false empty continuation: about 626px
     */

    #pmd-reservations2.pmd-r2-hour-layout-v38-active {
        display: flow-root !important;

        height: fit-content !important;
        min-height: 0 !important;
        max-height: none !important;

        padding-bottom: 14px !important;
        margin-bottom: 0 !important;

        overflow: visible !important;
    }

    /*
     * Shared shell ends with the visible Calendar content.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    #pmd-r2-shared-floor-canvas-v310 {
        height: fit-content !important;
        min-height: 0 !important;
        max-height: none !important;

        padding-bottom: 0 !important;
        margin-bottom: 0 !important;

        overflow: visible !important;
    }

    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    #pmd-r2-calendar-surface-v160 {
        height: fit-content !important;
        min-height: 0 !important;
        max-height: none !important;

        padding-bottom: 0 !important;
        margin-bottom: 0 !important;

        overflow: visible !important;
    }

    /*
     * The timeslot screen and Timeline define the true content height.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    .pmd-r2-timeslot-screen,

    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    .pmd-r2-day-board,

    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    .pmd-r2-day-board__timeline {
        height: fit-content !important;
        min-height: 0 !important;
        max-height: none !important;

        padding-bottom: 0 !important;
        margin-bottom: 0 !important;
    }

    /*
     * Empty structural siblings after the shared Calendar shell
     * must not reserve the legacy Floor/List height in Hour mode.
     *
     * Only empty elements are collapsed. Scripts, templates and
     * genuinely populated sections remain untouched.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    #pmd-r2-shared-floor-canvas-v310
    ~ div:empty,

    #pmd-reservations2.pmd-r2-hour-layout-v38-active
    #pmd-r2-shared-floor-canvas-v310
    ~ section:empty {
        display: none !important;

        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;
    }

    /*
     * Hour mode must not inherit a synthetic page spacer.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active::before,
    #pmd-reservations2.pmd-r2-hour-layout-v38-active::after {
        display: none !important;
        content: none !important;

        height: 0 !important;
        min-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;
    }
</style>

<script id="pmd-r2-hour-bottom-v38-1-script">
(function () {
    'use strict';

    var ROOT_ID =
        'pmd-reservations2';

    var CALENDAR_ID =
        'pmd-r2-calendar-surface-v160';

    var ACTIVE_CLASS =
        'pmd-r2-hour-layout-v38-active';

    function applyBottomFix() {
        var root =
            document.getElementById(
                ROOT_ID
            );

        var calendar =
            document.getElementById(
                CALENDAR_ID
            );

        if (!root || !calendar) {
            return false;
        }

        var grid =
            calendar.querySelector(
                '.pmd-r2-day-board__timeline'
            );

        if (
            !grid ||
            !root.classList.contains(
                ACTIVE_CLASS
            )
        ) {
            root.style.removeProperty(
                '--pmd-r2-hour-real-height-v381'
            );

            return false;
        }

        /*
         * No forced pixel height is applied.
         * This measurement is exposed only for verification.
         */
        var calendarRect =
            calendar.getBoundingClientRect();

        var gridRect =
            grid.getBoundingClientRect();

        root.style.setProperty(
            '--pmd-r2-hour-real-height-v381',
            Math.ceil(
                Math.max(
                    calendarRect.height,
                    gridRect.bottom -
                    calendarRect.top
                )
            ) + 'px'
        );

        return true;
    }

    function schedule() {
        [
            0,
            40,
            100,
            200,
            400,
            700
        ].forEach(function (delay) {
            window.setTimeout(
                applyBottomFix,
                delay
            );
        });
    }

    function boot() {
        var root =
            document.getElementById(
                ROOT_ID
            );

        if (!root) {
            return;
        }

        schedule();

        root.addEventListener(
            'click',
            schedule,
            true
        );

        window.addEventListener(
            'resize',
            function () {
                window.requestAnimationFrame(
                    applyBottomFix
                );
            }
        );

        window.PMD_R2_APPLY_HOUR_BOTTOM_V38_1 =
            applyBottomFix;

        console.log(
            '[PMD V38.1] Extra Hour bottom scroll fix active.'
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {
                once: true
            }
        );
    } else {
        boot();
    }
})();
</script>
{{-- PMD_R2_HOUR_BOTTOM_V38_1_END --}}


{{-- PMD_R2_EMPTY_PLACEHOLDER_FIX_V40_BEGIN --}}
<style id="pmd-r2-empty-placeholder-fix-v40-style">
    /*
     * V40 — evidence-based bottom spacing fix
     *
     * Audit proved that #pmd-r2-empty-content-v305 reserves
     * 547px after the active content.
     *
     * No Root height is calculated or forced.
     * Hour/Floor/Calendar dimensions remain untouched.
     */

    #pmd-reservations2 {
        padding-bottom: 14px !important;
        margin-bottom: 0 !important;
    }

    /*
     * Hide only the audited placeholder after JavaScript
     * confirms that it contains no meaningful content.
     */
    #pmd-reservations2
    #pmd-r2-empty-content-v305.pmd-r2-v40-confirmed-empty {
        display: none !important;

        width: 0 !important;
        height: 0 !important;

        min-width: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;

        overflow: hidden !important;
    }

    /*
     * Cards already contain their real content height.
     * Audit found an additional 72px padding and 30px margin.
     */
    #pmd-reservations2
    #pmd-r2-reservation-cards-v320 {
        padding-bottom: 0 !important;
        margin-bottom: 0 !important;
    }

    /*
     * Preserve the working Hour implementation.
     */
    #pmd-reservations2.pmd-r2-hour-layout-v38-active {
        padding-bottom: 14px !important;
    }
</style>

<script id="pmd-r2-empty-placeholder-fix-v40-script">
(function () {
    'use strict';

    var ROOT_ID =
        'pmd-reservations2';

    var EMPTY_ID =
        'pmd-r2-empty-content-v305';

    var EMPTY_CLASS =
        'pmd-r2-v40-confirmed-empty';

    var root = null;

    function isMeaningfulElement(element) {
        if (!(element instanceof Element)) {
            return false;
        }

        var style =
            window.getComputedStyle(element);

        var rect =
            element.getBoundingClientRect();

        if (
            style.display === 'none' ||
            style.visibility === 'hidden'
        ) {
            return false;
        }

        if (
            element.matches(
                [
                    'img',
                    'svg',
                    'canvas',
                    'video',
                    'iframe',
                    'table',
                    'form',
                    'input',
                    'select',
                    'textarea',
                    'button',
                    'a[href]'
                ].join(',')
            )
        ) {
            return true;
        }

        return (
            rect.width > 1 &&
            rect.height > 1 &&
            String(
                element.textContent || ''
            )
                .replace(/\s+/g, ' ')
                .trim()
                .length > 0
        );
    }

    function placeholderIsEmpty(element) {
        if (!(element instanceof Element)) {
            return false;
        }

        var text =
            String(
                element.textContent || ''
            )
                .replace(/\s+/g, ' ')
                .trim();

        if (text.length > 0) {
            return false;
        }

        var children =
            Array.prototype.slice.call(
                element.querySelectorAll('*')
            );

        return !children.some(
            isMeaningfulElement
        );
    }

    function removeDirectGreaterSign() {
        if (!root) {
            return;
        }

        Array.prototype.slice.call(
            root.childNodes
        ).forEach(function (node) {
            if (
                node.nodeType ===
                    Node.TEXT_NODE &&
                String(
                    node.nodeValue || ''
                ).trim() === '>'
            ) {
                node.remove();
            }
        });
    }

    function apply() {
        root =
            document.getElementById(
                ROOT_ID
            );

        if (!root) {
            return false;
        }

        removeDirectGreaterSign();

        var placeholder =
            document.getElementById(
                EMPTY_ID
            );

        if (placeholder) {
            placeholder.classList.toggle(
                EMPTY_CLASS,
                placeholderIsEmpty(
                    placeholder
                )
            );
        }

        window.PMD_R2_EMPTY_FIX_V40_RESULT = {
            placeholderFound:
                Boolean(placeholder),

            placeholderHidden:
                Boolean(
                    placeholder &&
                    placeholder.classList.contains(
                        EMPTY_CLASS
                    )
                ),

            placeholderText:
                placeholder
                    ? String(
                        placeholder.textContent || ''
                    )
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 200)
                    : null,

            rootPaddingBottom:
                window
                    .getComputedStyle(root)
                    .paddingBottom
        };

        return true;
    }

    function schedule() {
        [
            0,
            40,
            100,
            200,
            400,
            700,
            1100
        ].forEach(function (delay) {
            window.setTimeout(
                apply,
                delay
            );
        });
    }

    function boot() {
        root =
            document.getElementById(
                ROOT_ID
            );

        if (!root) {
            return;
        }

        schedule();

        root.addEventListener(
            'click',
            schedule,
            true
        );

        root.addEventListener(
            'change',
            schedule,
            true
        );

        window.addEventListener(
            'pageshow',
            schedule
        );

        window.PMD_R2_APPLY_EMPTY_FIX_V40 =
            apply;

        console.log(
            '[PMD V40] Empty 547px placeholder fix active.'
        );
    }

    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {
                once: true
            }
        );
    } else {
        boot();
    }
})();
</script>
{{-- PMD_R2_EMPTY_PLACEHOLDER_FIX_V40_END --}}


{{-- PMD_R2_SIDEBAR_SMOOTH_V44_BEGIN --}}
<style id="pmd-r2-sidebar-smooth-v44-style">
    /*
     * PMD V44
     *
     * Sidebar Audit:
     * - #pmd-side-menu2 animates width for 220ms.
     * - #pmd-reservations2 changed margin-left instantly.
     *
     * Preserve all existing expanded/collapsed dimensions.
     * Only animate the existing horizontal change.
     */

    @media (min-width: 992px) {
        #pmd-reservations2 {
            transition:
                margin-left 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1),
                margin-right 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1)
                !important;

            will-change:
                margin-left,
                margin-right;
        }

        /*
         * Use the same duration/easing on the Sidebar itself,
         * without changing its existing width values.
         */
        #pmd-side-menu2 {
            transition:
                width 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1)
                !important;

            will-change:
                width;
        }

        /*
         * Keep Sidebar branding and navigation aligned while
         * their available width changes.
         */
        #pmd-side-menu2
        .pmd-sm2__brand-control,

        #pmd-side-menu2
        .pmd-sm2__nav,

        #pmd-side-menu2
        .pmd-sm2__nav-item,

        #pmd-side-menu2
        .pmd-sm2__nav-link {
            transition:
                margin-left 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1),
                margin-right 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1),
                padding-left 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1),
                padding-right 220ms
                    cubic-bezier(0.22, 0.75, 0.24, 1),
                opacity 160ms ease
                !important;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #pmd-reservations2,
        #pmd-side-menu2,
        #pmd-side-menu2 .pmd-sm2__brand-control,
        #pmd-side-menu2 .pmd-sm2__nav,
        #pmd-side-menu2 .pmd-sm2__nav-item,
        #pmd-side-menu2 .pmd-sm2__nav-link {
            transition-duration: 0.01ms !important;
        }
    }
</style>

<script id="pmd-r2-sidebar-smooth-v44-script">
(function () {
    'use strict';

    var root =
        document.getElementById(
            'pmd-reservations2'
        );

    var sidebar =
        document.getElementById(
            'pmd-side-menu2'
        );

    window.PMD_R2_SIDEBAR_SMOOTH_V44_RESULT = {
        rootFound:
            Boolean(root),

        sidebarFound:
            Boolean(sidebar),

        rootTransition:
            root
                ? window
                    .getComputedStyle(root)
                    .transition
                : null,

        sidebarTransition:
            sidebar
                ? window
                    .getComputedStyle(sidebar)
                    .transition
                : null
    };

    console.log(
        '[PMD V44] Reservations Sidebar smooth reflow active.',
        window.PMD_R2_SIDEBAR_SMOOTH_V44_RESULT
    );
})();
</script>
{{-- PMD_R2_SIDEBAR_SMOOTH_V44_END --}}


{{-- PMD_R2_WIDTH_REFLOW_V44_1_BEGIN --}}
<style id="pmd-r2-width-reflow-v44-1-style">
    /*
     * V44.1
     *
     * V44 made Sidebar/margins smoother.
     * V44.1 animates the actual Reservations width so all
     * cards, grids, KPI panels, Floor and Calendar resize
     * continuously instead of jumping.
     */

    @media (min-width: 992px) {
        #pmd-reservations2 {
            box-sizing: border-box !important;
        }

        html.pmd-r2-width-reflow-v44-1-active
        #pmd-reservations2 {
            overflow-x: clip !important;
        }

        html.pmd-r2-width-reflow-v44-1-active
        #pmd-reservations2 * {
            /*
             * Prevent unrelated child transitions from fighting
             * against the parent-width animation.
             */
            animation-play-state: running;
        }
    }
</style>

<script id="pmd-r2-width-reflow-v44-1-script">
(function () {
    'use strict';

    var ROOT_ID =
        'pmd-reservations2';

    var SIDEBAR_ID =
        'pmd-side-menu2';

    var TOGGLE_SELECTOR =
        '.pmd-sm2__brand-control';

    var ACTIVE_CLASS =
        'pmd-r2-width-reflow-v44-1-active';

    var DURATION =
        280;

    var EASING =
        'cubic-bezier(0.22, 0.75, 0.24, 1)';

    var html =
        document.documentElement;

    var root = null;
    var sidebar = null;
    var toggle = null;

    var startState = null;
    var animationToken = 0;
    var cleanupTimer = 0;

    function number(value) {
        var parsed =
            parseFloat(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }

    function readState() {
        if (!root) {
            return null;
        }

        var rect =
            root.getBoundingClientRect();

        var style =
            window.getComputedStyle(root);

        return {
            left:
                rect.left,

            width:
                rect.width,

            marginLeft:
                number(
                    style.marginLeft
                ),

            marginRight:
                number(
                    style.marginRight
                )
        };
    }

    function clearTemporaryStyles() {
        if (!root) {
            return;
        }

        window.clearTimeout(
            cleanupTimer
        );

        root.style.removeProperty(
            'width'
        );

        root.style.removeProperty(
            'margin-left'
        );

        root.style.removeProperty(
            'margin-right'
        );

        root.style.removeProperty(
            'transition'
        );

        root.style.removeProperty(
            'will-change'
        );

        html.classList.remove(
            ACTIVE_CLASS
        );
    }

    function captureBeforeChange(event) {
        if (
            window.innerWidth < 992 ||
            !root
        ) {
            return;
        }

        var control =
            event.target instanceof Element
                ? event.target.closest(
                    TOGGLE_SELECTOR
                )
                : null;

        if (!control) {
            return;
        }

        clearTemporaryStyles();

        startState =
            readState();
    }

    function animateToNewLayout() {
        if (
            window.innerWidth < 992 ||
            !root ||
            !startState
        ) {
            return;
        }

        var token =
            ++animationToken;

        /*
         * At this point the collapsed class has changed and
         * the browser already knows the final target geometry.
         */
        var targetState =
            readState();

        if (!targetState) {
            return;
        }

        var widthDifference =
            Math.abs(
                targetState.width -
                startState.width
            );

        var marginDifference =
            Math.abs(
                targetState.marginLeft -
                startState.marginLeft
            );

        if (
            widthDifference < 1 &&
            marginDifference < 1
        ) {
            startState = null;
            return;
        }

        html.classList.add(
            ACTIVE_CLASS
        );

        /*
         * Freeze the Reservations page at its exact pre-click
         * geometry. This reverses the one-frame layout jump.
         */
        root.style.setProperty(
            'transition',
            'none',
            'important'
        );

        root.style.setProperty(
            'width',
            startState.width + 'px',
            'important'
        );

        root.style.setProperty(
            'margin-left',
            startState.marginLeft + 'px',
            'important'
        );

        root.style.setProperty(
            'margin-right',
            startState.marginRight + 'px',
            'important'
        );

        root.style.setProperty(
            'will-change',
            'width, margin-left, margin-right',
            'important'
        );

        /*
         * Force the frozen starting layout to render.
         */
        void root.offsetWidth;

        window.requestAnimationFrame(
            function () {
                if (
                    token !==
                    animationToken
                ) {
                    return;
                }

                root.style.setProperty(
                    'transition',
                    [
                        'width ' +
                            DURATION +
                            'ms ' +
                            EASING,

                        'margin-left ' +
                            DURATION +
                            'ms ' +
                            EASING,

                        'margin-right ' +
                            DURATION +
                            'ms ' +
                            EASING
                    ].join(', '),
                    'important'
                );

                /*
                 * Animate to the real dimensions belonging to
                 * the new expanded/collapsed Sidebar state.
                 */
                root.style.setProperty(
                    'width',
                    targetState.width + 'px',
                    'important'
                );

                root.style.setProperty(
                    'margin-left',
                    targetState.marginLeft + 'px',
                    'important'
                );

                root.style.setProperty(
                    'margin-right',
                    targetState.marginRight + 'px',
                    'important'
                );

                cleanupTimer =
                    window.setTimeout(
                        function () {
                            if (
                                token !==
                                animationToken
                            ) {
                                return;
                            }

                            clearTemporaryStyles();

                            startState = null;
                        },
                        DURATION + 80
                    );
            }
        );

        window.PMD_R2_WIDTH_REFLOW_V44_1_RESULT = {
            startWidth:
                Math.round(
                    startState.width
                ),

            targetWidth:
                Math.round(
                    targetState.width
                ),

            startMarginLeft:
                Math.round(
                    startState.marginLeft
                ),

            targetMarginLeft:
                Math.round(
                    targetState.marginLeft
                ),

            duration:
                DURATION,

            animated:
                true
        };
    }

    function boot() {
        root =
            document.getElementById(
                ROOT_ID
            );

        sidebar =
            document.getElementById(
                SIDEBAR_ID
            );

        toggle =
            sidebar
                ? sidebar.querySelector(
                    TOGGLE_SELECTOR
                )
                : document.querySelector(
                    TOGGLE_SELECTOR
                );

        if (
            !root ||
            !sidebar ||
            !toggle
        ) {
            console.warn(
                '[PMD V44.1] Required element missing.',
                {
                    root:
                        Boolean(root),

                    sidebar:
                        Boolean(sidebar),

                    toggle:
                        Boolean(toggle)
                }
            );

            return;
        }

        /*
         * Capture-phase click runs before the Sidebar runtime
         * changes pmd-sm2-collapsed.
         */
        document.addEventListener(
            'click',
            captureBeforeChange,
            true
        );

        var previousCollapsed =
            html.classList.contains(
                'pmd-sm2-collapsed'
            );

        var observer =
            new MutationObserver(
                function () {
                    var currentCollapsed =
                        html.classList.contains(
                            'pmd-sm2-collapsed'
                        );

                    if (
                        currentCollapsed ===
                        previousCollapsed
                    ) {
                        return;
                    }

                    previousCollapsed =
                        currentCollapsed;

                    window.requestAnimationFrame(
                        animateToNewLayout
                    );
                }
            );

        observer.observe(
            html,
            {
                attributes: true,
                attributeFilter: [
                    'class'
                ]
            }
        );

        window.addEventListener(
            'resize',
            clearTemporaryStyles
        );

        window.PMD_R2_WIDTH_REFLOW_V44_1 = {
            clear:
                clearTemporaryStyles,

            root:
                root,

            sidebar:
                sidebar
        };

        console.log(
            '[PMD V44.1] Full Reservations width reflow active.'
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {
                once: true
            }
        );
    } else {
        boot();
    }
})();
</script>
{{-- PMD_R2_WIDTH_REFLOW_V44_1_END --}}













{{-- PMD_R2_REMOVE_EMPTY_STATUSBAR_V28 --}}
<style id="pmd-r2-remove-empty-statusbar-v28">
  /*
   * Floor controls now live in the top page header.
   * Remove the obsolete internal Floor toolbar/status row completely.
   */
  #pmd-r2-shared-floor-canvas-v310
  > .pmd-floor-v1__statusbar,
  #pmd-r2-shared-floor-canvas-v310
  .pmd-floor-v1__statusbar {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;

    width: 0 !important;
    height: 0 !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 0 !important;
    max-height: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    position: absolute !important;
    inset: auto !important;

    overflow: hidden !important;
    pointer-events: none !important;

    background: transparent !important;

    border: 0 !important;
    border-top: 0 !important;
    border-right: 0 !important;
    border-bottom: 0 !important;
    border-left: 0 !important;

    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  #pmd-r2-shared-floor-canvas-v310
  .pmd-floor-v1__statusbar::before,
  #pmd-r2-shared-floor-canvas-v310
  .pmd-floor-v1__statusbar::after {
    display: none !important;
    content: none !important;
  }

  /*
   * Also suppress its obsolete hidden children.
   */
  #pmd-r2-shared-floor-canvas-v310
  .pmd-floor-v1__search,

  #pmd-r2-shared-floor-canvas-v310
  .pmd-floor-v1__secondary-toolbar,

  #pmd-r2-shared-floor-canvas-v310
  [data-floor-secondary-toolbar] {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  /*
   * Let the actual Floor content begin directly at the top of the frame.
   */
  #pmd-r2-shared-floor-canvas-v310 {
    padding-top: 0 !important;
  }

  #pmd-r2-shared-floor-canvas-v310
  > :first-child:not(.pmd-floor-v1__statusbar) {
    margin-top: 0 !important;
  }
</style>
