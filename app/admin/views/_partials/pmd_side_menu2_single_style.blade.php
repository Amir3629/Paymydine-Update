{{-- 
PMD_SINGLE_SIDE_MENU_STYLE_V3

Single visual authority for Side Menu 2.
Also contains the Reservations2 critical paint and responsive rules.
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

<!-- PMD_R2_CRITICAL_PREPAINT_V5_START -->
<style id="pmd-r2-critical-prepaint-v5">
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
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 42px !important;
    height: 42px !important;
    margin: 0 0 var(--pmd-r2-gap) 0 !important;
    padding: 0 !important;
    gap: 12px !important;
  }

  #pmd-r2-clean-header .pmd-r2-clean-leading {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
  }

  #pmd-r2-clean-header .pmd-r2-clean-title {
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    margin: 0 !important;
  }

  #pmd-r2-clean-header .pmd-r2-clean-actions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 8px !important;
    flex: 0 0 auto !important;
    margin: 0 !important;
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

  /* The legacy Bootstrap mobile toggle is not used on this page. */
  #pmd-r2-clean-header .pmd-r2-mobile-toggle,
  #pmd-r2-clean-header .navbar-toggler {
    display: none !important;
  }

  /* Notifications: exactly one 42x42 frame, with no wrapper frame. */
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
    overflow: visible !important;
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
    margin: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: 1px solid #c9e0ef !important;
    border-radius: 11px !important;
    background: #fff !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  #pmd-r2-clean-header #notifDropdown::after {
    display: none !important;
    content: none !important;
  }

  #pmd-r2-clean-header #notification-count {
    top: -6px !important;
    right: -7px !important;
    z-index: 3 !important;
  }

  #pmd-r2-clean-header .pmd-r2-mobile-menu {
    display: none !important;
  }

  #pmd-r2-mobile-nav {
    display: none;
  }

  @media (max-width: 820px) {
    #pmd-reservations2 {
      --pmd-r2-gap: 10px;
      padding: var(--pmd-r2-gap) !important;
      width: 100% !important;
      margin-left: 0 !important;
    }

    /* Mobile uses an ordinary in-flow website menu, never a side drawer. */
    #pmd-side-menu2,
    html.pmd-sm2-mobile-open #pmd-side-menu2 {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transform: none !important;
    }

    html.pmd-sm2-mobile-open::after {
      display: none !important;
      content: none !important;
    }

    #pmd-r2-clean-header {
      width: 100% !important;
      min-height: 40px !important;
      height: 40px !important;
      margin-bottom: var(--pmd-r2-gap) !important;
      gap: 8px !important;
    }

    #pmd-r2-clean-header .pmd-r2-clean-leading {
      gap: 8px !important;
    }

    #pmd-r2-clean-header .pmd-r2-clean-title {
      font-size: 18px !important;
      line-height: 1.1 !important;
    }

    #pmd-r2-clean-header .pmd-r2-clean-actions {
      gap: 6px !important;
    }

    #pmd-r2-clean-header .pmd-r2-header-back,
    #pmd-r2-clean-header .pmd-r2-mobile-menu,
    #pmd-r2-clean-header .pmd-r2-clean-create,
    #pmd-r2-clean-header #notif-root,
    #pmd-r2-clean-header #notif-root > .media-toolbar-tooltip-wrap,
    #pmd-r2-clean-header #notifDropdown {
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
    }

    #pmd-r2-clean-header .pmd-r2-mobile-menu {
      display: inline-flex !important;
    }

    /* Four KPI cards remain one horizontal rail; they never stack vertically. */
    #pmd-reservations2 .pmd-r2__kpis {
      display: flex !important;
      flex-flow: row nowrap !important;
      align-items: stretch !important;
      gap: var(--pmd-r2-gap) !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      scroll-snap-type: x mandatory !important;
      overscroll-behavior-x: contain !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 0 0 4px 0 !important;
      margin-bottom: var(--pmd-r2-gap) !important;
      scrollbar-width: thin !important;
    }

    #pmd-reservations2 .pmd-r2-kpi {
      flex: 0 0 176px !important;
      width: 176px !important;
      min-width: 176px !important;
      min-height: 88px !important;
      padding: 14px !important;
      border-radius: 14px !important;
      scroll-snap-align: start !important;
    }

    #pmd-reservations2 .pmd-r2-kpi strong {
      font-size: 25px !important;
    }

    #pmd-reservations2 .pmd-r2-kpi i {
      width: 40px !important;
      height: 40px !important;
    }

    #pmd-reservations2 .pmd-r2__workspace {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: var(--pmd-r2-gap) !important;
    }

    #pmd-reservations2 .pmd-r2__list-panel,
    #pmd-reservations2 .pmd-r2__floor-panel {
      min-width: 0 !important;
      width: 100% !important;
    }

    #pmd-r2-mobile-nav {
      display: none;
      width: 100%;
      margin: 0 0 var(--pmd-r2-gap) 0;
      padding: 10px;
      border: 1px solid #c9e0ef;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(16, 36, 58, .06);
    }

    #pmd-r2-mobile-nav.is-open {
      display: block;
    }

    #pmd-r2-mobile-nav .pmd-sm2__nav {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__item,
    #pmd-r2-mobile-nav .pmd-sm2__dropdown-toggle {
      display: flex !important;
      align-items: center !important;
      gap: 9px !important;
      width: 100% !important;
      min-height: 44px !important;
      margin: 0 !important;
      padding: 9px 10px !important;
      border: 1px solid #dbe9f2 !important;
      border-radius: 10px !important;
      background: #fff !important;
      color: #17231f !important;
      text-decoration: none !important;
      text-align: left !important;
      box-shadow: none !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__item.is-active {
      background: #fff7df !important;
      border-color: #ecdca5 !important;
    }

    #pmd-r2-mobile-nav svg {
      width: 20px !important;
      height: 20px !important;
      flex: 0 0 20px !important;
      fill: none !important;
      stroke: currentColor !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__label {
      display: block !important;
      min-width: 0 !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      white-space: normal !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__dropdown {
      min-width: 0 !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__submenu {
      display: none !important;
      grid-column: 1 / -1 !important;
      margin-top: 6px !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__dropdown.is-open .pmd-sm2__submenu {
      display: block !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__submenu-inner {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 6px !important;
      padding: 8px !important;
      border-radius: 10px !important;
      background: #f8fbfd !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__subitem {
      display: block !important;
      padding: 8px 9px !important;
      border-radius: 8px !important;
      color: #31485c !important;
      background: #fff !important;
      text-decoration: none !important;
      font-size: 12px !important;
    }
  }

  @media (max-width: 420px) {
    #pmd-r2-clean-header .pmd-r2-clean-title {
      font-size: 16px !important;
    }

    #pmd-r2-clean-header .pmd-r2-header-back,
    #pmd-r2-clean-header .pmd-r2-mobile-menu,
    #pmd-r2-clean-header .pmd-r2-clean-create,
    #pmd-r2-clean-header #notif-root,
    #pmd-r2-clean-header #notif-root > .media-toolbar-tooltip-wrap,
    #pmd-r2-clean-header #notifDropdown {
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
    }

    #pmd-r2-clean-header .pmd-r2-clean-actions {
      gap: 4px !important;
    }

    #pmd-r2-mobile-nav .pmd-sm2__nav,
    #pmd-r2-mobile-nav .pmd-sm2__submenu-inner {
      grid-template-columns: 1fr !important;
    }
  }
