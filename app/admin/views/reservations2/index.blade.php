
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
<link rel="stylesheet" href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-single-source-v1&pmd-mobile-menu-visual=2427-20260801_202220">
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


<!--
  PMD_CHROME_FLEX_TOP_V2419

  The global .page element is a horizontal flex container.
  Chrome vertically centers an oversized .page-wrapper when
  justify-content resolves to center, placing the beginning of
  Reservations2 roughly half of its total height above the viewport.

  This view-scoped rule keeps the Reservations2 workspace aligned
  to the top without changing Floor geometry, One Row, Calendar,
  Hour, cards, KPIs, scrolling, Safari, mobile, or other admin pages.
-->
<style id="pmd-chrome-flex-top-v2419">
body.page {
  justify-content: flex-start !important;
  align-content: flex-start !important;
}

body.page > .page-wrapper {
  align-self: stretch !important;
}
</style>

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
  href="/app/admin/assets/css/pmd-floor-v1.css?pmd-floor-guide=2413-20260801_182507&v=pmd-r2-v310"
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
  src="/app/admin/assets/js/pmd-floor-v1.js?pmd-floor-guide=2413-20260801_182507&v=20260729_d1-auth-v1"
  defer
></script>
<script
  src="/app/admin/assets/js/pmd-floor-v1-stable-v11.js?v=pmd-r2-v310"
  defer
></script>


<script src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260718-4&pmd-mobile-menu-behavior=2427-20260801_202220"></script>
<script src="/app/admin/assets/js/pmd-reservations2-v1.js?v=20260718-1&pmd-mobile-header-core=2424-20260801_195840"></script>


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
    href="/app/admin/assets/css/pmd-reservations2-mobile-hamburger-v301.css?v=20260722_111424&pmd-mobile-header-layout=2424-20260801_195840"
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
    src="/app/admin/assets/js/pmd-reservations2-prune-v305.js?v=20260722_233803&pmd-floor-preserve-prune=2418-20260801_192902"
    defer
></script>

<!-- PMD_R2_PRUNE_V305_END -->


<!-- PMD_R2_REMOVE_WAITER_ROOT_V306_START -->

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservations2-remove-waiter-root-v306.css?v=20260722_115443"
>

<script
    src="/app/admin/assets/js/pmd-reservations2-remove-waiter-root-v306.js?v=20260722_115443&pmd-floor-preserve-remove=2418-20260801_192902"
    defer
></script>

<!-- PMD_R2_REMOVE_WAITER_ROOT_V306_END -->


<!-- PMD_R2_RESERVATION_KPIS_V307_START -->

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservations2-kpis-v307.css?pmd-kpi=2409?v=20260722_120725"
>

<script
    src="/app/admin/assets/js/pmd-reservations2-kpis-v307.js?pmd-kpi=2409?v=20260729_b1-kpi-stable-v1"
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




<!-- PMD_TOOLBAR_OUTSIDE_FLOOR_FRAME_V5 -->
<style id="pmd-toolbar-outside-floor-frame-v5-style">
/*
 * Keep the real V316 toolbar, but remove its white 66px
 * in-Floor header row from the Floor layout.
 */

#pmd-r2-shared-floor-canvas-v310 {
    margin-top: 58px !important;
    overflow: visible !important;
}

#pmd-r2-shared-floor-canvas-v310
    > #pmd-r2-floor-toolbar-host-v464 {
    position: absolute !important;
    top: -54px !important;
    right: 0 !important;
    left: auto !important;

    width: auto !important;
    height: 40px !important;
    min-height: 0 !important;
    max-height: 40px !important;

    padding: 0 !important;
    margin: 0 !important;

    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;

    overflow: visible !important;
    z-index: 30 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
}

#pmd-r2-floor-toolbar-host-v464
    > #pmd-r2-floor-toolbar-v316 {
    position: static !important;

    width: auto !important;
    height: 40px !important;

    padding: 0 !important;
    margin: 0 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;

    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}

/*
 * The stage remains the only visible content inside
 * the bordered Floor frame.
 */
#pmd-r2-shared-floor-canvas-v310
    > .pmd-floor-v1__stage {
    border-radius: inherit;
}

/*
 * In One Row, only the mode-return button is needed.
 */
#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="edit"],

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="zoom-out"],

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="fit"],

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="zoom-in"] {
    display: none !important;
}

/*
 * Ensure the strip/full-floor button itself remains visible.
 */
#pmd-r2-shared-floor-canvas-v310
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="strip"] {
    display: inline-flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    transform: none !important;
}

/*
 * Keep the Toolbar reachable at narrower widths.
 */
@media (max-width: 700px) {
    #pmd-r2-shared-floor-canvas-v310 {
        margin-top: 54px !important;
    }

    #pmd-r2-shared-floor-canvas-v310
        > #pmd-r2-floor-toolbar-host-v464 {
        top: -50px !important;
        max-width: 100% !important;
    }

    #pmd-r2-floor-toolbar-v316 {
        max-width: 100% !important;
        gap: 6px !important;
    }
}
</style>

<script id="pmd-toolbar-outside-floor-frame-v5-script">
(function () {
    'use strict';

    if (window.PMDToolbarOutsideFloorFrameV5) {
        return;
    }

    var FLOOR_ID =
        'pmd-r2-shared-floor-canvas-v310';

    var TOOLBAR_ID =
        'pmd-r2-floor-toolbar-v316';

    var observer = null;

    function floor() {
        return document.getElementById(
            FLOOR_ID
        );
    }

    function toolbar() {
        return document.getElementById(
            TOOLBAR_ID
        );
    }

    function stripButton() {
        var tool = toolbar();

        return tool
            ? tool.querySelector(
                '[data-pmd-r2-tool="strip"]'
            )
            : null;
    }

    function syncModeButton() {
        var root = floor();
        var button = stripButton();

        if (!root || !button) {
            return false;
        }

        var isOneRow =
            root.classList.contains(
                'is-strip-mode'
            );

        if (
            !button.hasAttribute(
                'data-pmd-normal-strip-label-v5'
            )
        ) {
            var normalLabel =
                button.getAttribute(
                    'data-bs-original-title'
                ) ||
                button.textContent.trim() ||
                'One Row';

            button.setAttribute(
                'data-pmd-normal-strip-label-v5',
                normalLabel
            );
        }

        var normalLabel =
            button.getAttribute(
                'data-pmd-normal-strip-label-v5'
            ) || 'One Row';

        var visibleLabel =
            isOneRow
                ? 'Full Floor'
                : normalLabel;

        button.textContent =
            visibleLabel;

        button.setAttribute(
            'aria-label',
            visibleLabel
        );

        button.setAttribute(
            'title',
            visibleLabel
        );

        button.setAttribute(
            'aria-hidden',
            'false'
        );

        button.setAttribute(
            'tabindex',
            '0'
        );

        return true;
    }

    function start() {
        var root = floor();

        if (!root) {
            return false;
        }

        syncModeButton();

        observer =
            new MutationObserver(
                function (records) {
                    var classChanged =
                        records.some(
                            function (record) {
                                return (
                                    record.type ===
                                        'attributes' &&
                                    record.attributeName ===
                                        'class'
                                );
                            }
                        );

                    if (classChanged) {
                        syncModeButton();
                    }
                }
            );

        observer.observe(
            root,
            {
                attributes: true,
                attributeFilter: ['class']
            }
        );

        root.addEventListener(
            'click',
            function (event) {
                var button =
                    event.target.closest(
                        '[data-pmd-r2-tool="strip"]'
                    );

                if (!button) {
                    return;
                }

                requestAnimationFrame(
                    function () {
                        requestAnimationFrame(
                            syncModeButton
                        );
                    }
                );
            }
        );

        return true;
    }

    var attempts = 0;

    function boot() {
        attempts += 1;

        if (start()) {
            return;
        }

        if (attempts < 20) {
            window.setTimeout(
                boot,
                100
            );
        }
    }

    window.PMDToolbarOutsideFloorFrameV5 = {
        sync: syncModeButton,

        audit: function () {
            var root = floor();
            var tool = toolbar();
            var host =
                document.getElementById(
                    'pmd-r2-floor-toolbar-host-v464'
                );

            return {
                floor: Boolean(root),
                toolbar: Boolean(tool),
                host: Boolean(host),
                oneRow: Boolean(
                    root &&
                    root.classList.contains(
                        'is-strip-mode'
                    )
                ),
                toolbarParent:
                    tool &&
                    tool.parentElement
                        ? tool.parentElement.id
                        : null,
                hostHeight:
                    host
                        ? host.getBoundingClientRect()
                            .height
                        : null,
                floorTop:
                    root
                        ? root.getBoundingClientRect()
                            .top
                        : null,
                toolbarTop:
                    tool
                        ? tool.getBoundingClientRect()
                            .top
                        : null
            };
        },

        destroy: function () {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
    };

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
})();
</script>
<!-- PMD_TOOLBAR_OUTSIDE_FLOOR_FRAME_V5_END -->

<!-- PMD_R2_FLOOR_TOOLBAR_V316_START -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-reservations2-floor-toolbar-v316.css') }}?v=20260722_235352">

{{-- PMD_R2_TOOLBAR_ABOVE_FLOOR_V29_2 --}}
<style id="pmd-r2-toolbar-above-floor-v292-style">
  /*
   * Hide the original toolbar row before the first browser paint.
   */
  #pmd-r2-floor-toolbar-host-v464.pmd-r2-v292-prepaint-disabled {
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
        src="{{ asset('app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js') }}?v=20260802_dashboard2-no-cards-final-v1"></script>

<script id="pmd-r2-toolbar-above-floor-v29-2-script">
(function () {
  'use strict';
  return; // Superseded by the native Floor/V316 authority.

  return; // Disabled: V316 remains inside the native Floor.

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
    href="{{ asset('app/admin/assets/css/pmd-reservations2-date-popover-v318.css?pmd-date-modal-ui=2428-20260801_203012&pmd-date-visible=2430-20260801_203748&pmd-date-global-visible=2431-20260801_213327&pmd-date-backdrop-only=2433-20260801_214044&pmd-date-full-backdrop=2434-20260801_214546') }}?v=20260722_230938"
>
<script
    defer
    src="{{ asset('app/admin/assets/js/pmd-reservations2-date-popover-v318.js?pmd-date-modal=2428-20260801_203012&pmd-date-click=2429-20260801_203432') }}?v=20260722_230938"
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

{{-- PMD_RESERVATIONS_CANONICAL_BROWSER_URL_V1_DISABLED_20260808

The Reservations2 workspace must keep its real route identity:

    /admin/reservations2

Do NOT rewrite window.location.pathname to /admin/reservations.

Several Reservations2 authorities are route-scoped and explicitly
require /admin/reservations2. Changing only the browser URL causes
those authorities to see the wrong route after page boot and especially
after refresh / zero-state initialization.

No redirect is performed here.
--}}

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

[data-pmd-floor].pmd-r2-strip-controls-hidden-disabled
    [data-pmd-r2-tool="edit"],
[data-pmd-floor].pmd-r2-strip-controls-hidden-disabled
    [data-pmd-r2-tool="zoom-out"],
[data-pmd-floor].pmd-r2-strip-controls-hidden-disabled
    [data-pmd-r2-tool="fit"],
[data-pmd-floor].pmd-r2-strip-controls-hidden-disabled
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
  return; // Superseded by the native Floor/V316 authority.

    return; // Disabled: native Floor engine owns One Row geometry.

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
  return; // Superseded by the native Floor/V316 authority.

  return; // Disabled: body-level proxy toolbar is obsolete.

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
  return; // Superseded by the native Floor/V316 authority.

    return; // Disabled: body-toolbar positioning is obsolete.

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

<!-- PMD_WORKING_TOOLBAR_STYLE_V1 -->
<style id="pmd-working-toolbar-style-v1">

/* Real space between KPI cards and the Floor map. */
#pmd-reservations2 > #pmd-r2-shared-floor-canvas-v310 {
    margin-top: 64px !important;
    overflow: visible !important;
}

/* Existing V316 toolbar above and outside the Floor border. */
#pmd-r2-shared-floor-canvas-v310
    > #pmd-r2-floor-toolbar-host-v464 {
    position: absolute !important;
    top: -56px !important;
    right: 0 !important;
    left: auto !important;

    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;

    width: auto !important;
    height: 44px !important;
    min-height: 44px !important;
    max-height: 44px !important;

    padding: 0 !important;
    margin: 0 !important;

    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;

    overflow: visible !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;

    z-index: 9999 !important;
}

/* Keep the real toolbar visible, stable and right-aligned. */
#pmd-r2-floor-toolbar-host-v464
    > #pmd-r2-floor-toolbar-v316 {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;

    gap: 10px !important;

    position: relative !important;

    width: auto !important;
    height: 44px !important;

    margin: 0 !important;
    padding: 0 !important;

    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;

    transform: none !important;
    z-index: 10000 !important;
}

#pmd-r2-floor-toolbar-v316 button {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}

/* In One Row show only the return-to-Full-Floor button. */
#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="edit"],

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="zoom-out"],

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="fit"],

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="zoom-in"] {
    display: none !important;
}

#pmd-r2-shared-floor-canvas-v310.is-strip-mode
    #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="strip"] {
    display: inline-flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}

@media (max-width: 767px) {
    #pmd-reservations2 > #pmd-r2-shared-floor-canvas-v310 {
        margin-top: 58px !important;
    }

    #pmd-r2-shared-floor-canvas-v310
        > #pmd-r2-floor-toolbar-host-v464 {
        top: -52px !important;
        max-width: 100% !important;
    }

    #pmd-r2-floor-toolbar-host-v464
        > #pmd-r2-floor-toolbar-v316 {
        gap: 6px !important;
        max-width: 100% !important;
    }
}

</style>
<!-- PMD_WORKING_TOOLBAR_STYLE_V1_END -->

<!-- PMD_STABLE_ONE_ROW_V1 -->
<style id="pmd-stable-one-row-v1-style">
  [data-pmd-floor].pmd-one-row-v1-restoring
    [data-floor-scroll] {
    visibility: hidden !important;
  }

  [data-pmd-floor].is-strip-mode
    [data-floor-canvas] {
    transform: none !important;
  }
</style>

