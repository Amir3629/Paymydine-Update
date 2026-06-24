(function () {
  'use strict';

  var ctx = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
  var username = String(ctx.username || '').toLowerCase();
  var roleCode = String(ctx.role_code || '').toLowerCase();
  var roleName = String(ctx.role_name || '').toLowerCase();
  var isKds = username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1;

  if (!isKds) {
    window.PMDKdsDashboardInlineV76 = { active: false, context: ctx };
    return;
  }

  var kdsPath = '/admin/kitchendisplay/main-kitchen';
  var hostClass = 'pmd-kds-dashboard-host-v76';
  var iframeClass = 'pmd-kds-dashboard-iframe-v76';
  var timer = null;

  function pathClean() {
    return window.location.pathname.replace(/\/+$/, '') || '/';
  }

  function isLoginLogoutPath() {
    var p = pathClean();
    return p.indexOf('/admin/login') === 0 || p.indexOf('/admin/logout') === 0 || p.indexOf('/admin/signout') === 0;
  }

  function isInsideKdsPage() {
    return pathClean().indexOf('/admin/kitchendisplay') === 0;
  }

  function isDashboardPath() {
    var p = pathClean();
    return p === '/admin' || p === '/admin/dashboard';
  }

  function addClasses() {
    document.documentElement.classList.add(
      'pmd-kds-dashboard-inline-role-v76',
      'pmd-no-sidebar-role-v73',
      'pmd-kds-only-role-v73'
    );
    document.documentElement.classList.remove('pmd-kds-dashboard-is-embedded-v75');

    if (document.body) {
      (document.body||document.documentElement).classList.add(
        'pmd-kds-dashboard-inline-role-v76',
        'pmd-no-sidebar-role-v73',
        'pmd-kds-only-role-v73'
      );
      (document.body||document.documentElement).classList.remove('pmd-kds-dashboard-is-embedded-v75');
      document.body.style.setProperty('overflow-y', 'auto', 'important');
      document.body.style.setProperty('overflow-x', 'hidden', 'important');
    }
  }

  function killV75Overlay() {
    document.documentElement.classList.remove('pmd-kds-dashboard-is-embedded-v75');
    if (document.body) (document.body||document.documentElement).classList.remove('pmd-kds-dashboard-is-embedded-v75');

    document.querySelectorAll('.pmd-kds-dashboard-host-v75').forEach(function (el) {
      try { el.remove(); }
      catch (e) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('position', 'static', 'important');
        el.style.setProperty('z-index', '-1', 'important');
      }
    });
  }

  function hideSidebarOnly() {
    [
      '.sidebar',
      '#navSidebar',
      '#side-nav-menu',
      '.navbar-side',
      '.sidebar-left',
      '.pmd-sidebar-icons-toggle',
      '.pmd-logo-cycle-nav-item-v38',
      '.pmd-logo-cycle-btn-v38'
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    });

    [
      '.page-wrapper',
      '#page-wrapper',
      '.content-wrapper',
      '.main-content',
      '.layout-content',
      '.page-content'
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.setProperty('margin-left', '0', 'important');
        el.style.setProperty('left', '0', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('max-width', 'none', 'important');
      });
    });

    /* Be explicit: the top admin header must stay visible and clickable. */
    document.querySelectorAll('.navbar-top, .navbar-top *').forEach(function (el) {
      if (el.classList && (el.classList.contains('sidebar') || el.id === 'side-nav-menu')) return;
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
    });
  }

  function findMount() {
    var modern = document.querySelector('.pmd-dashboard-modern');
    if (modern) return modern;

    var dashboardContainer = document.querySelector('[data-control="dashboard-container"]');
    if (dashboardContainer) return dashboardContainer;

    var content = document.querySelector('.page-content');
    if (content) return content;

    return document.body || document.documentElement;
  }

  function currentHost() {
    return document.querySelector('.' + hostClass);
  }

  function makeHost() {
    var host = document.createElement('section');
    host.className = hostClass;
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Kitchen Display Dashboard');

    var iframe = document.createElement('iframe');
    iframe.className = iframeClass;
    iframe.title = 'Kitchen Display - Main Kitchen';
    iframe.src = kdsPath + '?embedded=dashboard-inline-v76';
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');

    iframe.addEventListener('load', function () {
      injectIframeCleanup(iframe);
      setTimeout(function () { injectIframeCleanup(iframe); }, 250);
      setTimeout(function () { injectIframeCleanup(iframe); }, 1000);
    });

    host.appendChild(iframe);
    return host;
  }

  function injectIframeCleanup(iframe) {
    try {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc || !doc.documentElement) return;
      doc.documentElement.classList.add('pmd-kds-iframe-inner-v76');

      if (!doc.getElementById('pmd-kds-iframe-inner-style-v76')) {
        var style = doc.createElement('style');
        style.id = 'pmd-kds-iframe-inner-style-v76';
        style.textContent = [
          'html,body{margin:0!important;background:#fff!important;overflow:auto!important;}',
          '.sidebar,#navSidebar,#side-nav-menu,.navbar-side,.sidebar-left,.pmd-sidebar-icons-toggle{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',
          '.page-wrapper,#page-wrapper,.content-wrapper,.main-content,.layout-content,.page-content{margin-left:0!important;left:0!important;width:100%!important;max-width:none!important;}',
          '.kds-container{padding:18px!important;}'
        ].join('\n');
        (doc.head || doc.documentElement).appendChild(style);
      }
    } catch (e) {
      /* Same-origin should allow this; silently ignore if browser blocks it. */
    }
  }

  function hidePreviewDashboardBehindKds() {
    var root = document.querySelector('.pmd-dashboard-modern');
    if (!root) return;
    root.setAttribute('data-pmd-kds-inline-v76', '1');

    ['.pmd-dashboard-kpi-bar', '.pmd-role-panel', '.pmd-dashboard-grid', '.pmd-owner-insights'].forEach(function (sel) {
      root.querySelectorAll(':scope > ' + sel).forEach(function (el) {
        if (!el.classList.contains(hostClass)) el.style.setProperty('display', 'none', 'important');
      });
    });

    document.querySelectorAll('.pmd-role-switcher').forEach(function (el) {
      el.style.setProperty('display', 'none', 'important');
    });
  }

  function askRolePreviewForKitchen() {
    try {
      if (window.PMDDashboardRolePreview && typeof window.PMDDashboardRolePreview.setRole === 'function') {
        window.PMDDashboardRolePreview.setRole('kitchen');
      }
    } catch (e) {}
  }

  function ensureInlineKds() {
    if (isLoginLogoutPath()) return;

    addClasses();
    killV75Overlay();
    hideSidebarOnly();

    if (isInsideKdsPage()) {
      document.documentElement.classList.remove('pmd-kds-dashboard-inline-mounted-v76');
      if (document.body) (document.body||document.documentElement).classList.remove('pmd-kds-dashboard-inline-mounted-v76');
      return;
    }

    if (!isDashboardPath()) return;

    askRolePreviewForKitchen();

    var mount = findMount();
    if (!mount) return;

    var host = currentHost();
    if (!host) host = makeHost();

    if (host.parentElement !== mount) {
      if (mount.firstElementChild) mount.insertBefore(host, mount.firstElementChild);
      else mount.appendChild(host);
    }

    document.documentElement.classList.add('pmd-kds-dashboard-inline-mounted-v76');
    if (document.body) (document.body||document.documentElement).classList.add('pmd-kds-dashboard-inline-mounted-v76');

    hidePreviewDashboardBehindKds();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(ensureInlineKds, 80);
  }

  window.PMDKdsDashboardInlineV76 = {
    active: true,
    context: ctx,
    path: kdsPath,
    ensure: ensureInlineKds,
    hideSidebar: hideSidebarOnly,
    killV75Overlay: killV75Overlay
  };

  addClasses();
  killV75Overlay();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureInlineKds, { once: true });
  } else {
    ensureInlineKds();
  }

  [50, 160, 350, 700, 1200, 2200, 3600, 6000].forEach(function (ms) {
    setTimeout(ensureInlineKds, ms);
  });

  try {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