</style>
<!-- PMD_R2_CRITICAL_PREPAINT_V5_END -->

<script id="pmd-r2-mobile-nav-v2">
(function () {
  'use strict';

  if (location.pathname.replace(/\/+$/, '') !== '/admin/reservations2') return;
  if (window.PMDR2MobileNavV2) return;

  function install() {
    var header = document.getElementById('pmd-r2-clean-header');
    var trigger = header && header.querySelector('.pmd-r2-mobile-menu');
    var side = document.getElementById('pmd-side-menu2');
    if (!header || !trigger || !side) return false;

    var panel = document.getElementById('pmd-r2-mobile-nav');
    if (!panel) {
      panel = document.createElement('nav');
      panel.id = 'pmd-r2-mobile-nav';
      panel.setAttribute('aria-label', 'Mobile admin navigation');
      panel.setAttribute('aria-hidden', 'true');

      var sourceNav = side.querySelector('.pmd-sm2__nav');
      if (sourceNav) panel.appendChild(sourceNav.cloneNode(true));
      header.insertAdjacentElement('afterend', panel);

      panel.querySelectorAll('[data-pmd-sm2-dropdown-toggle]').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          var group = button.closest('.pmd-sm2__dropdown');
          if (!group) return;
          var open = group.classList.toggle('is-open');
          button.setAttribute('aria-expanded', String(open));
        });
      });

      panel.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          panel.classList.remove('is-open');
          panel.setAttribute('aria-hidden', 'true');
          trigger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    function toggle(event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      document.documentElement.classList.remove('pmd-sm2-mobile-open');
      var open = panel.classList.toggle('is-open');
      panel.setAttribute('aria-hidden', String(!open));
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }

    trigger.addEventListener('click', toggle, true);

    document.addEventListener('click', function (event) {
      if (!panel.classList.contains('is-open')) return;
      if (event.target.closest('#pmd-r2-mobile-nav, .pmd-r2-mobile-menu')) return;
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-label', 'Open navigation');
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('pmd-sm2-mobile-open');
      }
    }, { passive: true });

    window.PMDR2MobileNavV2 = {
      version: '2.0.0',
      mode: 'inline',
      panel: panel,
      trigger: trigger
    };

    return true;
  }

  if (install()) return;

  var observer = new MutationObserver(function () {
    if (install()) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.setTimeout(function () {
    install();
    observer.disconnect();
  }, 2500);
})();
</script>