<script id="pmd-stable-one-row-v1-script">
(function () {
  'use strict';

  function bootStableOneRowV1() {
    if (
      window.PMDStableOneRowV1 &&
      typeof window.PMDStableOneRowV1.destroy === 'function'
    ) {
      window.PMDStableOneRowV1.destroy();
    }

    var floor =
      document.querySelector('[data-pmd-floor]');

    var scroll =
      floor &&
      floor.querySelector('[data-floor-scroll]');

    var canvas =
      floor &&
      floor.querySelector('[data-floor-canvas]');

    if (!floor || !scroll || !canvas) {
      console.warn(
        '[PMD One Row V1] Floor elements not found.'
      );

      return false;
    }

    var canonical = null;

    var previousStrip =
      floor.classList.contains('is-strip-mode');

    var captureTimer = null;
    var restoring = false;
    var destroyed = false;

    function tables() {
      return Array.prototype.slice.call(
        floor.querySelectorAll('[data-floor-table]')
      );
    }

    function snapshotElement(element) {
      return {
        cssText: element.style.cssText,
        scrollLeft: element.scrollLeft || 0,
        scrollTop: element.scrollTop || 0
      };
    }

    function metrics() {
      var items = tables();

      var rects = items.map(function (item) {
        return item.getBoundingClientRect();
      });

      return {
        mode:
          floor.classList.contains('is-strip-mode')
            ? 'one-row'
            : 'full-floor',

        tables: items.length,

        canvasWidth:
          canvas.getBoundingClientRect().width,

        canvasScrollWidth:
          scroll.scrollWidth,

        stripHeight:
          scroll.getBoundingClientRect().height,

        firstTable:
          rects[0]
            ? {
                left: rects[0].left,
                top: rects[0].top,
                width: rects[0].width,
                height: rects[0].height
              }
            : null,

        secondTable:
          rects[1]
            ? {
                left: rects[1].left,
                top: rects[1].top,
                width: rects[1].width,
                height: rects[1].height
              }
            : null,

        firstGap:
          rects[0] && rects[1]
            ? rects[1].left - rects[0].right
            : null
      };
    }

    function capture() {
      var currentTables = tables();

      if (
        destroyed ||
        !floor.classList.contains('is-strip-mode') ||
        currentTables.length === 0
      ) {
        return false;
      }

      canonical = {
        floorClassName: floor.className,

        scroll:
          snapshotElement(scroll),

        canvas:
          snapshotElement(canvas),

        tables:
          currentTables.map(function (table) {
            return {
              id:
                table.getAttribute('data-floor-table') ||
                table.dataset.floorTable ||
                '',

              cssText:
                table.style.cssText
            };
          }),

        metrics:
          metrics()
      };

      console.info(
        '[PMD One Row V1] Canonical One Row captured.',
        canonical.metrics
      );

      return true;
    }

    function savedTableFor(table, index, tableMap) {
      var id = String(
        table.getAttribute('data-floor-table') ||
        table.dataset.floorTable ||
        ''
      );

      return (
        tableMap.get(id) ||
        canonical.tables[index] ||
        null
      );
    }

    function applyCanonicalStyles(currentTables, tableMap) {
      scroll.style.cssText =
        canonical.scroll.cssText;

      canvas.style.cssText =
        canonical.canvas.cssText;

      currentTables.forEach(function (table, index) {
        var saved =
          savedTableFor(table, index, tableMap);

        if (saved) {
          table.style.cssText =
            saved.cssText;
        }
      });

      canvas.style.transform = 'none';
    }

    function restore(reason) {
      if (
        destroyed ||
        !canonical ||
        restoring ||
        !floor.classList.contains('is-strip-mode')
      ) {
        return false;
      }

      restoring = true;

      var currentTables = tables();

      var tableMap = new Map(
        canonical.tables.map(function (item) {
          return [String(item.id), item];
        })
      );

      floor.classList.add(
        'pmd-one-row-v1-restoring'
      );

      applyCanonicalStyles(
        currentTables,
        tableMap
      );

      scroll.scrollTop =
        canonical.scroll.scrollTop;

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (destroyed) {
            restoring = false;
            return;
          }

          applyCanonicalStyles(
            currentTables,
            tableMap
          );

          scroll.scrollLeft =
            canonical.scroll.scrollLeft;

          scroll.scrollTop =
            canonical.scroll.scrollTop;

          floor.classList.remove(
            'pmd-one-row-v1-restoring'
          );

          restoring = false;

          console.info(
            '[PMD One Row V1] Restored:',
            reason,
            metrics()
          );
        });
      });

      return true;
    }

    function scheduleInitialCapture() {
      window.clearTimeout(captureTimer);

      captureTimer =
        window.setTimeout(function () {
          capture();
        }, 450);
    }

    function handleModeChange() {
      var isStrip =
        floor.classList.contains('is-strip-mode');

      if (isStrip === previousStrip) {
        return;
      }

      previousStrip = isStrip;

      window.clearTimeout(captureTimer);

      if (!isStrip) {
        return;
      }

      if (!canonical) {
        scheduleInitialCapture();
        return;
      }

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          restore('mode-change');
        });
      });
    }

    var observer =
      new MutationObserver(function (mutations) {
        var classChanged =
          mutations.some(function (mutation) {
            return (
              mutation.type === 'attributes' &&
              mutation.attributeName === 'class'
            );
          });

        if (classChanged) {
          handleModeChange();
        }
      });

    observer.observe(floor, {
      attributes: true,
      attributeFilter: ['class']
    });

    window.PMDStableOneRowV1 = {
      version: '1.0.0',

      capture: capture,

      restore: function () {
        return restore('manual');
      },

      audit: function () {
        return {
          active: !destroyed,

          canonicalCaptured:
            Boolean(canonical),

          canonicalMetrics:
            canonical
              ? canonical.metrics
              : null,

          currentMetrics:
            metrics()
        };
      },

      destroy: function () {
        if (destroyed) {
          return;
        }

        destroyed = true;

        window.clearTimeout(captureTimer);
        observer.disconnect();

        floor.classList.remove(
          'pmd-one-row-v1-restoring'
        );

        delete window.PMDStableOneRowV1;

        console.info(
          '[PMD One Row V1] Destroyed.'
        );
      }
    };

    /*
     * If the saved preference opens the page directly in One Row,
     * capture that first clean rendered geometry automatically.
     */
    if (previousStrip) {
      scheduleInitialCapture();
    }

    console.info(
      '[PMD One Row V1] Ready.',
      {
        mode:
          previousStrip
            ? 'one-row'
            : 'full-floor',

        tables:
          tables().length
      }
    );

    return true;
  }

  function start() {
    var attempts = 0;
    var maximumAttempts = 20;

    function attempt() {
      attempts += 1;

      if (bootStableOneRowV1()) {
        return;
      }

      if (attempts < maximumAttempts) {
        window.setTimeout(attempt, 150);
      }
    }

    attempt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
</script>
<!-- PMD_STABLE_ONE_ROW_V1_END -->

<!-- PMD_THREE_VIEW_CYCLE_V1 -->
<style id="pmd-three-view-cycle-v1-style">
  #pmd-r2-floor-toolbar-v316
    [data-pmd-r2-tool="fit"] {
    display: none !important;
  }

  #pmd-reservations2
    > #pmd-r2-reservation-cards-v320 {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  #pmd-reservations2.is-calendar-mode
    > #pmd-r2-reservation-cards-v320 {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    margin-top: 18px !important;
  }
</style>

<script id="pmd-three-view-cycle-v1-script">
(function () {
  'use strict';

  var VERSION = '1.1.0';

  var PAGE_ID =
    'pmd-reservations2';

  var TOGGLE_ID =
    'pmd-r2-calendar-toggle-v1';

  var CALENDAR_ID =
    'pmd-r2-calendar-surface-v160';

  var CARDS_ID =
    'pmd-r2-reservation-cards-v320';

  if (
    window.PMDThreeViewCycleV1 &&
    typeof window.PMDThreeViewCycleV1.destroy ===
      'function'
  ) {
    window.PMDThreeViewCycleV1.destroy();
  }

  function page() {
    return document.getElementById(
      PAGE_ID
    );
  }

  function calendar() {
    return document.getElementById(
      CALENDAR_ID
    );
  }

  function toggleButton() {
    return document.getElementById(
      TOGGLE_ID
    );
  }

  function cards() {
    return document.getElementById(
      CARDS_ID
    );
  }

  function calendarApi() {
    return (
      window.PMDReservations2CalendarToggleV1 ||
      null
    );
  }

  function selectedCardsApi() {
    return (
      window.PMDSelectedDateCardsV12 ||
      null
    );
  }

  function localDateKey() {
    var date = new Date();

    return [
      String(date.getFullYear()),
      String(
        date.getMonth() + 1
      ).padStart(2, '0'),
      String(
        date.getDate()
      ).padStart(2, '0')
    ].join('-');
  }

  function storedDate() {
    var root = page();
    var section = cards();

    return (
      (root &&
        root.dataset.pmdSelectedDate) ||
      (section &&
        section.dataset.pmdSelectedDate) ||
      ''
    );
  }

  function isHourView() {
    var root = calendar();

    if (!root) {
      return false;
    }

    var timeline =
      root.querySelector(
        '.pmd-r2-day-board__timeline'
      );

    return Boolean(
      root.classList.contains(
        'is-timeslot-screen'
      ) &&
      timeline &&
      timeline.getClientRects().length
    );
  }

  function currentView() {
    if (isHourView()) {
      return 'hour';
    }

    if (
      page() &&
      page().classList.contains(
        'is-calendar-mode'
      )
    ) {
      return 'calendar';
    }

    return 'floor';
  }

  function ensureCardsVisible() {
    var element = cards();

    if (!element) {
      return false;
    }

    element.hidden = false;

    element.style.setProperty(
      'display',
      'block',
      'important'
    );

    element.style.setProperty(
      'visibility',
      'visible',
      'important'
    );

    element.style.setProperty(
      'opacity',
      '1',
      'important'
    );

    element.style.setProperty(
      'pointer-events',
      'auto',
      'important'
    );

    return true;
  }

  function syncCards(
    view,
    reason
  ) {
    var selectedApi =
      selectedCardsApi();

    if (
      !selectedApi ||
      typeof selectedApi.syncForView !==
        'function'
    ) {
      return false;
    }

    return selectedApi.syncForView(
      view || currentView(),
      reason || 'three-view-sync'
    );
  }

  function removeFitButton() {
    var button =
      document.querySelector(
        '#pmd-r2-floor-toolbar-v316 ' +
        '[data-pmd-r2-tool="fit"]'
      );

    if (!button) {
      return false;
    }

    button.remove();

    return true;
  }

  function resetHourToCalendar() {
    var root = calendar();

    if (!root) {
      return false;
    }

    var backButton =
      root.querySelector(
        '[data-r2-yc-clear-selection]'
      );

    if (backButton) {
      backButton.click();
    }

    root.classList.remove(
      'is-timeslot-screen',
      'is-switching-to-timeslots'
    );

    return true;
  }

  function updateButtonState() {
    var button = toggleButton();

    if (!button) {
      return;
    }

    var view =
      currentView();

    var nextLabel;

    if (view === 'floor') {
      nextLabel =
        'Open calendar view';
    } else if (view === 'calendar') {
      nextLabel =
        'Open hour timeline';
    } else {
      nextLabel =
        'Return to floor map';
    }

    button.setAttribute(
      'aria-label',
      nextLabel
    );

    button.setAttribute(
      'title',
      nextLabel
    );

    button.dataset
      .pmdThreeViewCurrent =
      view;
  }

  function enterCalendar() {
    var api =
      calendarApi();

    if (
      !api ||
      typeof api.open !== 'function'
    ) {
      return false;
    }

    api.open();

    window.setTimeout(
      function () {
        ensureCardsVisible();
        syncCards(
          'calendar',
          'enter-calendar'
        );
        updateButtonState();
      },
      220
    );

    return true;
  }

  function enterHour() {
    var api =
      calendarApi();

    if (
      !api ||
      typeof api.selectDate !==
        'function'
    ) {
      return false;
    }

    var apiAudit =
      typeof api.audit === 'function'
        ? api.audit()
        : null;

    var date =
      storedDate() ||
      (
        apiAudit &&
        apiAudit.selectedDate
          ? apiAudit.selectedDate
          : ''
      ) ||
      localDateKey();

    var selectedApi =
      selectedCardsApi();

    if (
      selectedApi &&
      typeof selectedApi.select ===
        'function'
    ) {
      selectedApi.select(
        date,
        false
      );
    }

    api.selectDate(date);

    window.requestAnimationFrame(
      function () {
        window.setTimeout(
          function () {
            if (
              typeof window
                .PMD_R2_APPLY_HOUR_LAYOUT_V38 ===
              'function'
            ) {
              window
                .PMD_R2_APPLY_HOUR_LAYOUT_V38();
            }

            if (
              typeof window
                .PMD_R2_APPLY_HOUR_BOTTOM_V38_1 ===
              'function'
            ) {
              window
                .PMD_R2_APPLY_HOUR_BOTTOM_V38_1();
            }

            ensureCardsVisible();

            syncCards(
              'hour',
              'enter-hour'
            );

            if (
              window.PMDRealHourTimelineV1 &&
              typeof window
                .PMDRealHourTimelineV1.render ===
                'function'
            ) {
              window
                .PMDRealHourTimelineV1
                .render(
                  'three-view-enter-hour'
                );
            }

            updateButtonState();
          },
          40
        );
      }
    );

    return true;
  }

  function enterFloor() {
    var api =
      calendarApi();

    resetHourToCalendar();

    if (
      !api ||
      typeof api.close !== 'function'
    ) {
      return false;
    }

    api.close();

    window.setTimeout(
      function () {
        ensureCardsVisible();

        syncCards(
          'floor',
          'enter-floor'
        );

        updateButtonState();
      },
      220
    );

    return true;
  }

  function cycle(event) {
    var button =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#' + TOGGLE_ID
          )
        : null;

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var view =
      currentView();

    if (view === 'floor') {
      enterCalendar();
      return;
    }

    if (view === 'calendar') {
      enterHour();
      return;
    }

    enterFloor();
  }

  function boot() {
    removeFitButton();
    ensureCardsVisible();
    updateButtonState();

    document.addEventListener(
      'click',
      cycle,
      true
    );

    [250, 900, 1800].forEach(
      function (delay) {
        window.setTimeout(
          function () {
            removeFitButton();
            ensureCardsVisible();
            updateButtonState();
          },
          delay
        );
      }
    );

    console.info(
      '[PMD Three View Cycle V1.1] Ready.',
      audit()
    );
  }

  function audit() {
    return {
      version: VERSION,
      currentView:
        currentView(),
      selectedDate:
        storedDate() || null,
      page:
        Boolean(page()),
      calendar:
        Boolean(calendar()),
      cards:
        Boolean(cards()),
      cardsVisible:
        Boolean(
          cards() &&
          getComputedStyle(
            cards()
          ).display !== 'none'
        ),
      fitButtonExists:
        Boolean(
          document.querySelector(
            '#pmd-r2-floor-toolbar-v316 ' +
            '[data-pmd-r2-tool="fit"]'
          )
        ),
      calendarApi:
        Boolean(calendarApi()),
      selectedCardsApi:
        Boolean(selectedCardsApi()),
      oneRowApi:
        Boolean(
          window.PMDStableOneRowV1
        )
    };
  }

  function destroy() {
    document.removeEventListener(
      'click',
      cycle,
      true
    );

    delete window
      .PMDThreeViewCycleV1;
  }

  window.PMDThreeViewCycleV1 = {
    version: VERSION,
    audit: audit,
    currentView: currentView,
    showFloor: enterFloor,
    showCalendar: enterCalendar,
    showHour: enterHour,
    ensureCardsVisible:
      ensureCardsVisible,
    destroy: destroy
  };

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
})();
</script>
<!-- PMD_THREE_VIEW_CYCLE_V1_END -->

