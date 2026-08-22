/*
  PMD Dashboard2 Clean Rebuild V1
  Runtime guard only. Data wiring will be added section-by-section.
*/
(function () {
  'use strict';

  var VERSION = '1.0.0';

  function isDashboard2() {
    return /\/admin\/dashboard2\/?$/.test(window.location.pathname);
  }

  if (!isDashboard2()) return;

  var oldSelectors = [
    '#pmd-d2-root',
    '.pmd-d2-root',
    '.pmd-d2-shell',
    '.pmd-d2-kpis',
    '.pmd-d2-grid',
    '.pmd-d2-priority-grid',
    '.pmd-d2-service-performance',
    '#pmd-dashboard2-quick-btn'
  ];

  function hideOldDashboard2() {
    oldSelectors.forEach(function (selector) {
      Array.prototype.slice.call(document.querySelectorAll(selector))
        .forEach(function (node) {
          if (node.id === 'pmd-dashboard2-rebuild-root') return;
          if (node.closest && node.closest('#pmd-side-menu2')) return;

          node.setAttribute('data-pmd-dashboard2-old-hidden', 'rebuild-v1');
          node.style.setProperty('display', 'none', 'important');
          node.style.setProperty('visibility', 'hidden', 'important');
          node.style.setProperty('opacity', '0', 'important');
          node.style.setProperty('pointer-events', 'none', 'important');
        });
    });
  }

  function markReady() {
    document.documentElement.classList.add('pmd-dashboard2-clean-ready-v1');
    document.body.classList.add('pmd-dashboard2-clean-ready-v1');
  }

  function boot() {
    hideOldDashboard2();
    markReady();

    var observer = new MutationObserver(function () {
      hideOldDashboard2();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.PMDDashboard2RebuildV1 = {
      version: VERSION,
      refresh: hideOldDashboard2,
      audit: function () {
        return {
          version: VERSION,
          path: location.pathname,
          cleanClass: document.documentElement.classList.contains('pmd-dashboard2-clean-server-v1'),
          readyClass: document.documentElement.classList.contains('pmd-dashboard2-clean-ready-v1'),
          sideMenu: Boolean(document.getElementById('pmd-side-menu2')),
          root: Boolean(document.getElementById('pmd-dashboard2-rebuild-root')),
          oldHidden: document.querySelectorAll('[data-pmd-dashboard2-old-hidden="rebuild-v1"]').length
        };
      }
    };

    console.info('[PMD] Dashboard2 Clean Rebuild V1 active', window.PMDDashboard2RebuildV1.audit());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
