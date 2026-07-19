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
})();
</script>

<!-- PMD_GLOBAL_MENU_CRITICAL_GEOMETRY_V4_START -->
<style>
  /*
   * These rules are intentionally inline.
   * They determine the first painted frame before
   * the external Side Menu stylesheet finishes loading.
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
    transition:
      width var(--pmd-sm2-speed)
      cubic-bezier(.22,.75,.24,1) !important;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    .pmd-sm2__brand {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
    height: 116px !important;
    min-height: 116px !important;
    padding: 4px 8px 8px !important;
    border: 0 !important;
    overflow: hidden !important;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2-logo {
    display: block !important;
    width: 50px !important;
    min-width: 50px !important;
    height: 58px !important;
    flex: 0 0 50px !important;
    margin: 0 auto !important;
    background-image:
      url("/app/admin/assets/images/paymydine-logo.svg?v=20260719-global-symbol-1")
      !important;
    background-repeat: no-repeat !important;
    background-position: center top !important;
    background-size: 50px auto !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  html.pmd-side-menu2-global-page.pmd-sm2-expanded
    #pmd-side-menu2-logo {
    width: 116px !important;
    min-width: 116px !important;
    height: 116px !important;
    flex-basis: 116px !important;
    background-size: 116px auto !important;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    img,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    picture,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    .logo,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    .logo-svg,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    [class*="single-logo"] {
    display: none !important;
  }
</style>
<!-- PMD_GLOBAL_MENU_CRITICAL_GEOMETRY_V4_END -->





<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V5_START -->
<style>
  /*
   * No animation during initial page paint or navigation.
   * Transitions are enabled only after JS marks the page ready.
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
    .navbar-fixed-top,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2-logo,
  html.pmd-side-menu2-global-page
    .pmd-sm2__item,
  html.pmd-side-menu2-global-page
    .pmd-sm2__dropdown-toggle,
  html.pmd-side-menu2-global-page
    .pmd-sm2__label,
  html.pmd-side-menu2-global-page
    .pmd-sm2__toggle,
  html.pmd-side-menu2-global-page
    .pmd-sm2__toggle span,
  html.pmd-side-menu2-global-page
    .pmd-sm2__toggle svg {
    transition: none !important;
    animation: none !important;
  }

  /*
   * Transitions become available only after the first stable
   * layout has already been painted.
   */
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

  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .pmd-sm2__item,
  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .pmd-sm2__dropdown-toggle,
  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .pmd-sm2__label,
  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .pmd-sm2__toggle,
  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .pmd-sm2__toggle span,
  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    .pmd-sm2__toggle svg,
  html.pmd-side-menu2-global-page.pmd-sm2-runtime-ready
    #pmd-side-menu2-logo {
    transition-duration: 220ms !important;
    transition-timing-function:
      cubic-bezier(.22,.75,.24,1)
      !important;
  }
</style>
<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V5_END -->

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
    href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-single-source-v1"
>

@include('admin::_partials.pmd_side_menu2_single_style')
@include('admin::_partials.pmd_side_menu2_single_menu')

<script
    src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260719-single-source-v1"
    defer
></script>

<script
    src="/app/admin/assets/js/pmd-admin-exact-layout-v1.js?v=20260719-global-5"
    defer
></script>
@endif