<!-- PMD_CARDS_ALL_VIEWS_V11 -->
<style id="pmd-cards-all-views-v12-style">
  #pmd-reservations2
    > #pmd-r2-reservation-cards-v320 {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;

    position: relative !important;

    width: 100% !important;
    height: auto !important;
    min-height: 1px !important;
    max-height: none !important;

    overflow: visible !important;
    pointer-events: auto !important;
  }

  #pmd-reservations2
    > #pmd-r2-reservation-cards-v320
    > .pmd-r2-reservation-cards-v320__head {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;

    width: 100% !important;
    height: auto !important;
    min-height: 44px !important;

    pointer-events: auto !important;
  }

  #pmd-reservations2
    > #pmd-r2-reservation-cards-v320
    > #pmd-r2-reservation-grid-v320 {
    display: grid !important;
    visibility: visible !important;
    opacity: 1 !important;

    width: 100% !important;
    height: auto !important;
    min-height: 1px !important;
    max-height: none !important;

    overflow: visible !important;
    pointer-events: auto !important;
  }

  #pmd-reservations2.is-calendar-mode
    > #pmd-r2-reservation-cards-v320,

  #pmd-reservations2.pmd-r2-hour-layout-v38-active
    > #pmd-r2-reservation-cards-v320 {
    margin-top: 18px !important;
  }
</style>

<script id="pmd-cards-all-views-v12-script">
(function () {
  'use strict';

  var VERSION =
    '1.2.0';

  var clickTimers = [];

  if (
    window.PMDSelectedDateCardsV12 &&
    typeof window.PMDSelectedDateCardsV12.destroy ===
      'function'
  ) {
    window.PMDSelectedDateCardsV12.destroy();
  }

  if (
    window.PMDCardsAllViewsV11 &&
    typeof window.PMDCardsAllViewsV11.destroy ===
      'function'
  ) {
    window.PMDCardsAllViewsV11.destroy();
  }

  function root() {
    return document.getElementById(
      'pmd-reservations2'
    );
  }

  function calendar() {
    return document.getElementById(
      'pmd-r2-calendar-surface-v160'
    );
  }

  function cards() {
    return document.getElementById(
      'pmd-r2-reservation-cards-v320'
    );
  }

  function head() {
    var section = cards();

    return section
      ? section.querySelector(
          ':scope > ' +
          '.pmd-r2-reservation-cards-v320__head'
        )
      : null;
  }

  function grid() {
    return document.getElementById(
      'pmd-r2-reservation-grid-v320'
    );
  }

  function reservationCards() {
    var sectionGrid =
      grid();

    return sectionGrid
      ? Array.prototype.slice.call(
          sectionGrid.querySelectorAll(
            ':scope > ' +
            'article[data-r2-reservation-id]'
          )
        )
      : [];
  }

  function addCard() {
    var sectionGrid =
      grid();

    return sectionGrid
      ? sectionGrid.querySelector(
          ':scope > ' +
          'article[data-r2-add-reservation]'
        )
      : null;
  }

  var monthMap = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
  };

  function normalizeDate(value) {
    if (!value) {
      return null;
    }

    var clean =
      String(value)
        .replace(/\s+/g, ' ')
        .trim();

    var iso =
      clean.match(
        /(\d{4})-(\d{2})-(\d{2})/
      );

    if (iso) {
      return (
        iso[1] +
        '-' +
        iso[2] +
        '-' +
        iso[3]
      );
    }

    var english =
      clean.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})/i
      );

    if (!english) {
      return null;
    }

    var month =
      monthMap[
        english[1].toLowerCase()
      ];

    return [
      english[3],
      String(month).padStart(
        2,
        '0'
      ),
      String(
        Number(english[2])
      ).padStart(
        2,
        '0'
      )
    ].join('-');
  }

  function storedDate() {
    var rootElement =
      root();

    var section =
      cards();

    return normalizeDate(
      (
        rootElement &&
        rootElement.dataset
          .pmdSelectedDate
      ) ||
      (
        section &&
        section.dataset
          .pmdSelectedDate
      ) ||
      ''
    );
  }

  function storeDate(date) {
    var normalized =
      normalizeDate(date);

    if (!normalized) {
      return false;
    }

    var rootElement =
      root();

    var section =
      cards();

    if (rootElement) {
      rootElement.dataset
        .pmdSelectedDate =
        normalized;
    }

    if (section) {
      section.dataset
        .pmdSelectedDate =
        normalized;
    }

    return normalized;
  }

  function currentView() {
    if (
      window.PMDThreeViewCycleV1 &&
      typeof window.PMDThreeViewCycleV1.currentView ===
        'function'
    ) {
      return window
        .PMDThreeViewCycleV1
        .currentView();
    }

    var rootElement =
      root();

    if (
      rootElement &&
      rootElement.classList.contains(
        'pmd-r2-hour-layout-v38-active'
      )
    ) {
      return 'hour';
    }

    if (
      rootElement &&
      rootElement.classList.contains(
        'is-calendar-mode'
      )
    ) {
      return 'calendar';
    }

    return 'floor';
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat(
      document.documentElement.lang ||
        'de',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    ).format(
      new Date(
        date + 'T12:00:00'
      )
    );
  }

  function revealElement(
    element,
    displayValue
  ) {
    if (!element) {
      return false;
    }

    element.hidden = false;

    element.style.setProperty(
      'display',
      displayValue,
      'important'
    );

    element.style.setProperty(
      'visibility',
      'visible',
      'important'
    );

    element.style.setProperty(
      'opacity',
      '1',
      'important'
    );

    element.style.setProperty(
      'height',
      'auto',
      'important'
    );

    element.style.setProperty(
      'max-height',
      'none',
      'important'
    );

    element.style.setProperty(
      'pointer-events',
      'auto',
      'important'
    );

    return true;
  }

  function revealStructure() {
    var section =
      cards();

    var sectionHead =
      head();

    var sectionGrid =
      grid();

    if (
      !section ||
      !sectionHead ||
      !sectionGrid
    ) {
      return false;
    }

    revealElement(
      section,
      'block'
    );

    revealElement(
      sectionHead,
      'flex'
    );

    revealElement(
      sectionGrid,
      'grid'
    );

    section.style.setProperty(
      'width',
      '100%',
      'important'
    );

    sectionGrid.style.setProperty(
      'width',
      '100%',
      'important'
    );

    return true;
  }

  function cardDate(card) {
    var dateArea =
      card.querySelector(
        '.pmd-r2-booking-date-v457'
      );

    return normalizeDate(
      (
        dateArea &&
        dateArea.textContent
      ) ||
      card.textContent ||
      ''
    );
  }

  function showAllCards(
    reason
  ) {
    revealStructure();

    var items =
      reservationCards();

    items.forEach(
      function (card) {
        card.style.removeProperty(
          'display'
        );

        card.style.removeProperty(
          'visibility'
        );

        card.style.removeProperty(
          'opacity'
        );

        delete card.dataset
          .pmdCardDate;
      }
    );

    var add =
      addCard();

    if (add) {
      revealElement(
        add,
        'flex'
      );
    }

    updateHeader(
      null,
      items.length
    );

    console.info(
      '[PMD Selected Date Cards V1.2] Show all:',
      reason,
      {
        view: currentView(),
        cards: items.length
      }
    );

    return true;
  }

  function updateHeader(
    selectedDate,
    count
  ) {
    var sectionHead =
      head();

    if (!sectionHead) {
      return;
    }

    var title =
      sectionHead.querySelector(
        'strong'
      );

    var subtitle =
      sectionHead.querySelector(
        'span'
      );

    if (title) {
      title.textContent =
        selectedDate
          ? 'Reservations'
          : 'All reservations';
    }

    if (subtitle) {
      subtitle.textContent =
        selectedDate
          ? (
              formatDate(
                selectedDate
              ) +
              ' · ' +
              count +
              (
                count === 1
                  ? ' reservation'
                  : ' reservations'
              )
            )
          : (
              'All dates · ' +
              count +
              ' reservations'
            );
    }
  }

  function filterSelectedDate(
    reason
  ) {
    revealStructure();

    var selectedDate =
      storedDate();

    if (!selectedDate) {
      return showAllCards(
        reason + '-no-date'
      );
    }

    var items =
      reservationCards();

    var visibleCount = 0;
    var parsedCount = 0;

    items.forEach(
      function (card) {
        var date =
          cardDate(card);

        var matches =
          date === selectedDate;

        card.dataset
          .pmdCardDate =
          date || '';

        if (date) {
          parsedCount += 1;
        }

        card.style.setProperty(
          'display',
          matches
            ? 'block'
            : 'none',
          'important'
        );

        card.style.setProperty(
          'visibility',
          matches
            ? 'visible'
            : 'hidden',
          'important'
        );

        card.style.setProperty(
          'opacity',
          matches
            ? '1'
            : '0',
          'important'
        );

        if (matches) {
          visibleCount += 1;
        }
      }
    );

    var add =
      addCard();

    if (add) {
      revealElement(
        add,
        'flex'
      );
    }

    updateHeader(
      selectedDate,
      visibleCount
    );

    console.info(
      '[PMD Selected Date Cards V1.2] Filtered:',
      reason,
      {
        selectedDate:
          selectedDate,
        view:
          currentView(),
        totalCards:
          items.length,
        parsedCards:
          parsedCount,
        visibleCards:
          visibleCount
      }
    );

    return true;
  }

  function syncForView(
    view,
    reason
  ) {
    var targetView =
      view ||
      currentView();

    if (
      targetView === 'calendar' ||
      targetView === 'hour'
    ) {
      return filterSelectedDate(
        reason ||
        'sync-selected'
      );
    }

    return showAllCards(
      reason ||
      'sync-floor'
    );
  }

  function select(
    date,
    applyNow
  ) {
    var normalized =
      storeDate(date);

    if (!normalized) {
      return false;
    }

    if (applyNow === false) {
      return normalized;
    }

    return syncForView(
      currentView(),
      'select-date'
    );
  }

  function clearTimers() {
    clickTimers.forEach(
      function (timer) {
        window.clearTimeout(
          timer
        );
      }
    );

    clickTimers = [];
  }

  function delayedSync(
    reason
  ) {
    clearTimers();

    [80, 260, 650].forEach(
      function (delay) {
        clickTimers.push(
          window.setTimeout(
            function () {
              syncForView(
                currentView(),
                reason +
                  '-' +
                  delay
              );
            },
            delay
          )
        );
      }
    );
  }

  function handleClick(event) {
    var target =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '[data-r2-yc-date],' +
            '[data-r2-yc-clear-selection]'
          )
        : null;

    if (!target) {
      return;
    }

    if (
      target.matches(
        '[data-r2-yc-date]'
      )
    ) {
      var date =
        target.getAttribute(
          'data-r2-yc-date'
        );

      if (date) {
        storeDate(date);
      }

      delayedSync(
        'calendar-date-click'
      );

      return;
    }

    delayedSync(
      'calendar-clear-selection'
    );
  }

  function apply(
    reason
  ) {
    revealStructure();

    return syncForView(
      currentView(),
      reason || 'manual'
    );
  }

  function audit() {
    var items =
      reservationCards();

    var visible =
      items.filter(
        function (card) {
          var style =
            getComputedStyle(card);

          return (
            style.display !==
              'none' &&
            style.visibility !==
              'hidden' &&
            Number(
              style.opacity
            ) > 0
          );
        }
      );

    return {
      version: VERSION,
      currentView:
        currentView(),
      selectedDate:
        storedDate(),
      totalCards:
        items.length,
      visibleCards:
        visible.length,
      visibleIds:
        visible.map(
          function (card) {
            return card.getAttribute(
              'data-r2-reservation-id'
            );
          }
        ),
      permanentInterval:
        false,
      mutationObserver:
        false
    };
  }

  function boot() {
    revealStructure();

    document.addEventListener(
      'click',
      handleClick,
      true
    );

    [250, 700, 1400].forEach(
      function (delay) {
        window.setTimeout(
          function () {
            apply(
              'initial-' +
              delay
            );
          },
          delay
        );
      }
    );

    console.info(
      '[PMD Selected Date Cards V1.2] Ready.',
      audit()
    );
  }

  function destroy() {
    clearTimers();

    document.removeEventListener(
      'click',
      handleClick,
      true
    );

    delete window
      .PMDSelectedDateCardsV12;

    delete window
      .PMDCardsAllViewsV11;
  }

  window.PMDSelectedDateCardsV12 = {
    version: VERSION,
    apply: function () {
      return apply(
        'manual'
      );
    },
    select: select,
    syncForView:
      syncForView,
    showAll:
      showAllCards,
    filter:
      filterSelectedDate,
    audit: audit,
    destroy: destroy
  };

  /*
   * Compatibility for previous runtime callers.
   */
  window.PMDCardsAllViewsV11 = {
    version: VERSION,
    apply: function () {
      return apply(
        'compatibility'
      );
    },
    audit: audit,
    destroy: destroy
  };

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
})();
</script>
<!-- PMD_CARDS_ALL_VIEWS_V11_END -->

