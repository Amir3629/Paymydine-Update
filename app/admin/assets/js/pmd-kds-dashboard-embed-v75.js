(function () {
  'use strict';

  var ctx = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
  var username = String(ctx.username || '').toLowerCase();
  var roleCode = String(ctx.role_code || '').toLowerCase();
  var roleName = String(ctx.role_name || '').toLowerCase();
  var isKds = username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1;

  if (!isKds) {
    window.PMDKdsDashboardEmbedV75 = { active: false, context: ctx };
    return;
  }

  var kdsPath = '/admin/kitchendisplay/main-kitchen';

  function addClass() {
    document.documentElement.classList.add(
      'pmd-kds-dashboard-embed-role-v75',
      'pmd-no-sidebar-role-v73',
      'pmd-kds-only-role-v73'
    );

    if (document.body) {
      document.body.classList.add(
        'pmd-kds-dashboard-embed-role-v75',
        'pmd-no-sidebar-role-v73',
        'pmd-kds-only-role-v73'
      );
    }
  }

  function hideSidebar() {
    [
      '.sidebar',
      '#navSidebar',
      '.navbar-side',
      '.sidebar-left',
      '.pmd-sidebar-icons-toggle',
      '.pmd-platform-logo-slot-v38',
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
  }

  function isLoginLogoutPath() {
    var p = window.location.pathname.replace(/\/+$/, '');
    return p.indexOf('/admin/login') === 0 ||
      p.indexOf('/admin/logout') === 0 ||
      p.indexOf('/admin/signout') === 0;
  }

  function isInsideKdsPage() {
    return window.location.pathname.indexOf('/admin/kitchendisplay') === 0;
  }

  function injectIntoIframe(iframe) {
    try {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc || !doc.documentElement) return;

      doc.documentElement.classList.add('pmd-kds-iframe-inner-v75');

      if (!doc.getElementById('pmd-kds-iframe-inner-style-v75')) {
        var style = doc.createElement('style');
        style.id = 'pmd-kds-iframe-inner-style-v75';
        style.textContent = [
          '.sidebar,#navSidebar,.navbar-side,.sidebar-left,.pmd-sidebar-icons-toggle{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',
          '.page-wrapper,#page-wrapper,.content-wrapper,.main-content,.layout-content,.page-content{margin-left:0!important;left:0!important;width:100%!important;max-width:none!important;}',
          'body{margin:0!important;overflow:auto!important;}'
        ].join('\n');
        (doc.head || doc.documentElement).appendChild(style);
      }
    } catch (e) {}
  }

  function ensureEmbed() {
    if (isLoginLogoutPath()) return;

    addClass();
    hideSidebar();

    /* If user is already on the real KDS page, do NOT create iframe.
       Just make the real KDS page full width/no-sidebar. */
    if (isInsideKdsPage()) {
      document.documentElement.classList.remove('pmd-kds-dashboard-is-embedded-v75');
      return;
    }

    document.documentElement.classList.add('pmd-kds-dashboard-is-embedded-v75');

    var existing = document.querySelector('.pmd-kds-dashboard-host-v75');
    if (existing) return;

    var host = document.createElement('div');
    host.className = 'pmd-kds-dashboard-host-v75';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Kitchen Display Dashboard');

    var iframe = document.createElement('iframe');
    iframe.className = 'pmd-kds-dashboard-iframe-v75';
    iframe.title = 'Kitchen Display - Main Kitchen';
    iframe.src = kdsPath + '?embedded=dashboard';
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');

    iframe.addEventListener('load', function () {
      injectIntoIframe(iframe);
      setTimeout(function () { injectIntoIframe(iframe); }, 300);
      setTimeout(function () { injectIntoIframe(iframe); }, 1000);
    });

    host.appendChild(iframe);
    document.body.appendChild(host);
  }

  window.PMDKdsDashboardEmbedV75 = {
    active: true,
    context: ctx,
    path: kdsPath,
    ensureEmbed: ensureEmbed,
    hideSidebar: hideSidebar
  };

  addClass();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureEmbed, { once: true });
  } else {
    ensureEmbed();
  }

  [80, 250, 600, 1200, 2400].forEach(function (ms) {
    setTimeout(ensureEmbed, ms);
  });

  try {
    new MutationObserver(function () {
      clearTimeout(window.__pmdKdsDashboardEmbedV75Timer);
      window.__pmdKdsDashboardEmbedV75Timer = setTimeout(function () {
        addClass();
        hideSidebar();
      }, 100);
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
