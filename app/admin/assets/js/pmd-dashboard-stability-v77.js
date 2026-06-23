(function () {
  'use strict';

  // Real API already writes values into the dashboard before dispatching these events.
  // The old listeners use the events to rebuild whole dashboard blocks, which causes the blink/jump.
  if (!document.__pmdDashboardStableDispatchV77) {
    document.__pmdDashboardStableDispatchV77 = true;
    var originalDispatch = document.dispatchEvent.bind(document);
    document.dispatchEvent = function (event) {
      try {
        if (event && /^pmd:dashboard-real-data/.test(String(event.type || ''))) {
          if (event.detail) window.PMDRealDashboardData = event.detail;
          window.__PMD_LAST_SUPPRESSED_REAL_DASHBOARD_EVENT_V77 = event.type;
          return true;
        }
      } catch (e) {}
      return originalDispatch(event);
    };
  }

  function settle() {
    try {
      if (window.PMDRoleDashboardLockV72 && window.PMDRoleDashboardLockV72.safe && typeof window.PMDRoleDashboardLockV72.enforce === 'function') {
        window.PMDRoleDashboardLockV72.enforce();
      }
    } catch (e) {}

    try {
      var rt = document.querySelector('.pmd-dashboard-modern[data-pmd-role="waiter3"]');
      if (rt && !rt.querySelector('.pmd-w3-role-kpi-bar') && window.PMDWaiter3RoleBar && typeof window.PMDWaiter3RoleBar.refresh === 'function') {
        window.PMDWaiter3RoleBar.refresh();
      }
    } catch (e2) {}

    try {
      document.documentElement.classList.remove('pmd-dashboard-booting');
      document.documentElement.classList.add('pmd-dashboard-ready');
    } catch (e3) {}
  }

  function schedule() {
    [50, 150, 300, 650, 1000, 1800, 3000, 5000].forEach(function (delay) {
      setTimeout(settle, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();

  window.PMDDashboardStabilityV77 = { settle: settle };
})();