<!-- PMD_SELECTED_DATE_BUTTON_SYNC_V1 -->
<script id="pmd-selected-date-button-sync-v1-script">
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var timers = [];
  var wrapped = false;
  var originalMethods = {};

  if (
    window.PMDSelectedDateButtonSyncV1 &&
    typeof window.PMDSelectedDateButtonSyncV1.destroy ===
      'function'
  ) {
    window.PMDSelectedDateButtonSyncV1.destroy();
  }

  function root() {
    return document.getElementById(
      'pmd-reservations2'
    );
  }

  function cards() {
    return document.getElementById(
      'pmd-r2-reservation-cards-v320'
    );
  }

  function button() {
    return document.getElementById(
      'pmd-r2-date-button-v430'
    );
  }

  function selectedCardsApi() {
    return (
      window.PMDSelectedDateCardsV12 ||
      null
    );
  }

  function currentView() {
    if (
      window.PMDThreeViewCycleV1 &&
      typeof window.PMDThreeViewCycleV1.currentView ===
        'function'
    ) {
      return window
        .PMDThreeViewCycleV1
        .currentView();
    }

    var page = root();

    if (
      page &&
      page.classList.contains(
        'pmd-r2-hour-layout-v38-active'
      )
    ) {
      return 'hour';
    }

    if (
      page &&
      page.classList.contains(
        'is-calendar-mode'
      )
    ) {
      return 'calendar';
    }

    return 'floor';
  }

  function selectedDate() {
    var page = root();
    var section = cards();

    var api = selectedCardsApi();
    var audit =
      api &&
      typeof api.audit === 'function'
        ? api.audit()
        : null;

    return (
      (
        audit &&
        audit.selectedDate
      ) ||
      (
        page &&
        page.dataset.pmdSelectedDate
      ) ||
      (
        section &&
        section.dataset.pmdSelectedDate
      ) ||
      ''
    );
  }

  function validIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
      String(value || '')
    );
  }

  function formatDate(value) {
    if (!validIsoDate(value)) {
      return null;
    }

    var parsed = new Date(
      value + 'T12:00:00'
    );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return new Intl.DateTimeFormat(
      document.documentElement.lang ||
        'de',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    ).format(parsed);
  }

  function update(reason) {
    var dateButton = button();

    if (!dateButton) {
      return false;
    }

    var label =
      dateButton.querySelector('span');

    var view = currentView();
    var date = selectedDate();

    var shouldShowDate =
      (
        view === 'calendar' ||
        view === 'hour'
      ) &&
      validIsoDate(date);

    var text =
      shouldShowDate
        ? formatDate(date)
        : 'All dates';

    if (!text) {
      text = 'All dates';
    }

    if (label) {
      label.textContent = text;
    }

    dateButton.setAttribute(
      'aria-label',
      shouldShowDate
        ? (
            'Reservation date: ' +
            text
          )
        : 'Reservation date range'
    );

    dateButton.dataset
      .pmdDisplayedDate =
      shouldShowDate
        ? date
        : '';

    console.info(
      '[PMD Date Button Sync V1] Updated:',
      reason,
      {
        view: view,
        selectedDate:
          date || null,
        buttonText: text
      }
    );

    return true;
  }

  function clearTimers() {
    timers.forEach(
      function (timer) {
        window.clearTimeout(timer);
      }
    );

    timers = [];
  }

  function schedule(reason) {
    clearTimers();

    [0, 100, 320, 700].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              update(
                reason + '-' + delay
              );
            },
            delay
          )
        );
      }
    );
  }

  function handleDateClick(event) {
    var cell =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '[data-r2-yc-date]'
          )
        : null;

    if (!cell) {
      return;
    }

    schedule(
      'calendar-date-click'
    );
  }

  function wrapApi() {
    var api = selectedCardsApi();

    if (!api || wrapped) {
      return false;
    }

    [
      'apply',
      'select',
      'syncForView',
      'showAll',
      'filter'
    ].forEach(
      function (methodName) {
        if (
          typeof api[methodName] !==
          'function'
        ) {
          return;
        }

        originalMethods[methodName] =
          api[methodName];

        api[methodName] =
          function () {
            var result =
              originalMethods[
                methodName
              ].apply(
                api,
                arguments
              );

            schedule(
              'api-' + methodName
            );

            return result;
          };
      }
    );

    wrapped = true;

    return true;
  }

  function audit() {
    var dateButton = button();

    return {
      version: VERSION,
      currentView:
        currentView(),
      selectedDate:
        selectedDate() || null,
      button:
        Boolean(dateButton),
      buttonText:
        dateButton
          ? (
              dateButton
                .querySelector('span')
                ?.textContent
                ?.trim() || ''
            )
          : null,
      displayedDate:
        dateButton
          ? (
              dateButton.dataset
                .pmdDisplayedDate ||
              null
            )
          : null,
      apiWrapped:
        wrapped,
      mutationObserver:
        false,
      permanentInterval:
        false
    };
  }

  function boot() {
    wrapApi();

    document.addEventListener(
      'click',
      handleDateClick,
      true
    );

    [250, 700, 1400].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              wrapApi();
              update(
                'initial-' + delay
              );
            },
            delay
          )
        );
      }
    );

    console.info(
      '[PMD Date Button Sync V1] Ready.',
      audit()
    );
  }

  function destroy() {
    clearTimers();

    document.removeEventListener(
      'click',
      handleDateClick,
      true
    );

    var api = selectedCardsApi();

    if (api && wrapped) {
      Object.keys(
        originalMethods
      ).forEach(
        function (methodName) {
          api[methodName] =
            originalMethods[
              methodName
            ];
        }
      );
    }

    wrapped = false;
    originalMethods = {};

    delete window
      .PMDSelectedDateButtonSyncV1;
  }

  window.PMDSelectedDateButtonSyncV1 = {
    version: VERSION,
    update: function () {
      return update('manual');
    },
    audit: audit,
    destroy: destroy
  };

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
})();
</script>
<!-- PMD_SELECTED_DATE_BUTTON_SYNC_V1_END -->

<!-- PMD_DATE_BUTTON_LABEL_AUTHORITY_V2 -->
<style id="pmd-date-button-label-authority-v2-style">
  /*
   * Native toolbar scripts may rewrite the original span to
   * "All dates". Keep it in the DOM but use our stable label.
   */
  #pmd-r2-date-button-v430[data-pmd-date-label]
    > span {
    display: none !important;
  }

  #pmd-r2-date-button-v430[data-pmd-date-label]::after {
    content: attr(data-pmd-date-label);
    display: inline-block;
    white-space: nowrap;
  }
</style>

<script id="pmd-date-button-label-authority-v2-script">
(function () {
  'use strict';

  var VERSION = '2.0.0';
  var timers = [];

  if (
    window.PMDDateButtonLabelAuthorityV2 &&
    typeof window.PMDDateButtonLabelAuthorityV2.destroy ===
      'function'
  ) {
    window.PMDDateButtonLabelAuthorityV2.destroy();
  }

  function root() {
    return document.getElementById(
      'pmd-reservations2'
    );
  }

  function cards() {
    return document.getElementById(
      'pmd-r2-reservation-cards-v320'
    );
  }

  function button() {
    return document.getElementById(
      'pmd-r2-date-button-v430'
    );
  }

  function currentView() {
    if (
      window.PMDThreeViewCycleV1 &&
      typeof window.PMDThreeViewCycleV1.currentView ===
        'function'
    ) {
      return window
        .PMDThreeViewCycleV1
        .currentView();
    }

    var page = root();

    if (
      page &&
      page.classList.contains(
        'pmd-r2-hour-layout-v38-active'
      )
    ) {
      return 'hour';
    }

    if (
      page &&
      page.classList.contains(
        'is-calendar-mode'
      )
    ) {
      return 'calendar';
    }

    return 'floor';
  }

  function selectedDate() {
    var page = root();
    var section = cards();

    var api =
      window.PMDSelectedDateCardsV12;

    var audit =
      api &&
      typeof api.audit === 'function'
        ? api.audit()
        : null;

    return (
      (
        audit &&
        audit.selectedDate
      ) ||
      (
        page &&
        page.dataset.pmdSelectedDate
      ) ||
      (
        section &&
        section.dataset.pmdSelectedDate
      ) ||
      ''
    );
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
      String(value || '')
    );
  }

  function formatDate(value) {
    if (!validDate(value)) {
      return null;
    }

    var parsed =
      new Date(
        value + 'T12:00:00'
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return new Intl.DateTimeFormat(
      document.documentElement.lang ||
        'de',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    ).format(parsed);
  }

  function apply(reason) {
    var dateButton = button();

    if (!dateButton) {
      return false;
    }

    var view = currentView();
    var date = selectedDate();

    var showSelectedDate =
      (
        view === 'calendar' ||
        view === 'hour'
      ) &&
      validDate(date);

    var label =
      showSelectedDate
        ? formatDate(date)
        : 'All dates';

    if (!label) {
      label = 'All dates';
    }

    dateButton.dataset
      .pmdDateLabel =
      label;

    dateButton.dataset
      .pmdDisplayedDate =
      showSelectedDate
        ? date
        : '';

    dateButton.setAttribute(
      'aria-label',
      showSelectedDate
        ? (
            'Reservation date: ' +
            label
          )
        : 'Reservation date range'
    );

    console.info(
      '[PMD Date Button Label Authority V2] Applied:',
      reason,
      {
        view: view,
        selectedDate:
          date || null,
        displayedLabel:
          label
      }
    );

    return true;
  }

  function clearTimers() {
    timers.forEach(
      function (timer) {
        window.clearTimeout(timer);
      }
    );

    timers = [];
  }

  function schedule(reason) {
    clearTimers();

    [0, 120, 360, 800].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              apply(
                reason +
                '-' +
                delay
              );
            },
            delay
          )
        );
      }
    );
  }

  function handleClick(event) {
    var target =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#pmd-r2-calendar-toggle-v1,' +
            '[data-r2-yc-date],' +
            '[data-r2-yc-clear-selection]'
          )
        : null;

    if (!target) {
      return;
    }

    schedule('relevant-click');
  }

  function audit() {
    var dateButton = button();

    return {
      version: VERSION,
      currentView:
        currentView(),
      selectedDate:
        selectedDate() || null,
      button:
        Boolean(dateButton),
      nativeSpanText:
        dateButton
          ? (
              dateButton
                .querySelector('span')
                ?.textContent
                ?.trim() || ''
            )
          : null,
      displayedLabel:
        dateButton
          ? (
              dateButton.dataset
                .pmdDateLabel ||
              null
            )
          : null,
      displayedDate:
        dateButton
          ? (
              dateButton.dataset
                .pmdDisplayedDate ||
              null
            )
          : null,
      mutationObserver:
        false,
      permanentInterval:
        false
    };
  }

  function boot() {
    document.addEventListener(
      'click',
      handleClick,
      true
    );

    [250, 700, 1400].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              apply(
                'initial-' +
                delay
              );
            },
            delay
          )
        );
      }
    );

    console.info(
      '[PMD Date Button Label Authority V2] Ready.',
      audit()
    );
  }

  function destroy() {
    clearTimers();

    document.removeEventListener(
      'click',
      handleClick,
      true
    );

    var dateButton = button();

    if (dateButton) {
      delete dateButton.dataset
        .pmdDateLabel;

      delete dateButton.dataset
        .pmdDisplayedDate;
    }

    delete window
      .PMDDateButtonLabelAuthorityV2;
  }

  window.PMDDateButtonLabelAuthorityV2 = {
    version: VERSION,
    apply: function () {
      return apply('manual');
    },
    audit: audit,
    destroy: destroy
  };

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
})();
</script>
<!-- PMD_DATE_BUTTON_LABEL_AUTHORITY_V2_END -->

