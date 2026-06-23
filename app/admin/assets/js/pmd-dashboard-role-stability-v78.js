(function () {
  'use strict';

  var lock = window.PMD_LOCKED_DASHBOARD_ROLE_V78 || null;
  if (!lock || !lock.role) return;

  function addClasses() {
    try {
      if (window.PMDRoleStabilityPrebootV78) window.PMDRoleStabilityPrebootV78.addClasses();
    } catch (e) {}
  }

  function currentRole() {
    var rt = document.querySelector('.pmd-dashboard-modern');
    return rt ? rt.getAttribute('data-pmd-role') : null;
  }

  function enforceRole() {
    addClasses();
    try { if (window.PMDRoleStabilityPrebootV78) window.PMDRoleStabilityPrebootV78.writeStorage(); } catch(e) {}

    if (currentRole() === lock.role) return true;

    if (window.PMDDashboardRolePreview && typeof window.PMDDashboardRolePreview.setRole === 'function') {
      try { window.PMDDashboardRolePreview.setRole(lock.role); } catch (e2) {}
    }

    if (lock.role === 'waiter3' && window.PMDWaiter3DashboardV12 && typeof window.PMDWaiter3DashboardV12.setRole === 'function') {
      try { window.PMDWaiter3DashboardV12.setRole('waiter3'); } catch (e3) {}
    }

    document.querySelectorAll('.pmd-role-switcher').forEach(function (el) {
      el.classList.add('pmd-dashboard-role-switcher-hidden-v72', 'pmd-dashboard-switcher-hide-v73');
    });

    return currentRole() === lock.role;
  }

  function schedule() {
    [0, 60, 140, 300, 650, 1200, 2200, 3600, 5500].forEach(function (ms) {
      setTimeout(enforceRole, ms);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();

  window.PMDDashboardRoleStabilityV78 = { lock: lock, enforce: enforceRole, currentRole: currentRole };
})();
