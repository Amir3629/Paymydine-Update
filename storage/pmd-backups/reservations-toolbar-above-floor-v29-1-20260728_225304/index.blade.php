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
  src="/app/admin/assets/js/pmd-floor-v1.js?v=safe-v3-20260727_122329"
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
        src="{{ asset('app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js') }}?v=pmd-lean-v17-20260728_201405"></script>
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
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-stability-v3.css?v=3.0.0-20260725_084550">
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css?v=20260728_181723"
>
<script
  src="/app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js?v=20260728_182351"
></script>
<script defer src="/app/admin/assets/js/pmd-reservations2-stability-v3.js?v=3.0.0-20260725_084550"></script>
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

        scroll.style.setProperty(
            '--floor-zoom',
            '1'
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

{{-- PMD_R2_TOOLBAR_ABOVE_FLOOR_V29 --}}
<style id="pmd-r2-toolbar-above-floor-v29-style">
  /*
   * Transparent toolbar row directly above the Floor frame.
   */
  #pmd-r2-toolbar-above-floor-shell-v29 {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;
    gap: 10px !important;

    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;

    box-sizing: border-box !important;

    margin: 14px 0 16px 0 !important;
    padding: 0 !important;

    position: relative !important;
    z-index: 20 !important;

    background: transparent !important;

    border: 0 !important;
    border-top: 0 !important;
    border-right: 0 !important;
    border-bottom: 0 !important;
    border-left: 0 !important;

    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
    overflow: visible !important;
  }

  #pmd-r2-toolbar-above-floor-shell-v29::before,
  #pmd-r2-toolbar-above-floor-shell-v29::after {
    display: none !important;
    content: none !important;
  }

  #pmd-r2-toolbar-above-floor-shell-v29
  #pmd-r2-floor-toolbar-v316 {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;
    gap: 10px !important;

    width: auto !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    position: relative !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  /*
   * Individual buttons keep the same clean Calendar-style design.
   */
  #pmd-r2-toolbar-above-floor-shell-v29
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

    background: #ffffff !important;
    border: 1px solid #cfe0ed !important;
    border-radius: 13px !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  #pmd-r2-toolbar-above-floor-shell-v29
  .pmd-r2-floor-tool-v316:hover {
    background: #f7fafc !important;
  }

  /*
   * Move the Floor frame lower and create clean separation.
   */
  #pmd-r2-shared-floor-canvas-v310.pmd-r2-floor-below-toolbar-v29 {
    margin-top: 0 !important;
  }

  /*
   * Old internal host remains only for compatibility.
   * It creates no row, gap or border inside the Floor frame.
   */
  #pmd-r2-floor-toolbar-host-v464.pmd-r2-old-host-hidden-v29 {
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
    overflow: hidden !important;
    pointer-events: none !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-floor-toolbar-host-v464.pmd-r2-old-host-hidden-v29::before,
  #pmd-r2-floor-toolbar-host-v464.pmd-r2-old-host-hidden-v29::after {
    display: none !important;
    content: none !important;
  }

  @media (max-width: 900px) {
    #pmd-r2-toolbar-above-floor-shell-v29 {
      gap: 6px !important;
      margin-top: 10px !important;
      margin-bottom: 12px !important;
    }

    #pmd-r2-toolbar-above-floor-shell-v29
    .pmd-r2-floor-tool-v316 {
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
    }
  }
</style>

<script id="pmd-r2-toolbar-above-floor-v29-script">
(function () {
  'use strict';

  var ROOT_ID =
    'pmd-reservations2';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var HOST_ID =
    'pmd-r2-floor-toolbar-host-v464';

  var TOOLBAR_ID =
    'pmd-r2-floor-toolbar-v316';

  var SHELL_ID =
    'pmd-r2-toolbar-above-floor-shell-v29';

  var attempt = 0;
  var maxAttempts = 40;
  var timer = null;

  function getShell(root, floor) {
    var shell =
      document.getElementById(SHELL_ID);

    if (!shell) {
      shell =
        document.createElement('div');

      shell.id = SHELL_ID;

      shell.setAttribute(
        'data-pmd-toolbar-location',
        'above-floor-v29'
      );
    }

    /*
     * Place shell directly before the Floor frame.
     */
    if (
      shell.parentElement !== root ||
      shell.nextElementSibling !== floor
    ) {
      root.insertBefore(
        shell,
        floor
      );
    }

    return shell;
  }

  function mount() {
    attempt += 1;

    var root =
      document.getElementById(ROOT_ID);

    var floor =
      document.getElementById(FLOOR_ID);

    var host =
      document.getElementById(HOST_ID);

    var toolbar =
      document.getElementById(TOOLBAR_ID);

    if (
      !root ||
      !floor ||
      !host ||
      !toolbar
    ) {
      if (attempt < maxAttempts) {
        timer =
          window.setTimeout(
            mount,
            100
          );
      }

      return false;
    }

    var shell =
      getShell(
        root,
        floor
      );

    /*
     * Move the real toolbar from the main page header
     * into the transparent shell above the Floor frame.
     */
    if (
      toolbar.parentElement !== shell
    ) {
      shell.appendChild(toolbar);
    }

    host.classList.add(
      'pmd-r2-old-host-hidden-v29'
    );

    floor.classList.add(
      'pmd-r2-floor-below-toolbar-v29'
    );

    host.setAttribute(
      'aria-hidden',
      'true'
    );

    host.setAttribute(
      'data-pmd-toolbar-host',
      'inactive-v29'
    );

    toolbar.setAttribute(
      'data-pmd-toolbar-location',
      'above-floor-v29'
    );

    return true;
  }

  function boot() {
    mount();

    /*
     * Limited retries only.
     * No permanent MutationObserver and no runtime lag.
     */
    [
      150,
      350,
      700,
      1200,
      2000,
      3200
    ].forEach(function (delay) {
      window.setTimeout(
        mount,
        delay
      );
    });

    console.info(
      '[PMD Reservations V29] ' +
      'Floor controls mounted above Floor frame'
    );
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
</script>

