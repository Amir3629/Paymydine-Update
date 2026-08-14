@php
    $pmdPath = trim(request()->path(), '/');

    $pmdSideMenuExcluded =
        $pmdPath === 'admin/login' ||
        str_starts_with($pmdPath, 'admin/dashboardwaiter') ||
        str_starts_with($pmdPath, 'admin/kds') ||
        str_starts_with($pmdPath, 'admin/dashboardkitchen') ||
        str_starts_with($pmdPath, 'admin/quick-mode') ||
        /* PMD_ROLE_WORKSPACE_STANDALONE_MENU_EXCLUSION_V3 */
        in_array($pmdPath, [
            'admin/reservationslab',
            'admin/cashierlab',
            'admin/accountantlab',
        ], true);

    $pmdIsReservations2 =
        str_starts_with($pmdPath, 'admin/reservations2');

    /*
     * PMD_SETTINGS_SUITE_ROUTE_AUTHORITY_V6
     *
     * The route is known by Blade before body paint. V6 keeps the Settings
     * shell in normal document flow so long pages can scroll, while preserving
     * the exact first-paint Side Menu geometry and zero-top header authority.
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
<!-- PMD_SETTINGS_SUITE_ROUTE_FLOW_SCROLL_V6_START -->
<style id="pmd-settings-suite-route-flow-scroll-v6">
  /*
   * PMD_SETTINGS_SUITE_FLOW_SCROLL_AUTHORITY_V6
   *
   * Previous first-paint work used an absolutely-positioned .page-wrapper.
   * That removed long Settings pages from document flow, so Safari/Chrome
   * could have no vertical page height to scroll. Keep the SAME horizontal
   * geometry in normal flow instead: margin-left owns the Side Menu offset.
   */
  html.pmd-settings-suite-route-v5,
  html.pmd-settings-suite-route-v5 body {
    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    margin-top: 0 !important;
    padding-top: 0 !important;
    background-color: #f8fbfd !important;
    background-image: none !important;
  }

  html.pmd-settings-suite-route-v5 body {
    position: relative !important;
    top: 0 !important;
    min-height: 100vh !important;
  }

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
    max-height: none !important;
    background-color: #f8fbfd !important;
    background-image: none !important;
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
    height: auto !important;
    max-height: none !important;
    overflow-y: visible !important;
  }

  /* Beat the older head-loaded absolute Settings shell before first paint. */
  @media (min-width: 821px) {
    html.pmd-settings-suite-route-v5.pmd-side-menu2-global-page.pmd-sm2-collapsed
    body.page.pmd-admin-theme-v1.pmd-settings-suite .page-wrapper {
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      top: 0 !important;
      bottom: auto !important;
      margin-left: 86px !important;
      margin-right: 0 !important;
      width: calc(100vw - 86px) !important;
      min-width: 0 !important;
      max-width: none !important;
      height: auto !important;
      min-height: 100vh !important;
      max-height: none !important;
      overflow-x: hidden !important;
      overflow-y: visible !important;
      transform: none !important;
      transition: none !important;
    }

    html.pmd-settings-suite-route-v5.pmd-side-menu2-global-page.pmd-sm2-expanded
    body.page.pmd-admin-theme-v1.pmd-settings-suite .page-wrapper {
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      top: 0 !important;
      bottom: auto !important;
      margin-left: 198px !important;
      margin-right: 0 !important;
      width: calc(100vw - 198px) !important;
      min-width: 0 !important;
      max-width: none !important;
      height: auto !important;
      min-height: 100vh !important;
      max-height: none !important;
      overflow-x: hidden !important;
      overflow-y: visible !important;
      transform: none !important;
      transition: none !important;
    }
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
    height: auto !important;
    max-height: none !important;
    overflow-y: visible !important;
  }

  html.pmd-settings-suite-route-v5 .page-wrapper {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
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
    min-height: 100vh !important;
    max-height: none !important;
    overflow-y: visible !important;
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

  /*
   * Owner notification fallback authority.
   * The bell is centered by the button's grid, not by absolute offsets.
   * The unread count is anchored to the frame's TOP-RIGHT corner.
   */
  html.pmd-settings-suite-route-v5 .pmd-owner-page #notif-root {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 42px !important;
    min-width: 42px !important;
    max-width: 42px !important;
    height: 42px !important;
    min-height: 42px !important;
    max-height: 42px !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  html.pmd-settings-suite-route-v5 .pmd-owner-page #notifDropdown {
    position: relative !important;
    display: grid !important;
    place-items: center !important;
    width: 42px !important;
    min-width: 42px !important;
    max-width: 42px !important;
    height: 42px !important;
    min-height: 42px !important;
    max-height: 42px !important;
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1 !important;
    overflow: visible !important;
    transform: none !important;
  }

  html.pmd-settings-suite-route-v5 .pmd-owner-page #bell-icon {
    position: static !important;
    inset: auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    pointer-events: none !important;
  }

  html.pmd-settings-suite-route-v5 .pmd-owner-page #bell-icon svg {
    display: block !important;
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
  }

  html.pmd-settings-suite-route-v5 .pmd-owner-page #notification-count {
    position: absolute !important;
    top: -7px !important;
    right: -8px !important;
    bottom: auto !important;
    left: auto !important;
    z-index: 8 !important;
    margin: 0 !important;
    transform: none !important;
    white-space: nowrap !important;
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
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      top: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      width: 100vw !important;
      height: auto !important;
      min-height: 100vh !important;
      max-height: none !important;
      overflow-y: visible !important;
    }
  }
</style>
<!-- PMD_SETTINGS_SUITE_ROUTE_FLOW_SCROLL_V6_END -->
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


<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V8_START -->
<style id="pmd-sm2-global-shell-transition-v8">
  /*
   * Global pages control only outer-shell/page geometry.
   * No boot transitions. Runtime transitions are enabled only after the
   * shared Side Menu announces a real user-driven state change.
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

  /* Settings use normal-flow margin-left instead of absolute left. */
  html.pmd-side-menu2-global-page.pmd-settings-suite-route-v5.pmd-sm2-runtime-ready
    .page-wrapper {
    transition:
      margin-left 220ms cubic-bezier(.22,.75,.24,1),
      width 220ms cubic-bezier(.22,.75,.24,1)
      !important;
  }
</style>
<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V8_END -->

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
    src="/app/admin/assets/js/pmd-admin-exact-layout-v1.js?v=20260810-settings-flow-scroll-v7"
    defer
></script>
@endif