<!-- PMD_REAL_HOUR_TIMELINE_V1 -->
<script id="pmd-real-hour-timeline-v1-script">
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var timers = [];

  if (
    window.PMDRealHourTimelineV1 &&
    typeof window.PMDRealHourTimelineV1.destroy ===
      'function'
  ) {
    window.PMDRealHourTimelineV1.destroy();
  }

  function root() {
    return document.getElementById(
      'pmd-reservations2'
    );
  }

  function calendar() {
    return document.getElementById(
      'pmd-r2-calendar-surface-v160'
    );
  }

  function timeline() {
    var calendarRoot = calendar();

    return calendarRoot
      ? calendarRoot.querySelector(
          '.pmd-r2-day-board__timeline'
        )
      : null;
  }

  function grid() {
    return document.getElementById(
      'pmd-r2-reservation-grid-v320'
    );
  }

  function currentView() {
    if (
      window.PMDThreeViewCycleV1 &&
      typeof window.PMDThreeViewCycleV1.currentView ===
        'function'
    ) {
      return window
        .PMDThreeViewCycleV1
        .currentView();
    }

    return 'floor';
  }

  function selectedDate() {
    var page = root();

    var cardsApi =
      window.PMDSelectedDateCardsV12;

    var cardsAudit =
      cardsApi &&
      typeof cardsApi.audit === 'function'
        ? cardsApi.audit()
        : null;

    return (
      (
        cardsAudit &&
        cardsAudit.selectedDate
      ) ||
      (
        page &&
        page.dataset.pmdSelectedDate
      ) ||
      ''
    );
  }

  function clean(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function visibleCards() {
    var cardGrid = grid();

    if (!cardGrid) {
      return [];
    }

    return Array.prototype.slice
      .call(
        cardGrid.querySelectorAll(
          ':scope > ' +
          'article[data-r2-reservation-id]'
        )
      )
      .filter(function (card) {
        var style =
          getComputedStyle(card);

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0
        );
      });
  }

  function extractTime(text) {
    var cleanText = clean(text);

    var twelveHour =
      cleanText.match(
        /(\d{1,2}):(\d{2})\s*(AM|PM)/i
      );

    if (twelveHour) {
      var hour =
        Number(twelveHour[1]);

      var minute =
        twelveHour[2];

      var period =
        twelveHour[3]
          .toUpperCase();

      if (
        period === 'AM' &&
        hour === 12
      ) {
        hour = 0;
      }

      if (
        period === 'PM' &&
        hour !== 12
      ) {
        hour += 12;
      }

      return (
        String(hour).padStart(
          2,
          '0'
        ) +
        ':' +
        minute
      );
    }

    var twentyFourHour =
      cleanText.match(
        /(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/
      );

    if (!twentyFourHour) {
      return null;
    }

    return (
      String(
        Number(twentyFourHour[1])
      ).padStart(
        2,
        '0'
      ) +
      ':' +
      twentyFourHour[2]
    );
  }

  function extractName(card, id) {
    var selectors = [
      'h2',
      'h3',
      '.pmd-r2-reservation-card__name',
      '.pmd-r2-booking-name',
      '[data-r2-customer-name]',
      'strong'
    ];

    for (
      var index = 0;
      index < selectors.length;
      index += 1
    ) {
      var element =
        card.querySelector(
          selectors[index]
        );

      var value =
        clean(
          element &&
          element.textContent
        );

      if (value) {
        return value;
      }
    }

    return (
      'Reservation ' +
      String(id || '')
    );
  }

  function extractNumber(
    text,
    patterns
  ) {
    for (
      var index = 0;
      index < patterns.length;
      index += 1
    ) {
      var match =
        text.match(
          patterns[index]
        );

      if (
        match &&
        match[1]
      ) {
        return match[1];
      }
    }

    return '—';
  }

  function reservationFromCard(card) {
    var id =
      card.getAttribute(
        'data-r2-reservation-id'
      );

    var text =
      clean(card.textContent);

    var time =
      extractTime(text);

    if (!time) {
      return null;
    }

    return {
      id: id,

      time: time,

      name:
        extractName(
          card,
          id
        ),

      table:
        card.getAttribute(
          'data-table'
        ) ||
        card.getAttribute(
          'data-table-id'
        ) ||
        extractNumber(
          text,
          [
            /(?:Table|Tisch)\s*#?\s*(\d+)/i
          ]
        ),

      guests:
        card.getAttribute(
          'data-guests'
        ) ||
        extractNumber(
          text,
          [
            /(\d+)\s*(?:guests?|Gäste|Personen)/i,
            /(?:guests?|Gäste|Personen)\s*:?\s*(\d+)/i
          ]
        ),

      status:
        card.getAttribute(
          'data-status'
        ) ||
        'Scheduled'
    };
  }

  function reservations() {
    return visibleCards()
      .map(
        reservationFromCard
      )
      .filter(Boolean);
  }

  function groupByTime(items) {
    return items.reduce(
      function (
        result,
        reservation
      ) {
        if (
          !result[
            reservation.time
          ]
        ) {
          result[
            reservation.time
          ] = [];
        }

        result[
          reservation.time
        ].push(
          reservation
        );

        return result;
      },
      {}
    );
  }

  function createEmptyState() {
    var empty =
      document.createElement(
        'div'
      );

    empty.className =
      'pmd-r2-timeslot__free';

    var dot =
      document.createElement('i');

    var text =
      document.createElement(
        'span'
      );

    text.textContent =
      'No reservations';

    empty.appendChild(dot);
    empty.appendChild(text);

    return empty;
  }

  function createBooking(
    reservation
  ) {
    var article =
      document.createElement(
        'article'
      );

    article.className =
      'pmd-r2-slot-booking is-confirmed';

    article.setAttribute(
      'data-r2-reservation-id',
      reservation.id
    );

    var main =
      document.createElement(
        'div'
      );

    main.className =
      'pmd-r2-slot-booking__main';

    var name =
      document.createElement(
        'strong'
      );

    name.textContent =
      reservation.name;

    var meta =
      document.createElement(
        'span'
      );

    meta.textContent =
      'Tisch ' +
      reservation.table +
      ' · ' +
      reservation.guests +
      ' guests';

    main.appendChild(name);
    main.appendChild(meta);

    var status =
      document.createElement(
        'div'
      );

    status.className =
      'pmd-r2-slot-booking__status';

    var statusText =
      document.createElement(
        'span'
      );

    statusText.textContent =
      reservation.status;

    var link =
      document.createElement('a');

    link.href =
      '/admin/reservations/edit/' +
      encodeURIComponent(
        reservation.id
      );

    link.textContent =
      'Geöffnet';

    status.appendChild(
      statusText
    );

    status.appendChild(
      link
    );

    article.appendChild(main);
    article.appendChild(status);

    return article;
  }

  function render(reason) {
    if (
      currentView() !== 'hour'
    ) {
      return false;
    }

    var timelineRoot =
      timeline();

    var date =
      selectedDate();

    if (
      !timelineRoot ||
      !date
    ) {
      return false;
    }

    var items =
      reservations();

    var grouped =
      groupByTime(items);

    var slots =
      Array.prototype.slice.call(
        timelineRoot.querySelectorAll(
          '.pmd-r2-timeslot' +
          '[data-r2-create-time]'
        )
      );

    slots.forEach(
      function (slot) {
        var time =
          slot.getAttribute(
            'data-r2-create-time'
          );

        var bookings =
          grouped[time] || [];

        var content =
          slot.querySelector(
            '.pmd-r2-timeslot__content'
          );

        var count =
          slot.querySelector(
            '.pmd-r2-timeslot__time span'
          );

        if (!content) {
          return;
        }

        var createButton =
          content.querySelector(
            '[data-r2-create-button]'
          );

        Array.prototype.slice
          .call(
            content.querySelectorAll(
              '.pmd-r2-slot-booking,' +
              '.pmd-r2-timeslot__free'
            )
          )
          .forEach(
            function (element) {
              element.remove();
            }
          );

        slot.setAttribute(
          'data-r2-create-date',
          date
        );

        if (!bookings.length) {
          slot.classList.remove(
            'has-bookings'
          );

          slot.classList.add(
            'is-empty'
          );

          if (count) {
            count.textContent =
              'Verfügbar';
          }

          content.insertBefore(
            createEmptyState(),
            createButton || null
          );

          return;
        }

        slot.classList.remove(
          'is-empty'
        );

        slot.classList.add(
          'has-bookings'
        );

        if (count) {
          count.textContent =
            String(
              bookings.length
            ) +
            (
              bookings.length === 1
                ? ' Reservierung'
                : ' Reservierungen'
            );
        }

        bookings.forEach(
          function (
            reservation
          ) {
            content.insertBefore(
              createBooking(
                reservation
              ),
              createButton || null
            );
          }
        );
      }
    );

    var rendered =
      timelineRoot.querySelectorAll(
        '.pmd-r2-slot-booking' +
        '[data-r2-reservation-id]'
      ).length;

    console.info(
      '[PMD Real Hour Timeline V1] Rendered:',
      reason,
      {
        selectedDate:
          date,
        parsedReservations:
          items.length,
        renderedReservations:
          rendered
      }
    );

    return {
      selectedDate: date,
      parsedReservations:
        items.length,
      renderedReservations:
        rendered
    };
  }

  function clearTimers() {
    timers.forEach(
      function (timer) {
        window.clearTimeout(
          timer
        );
      }
    );

    timers = [];
  }

  function schedule(reason) {
    clearTimers();

    window.requestAnimationFrame(
      function () {
        render(
          reason + '-frame'
        );
      }
    );

    [60, 180].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              render(
                reason +
                '-' +
                delay
              );
            },
            delay
          )
        );
      }
    );
  }

  function handleClick(event) {
    var target =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#pmd-r2-calendar-toggle-v1,' +
            '[data-r2-yc-date]'
          )
        : null;

    if (!target) {
      return;
    }

    schedule(
      target.matches(
        '[data-r2-yc-date]'
      )
        ? 'date-click'
        : 'view-click'
    );
  }

  function audit() {
    var timelineRoot =
      timeline();

    return {
      version: VERSION,
      currentView:
        currentView(),
      selectedDate:
        selectedDate() || null,
      visibleCards:
        visibleCards().length,
      parsedReservations:
        reservations().length,
      renderedReservations:
        timelineRoot
          ? timelineRoot.querySelectorAll(
              '.pmd-r2-slot-booking' +
              '[data-r2-reservation-id]'
            ).length
          : 0,
      mutationObserver:
        false,
      permanentInterval:
        false
    };
  }

  function boot() {
    document.addEventListener(
      'click',
      handleClick,
      true
    );

    console.info(
      '[PMD Real Hour Timeline V1] Ready.',
      audit()
    );
  }

  function destroy() {
    clearTimers();

    document.removeEventListener(
      'click',
      handleClick,
      true
    );

    delete window
      .PMDRealHourTimelineV1;
  }

  window.PMDRealHourTimelineV1 = {
    version: VERSION,
    render: function () {
      return render('manual');
    },
    audit: audit,
    destroy: destroy
  };

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
})();
</script>
<!-- PMD_REAL_HOUR_TIMELINE_V1_END -->

<!-- PMD_HOUR_ENTRY_AUTHORITY_V11 -->
<script id="pmd-hour-entry-authority-v11-script">
(function () {
  'use strict';

  var VERSION = '1.1.0';

  var frameId = null;
  var timers = [];
  var runToken = 0;

  if (
    window.PMDHourEntryAuthorityV11 &&
    typeof window.PMDHourEntryAuthorityV11.destroy ===
      'function'
  ) {
    window.PMDHourEntryAuthorityV11.destroy();
  }

  function currentView() {
    if (
      window.PMDThreeViewCycleV1 &&
      typeof window.PMDThreeViewCycleV1.currentView ===
        'function'
    ) {
      return window
        .PMDThreeViewCycleV1
        .currentView();
    }

    return 'floor';
  }

  function root() {
    return document.getElementById(
      'pmd-reservations2'
    );
  }

  function timeline() {
    return document.querySelector(
      '#pmd-r2-calendar-surface-v160 ' +
      '.pmd-r2-day-board__timeline'
    );
  }

  function selectedDate() {
    var page = root();

    var audit =
      window.PMDSelectedDateCardsV12 &&
      typeof window.PMDSelectedDateCardsV12.audit ===
        'function'
        ? window.PMDSelectedDateCardsV12.audit()
        : null;

    return (
      (
        audit &&
        audit.selectedDate
      ) ||
      (
        page &&
        page.dataset.pmdSelectedDate
      ) ||
      ''
    );
  }

  function visibleCardCount() {
    return Array.prototype.slice
      .call(
        document.querySelectorAll(
          '#pmd-r2-reservation-grid-v320 ' +
          '> article[data-r2-reservation-id]'
        )
      )
      .filter(function (card) {
        var style =
          getComputedStyle(card);

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0
        );
      })
      .length;
  }

  function renderedBookingCount() {
    var hourTimeline =
      timeline();

    return hourTimeline
      ? hourTimeline.querySelectorAll(
          '.pmd-r2-slot-booking' +
          '[data-r2-reservation-id]'
        ).length
      : 0;
  }

  function clearWork() {
    if (frameId !== null) {
      window.cancelAnimationFrame(
        frameId
      );

      frameId = null;
    }

    timers.forEach(
      function (timer) {
        window.clearTimeout(timer);
      }
    );

    timers = [];
  }

  function restoreScroll(
    scrollX,
    scrollY
  ) {
    window.scrollTo({
      left: scrollX,
      top: scrollY,
      behavior: 'auto'
    });
  }

  function syncCards() {
    var api =
      window.PMDSelectedDateCardsV12;

    if (
      !api ||
      typeof api.syncForView !==
        'function'
    ) {
      return false;
    }

    return api.syncForView(
      'hour',
      'hour-entry-authority'
    );
  }

  function renderRealHour(
    reason
  ) {
    var api =
      window.PMDRealHourTimelineV1;

    if (
      !api ||
      typeof api.render !==
        'function'
    ) {
      return false;
    }

    return api.render(reason);
  }

  function finalize(
    token,
    scrollX,
    scrollY,
    reason
  ) {
    if (token !== runToken) {
      return false;
    }

    syncCards();

    window.requestAnimationFrame(
      function () {
        if (token !== runToken) {
          return;
        }

        var result =
          renderRealHour(reason);

        restoreScroll(
          scrollX,
          scrollY
        );

        var active =
          document.activeElement;

        if (
          active &&
          active.id ===
            'pmd-r2-calendar-toggle-v1'
        ) {
          active.blur();
        }

        console.info(
          '[PMD Hour Entry Authority V1.1] Finalized:',
          {
            reason: reason,
            selectedDate:
              selectedDate() || null,
            visibleCards:
              visibleCardCount(),
            renderedBookings:
              renderedBookingCount(),
            renderResult:
              result || null,
            scrollY:
              window.scrollY
          }
        );
      }
    );

    return true;
  }

  function start(
    scrollX,
    scrollY,
    reason
  ) {
    clearWork();

    runToken += 1;

    var token = runToken;
    var frame = 0;
    var maximumFrames = 36;

    function waitForHour() {
      if (token !== runToken) {
        return;
      }

      restoreScroll(
        scrollX,
        scrollY
      );

      var hourTimeline =
        timeline();

      var ready =
        currentView() === 'hour' &&
        Boolean(hourTimeline) &&
        hourTimeline.getBoundingClientRect()
          .height > 0 &&
        Boolean(selectedDate());

      if (ready) {
        finalize(
          token,
          scrollX,
          scrollY,
          reason + '-ready'
        );

        /*
         * Two bounded authority passes protect against the
         * legacy Hour renderer writing after the first pass.
         */
        [90, 220].forEach(
          function (delay) {
            timers.push(
              window.setTimeout(
                function () {
                  finalize(
                    token,
                    scrollX,
                    scrollY,
                    reason +
                      '-authority-' +
                      delay
                  );
                },
                delay
              )
            );
          }
        );

        frameId = null;
        return;
      }

      frame += 1;

      if (frame >= maximumFrames) {
        finalize(
          token,
          scrollX,
          scrollY,
          reason + '-bounded-fallback'
        );

        frameId = null;
        return;
      }

      frameId =
        window.requestAnimationFrame(
          waitForHour
        );
    }

    frameId =
      window.requestAnimationFrame(
        waitForHour
      );
  }

  function handleClick(event) {
    var button =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#pmd-r2-calendar-toggle-v1'
          )
        : null;

    if (!button) {
      return;
    }

    /*
     * Only Calendar -> Hour needs this authority.
     */
    if (
      currentView() !== 'calendar'
    ) {
      return;
    }

    var scrollX =
      window.scrollX;

    var scrollY =
      window.scrollY;

    start(
      scrollX,
      scrollY,
      'header-calendar-to-hour'
    );
  }

  function audit() {
    return {
      version: VERSION,
      currentView:
        currentView(),
      selectedDate:
        selectedDate() || null,
      visibleCards:
        visibleCardCount(),
      renderedBookings:
        renderedBookingCount(),
      activeFrame:
        frameId !== null,
      pendingTimers:
        timers.length,
      permanentInterval:
        false,
      mutationObserver:
        false
    };
  }

  function destroy() {
    clearWork();

    document.removeEventListener(
      'click',
      handleClick,
      true
    );

    delete window
      .PMDHourEntryAuthorityV11;
  }

  window.PMDHourEntryAuthorityV11 = {
    version: VERSION,
    run: function () {
      start(
        window.scrollX,
        window.scrollY,
        'manual'
      );

      return true;
    },
    audit: audit,
    destroy: destroy
  };

  document.addEventListener(
    'click',
    handleClick,
    true
  );

  console.info(
    '[PMD Hour Entry Authority V1.1] Ready.',
    audit()
  );
})();
</script>
<!-- PMD_HOUR_ENTRY_AUTHORITY_V11_END -->

