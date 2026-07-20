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

<!-- PMD_R2_CRITICAL_PREPAINT_V4_START -->
<style id="pmd-r2-critical-prepaint-v4">
  :root { background: #f8fbfd !important; }

  html,
  body,
  body.layout,
  body.admin,
  .app-container,
  .layout,
  .layout-wrapper,
  .main-content,
  .page-wrapper,
  .page-content,
  .content-wrapper,
  .container,
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

  body:has(#pmd-reservations2)::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    background: #f8fbfd;
    pointer-events: none;
  }

  body:has(#pmd-reservations2),
  body:has(#pmd-reservations2) .app-container,
  body:has(#pmd-reservations2) .layout,
  body:has(#pmd-reservations2) .layout-wrapper,
  body:has(#pmd-reservations2) .main-content,
  body:has(#pmd-reservations2) .page-wrapper,
  body:has(#pmd-reservations2) .page-content,
  body:has(#pmd-reservations2) .content-wrapper,
  body:has(#pmd-reservations2) .container,
  body:has(#pmd-reservations2) .container-fluid {
    background: #f8fbfd !important;
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

  #pmd-dashboard2-quick-btn,
  #pmd-reservations2 .pmd-r2__hero {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #pmd-reservations2 {
    --pmd-r2-gap: 14px;
    padding-top: var(--pmd-r2-gap) !important;
  }

  #pmd-r2-clean-header {
    min-height: 42px !important;
    height: 42px !important;
    margin: 0 0 var(--pmd-r2-gap) 0 !important;
    padding: 0 !important;
  }

  #pmd-r2-clean-header .pmd-r2-clean-title,
  #pmd-r2-clean-header .pmd-r2-clean-actions {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  #pmd-r2-clean-header .pmd-r2-clean-leading {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    min-width: 0 !important;
  }

  #pmd-r2-clean-header .pmd-r2-header-back,
  #pmd-r2-clean-header .pmd-r2-mobile-menu {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: 1px solid #c9e0ef !important;
    border-radius: 11px !important;
    background: #fff !important;
    color: #17231f !important;
    box-shadow: none !important;
  }

  #pmd-r2-clean-header .pmd-r2-header-back svg,
  #pmd-r2-clean-header .pmd-r2-mobile-menu svg {
    width: 20px !important;
    height: 20px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 2 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }

  /* Remove the accidental pill/double-frame around Notifications. */
  #pmd-r2-clean-header #notif-root,
  #pmd-r2-clean-header #notif-root > .media-toolbar-tooltip-wrap {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #pmd-r2-clean-header #notif-root > .media-toolbar-tooltip-wrap {
    display: block !important;
  }

  #pmd-r2-clean-header #notifDropdown {
    box-sizing: border-box !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: 1px solid #c9e0ef !important;
    border-radius: 11px !important;
    background: #fff !important;
    box-shadow: none !important;
  }

  #pmd-r2-clean-header #notification-count {
    top: -6px !important;
    right: -7px !important;
  }

  #pmd-r2-clean-header .pmd-r2-mobile-menu {
    display: none !important;
  }

  @media (max-width: 820px) {
    #pmd-reservations2 {
      --pmd-r2-gap: 10px;
      padding-top: var(--pmd-r2-gap) !important;
    }

    #pmd-r2-clean-header {
      min-height: 42px !important;
      height: 42px !important;
      margin-bottom: var(--pmd-r2-gap) !important;
    }

    #pmd-r2-clean-header .pmd-r2-clean-title {
      font-size: 19px !important;
    }

    #pmd-r2-clean-header .pmd-r2-mobile-menu {
      display: inline-flex !important;
    }

    /* Keep all four KPI cards in one horizontal row on mobile. */
    #pmd-reservations2 .pmd-r2__kpis {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(190px, 1fr)) !important;
      gap: var(--pmd-r2-gap) !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      scroll-snap-type: x proximity !important;
      -webkit-overflow-scrolling: touch !important;
      padding-bottom: 3px !important;
    }

    #pmd-reservations2 .pmd-r2-kpi {
      min-width: 190px !important;
      scroll-snap-align: start !important;
    }

    html.pmd-sm2-mobile-open #pmd-side-menu2 {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      transform: translateX(0) !important;
      pointer-events: auto !important;
      z-index: 10050 !important;
    }

    html.pmd-sm2-mobile-open::after {
      content: "";
      position: fixed;
      inset: 0;
      background: rgba(6, 18, 15, .36);
      z-index: 10040;
    }
  }
</style>
<!-- PMD_R2_CRITICAL_PREPAINT_V4_END -->