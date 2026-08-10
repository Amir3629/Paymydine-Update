@php
    $pmdPath = trim(request()->path(), '/');

    $pmdSideMenuExcluded =
        $pmdPath === 'admin/login' ||
        str_starts_with($pmdPath, 'admin/dashboardwaiter') ||
        str_starts_with($pmdPath, 'admin/kds') ||
        str_starts_with($pmdPath, 'admin/dashboardkitchen') ||
        str_starts_with($pmdPath, 'admin/quick-mode');

    $pmdIsReservations2 =
        str_starts_with($pmdPath, 'admin/reservations2');

    /*
     * PMD_SETTINGS_SUITE_ROUTE_AUTHORITY_V5
     *
     * This is intentionally route-derived instead of body-class-derived.
     * The route is known by Blade before body paint, so the final vertical
     * shell/header geometry exists before any deferred controller/runtime CSS
     * or JS can leave a legacy navbar/page-wrapper top offset behind.
     */
    $pmdIsSettingsSuiteRoute =
        $pmdPath === 'admin/pmdsettings' ||
        str_starts_with($pmdPath, 'admin/pmdsettings/') ||
        in_array($pmdPath, [
            'admin/pmdmenu',
            'admin/pmdcustomer',
            'admin/pmdteam',
            'admin/pmddevices',
            'admin/pmdfinance',
            'admin/pmdbrand',
            'admin/pmdadvanced',
        ], true);

    $pmdActive = function ($paths) use ($pmdPath) {
        foreach ((array) $paths as $path) {
            if (
                $pmdPath === 'admin/'.$path ||
                str_starts_with($pmdPath, 'admin/'.$path.'/')
            ) {
                return true;
            }
        }

        return false;
    };
@endphp

@if(!$pmdSideMenuExcluded && !$pmdIsReservations2)
<script>
(function () {
    var state = 'collapsed';

    try {
        state =
            localStorage.getItem('pmd.sideMenu2.state') === 'expanded'
                ? 'expanded'
                : 'collapsed';
    } catch (error) {}

    document.documentElement.classList.add(
        state === 'expanded'
            ? 'pmd-sm2-expanded'
            : 'pmd-sm2-collapsed'
    );

    document.documentElement.classList.add(
        'pmd-side-menu2-global-page'
    );

    @if($pmdIsSettingsSuiteRoute)
    document.documentElement.classList.add(
        'pmd-settings-suite-route-v5'
    );
    @endif

    @if($pmdPath === 'admin/dashboard2')
    /*
     * PMD_DASHBOARD2_STATIC_SHELL_FIRST_PAINT_V1
     *
     * Server-known route marker. The final Dashboard2 shell geometry can
     * therefore exist before deferred runtime layout code executes.
     */
    document.documentElement.classList.add(
        'pmd-dashboard2-static-shell-v1'
    );
    @endif
})();
</script>