<!-- PMD_CALENDAR_REAL_COUNTS_FLOATING_V1 -->
<style id="pmd-calendar-real-counts-floating-v1-style">
  /*
   * Calendar toolbar without a surrounding frame.
   */
  #pmd-r2-calendar-surface-v160 .pmd-yc__toolbar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 10px 14px !important;

    width: 100% !important;
    min-height: 0 !important;
    margin: 0 0 14px !important;
    padding: 0 !important;

    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  /*
   * The legend is redundant in this clean Calendar layout.
   */
  #pmd-r2-calendar-surface-v160 .pmd-yc__legend {
    display: none !important;
  }

  /*
   * Floating month/date navigation.
   */
  #pmd-r2-calendar-surface-v160 .pmd-yc__month-nav {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;

    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav > strong {
    min-width: 130px !important;
    margin: 0 !important;
    text-align: center !important;
    white-space: nowrap !important;
  }

  /*
   * Right-side buttons without a parent frame.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar-right {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: wrap !important;
    gap: 8px !important;

    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;

    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav > button,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch > button,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters > button,
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn {
    position: relative !important;
    float: none !important;
    inset: auto !important;
    margin: 0 !important;
  }

  /*
   * Reservation count created by the new real-count authority.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc-day__summary.is-reservation[
      data-pmd-real-reservation-count
    ] {
    white-space: nowrap !important;
  }

  @media (max-width: 900px) {
    #pmd-r2-calendar-surface-v160 .pmd-yc__toolbar {
      align-items: flex-start !important;
    }

    #pmd-r2-calendar-surface-v160
      .pmd-yc__toolbar-right {
      justify-content: flex-start !important;
    }
  }
</style>

<script id="pmd-calendar-real-counts-floating-v1-script">
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var TIME_ZONE = 'Europe/Berlin';

  var timers = [];
  var frameId = null;

  if (
    window.PMDCalendarRealCountsFloatingV1 &&
    typeof window.PMDCalendarRealCountsFloatingV1.destroy ===
      'function'
  ) {
    window.PMDCalendarRealCountsFloatingV1.destroy();
  }

  function calendarRoot() {
    return document.getElementById(
      'pmd-r2-calendar-surface-v160'
    );
  }

  function sourceReservations() {
    var boot =
      window.PMD_RESERVATIONS2_BOOT;

    if (
      !boot ||
      !Array.isArray(
        boot.reservations
      )
    ) {
      return [];
    }

    return boot.reservations;
  }

  function clean(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function validIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
      String(value || '')
    );
  }

  function localIsoDate(value) {
    if (!value) {
      return null;
    }

    var raw =
      String(value).trim();

    /*
     * Keep plain database dates unchanged.
     */
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ) {
      return raw;
    }

    var parsed =
      new Date(raw);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      var direct =
        raw.match(
          /^(\d{4})-(\d{2})-(\d{2})/
        );

      return direct
        ? (
            direct[1] +
            '-' +
            direct[2] +
            '-' +
            direct[3]
          )
        : null;
    }

    try {
      var parts =
        new Intl.DateTimeFormat(
          'en-GB',
          {
            timeZone: TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }
        ).formatToParts(parsed);

      var result = {};

      parts.forEach(
        function (part) {
          if (
            part.type === 'year' ||
            part.type === 'month' ||
            part.type === 'day'
          ) {
            result[part.type] =
              part.value;
          }
        }
      );

      if (
        result.year &&
        result.month &&
        result.day
      ) {
        return (
          result.year +
          '-' +
          result.month +
          '-' +
          result.day
        );
      }
    } catch (error) {
      /*
       * Fall through to the direct ISO part.
       */
    }

    var fallback =
      raw.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    return fallback
      ? (
          fallback[1] +
          '-' +
          fallback[2] +
          '-' +
          fallback[3]
        )
      : null;
  }

  function reservationDate(
    reservation
  ) {
    if (!reservation) {
      return null;
    }

    /*
     * reservation_datetime contains the real service date/time.
     * reserve_date is retained as a reliable fallback.
     */
    return (
      localIsoDate(
        reservation.reservation_datetime
      ) ||
      localIsoDate(
        reservation.reserve_date
      ) ||
      localIsoDate(
        reservation.date
      )
    );
  }

  function uniqueReservations() {
    var seen = {};

    return sourceReservations()
      .filter(
        function (reservation) {
          var id =
            reservation &&
            (
              reservation.reservation_id ||
              reservation.id
            );

          var key =
            id !== undefined &&
            id !== null
              ? String(id)
              : JSON.stringify(
                  reservation
                );

          if (seen[key]) {
            return false;
          }

          seen[key] = true;

          return true;
        }
      );
  }

  function countsByDate() {
    return uniqueReservations()
      .reduce(
        function (
          counts,
          reservation
        ) {
          var date =
            reservationDate(
              reservation
            );

          if (!validIsoDate(date)) {
            return counts;
          }

          counts[date] =
            (
              counts[date] ||
              0
            ) + 1;

          return counts;
        },
        {}
      );
  }

  function reservationLabel(count) {
    return (
      String(count) +
      (
        count === 1
          ? ' Reservierung'
          : ' Reservierungen'
      )
    );
  }

  function existingReservationSummary(
    cell
  ) {
    return cell.querySelector(
      '.pmd-yc-day__summary.is-reservation,' +
      '[data-r2-yc-reservation-count],' +
      '[data-pmd-real-reservation-count]'
    );
  }

  function summaryHolder(cell) {
    return (
      cell.querySelector(
        '.pmd-yc-day__summaries'
      ) ||
      cell.querySelector(
        '.pmd-yc-day__summary-list'
      ) ||
      cell.querySelector(
        '.pmd-yc-day__meta'
      ) ||
      cell.querySelector(
        '.pmd-yc-day__content'
      ) ||
      cell
    );
  }

  function ensureReservationSummary(
    cell,
    count
  ) {
    var summary =
      existingReservationSummary(
        cell
      );

    if (count <= 0) {
      if (summary) {
        summary.remove();
      }

      cell.dataset
        .pmdRealReservationCount =
        '0';

      return false;
    }

    if (!summary) {
      summary =
        document.createElement(
          'span'
        );

      summary.className =
        'pmd-yc-day__summary is-reservation';

      summaryHolder(cell)
        .appendChild(summary);
    }

    summary.classList.add(
      'pmd-yc-day__summary',
      'is-reservation'
    );

    summary.setAttribute(
      'data-pmd-real-reservation-count',
      String(count)
    );

    summary.textContent =
      reservationLabel(count);

    cell.dataset
      .pmdRealReservationCount =
      String(count);

    return true;
  }

  function apply(reason) {
    var calendar =
      calendarRoot();

    if (!calendar) {
      return false;
    }

    var counts =
      countsByDate();

    var cells =
      Array.prototype.slice.call(
        calendar.querySelectorAll(
          '[data-r2-yc-date]'
        )
      );

    var updated = 0;
    var cellsWithReservations = 0;

    cells.forEach(
      function (cell) {
        var date =
          cell.getAttribute(
            'data-r2-yc-date'
          );

        var count =
          counts[date] || 0;

        if (count > 0) {
          cellsWithReservations += 1;
        }

        var before =
          clean(
            existingReservationSummary(
              cell
            )?.textContent
          );

        ensureReservationSummary(
          cell,
          count
        );

        var after =
          clean(
            existingReservationSummary(
              cell
            )?.textContent
          );

        if (before !== after) {
          updated += 1;
        }
      }
    );

    console.info(
      '[PMD Calendar Real Counts + Floating V1] Applied:',
      reason,
      {
        sourceReservations:
          sourceReservations().length,
        uniqueReservations:
          uniqueReservations().length,
        calendarCells:
          cells.length,
        datesWithReservations:
          Object.keys(counts).length,
        visibleCellsWithReservations:
          cellsWithReservations,
        updatedCells:
          updated
      }
    );

    return {
      sourceReservations:
        sourceReservations().length,
      uniqueReservations:
        uniqueReservations().length,
      calendarCells:
        cells.length,
      datesWithReservations:
        Object.keys(counts).length,
      visibleCellsWithReservations:
        cellsWithReservations,
      updatedCells:
        updated
    };
  }

  function clearScheduledWork() {
    timers.forEach(
      function (timer) {
        window.clearTimeout(timer);
      }
    );

    timers = [];

    if (frameId !== null) {
      window.cancelAnimationFrame(
        frameId
      );

      frameId = null;
    }
  }

  function schedule(reason) {
    clearScheduledWork();

    frameId =
      window.requestAnimationFrame(
        function () {
          frameId = null;

          apply(
            reason + '-frame'
          );
        }
      );

    [60, 180, 420].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              apply(
                reason +
                '-' +
                delay
              );
            },
            delay
          )
        );
      }
    );
  }

  function relevantClick(event) {
    var target =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#pmd-r2-calendar-toggle-v1,' +
            '[data-r2-yc-prev],' +
            '[data-r2-yc-next],' +
            '[data-r2-yc-view],' +
            '[data-r2-yc-filter]'
          )
        : null;

    if (!target) {
      return;
    }

    schedule(
      'calendar-control-click'
    );
  }

  function visibleCellRows() {
    var calendar =
      calendarRoot();

    if (!calendar) {
      return [];
    }

    var counts =
      countsByDate();

    return Array.prototype.slice
      .call(
        calendar.querySelectorAll(
          '[data-r2-yc-date]'
        )
      )
      .map(
        function (cell) {
          var date =
            cell.getAttribute(
              'data-r2-yc-date'
            );

          var summary =
            existingReservationSummary(
              cell
            );

          return {
            date: date,
            realCount:
              counts[date] || 0,
            displayedText:
              clean(
                summary &&
                summary.textContent
              )
          };
        }
      )
      .filter(
        function (row) {
          return (
            row.realCount > 0 ||
            row.displayedText
          );
        }
      );
  }

  function audit() {
    var counts =
      countsByDate();

    var rows =
      visibleCellRows();

    return {
      version: VERSION,
      timeZone: TIME_ZONE,
      sourceReservations:
        sourceReservations().length,
      uniqueReservations:
        uniqueReservations().length,
      parsedReservations:
        Object.values(counts)
          .reduce(
            function (
              total,
              count
            ) {
              return total + count;
            },
            0
          ),
      datesWithReservations:
        Object.keys(counts).length,
      calendarCells:
        calendarRoot()
          ? calendarRoot()
              .querySelectorAll(
                '[data-r2-yc-date]'
              ).length
          : 0,
      visibleCountRows:
        rows,
      july31Count:
        counts['2026-07-31'] || 0,
      toolbarFrameRemoved:
        true,
      legendHidden:
        true,
      mutationObserver:
        false,
      permanentInterval:
        false
    };
  }

  function boot() {
    document.addEventListener(
      'click',
      relevantClick,
      true
    );

    [250, 700, 1400].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              apply(
                'initial-' +
                delay
              );
            },
            delay
          )
        );
      }
    );

    console.info(
      '[PMD Calendar Real Counts + Floating V1] Ready.',
      audit()
    );
  }

  function destroy() {
    clearScheduledWork();

    document.removeEventListener(
      'click',
      relevantClick,
      true
    );

    delete window
      .PMDCalendarRealCountsFloatingV1;
  }

  window.PMDCalendarRealCountsFloatingV1 = {
    version: VERSION,

    refresh: function () {
      return apply('manual');
    },

    audit: audit,

    counts: function () {
      return countsByDate();
    },

    destroy: destroy
  };

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
})();
</script>
<!-- PMD_CALENDAR_REAL_COUNTS_FLOATING_V1_END -->

