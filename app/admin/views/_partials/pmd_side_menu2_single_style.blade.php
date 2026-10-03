{{-- PMD_SIDE_MENU2_CRITICAL_SINGLE_AUTHORITY_V2 --}}
<style id="pmd-side-menu2-critical-v2">
  :root {
    --pmd-admin-bg: #f8fbfd;
    --pmd-sm2-gap: 14px;
    --pmd-sm2-collapsed: 72px;
    --pmd-sm2-expanded: 160px;
    --pmd-sm2-content-left-collapsed: 100px;
    --pmd-sm2-content-left-expanded: 188px;
  }

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
  .content-wrapper {
    background: var(--pmd-admin-bg) !important;
  }

  html,
  body {
    min-width: 100%;
    min-height: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }
  #pmd-side-menu2 {
    position: fixed !important;
    left: var(--pmd-sm2-gap) !important;
    top: var(--pmd-sm2-gap) !important;
    bottom: var(--pmd-sm2-gap) !important;
    height: auto !important;
    margin: 0 !important;
    transform: none !important;
    z-index: 1050;
    transition: width 220ms cubic-bezier(.22,.75,.24,1) !important;
  }

  html.pmd-sm2-collapsed #pmd-side-menu2 {
    width: var(--pmd-sm2-collapsed) !important;
  }

  html.pmd-sm2-expanded #pmd-side-menu2 {
    width: var(--pmd-sm2-expanded) !important;
  }
  html:not(.pmd-sm2-runtime-ready) #pmd-side-menu2 {
    transition: none !important;
  }

  @media (max-width: 820px) {
    :root { --pmd-sm2-gap: 10px; }
    #pmd-side-menu2,
    html.pmd-sm2-collapsed #pmd-side-menu2,
    html.pmd-sm2-expanded #pmd-side-menu2 {
      left: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: min(78vw, 340px) !important;
      height: 100dvh !important;
      transform: translateX(-105%) !important;
      opacity: 1;
      visibility: visible;
      pointer-events: none;
      border-radius: 0 24px 24px 0;
      box-shadow: 0 24px 70px rgba(0,0,0,.28);
      transition: transform 280ms cubic-bezier(.22,.75,.24,1) !important;
      z-index: 2147483646;
    }

    html.pmd-sm2-mobile-open #pmd-side-menu2 {
      transform: translateX(0) !important;
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