@if($pmdIsSettingsSuiteRoute)
<!-- PMD_SETTINGS_SUITE_ROUTE_ZERO_TOP_V5_START -->
<style id="pmd-settings-suite-route-zero-top-v5">
  /*
   * Route-level first-paint authority for ALL consolidated Settings pages.
   *
   * The old admin shell can contribute top padding/margins at several nested
   * wrapper levels even when the legacy navbar itself is hidden. Reset every
   * shell layer that sits ABOVE the PMD custom page root. Internal PMD cards,
   * forms and their intentional spacing are not touched.
   */
  html.pmd-settings-suite-route-v5,
  html.pmd-settings-suite-route-v5 body,
  html.pmd-settings-suite-route-v5 .page,
  html.pmd-settings-suite-route-v5 .page-wrapper,
  html.pmd-settings-suite-route-v5 .page-content,
  html.pmd-settings-suite-route-v5 .content-wrapper,
  html.pmd-settings-suite-route-v5 .content,
  html.pmd-settings-suite-route-v5 .main-content,
  html.pmd-settings-suite-route-v5 .app-container,
  html.pmd-settings-suite-route-v5 .layout,
  html.pmd-settings-suite-route-v5 .layout-wrapper,
  html.pmd-settings-suite-route-v5 .nk-wrap,
  html.pmd-settings-suite-route-v5 .nk-content,
  html.pmd-settings-suite-route-v5 .nk-content-inner,
  html.pmd-settings-suite-route-v5 .nk-content-body,
  html.pmd-settings-suite-route-v5 .nk-content-wrap,
  html.pmd-settings-suite-route-v5 .container,
  html.pmd-settings-suite-route-v5 .container-fluid,
  html.pmd-settings-suite-route-v5 .row-fluid {
    margin-top: 0 !important;
    padding-top: 0 !important;
    background-color: #f8fbfd !important;
    background-image: none !important;
  }

  html.pmd-settings-suite-route-v5 body {
    top: 0 !important;
  }

  html.pmd-settings-suite-route-v5 .page,
  html.pmd-settings-suite-route-v5 .page-wrapper,
  html.pmd-settings-suite-route-v5 .page-content,
  html.pmd-settings-suite-route-v5 .content-wrapper,
  html.pmd-settings-suite-route-v5 .main-content,
  html.pmd-settings-suite-route-v5 .nk-wrap,
  html.pmd-settings-suite-route-v5 .nk-content,
  html.pmd-settings-suite-route-v5 .nk-content-inner,
  html.pmd-settings-suite-route-v5 .nk-content-body,
  html.pmd-settings-suite-route-v5 .nk-content-wrap {
    top: 0 !important;
    bottom: auto !important;
  }

  html.pmd-settings-suite-route-v5 .page-wrapper {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  html.pmd-settings-suite-route-v5 .page-content,
  html.pmd-settings-suite-route-v5 .content-wrapper,
  html.pmd-settings-suite-route-v5 .main-content,
  html.pmd-settings-suite-route-v5 .nk-content,
  html.pmd-settings-suite-route-v5 .nk-content-inner,
  html.pmd-settings-suite-route-v5 .nk-content-body,
  html.pmd-settings-suite-route-v5 .nk-content-wrap,
  html.pmd-settings-suite-route-v5 .container,
  html.pmd-settings-suite-route-v5 .container-fluid {
    margin-bottom: 0 !important;
  }

  /* Hidden legacy topbar must consume literally zero vertical geometry. */
  html.pmd-settings-suite-route-v5 .navbar-top,
  html.pmd-settings-suite-route-v5 .navbar-fixed-top,
  html.pmd-settings-suite-route-v5 .page-title-section {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    position: absolute !important;
    top: 0 !important;
    min-height: 0 !important;
    height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  /* The custom Settings roots own the only vertical rhythm. */
  html.pmd-settings-suite-route-v5 :is(
    #pmd-settings-center,
    #pmd-restaurant-profile,
    #pmd-menu-checkout,
    #pmd-team-access,
    .pmd-owner-page
  ) {
    margin-top: 0 !important;
    padding-top: 0 !important;
    transform: none !important;
    translate: none !important;
    animation: none !important;
  }

  /* One header family across every consolidated Settings page. */
  html.pmd-settings-suite-route-v5 :is(
    #pmd-settings-clean-header,
    .pmd-profile-header,
    .pmd-menu-header,
    .pmd-team-header,
    .pmd-owner-header
  ) {
    box-sizing: border-box !important;
    position: relative !important;
    top: 0 !important;
    min-height: 64px !important;
    height: 64px !important;
    margin-top: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
    transform: none !important;
    translate: none !important;
    animation: none !important;
    transition: none !important;
  }

  html.pmd-settings-suite-route-v5 :is(
    .pmd-owner-header h1,
    .pmd-team-header h1,
    .pmd-menu-header h1,
    .pmd-profile-header h1,
    #pmd-settings-clean-header .pmd-settings-clean-title
  ) {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 22px !important;
    line-height: 1.2 !important;
    font-weight: 700 !important;
  }

  /* No structural motion during refresh/normalization. */
  html.pmd-settings-suite-route-v5 :is(
    .page-wrapper,
    .page-content,
    .content-wrapper,
    .main-content,
    .nk-wrap,
    .nk-content,
    .nk-content-inner,
    .nk-content-body,
    .nk-content-wrap,
    #pmd-settings-center,
    #pmd-restaurant-profile,
    #pmd-menu-checkout,
    #pmd-team-access,
    .pmd-owner-page,
    #pmd-settings-clean-header,
    .pmd-profile-header,
    .pmd-menu-header,
    .pmd-team-header,
    .pmd-owner-header
  ) {
    animation: none !important;
    transition: none !important;
  }

  @media (max-width: 820px) {
    html.pmd-settings-suite-route-v5 .page-wrapper {
      top: 0 !important;
    }
  }
</style>
<!-- PMD_SETTINGS_SUITE_ROUTE_ZERO_TOP_V5_END -->
@endif

<!-- PMD_GLOBAL_MENU_CRITICAL_GEOMETRY_V6_START -->
<style id="pmd-global-menu-critical-geometry-v6">
  /*
   * Global pages control only the outer fixed shell.
   *
   * All internal visual styling—logo, brand, navigation,
   * dropdowns and footer—is owned by the shared
   * Reservations2 Side Menu sources.
   */
  html.pmd-side-menu2-global-page {
    --pmd-admin-gap: 14px;
    --pmd-sm2-panel: 72px;
    --pmd-sm2-speed: 220ms;
  }

  html.pmd-side-menu2-global-page.pmd-sm2-expanded {
    --pmd-sm2-panel: 184px;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2 {
    position: fixed !important;

    left: 14px !important;
    top: 14px !important;
    bottom: 14px !important;

    width: var(--pmd-sm2-panel) !important;

    z-index: 12000 !important;

    display: flex !important;
    flex-direction: column !important;

    overflow: hidden !important;

    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;

    border-radius: 22px !important;

    background:
      linear-gradient(
        180deg,
        #06120f 0%,
        #003d34 100%
      ) !important;
  }
</style>
<!-- PMD_GLOBAL_MENU_CRITICAL_GEOMETRY_V6_END -->


<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V7_START -->
<style id="pmd-sm2-global-shell-transition-v7">
  /*
   * Global pages control only outer-shell/page geometry.
   *
   * No logo, brand, item, label, dropdown, submenu or footer
   * selector is allowed in this block.
   */

  html.pmd-side-menu2-global-page
    #pmd-side-menu2,

  html.pmd-side-menu2-global-page
    .page-wrapper,

  html.pmd-side-menu2-global-page
    .page-content,

  html.pmd-side-menu2-global-page
    .navbar-top,

  html.pmd-side-menu2-global-page
    .navbar-fixed-top {
    transition: none !important;
    animation: none !important;
  }

  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    #pmd-side-menu2 {
    transition:
      width 220ms
      cubic-bezier(.22,.75,.24,1)
      !important;
  }

  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .page-wrapper,

  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .navbar-top,

  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .navbar-fixed-top {
    transition:
      left 220ms cubic-bezier(.22,.75,.24,1),
      width 220ms cubic-bezier(.22,.75,.24,1)
      !important;
  }
</style>
<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V7_END -->

<!-- PMD_SM2_VERTICAL_FIRST_PAINT_LOCK_V6_START -->
<style>
  html.pmd-side-menu2-global-page
    #pmd-side-menu2 {
    top: 14px !important;
    bottom: 14px !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    margin-top: 0 !important;
    margin-bottom: 0 !important;

    translate: none !important;
    transform: none !important;

    contain: layout paint !important;

    transition-property: width !important;
  }
</style>
<!-- PMD_SM2_VERTICAL_FIRST_PAINT_LOCK_V6_END -->

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-identical-behavior-v2"
>

@include('admin::_partials.pmd_side_menu2_single_style')

@if($pmdPath === 'admin/dashboard2')
<!-- PMD_DASHBOARD2_STATIC_SHELL_FIRST_PAINT_V1_START -->
<style id="pmd-dashboard2-static-shell-first-paint-v1">
  /*
   * Match the FINAL pmd-admin-exact-layout geometry before the browser can
   * paint Dashboard2. This also beats the embedded Reservations2 :has()
   * wrapper reset which otherwise changes the parent shell after parsing.
   */
  html.pmd-dashboard2-static-shell-v1 .page-wrapper,
  html.pmd-dashboard2-static-shell-v1 body:has(#pmd-reservations2) .page-wrapper {
    position: absolute !important;
    left: 86px !important;
    right: auto !important;
    width: calc(100vw - 86px) !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }

  html.pmd-dashboard2-static-shell-v1.pmd-sm2-expanded .page-wrapper,
  html.pmd-dashboard2-static-shell-v1.pmd-sm2-expanded body:has(#pmd-reservations2) .page-wrapper {
    left: 198px !important;
    width: calc(100vw - 198px) !important;
  }

  html.pmd-dashboard2-static-shell-v1 .page-content,
  html.pmd-dashboard2-static-shell-v1 body:has(#pmd-reservations2) .page-content {
    position: relative !important;
    left: 0 !important;
    right: auto !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 14px !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }

  html.pmd-dashboard2-static-shell-v1 .page-content > * {
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  html.pmd-dashboard2-static-shell-v1 .navbar-top,
  html.pmd-dashboard2-static-shell-v1 .navbar-fixed-top {
    left: 86px !important;
    right: 0 !important;
    width: calc(100vw - 86px) !important;
    max-width: none !important;
    margin-left: 0 !important;
    box-sizing: border-box !important;
    transition: none !important;
    animation: none !important;
  }

  html.pmd-dashboard2-static-shell-v1.pmd-sm2-expanded .navbar-top,
  html.pmd-dashboard2-static-shell-v1.pmd-sm2-expanded .navbar-fixed-top {
    left: 198px !important;
    width: calc(100vw - 198px) !important;
  }

  @media (max-width: 767px) {
    html.pmd-dashboard2-static-shell-v1 .page-wrapper,
    html.pmd-dashboard2-static-shell-v1.pmd-sm2-expanded .page-wrapper,
    html.pmd-dashboard2-static-shell-v1 body:has(#pmd-reservations2) .page-wrapper {
      left: 0 !important;
      width: 100vw !important;
    }

    html.pmd-dashboard2-static-shell-v1 .page-content,
    html.pmd-dashboard2-static-shell-v1 body:has(#pmd-reservations2) .page-content {
      padding: 10px !important;
    }
  }
</style>
<!-- PMD_DASHBOARD2_STATIC_SHELL_FIRST_PAINT_V1_END -->
@endif


@include('admin::_partials.pmd_side_menu2_single_menu')

<script
    src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260719-identical-behavior-v2"
    defer
></script>

<script
    src="/app/admin/assets/js/pmd-admin-exact-layout-v1.js?v=20260809-dashboard2-static-shell-v2"
    defer
></script>
@endif