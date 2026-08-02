/*
  PMD_DASHBOARD2_REAL_R2_SYSTEM_V13
  Dashboard2 only.
*/
(function () {
  'use strict';

  var VERSION = '13.0.0';

  function isDashboard2() {
    return /\/admin\/dashboard2\/?$/.test(window.location.pathname);
  }

  if (!isDashboard2()) return;

  function markReady() {
    document.documentElement.classList.add(
      'pmd-dashboard2-clean-ready-v1',
      'pmd-dashboard2-real-r2-system-ready-v13'
    );

    document.body.classList.add(
      'pmd-dashboard2-real-r2-system-ready-v13'
    );
  }

  function audit() {
    var root = document.getElementById('pmd-dashboard2-rebuild-root');
    var floor = root ? root.querySelector('[data-pmd-floor]') : null;

    return {
      version: VERSION,
      path: location.pathname,
      root: Boolean(root),
      sideMenu: Boolean(document.getElementById('pmd-side-menu2')),
      realR2SystemClass: document.documentElement.classList.contains('pmd-dashboard2-real-r2-system-v13'),
      readyClass: document.documentElement.classList.contains('pmd-dashboard2-clean-ready-v1'),
      kpis: root ? root.querySelectorAll('.pmd-d2r-kpi').length : 0,
      realFloorPartial: Boolean(floor),
      floorTables: floor ? floor.querySelectorAll('[data-table-id], .pmd-floor-v1__table').length : 0,
      panels: root ? root.querySelectorAll('.pmd-d2r-panel').length : 0
    };
  }

  function boot() {
    markReady();

    window.PMDDashboard2RebuildV1 = {
      version: VERSION,
      audit: audit,
      refresh: function () {
        markReady();
        return audit();
      }
    };

    console.info('[PMD] Dashboard2 Real Reservations2 System V13 active', audit());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
