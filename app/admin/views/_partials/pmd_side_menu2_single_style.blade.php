{{-- 
PMD_SINGLE_SIDE_MENU_STYLE_V2

Single visual authority for Side Menu 2.
Also contains route-scoped critical paint guards that must exist
in the initial HTML response before JavaScript executes.
--}}
<!-- PMD_SM2_CRITICAL_LOGO_START -->
<style id="pmd-sm2-critical-logo">
  #pmd-side-menu2 .pmd-sm2__brand {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 116px !important;
    min-height: 116px !important;
    padding: 8px !important;
    overflow: hidden !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand
    > :not(#pmd-side-menu2-logo) {
    display: none !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand img,
  #pmd-side-menu2 .pmd-sm2__brand svg,
  #pmd-side-menu2 .pmd-sm2__brand picture,
  #pmd-side-menu2 .pmd-sm2__brand-text,
  #pmd-side-menu2 .logo,
  #pmd-side-menu2 .logo-svg {
    display: none !important;
  }

  #pmd-side-menu2-logo {
    display: block !important;
    width: 96px !important;
    height: 82px !important;
    flex: 0 0 96px !important;
    overflow: hidden !important;
    background-image:
      url("/app/admin/assets/images/paymydine-logo.svg?v=20260718-8")
      !important;
    background-repeat: no-repeat !important;
    background-size: 132px auto !important;
    background-position: center -5px !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
  }

  html.pmd-sm2-collapsed #pmd-side-menu2-logo {
    width: 48px !important;
    height: 54px !important;
    flex-basis: 48px !important;
    background-size: 80px auto !important;
    background-position: center -3px !important;
  }

  html.pmd-sm2-collapsed
    #pmd-side-menu2 .pmd-sm2__brand {
    height: 96px !important;
    min-height: 96px !important;
  }
</style>
<!-- PMD_SM2_CRITICAL_LOGO_END -->

@if (request()->is('admin/reservations2'))
<!-- PMD_R2_CRITICAL_PREPAINT_V1_START -->
<style id="pmd-r2-critical-prepaint-v1">
  :root {
    background: #f8fbfd !important;
  }

  html,
  body,
  body.layout,
  body.admin,
  .app-container,
  .page-wrapper,
  .page-content,
  .content-wrapper,
  .container-fluid,
  #pmd-reservations2 {
    background-color: #f8fbfd !important;
  }

  html,
  body {
    min-width: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body {
    min-height: 100vh !important;
    overflow-x: hidden !important;
  }

  .page-wrapper,
  .page-content,
  .content-wrapper,
  #pmd-reservations2 {
    min-height: 100vh !important;
    margin-top: 0 !important;
  }

  .navbar-top,
  .navbar-fixed-top {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  #pmd-dashboard2-quick-btn {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #pmd-reservations2 .pmd-r2__hero {
    display: none !important;
  }
</style>
<!-- PMD_R2_CRITICAL_PREPAINT_V1_END -->
@endif
