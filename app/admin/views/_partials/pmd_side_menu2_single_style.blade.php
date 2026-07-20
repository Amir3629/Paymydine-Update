{{-- 
PMD_SINGLE_SIDE_MENU_STYLE_V3

Single visual authority for Side Menu 2.
Also contains a DOM-scoped critical paint guard for Reservations2.
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

<!-- PMD_R2_CRITICAL_PREPAINT_V2_START -->
<style id="pmd-r2-critical-prepaint-v2">
  /*
   * Do not depend on Blade route matching. The presence of the actual
   * Reservations2 root is the authority, so this works in cached/global views.
   */
  html:has(#pmd-reservations2),
  html:has(#pmd-reservations2) body,
  body:has(#pmd-reservations2),
  body:has(#pmd-reservations2) .app-container,
  body:has(#pmd-reservations2) .layout,
  body:has(#pmd-reservations2) .layout-wrapper,
  body:has(#pmd-reservations2) .main-content,
  body:has(#pmd-reservations2) .page-wrapper,
  body:has(#pmd-reservations2) .page-content,
  body:has(#pmd-reservations2) .content-wrapper,
  body:has(#pmd-reservations2) .container,
  body:has(#pmd-reservations2) .container-fluid,
  body:has(#pmd-reservations2) #pmd-reservations2 {
    background: #f8fbfd !important;
    background-color: #f8fbfd !important;
  }

  html:has(#pmd-reservations2),
  html:has(#pmd-reservations2) body {
    width: 100% !important;
    min-width: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body:has(#pmd-reservations2) {
    min-height: 100vh !important;
    overflow-x: hidden !important;
  }

  body:has(#pmd-reservations2)::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -2147483647;
    background: #f8fbfd !important;
    pointer-events: none;
  }

  body:has(#pmd-reservations2) .page-wrapper,
  body:has(#pmd-reservations2) .page-content,
  body:has(#pmd-reservations2) .content-wrapper,
  body:has(#pmd-reservations2) #pmd-reservations2 {
    min-height: 100vh !important;
    margin-top: 0 !important;
  }

  body:has(#pmd-reservations2) .navbar-top,
  body:has(#pmd-reservations2) .navbar-fixed-top {
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

  body:has(#pmd-reservations2) #pmd-dashboard2-quick-btn,
  body:has(#pmd-reservations2) #pmd-reservations2 .pmd-r2__hero {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
</style>
<!-- PMD_R2_CRITICAL_PREPAINT_V2_END -->