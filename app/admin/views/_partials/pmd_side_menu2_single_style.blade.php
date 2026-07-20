{{-- PMD_SIDE_MENU2_CRITICAL_SINGLE_AUTHORITY_V1 --}}
<style id="pmd-side-menu2-critical-v1">
  :root {
    --pmd-admin-bg: #f8fbfd;
    --pmd-sm2-gap: 14px;
    --pmd-sm2-collapsed: 72px;
    --pmd-sm2-expanded: 184px;
    --pmd-sm2-width: var(--pmd-sm2-collapsed);
  }

  html.pmd-sm2-expanded { --pmd-sm2-width: var(--pmd-sm2-expanded); }
  html.pmd-sm2-collapsed { --pmd-sm2-width: var(--pmd-sm2-collapsed); }

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
  #pmd-reservations2 {
    background: var(--pmd-admin-bg) !important;
  }

  html,
  body {
    min-width: 100%;
    min-height: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  body:has(#pmd-reservations2) {
    overflow-x: hidden !important;
  }

  body:has(#pmd-reservations2) .navbar-top,
  body:has(#pmd-reservations2) .navbar-fixed-top,
  body:has(#pmd-reservations2) #pmd-dashboard2-quick-btn,
  body:has(#pmd-reservations2) #pmd-reservations2 .pmd-r2__hero {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #pmd-side-menu2 {
    position: fixed;
    left: var(--pmd-sm2-gap);
    top: var(--pmd-sm2-gap);
    bottom: var(--pmd-sm2-gap);
    width: var(--pmd-sm2-width);
    z-index: 1050;
  }

  body:has(#pmd-reservations2) .page-wrapper,
  body:has(#pmd-reservations2) .page-content,
  body:has(#pmd-reservations2) .content-wrapper {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    overflow-x: hidden !important;
  }

  #pmd-reservations2 {
    width: auto !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 var(--pmd-sm2-gap) 0 calc(var(--pmd-sm2-gap) + var(--pmd-sm2-width) + var(--pmd-sm2-gap)) !important;
    padding: var(--pmd-sm2-gap) 0 var(--pmd-sm2-gap) !important;
    box-sizing: border-box !important;
    transition: margin-left 220ms cubic-bezier(.22,.75,.24,1) !important;
  }

  html:not(.pmd-sm2-runtime-ready) #pmd-side-menu2,
  html:not(.pmd-sm2-runtime-ready) #pmd-reservations2 {
    transition: none !important;
  }

  @media (max-width: 820px) {
    :root { --pmd-sm2-gap: 10px; }

    #pmd-reservations2 {
      width: 100% !important;
      margin: 0 !important;
      padding: var(--pmd-sm2-gap) !important;
    }

    #pmd-side-menu2 {
      left: 0;
      top: 0;
      bottom: 0;
      width: min(78vw, 340px);
      height: 100dvh;
      transform: translateX(-105%);
      opacity: 1;
      visibility: visible;
      pointer-events: none;
      border-radius: 0 24px 24px 0;
      box-shadow: 0 24px 70px rgba(0,0,0,.28);
      transition: transform 280ms cubic-bezier(.22,.75,.24,1);
      z-index: 2147483646;
    }

    html.pmd-sm2-mobile-open #pmd-side-menu2 {
      transform: translateX(0);
      pointer-events: auto;
    }

    #pmd-side-menu2-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483645;
      background: rgba(8,18,16,.32);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 280ms ease, visibility 280ms ease;
    }

    html.pmd-sm2-mobile-open #pmd-side-menu2-backdrop {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    body.pmd-sm2-scroll-locked { overflow: hidden !important; }
  }
</style>
