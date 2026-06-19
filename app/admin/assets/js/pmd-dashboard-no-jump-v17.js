(function () {
  'use strict';

  var done = false;

  function hasDashboard() {
    return !!document.querySelector('.pmd-dashboard-modern, [data-control="dashboard-container"]');
  }

  function isWaiter3() {
    var root = document.querySelector('.pmd-dashboard-modern');
    return root && root.getAttribute('data-pmd-role') === 'waiter3';
  }

  function warmUp() {
    try {
      if (window.PMDW3QuickIcons && typeof window.PMDW3QuickIcons.refresh === 'function') {
        window.PMDW3QuickIcons.refresh();
      }
    } catch (e) {}

    try {
      if (window.PMDWaiter3RoleBar && typeof window.PMDWaiter3RoleBar.refresh === 'function') {
        window.PMDWaiter3RoleBar.refresh();
      }
    } catch (e) {}

    try {
      if (
        window.PMDDashboardRolePreview &&
        typeof window.PMDDashboardRolePreview.setRole === 'function' &&
        localStorage.getItem('pmdDashboardPreviewRole')
      ) {
        window.PMDDashboardRolePreview.setRole(localStorage.getItem('pmdDashboardPreviewRole'));
      }
    } catch (e) {}
  }

  function readyEnough() {
    var root = document.querySelector('.pmd-dashboard-modern');
    if (!root) return false;

    var switcher = document.querySelector('.pmd-role-switcher');
    if (!switcher) return false;

    if (isWaiter3()) {
      return !!document.querySelector('.pmd-w3-role-kpi-bar') &&
             !!document.querySelector('.pmd-w3-quick-card[data-pmd-w3-action]');
    }

    return true;
  }

  function finish(force) {
    if (done) return;

    warmUp();

    if (!force && hasDashboard() && !readyEnough()) return;

    done = true;

    document.documentElement.classList.remove('pmd-dashboard-booting');
    document.documentElement.classList.add('pmd-dashboard-ready');

    setTimeout(function () {
      document.documentElement.classList.remove('pmd-dashboard-ready');
    }, 900);
  }

  function schedule() {
    [80, 180, 350, 650, 950, 1250, 1600].forEach(function (delay) {
      setTimeout(function () {
        finish(false);
      }, delay);
    });

    /* Final safety: never hide dashboard longer than this */
    setTimeout(function () {
      finish(true);
    }, 1900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  window.PMDDashboardNoJump = {
    finish: function () { finish(true); },
    warmUp: warmUp
  };
})();