<!-- PMD_CALENDAR_COUNTS_TOOLBAR_V11_FIXED -->
<style id="pmd-calendar-counts-toolbar-v11-fixed-style">
  /*
   * Completely remove the Calendar toolbar container frame.
   */
  #pmd-r2-calendar-surface-v160 .pmd-yc__toolbar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 10px !important;

    width: 100% !important;
    min-height: 42px !important;
    margin: 0 0 12px !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  #pmd-r2-calendar-surface-v160 .pmd-yc__toolbar::before,
  #pmd-r2-calendar-surface-v160 .pmd-yc__toolbar::after {
    display: none !important;
    content: none !important;
  }

  #pmd-r2-calendar-surface-v160 .pmd-yc__legend {
    display: none !important;
  }

  #pmd-r2-calendar-surface-v160 .pmd-yc__month-nav,
  #pmd-r2-calendar-surface-v160 .pmd-yc__toolbar-right,
  #pmd-r2-calendar-surface-v160 .pmd-yc__view-switch,
  #pmd-r2-calendar-surface-v160 .pmd-yc__filters {
    display: inline-flex !important;
    align-items: center !important;
    gap: 7px !important;

    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar-right {
    justify-content: flex-end !important;
    flex-wrap: wrap !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav > strong {
    min-width: 135px !important;
    margin: 0 !important;
    padding: 0 8px !important;

    color: #122b43 !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    line-height: 38px !important;
    text-align: center !important;
    white-space: nowrap !important;

    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  /*
   * Match the clean Hour/Floor toolbar buttons.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav > button,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch > button,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters > button,
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn {
    position: relative !important;
    inset: auto !important;
    float: none !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    min-width: 42px !important;
    height: 38px !important;
    margin: 0 !important;
    padding: 0 13px !important;

    color: #28445f !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    white-space: nowrap !important;

    background: #ffffff !important;
    border: 1px solid #cadbe8 !important;
    border-radius: 9px !important;
    box-shadow: 0 1px 2px rgba(16, 42, 67, 0.04) !important;

    cursor: pointer !important;
    transition:
      color 140ms ease,
      background-color 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      transform 140ms ease !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav > button {
    width: 42px !important;
    padding: 0 !important;
    font-size: 17px !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav > button:hover,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch > button:hover,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters > button:hover,
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn:hover {
    color: #102a43 !important;
    background: #f1f6fa !important;
    border-color: #9db8cd !important;
    box-shadow: 0 4px 10px rgba(16, 42, 67, 0.09) !important;
    transform: translateY(-1px) !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch > button.is-active,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters > button.is-active {
    color: #ffffff !important;
    background: #102f4d !important;
    border-color: #102f4d !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch > button.is-active:hover,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters > button.is-active:hover {
    color: #ffffff !important;
    background: #174365 !important;
    border-color: #174365 !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn {
    color: #a45100 !important;
    background: #fffaf4 !important;
    border-color: #efad69 !important;
  }

  /*
   * Hide the duplicate month title inside the Calendar frame.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__calendar-header,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-header,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__grid-title,
  #pmd-r2-calendar-surface-v160
    [data-r2-yc-grid-label] {
    display: none !important;
  }

  /*
   * The actual markup uses a direct heading above weekdays.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__calendar > h2,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__calendar > h3,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__month > h2,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__month > h3 {
    display: none !important;
  }
</style>

<script id="pmd-calendar-counts-toolbar-v11-fixed-script">
(function () {
  'use strict';

  var VERSION = '1.1.1';
  var REQUIRED_CELLS = 42;

  var frameId = null;
  var timers = [];
  var token = 0;
  var wrapped = false;
  var originals = {};

  if (
    window.PMDCalendarCountsToolbarV111 &&
    typeof window.PMDCalendarCountsToolbarV111.destroy ===
      'function'
  ) {
    window.PMDCalendarCountsToolbarV111.destroy();
  }

  function root() {
    return document.getElementById(
      'pmd-r2-calendar-surface-v160'
    );
  }

  function cells() {
    var calendar = root();

    return calendar
      ? Array.prototype.slice.call(
          calendar.querySelectorAll(
            '[data-r2-yc-date]'
          )
        )
      : [];
  }

  function authority() {
    return window
      .PMDCalendarRealCountsFloatingV1;
  }

  function clearWork() {
    if (frameId !== null) {
      window.cancelAnimationFrame(
        frameId
      );

      frameId = null;
    }

    timers.forEach(
      function (timer) {
        window.clearTimeout(timer);
      }
    );

    timers = [];
  }

  function apply(reason) {
    var api = authority();

    if (
      !api ||
      typeof api.refresh !== 'function'
    ) {
      return false;
    }

    var result = api.refresh();

    console.info(
      '[PMD Calendar Counts Toolbar V1.1.1] Applied:',
      reason,
      result || null
    );

    return result;
  }

  function waitForCalendar(reason) {
    clearWork();

    token += 1;

    var currentToken = token;
    var attempts = 0;

    function check() {
      if (currentToken !== token) {
        return;
      }

      var calendarCells = cells();

      if (
        calendarCells.length >=
        REQUIRED_CELLS
      ) {
        apply(reason + '-ready');

        [80, 220, 500, 900].forEach(
          function (delay) {
            timers.push(
              window.setTimeout(
                function () {
                  if (
                    currentToken === token
                  ) {
                    apply(
                      reason +
                      '-authority-' +
                      delay
                    );
                  }
                },
                delay
              )
            );
          }
        );

        frameId = null;
        return;
      }

      attempts += 1;

      if (attempts >= 120) {
        console.warn(
          '[PMD Calendar Counts Toolbar V1.1.1] Cells not ready.',
          {
            reason: reason,
            cells:
              calendarCells.length
          }
        );

        frameId = null;
        return;
      }

      frameId =
        window.requestAnimationFrame(
          check
        );
    }

    frameId =
      window.requestAnimationFrame(
        check
      );
  }

  function wrapCalendarApi() {
    var api =
      window
        .PMDReservations2CalendarToggleV1;

    if (!api || wrapped) {
      return false;
    }

    [
      'open',
      'render',
      'toggle',
      'selectDate'
    ].forEach(
      function (methodName) {
        if (
          typeof api[methodName] !==
          'function'
        ) {
          return;
        }

        originals[methodName] =
          api[methodName];

        api[methodName] =
          function () {
            var result =
              originals[methodName]
                .apply(
                  api,
                  arguments
                );

            waitForCalendar(
              'api-' +
              methodName
            );

            return result;
          };
      }
    );

    wrapped = true;

    return true;
  }

  function onClick(event) {
    var target =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#pmd-r2-calendar-toggle-v1,' +
            '[data-r2-yc-prev],' +
            '[data-r2-yc-next],' +
            '[data-r2-yc-view],' +
            '[data-r2-yc-filter]'
          )
        : null;

    if (!target) {
      return;
    }

    waitForCalendar(
      'calendar-control-click'
    );
  }

  function displayedText(date) {
    var calendar = root();

    var cell =
      calendar &&
      calendar.querySelector(
        '[data-r2-yc-date="' +
        date +
        '"]'
      );

    if (!cell) {
      return null;
    }

    var summary =
      cell.querySelector(
        '[data-pmd-real-reservation-count],' +
        '.pmd-yc-day__summary.is-reservation'
      );

    return summary
      ? String(
          summary.textContent || ''
        )
          .replace(/\s+/g, ' ')
          .trim()
      : null;
  }

  function realCount(date) {
    var api = authority();

    if (
      !api ||
      typeof api.counts !== 'function'
    ) {
      return 0;
    }

    return (
      api.counts()[date] ||
      0
    );
  }

  function audit() {
    return {
      version: VERSION,
      calendarCells:
        cells().length,
      july31RealCount:
        realCount(
          '2026-07-31'
        ),
      july31DisplayedText:
        displayedText(
          '2026-07-31'
        ),
      calendarApiWrapped:
        wrapped,
      activeFrame:
        frameId !== null,
      pendingTimers:
        timers.length,
      permanentInterval:
        false,
      mutationObserver:
        false
    };
  }

  function boot() {
    document.addEventListener(
      'click',
      onClick,
      true
    );

    wrapCalendarApi();

    [200, 600, 1200].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              wrapCalendarApi();

              if (
                cells().length > 0
              ) {
                waitForCalendar(
                  'initial-' +
                  delay
                );
              }
            },
            delay
          )
        );
      }
    );

    console.info(
      '[PMD Calendar Counts Toolbar V1.1.1] Ready.',
      audit()
    );
  }

  function destroy() {
    clearWork();

    document.removeEventListener(
      'click',
      onClick,
      true
    );

    var api =
      window
        .PMDReservations2CalendarToggleV1;

    if (api && wrapped) {
      Object.keys(
        originals
      ).forEach(
        function (methodName) {
          api[methodName] =
            originals[
              methodName
            ];
        }
      );
    }

    originals = {};
    wrapped = false;

    delete window
      .PMDCalendarCountsToolbarV111;
  }

  window.PMDCalendarCountsToolbarV111 = {
    version: VERSION,

    refresh: function () {
      waitForCalendar('manual');
      return true;
    },

    audit: audit,

    destroy: destroy
  };

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
<!-- PMD_CALENDAR_COUNTS_TOOLBAR_V11_FIXED_END -->

<!-- PMD_CALENDAR_NATIVE_COUNT_V14 -->
<script id="pmd-calendar-native-count-v14-script">
(function () {
  'use strict';

  var VERSION = '1.4.0';

  var frameId = null;
  var timers = [];
  var token = 0;

  var originalRefresh = null;
  var refreshWrapped = false;

  if (
    window.PMDCalendarNativeCountV14 &&
    typeof window.PMDCalendarNativeCountV14.destroy ===
      'function'
  ) {
    window.PMDCalendarNativeCountV14.destroy();
  }

  function calendar() {
    return document.getElementById(
      'pmd-r2-calendar-surface-v160'
    );
  }

  function sourceAuthority() {
    return window
      .PMDCalendarRealCountsFloatingV1;
  }

  function realCounts() {
    var api = sourceAuthority();

    if (
      !api ||
      typeof api.counts !== 'function'
    ) {
      return {};
    }

    return api.counts();
  }

  function reservationLabel(count) {
    return (
      String(count) +
      (
        count === 1
          ? ' Reservierung'
          : ' Reservierungen'
      )
    );
  }

  function nativeOperations(cell) {
    /* PMD_DASHBOARD2_V1415_SINGLE_HYDRATION */
    if (!(cell instanceof Element)) {
      return null;
    }

    return cell.querySelector(
      ':scope > .pmd-yc-day__operations'
    );
  }

  function nativeEntry(cell) {
    if (!(cell instanceof Element)) {
      return null;
    }

    return cell.querySelector(
      ':scope > .pmd-yc-day__operations ' +
      '> .pmd-r2-yc-entry.is-reservation'
    );
  }

  function generatedSummary(cell) {
    if (!(cell instanceof Element)) {
      return null;
    }

    return cell.querySelector(
      ':scope > ' +
      '.pmd-yc-day__summary.is-reservation' +
      '[data-pmd-real-reservation-count]'
    );
  }

  function ensureNativeEntry(cell) {
    var entry =
      nativeEntry(cell);

    if (entry) {
      return entry;
    }

    var operations =
      nativeOperations(cell);

    if (!operations) {
      operations =
        document.createElement('span');

      operations.className =
        'pmd-yc-day__operations';

      cell.appendChild(operations);
    }

    entry =
      document.createElement('span');

    entry.className =
      'pmd-r2-yc-entry is-reservation';

    operations.appendChild(entry);

    return entry;
  }

  function removeEmptyOperations(cell) {
    var operations =
      nativeOperations(cell);

    if (
      operations &&
      operations.children.length === 0 &&
      !String(
        operations.textContent || ''
      ).trim()
    ) {
      operations.remove();
    }
  }

  function normalizeCell(
    cell,
    counts
  ) {
    var date =
      cell.getAttribute(
        'data-r2-yc-date'
      );

    var count =
      counts[date] || 0;

    var summary =
      generatedSummary(cell);

    /*
     * Remove only the exact duplicate element created
     * by PMD Calendar Real Counts V1.
     */
    if (summary) {
      summary.remove();
    }

    var entry =
      nativeEntry(cell);

    if (count <= 0) {
      if (entry) {
        entry.remove();
      }

      removeEmptyOperations(cell);

      cell.dataset
        .pmdNativeReservationCount =
        '0';

      return {
        date: date,
        count: 0,
        entry: false
      };
    }

    entry =
      ensureNativeEntry(cell);

    entry.textContent =
      reservationLabel(count);

    entry.setAttribute(
      'data-pmd-native-reservation-count',
      String(count)
    );

    cell.dataset
      .pmdNativeReservationCount =
      String(count);

    return {
      date: date,
      count: count,
      entry: true
    };
  }

  function normalize(reason) {
    var root =
      calendar();

    if (!root) {
      return false;
    }

    var counts =
      realCounts();

    var cells =
      Array.prototype.slice.call(
        root.querySelectorAll(
          '[data-r2-yc-date]'
        )
      );

    var updated = 0;

    cells.forEach(
      function (cell) {
        var before =
          nativeEntry(cell)
            ?.textContent
            ?.trim() || '';

        var result =
          normalizeCell(
            cell,
            counts
          );

        var after =
          nativeEntry(cell)
            ?.textContent
            ?.trim() || '';

        if (before !== after) {
          updated += 1;
        }

        return result;
      }
    );

    var july31 =
      root.querySelector(
        '[data-r2-yc-date="2026-07-31"]'
      );

    console.info(
      '[PMD Calendar Native Count V1.4] Applied:',
      reason,
      {
        calendarCells:
          cells.length,

        updatedCells:
          updated,

        july31RealCount:
          counts[
            '2026-07-31'
          ] || 0,

        july31NativeText:
          nativeEntry(july31)
            ?.textContent
            ?.trim() || null,

        july31DuplicateSummary:
          Boolean(
            generatedSummary(
              july31
            )
          )
      }
    );

    return true;
  }

  function clearWork() {
    if (frameId !== null) {
      window.cancelAnimationFrame(
        frameId
      );

      frameId = null;
    }

    timers.forEach(
      function (timer) {
        window.clearTimeout(timer);
      }
    );

    timers = [];
  }

  function schedule(reason) {
    clearWork();

    token += 1;

    var currentToken = token;
    var attempts = 0;

    function waitForCalendar() {
      if (currentToken !== token) {
        return;
      }

      var cellCount =
        calendar()
          ?.querySelectorAll(
            '[data-r2-yc-date]'
          ).length || 0;

      if (cellCount >= 42) {
        normalize(
          reason + '-ready'
        );

        /*
         * Bounded passes protect against a late native
         * Calendar render. No permanent polling.
         */
        [80, 220, 500].forEach(
          function (delay) {
            timers.push(
              window.setTimeout(
                function () {
                  if (
                    currentToken === token
                  ) {
                    normalize(
                      reason +
                      '-authority-' +
                      delay
                    );
                  }
                },
                delay
              )
            );
          }
        );

        frameId = null;
        return;
      }

      attempts += 1;

      if (attempts >= 120) {
        console.warn(
          '[PMD Calendar Native Count V1.4] Calendar cells not ready.',
          {
            reason: reason,
            calendarCells:
              cellCount
          }
        );

        frameId = null;
        return;
      }

      frameId =
        window.requestAnimationFrame(
          waitForCalendar
        );
    }

    frameId =
      window.requestAnimationFrame(
        waitForCalendar
      );
  }

  function wrapCountAuthority() {
    var api =
      sourceAuthority();

    if (
      !api ||
      refreshWrapped ||
      typeof api.refresh !==
        'function'
    ) {
      return false;
    }

    originalRefresh =
      api.refresh;

    api.refresh =
      function () {
        var result =
          originalRefresh.apply(
            api,
            arguments
          );

        window.requestAnimationFrame(
          function () {
            normalize(
              'after-real-count-refresh'
            );
          }
        );

        return result;
      };

    refreshWrapped = true;

    return true;
  }

  function relevantClick(event) {
    var target =
      event.target &&
      event.target.closest
        ? event.target.closest(
            '#pmd-r2-calendar-toggle-v1,' +
            '[data-r2-yc-prev],' +
            '[data-r2-yc-next],' +
            '[data-r2-yc-view],' +
            '[data-r2-yc-filter]'
          )
        : null;

    if (!target) {
      return;
    }

    schedule(
      'calendar-control-click'
    );
  }

  function audit() {
    var root =
      calendar();

    var july31 =
      root?.querySelector(
        '[data-r2-yc-date="2026-07-31"]'
      );

    return {
      version: VERSION,

      calendarCells:
        root
          ?.querySelectorAll(
            '[data-r2-yc-date]'
          ).length || 0,

      july31RealCount:
        realCounts()[
          '2026-07-31'
        ] || 0,

      july31NativeText:
        nativeEntry(july31)
          ?.textContent
          ?.replace(/\s+/g, ' ')
          .trim() || null,

      july31NativeEntries:
        july31
          ?.querySelectorAll(
            ':scope > ' +
            '.pmd-yc-day__operations ' +
            '> .pmd-r2-yc-entry' +
            '.is-reservation'
          ).length || 0,

      july31DuplicateSummaries:
        july31
          ?.querySelectorAll(
            ':scope > ' +
            '.pmd-yc-day__summary' +
            '.is-reservation' +
            '[data-pmd-real-reservation-count]'
          ).length || 0,

      countAuthorityWrapped:
        refreshWrapped,

      mutationObserver:
        false,

      permanentInterval:
        false
    };
  }

  function boot() {
    document.addEventListener(
      'click',
      relevantClick,
      true
    );

    wrapCountAuthority();

    [250, 700, 1400].forEach(
      function (delay) {
        timers.push(
          window.setTimeout(
            function () {
              wrapCountAuthority();

              if (calendar()) {
                schedule(
                  'initial-' +
                  delay
                );
              }
            },
            delay
          )
        );
      }
    );

    console.info(
      '[PMD Calendar Native Count V1.4] Ready.',
      audit()
    );
  }

  function destroy() {
    clearWork();

    document.removeEventListener(
      'click',
      relevantClick,
      true
    );

    var api =
      sourceAuthority();

    if (
      api &&
      refreshWrapped &&
      originalRefresh
    ) {
      api.refresh =
        originalRefresh;
    }

    originalRefresh = null;
    refreshWrapped = false;

    delete window
      .PMDCalendarNativeCountV14;
  }

  window.PMDCalendarNativeCountV14 = {
    version: VERSION,

    refresh: function () {
      schedule('manual');
      return true;
    },

    normalize: function () {
      return normalize(
        'manual-immediate'
      );
    },

    audit: audit,

    destroy: destroy
  };

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
<!-- PMD_CALENDAR_NATIVE_COUNT_V14_END -->

<!-- PMD_CALENDAR_HOUR_STYLE_TOOLBAR_V15 -->
<style id="pmd-calendar-hour-style-toolbar-v15">
  /*
   * Keep all native Calendar DOM and functionality.
   * Visually separate the toolbar from the Calendar grid.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    background-color: transparent !important;

    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;

    overflow: visible !important;
  }

  /*
   * Hour-style floating Calendar header:
   * empty left column, centered date controls, actions right.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame
    > .pmd-yc__toolbar {
    display: grid !important;
    grid-template-columns:
      minmax(0, 1fr)
      auto
      minmax(0, 1fr) !important;

    align-items: center !important;
    justify-content: normal !important;

    column-gap: 18px !important;
    row-gap: 8px !important;

    width: 100% !important;
    min-height: 54px !important;

    margin: 0 0 12px !important;
    padding: 6px 12px !important;

    background: transparent !important;
    background-color: transparent !important;

    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar::before,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar::after {
    display: none !important;
    content: none !important;
  }

  /*
   * Remove the legend completely.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__legend {
    display: none !important;
  }

  /*
   * Month/date navigation exactly in the middle.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav {
    grid-column: 2 !important;

    display: grid !important;
    grid-template-columns: 42px minmax(170px, auto) 42px !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 10px !important;

    width: auto !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav
    > strong {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    min-width: 170px !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 14px !important;

    color: #102a43 !important;
    font-size: 17px !important;
    font-weight: 850 !important;
    line-height: 1 !important;
    text-align: center !important;
    white-space: nowrap !important;

    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  /*
   * Right-side actions.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar-right {
    grid-column: 3 !important;
    justify-self: end !important;

    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;

    gap: 8px !important;

    width: auto !important;
    min-width: 0 !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;

    width: auto !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  /*
   * Match the verified Hour toolbar button dimensions:
   * 42px high, white, light border, 13px radius.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav
    > button,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch
    > button,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters
    > button,
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn {
    position: static !important;
    inset: auto !important;
    float: none !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    min-width: 42px !important;
    height: 42px !important;

    margin: 0 !important;
    padding: 0 14px !important;

    color: #102a43 !important;
    font-family: inherit !important;
    font-size: 12px !important;
    font-weight: 850 !important;
    line-height: 1 !important;
    text-align: center !important;
    white-space: nowrap !important;

    background: #ffffff !important;
    background-color: #ffffff !important;

    border: 1px solid #cbdde9 !important;
    border-radius: 13px !important;
    box-shadow: none !important;
    outline: 0 !important;

    cursor: pointer !important;

    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease,
      transform 140ms ease !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__month-nav
    > button {
    width: 42px !important;
    padding: 0 !important;

    font-size: 23px !important;
    font-weight: 850 !important;
  }

  /*
   * No black active buttons.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch
    > button.is-active,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters
    > button.is-active {
    color: #102a43 !important;

    background: #eaf4fc !important;
    background-color: #eaf4fc !important;

    border-color: #8ebbd8 !important;
    box-shadow: inset 0 0 0 1px rgba(36, 111, 159, 0.08) !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar
    button:hover {
    color: #102a43 !important;

    background: #f2f7fb !important;
    background-color: #f2f7fb !important;

    border-color: #9ebed3 !important;
    transform: translateY(-1px) !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__view-switch
    > button.is-active:hover,
  #pmd-r2-calendar-surface-v160
    .pmd-yc__filters
    > button.is-active:hover {
    color: #102a43 !important;

    background: #dfeffc !important;
    background-color: #dfeffc !important;

    border-color: #79abd0 !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar
    button:active {
    transform: translateY(0) !important;
  }

  /*
   * Note remains a normal white toolbar button
   * with a subtle warm accent, not a separate orange block.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn {
    color: #7f480f !important;

    background: #ffffff !important;
    background-color: #ffffff !important;

    border-color: #d9b487 !important;
  }

  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-note-btn:hover {
    color: #653500 !important;

    background: #fff8ef !important;
    background-color: #fff8ef !important;

    border-color: #c99558 !important;
  }

  /*
   * The Calendar grid receives its own frame.
   * Toolbar now appears outside and above it.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame
    > .pmd-yc__months {
    display: block !important;

    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;

    background: #ffffff !important;
    background-color: #ffffff !important;

    border: 1px solid #cfe0ed !important;
    border-radius: 18px !important;

    box-shadow: none !important;
    overflow: hidden !important;
  }

  /*
   * Date is already centered in the toolbar.
   * Hide only the duplicate heading in Month View.
   * Year-view month headings remain untouched.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc-month.is-month-view
    > .pmd-yc-month__head {
    display: none !important;
  }

  /*
   * Preserve weekday spacing after removing the duplicate heading.
   */
  #pmd-r2-calendar-surface-v160
    .pmd-yc-month.is-month-view
    > .pmd-yc-weekdays {
    border-top: 0 !important;
  }

  @media (max-width: 1100px) {
    #pmd-r2-calendar-surface-v160
      .pmd-r2-yc-calendar-frame
      > .pmd-yc__toolbar {
      grid-template-columns: 1fr !important;
      justify-items: stretch !important;
      padding: 6px 0 !important;
    }

    #pmd-r2-calendar-surface-v160
      .pmd-yc__month-nav {
      grid-column: 1 !important;
      justify-self: center !important;
    }

    #pmd-r2-calendar-surface-v160
      .pmd-yc__toolbar-right {
      grid-column: 1 !important;
      justify-self: center !important;
      flex-wrap: wrap !important;
      height: auto !important;
    }
  }
</style>
<!-- PMD_CALENDAR_HOUR_STYLE_TOOLBAR_V15_END -->

<!-- PMD_CALENDAR_FRAME_SEPARATION_V16 -->
<style id="pmd-calendar-frame-separation-v16">
  /*
   * Remove every outer frame around the Calendar toolbar.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160,
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    > .pmd-r2-yc-calendar-frame,
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;

    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;

    border: 0 !important;
    border-width: 0 !important;
    border-color: transparent !important;
    border-radius: 0 !important;

    outline: 0 !important;
    box-shadow: none !important;

    overflow: visible !important;
  }

  /*
   * Toolbar remains on the page background, completely outside
   * any white rounded Calendar panel.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame
    > .pmd-yc__toolbar {
    position: relative !important;
    z-index: 5 !important;

    margin: 0 0 18px !important;
    padding: 6px 12px !important;

    background: #f8fbfd !important;
    background-color: #f8fbfd !important;
    background-image: none !important;

    border: 0 !important;
    border-width: 0 !important;
    border-color: transparent !important;
    border-radius: 0 !important;

    outline: 0 !important;
    box-shadow: none !important;
  }

  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar::before,
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc__toolbar::after {
    display: none !important;
    content: none !important;
  }

  /*
   * Remove a possible wrapper frame around the rendered months.
   * The actual Month/Grid gets the white frame below.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc__months {
    margin: 0 !important;
    padding: 0 !important;

    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;

    border: 0 !important;
    border-radius: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;

    overflow: visible !important;
  }

  /*
   * Only the real Month/Grid is framed.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc-month.is-month-view {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;

    background: #ffffff !important;
    background-color: #ffffff !important;

    border: 1px solid #cfe0ed !important;
    border-radius: 18px !important;

    outline: 0 !important;
    box-shadow: none !important;

    overflow: hidden !important;
  }

  /*
   * Fallback for builds where is-month-view is set on a parent
   * instead of directly on .pmd-yc-month.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc__months
    > .pmd-yc-month:only-child {
    background: #ffffff !important;
    background-color: #ffffff !important;

    border: 1px solid #cfe0ed !important;
    border-radius: 18px !important;

    outline: 0 !important;
    box-shadow: none !important;

    overflow: hidden !important;
  }

  /*
   * Avoid two borders if both Month selectors match.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc-month.is-month-view.pmd-yc-month {
    border: 1px solid #cfe0ed !important;
  }
</style>
<!-- PMD_CALENDAR_FRAME_SEPARATION_V16_END -->

<!-- PMD_CALENDAR_VERTICAL_RHYTHM_V17 -->
<style id="pmd-calendar-vertical-rhythm-v17">
  /*
   * Reservations2 vertical spacing rule:
   * major neighboring sections use the same 16px rhythm.
   */

  /*
   * Reduce the oversized space between KPI cards
   * and the Calendar toolbar.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160 {
    margin-top: 16px !important;
    margin-block-start: 16px !important;

    padding-top: 0 !important;
    padding-block-start: 0 !important;
  }

  /*
   * Prevent inner Calendar wrappers from reintroducing
   * additional top spacing.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    > .pmd-r2-yc-calendar-frame,
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame {
    margin-top: 0 !important;
    margin-block-start: 0 !important;

    padding-top: 0 !important;
    padding-block-start: 0 !important;
  }

  /*
   * Keep Toolbar → Calendar Grid spacing equal
   * to KPI → Toolbar spacing.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame
    > .pmd-yc__toolbar {
    margin-top: 0 !important;
    margin-bottom: 16px !important;
    margin-block-start: 0 !important;
    margin-block-end: 16px !important;
  }

  /*
   * Remove accidental empty spacing before the framed grid.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc__months,
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-yc-month.is-month-view {
    margin-top: 0 !important;
    margin-block-start: 0 !important;
  }
</style>
<!-- PMD_CALENDAR_VERTICAL_RHYTHM_V17_END -->

<!-- PMD_CALENDAR_HOUR_TOP_GAP_V18 -->
<style id="pmd-calendar-hour-top-gap-v18">
  /*
   * The real oversized gap came from the shared canvas:
   * computed margin-top was 64px.
   *
   * Calendar and Hour use the same shared canvas, so normalize
   * that gap to the page's 16px spacing rhythm.
   *
   * Floor mode remains untouched.
   */
  #pmd-reservations2.is-calendar-mode
    > #pmd-r2-shared-floor-canvas-v310,
  #pmd-reservations2.pmd-r2-hour-layout-v38-active
    > #pmd-r2-shared-floor-canvas-v310,
  #pmd-reservations2.is-timeslot-screen
    > #pmd-r2-shared-floor-canvas-v310 {
    margin-top: 16px !important;
    margin-block-start: 16px !important;
  }

  /*
   * Do not let the nested Calendar surface add another top gap.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160 {
    margin-top: 0 !important;
    margin-block-start: 0 !important;
  }

  /*
   * Preserve the verified 16px Toolbar → Grid spacing.
   */
  #pmd-reservations2.is-calendar-mode
    #pmd-r2-calendar-surface-v160
    .pmd-r2-yc-calendar-frame
    > .pmd-yc__toolbar {
    margin-bottom: 16px !important;
    margin-block-end: 16px !important;
  }
</style>
<!-- PMD_CALENDAR_HOUR_TOP_GAP_V18_END -->

<!-- PMD_RESERVATION_COMPOSER_V1_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-reservation-composer-v1.css') }}?v=1.0.0">
@include('admin::reservations2._reservation_composer')
<script>
window.PMD_RESERVATION_COMPOSER_V1 = Object.freeze({
  endpoint: @json(admin_url('reservations2'))
});
</script>
<script defer src="{{ asset('app/admin/assets/js/pmd-reservation-composer-v1.js?pmd-composer-draft=2426-20260801_201842') }}?v=1.0.0"></script>
<!-- PMD_RESERVATION_COMPOSER_V1_END -->
